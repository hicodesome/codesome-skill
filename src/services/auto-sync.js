import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { withApiClient } from '../api/client.js'
import { AUTO_SYNC_STATE_PATH } from '../config/paths.js'
import { buildUseBaseUrls, normalizePublicSettings } from './public-settings.js'

export const AUTO_SYNC_MIN_INTERVAL_MS = Number(process.env.CODESOME_AUTO_SYNC_INTERVAL_MS || 0)
export const AUTO_SYNC_RECHARGE_DELAY_TEXT = '通常 10-60 秒内同步完成；极端情况下请等待 1-3 分钟后手动刷新。'

const PACKAGE_NAME = 'codesome-cli'
const BACKGROUND_FLAG = '--__codesome-auto-sync-worker'

function nowIso() {
  return new Date().toISOString()
}

function isDisabled() {
  return process.env.CODESOME_AUTO_SYNC === '0' || process.env.CODESOME_AUTO_SYNC === 'false'
}

async function readJsonSafe(filePath) {
  if (!filePath) return null
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch {
    return null
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function readState() {
  const state = await readJsonSafe(AUTO_SYNC_STATE_PATH)
  return state && typeof state === 'object' ? state : { version: 1 }
}

async function updateState(changes) {
  const current = await readState()
  const next = {
    ...current,
    version: 1,
    ...changes,
    updated_at: nowIso()
  }
  await writeJson(AUTO_SYNC_STATE_PATH, next)
  return next
}

function ageMs(value) {
  if (!value) return Infinity
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? Date.now() - timestamp : Infinity
}

async function shouldStartBackgroundSync() {
  if (isDisabled()) return false
  const state = await readState()
  if (state.running_pid && ageMs(state.running_at) < 2 * 60 * 1000) return false
  return ageMs(state.last_started_at) >= AUTO_SYNC_MIN_INTERVAL_MS
}

export async function maybeStartAutoSync(args = []) {
  if (args.includes(BACKGROUND_FLAG)) return false
  if (args.includes('--refresh')) return false
  const command = args[0]
  if (!command || command === 'help' || command === '--help' || command === '-h') return false
  if (command === 'sync') return false
  if (!(await shouldStartBackgroundSync())) return false

  await updateState({
    last_started_at: nowIso(),
    running_at: nowIso(),
    running_pid: process.pid
  })

  const entry = resolveCurrentEntrypoint()
  if (!entry) return false
  const child = spawn(process.execPath, [entry, BACKGROUND_FLAG], {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      CODESOME_AUTO_SYNC: '0'
    }
  })
  child.unref()
  return true
}

async function refreshAccountSnapshot(serviceOptions = {}) {
  return withApiClient(serviceOptions, async (client) => {
    const [profile, dashboardStats, subscriptions, publicSettings] = await Promise.allSettled([
      client.get('/auth/me'),
      client.get('/usage/dashboard/stats'),
      client.get('/subscriptions/active'),
      client.get('/settings/public')
    ])
    if (profile.status === 'rejected') throw profile.reason
    const stats = dashboardStats.status === 'fulfilled' ? dashboardStats.value : null
    const activeSubscriptions = subscriptions.status === 'fulfilled'
      ? (Array.isArray(subscriptions.value) ? subscriptions.value : subscriptions.value?.items || [])
      : []
    const normalizedPublicSettings = publicSettings.status === 'fulfilled'
      ? normalizePublicSettings(publicSettings.value)
      : null
    return {
      account_alias: client.account.alias,
      instance_id: client.account.instance_id,
      instance_name: client.account.instance_name,
      base_url: client.baseUrl,
      api_base_url: normalizedPublicSettings?.api_base_url || null,
      use_base_urls: normalizedPublicSettings ? buildUseBaseUrls(normalizedPublicSettings) : null,
      synced_at: nowIso(),
      account: {
        id: profile.value.id,
        email: profile.value.email,
        username: profile.value.username,
        status: profile.value.status,
        balance: profile.value.balance,
        total_recharged: profile.value.total_recharged,
        concurrency: profile.value.concurrency,
        rpm_limit: profile.value.rpm_limit
      },
      usage: stats ? {
        today_actual_cost: stats.today_actual_cost,
        total_actual_cost: stats.total_actual_cost,
        today_requests: stats.today_requests,
        total_requests: stats.total_requests
      } : null,
      active_subscription_count: activeSubscriptions.length,
      warnings: [
        ...(dashboardStats.status === 'rejected' ? ['usage dashboard stats unavailable'] : []),
        ...(subscriptions.status === 'rejected' ? ['active subscriptions unavailable'] : []),
        ...(publicSettings.status === 'rejected' ? ['public settings unavailable'] : [])
      ]
    }
  })
}

async function commandExists(command) {
  return new Promise((resolve) => {
    const child = spawn(command, ['--version'], { stdio: 'ignore' })
    child.on('error', () => resolve(false))
    child.on('close', (code) => resolve(code === 0))
  })
}

async function runNpm(args) {
  return new Promise((resolve) => {
    const child = spawn('npm', args, {
      stdio: ['ignore', 'ignore', 'ignore'],
      env: process.env
    })
    child.on('error', (error) => resolve({ ok: false, error: error.message }))
    child.on('close', (code) => resolve({ ok: code === 0, code }))
  })
}

async function autoUpdateNpmPackage() {
  if (process.env.CODESOME_AUTO_NPM_UPDATE === '0' || process.env.CODESOME_AUTO_NPM_UPDATE === 'false') {
    return { skipped: true, reason: 'disabled' }
  }
  if (!(await commandExists('npm'))) return { skipped: true, reason: 'npm_not_found' }
  const tag = await resolveAutoUpdateTag()
  const result = await runNpm(['install', '-g', `${PACKAGE_NAME}@${tag}`, '--silent'])
  return result.ok
    ? { updated: true, package: PACKAGE_NAME, tag }
    : { updated: false, package: PACKAGE_NAME, tag, error: result.error || `npm exited ${result.code}` }
}

async function resolveAutoUpdateTag() {
  if (process.env.CODESOME_AUTO_NPM_TAG) return process.env.CODESOME_AUTO_NPM_TAG
  const pkg = await readJsonSafe(resolvePackageJsonPath())
  return String(pkg?.version || '').includes('-') ? 'beta' : 'latest'
}

function resolveCurrentEntrypoint() {
  if (process.pkg) return null
  return process.argv[1] ? path.resolve(process.argv[1]) : null
}

function resolvePackageJsonPath() {
  const entry = resolveCurrentEntrypoint()
  if (!entry) return null
  return path.resolve(path.dirname(entry), '..', 'package.json')
}

export async function runAutoSyncWorker(options = {}) {
  const startedAt = nowIso()
  try {
    await updateState({ running_at: startedAt, running_pid: process.pid, last_error: null })
    const jobs = [refreshAccountSnapshot(options.serviceOptions || {})]
    if (options.updateNpm) jobs.push(autoUpdateNpmPackage())
    const [accountSnapshot, npmUpdate] = await Promise.allSettled(jobs)
    const changes = {
      completed_at: nowIso(),
      running_pid: null,
      running_at: null
    }
    if (options.updateNpm) {
      changes.npm_update = npmUpdate.status === 'fulfilled' ? npmUpdate.value : { updated: false, error: npmUpdate.reason?.message || String(npmUpdate.reason) }
    }
    if (accountSnapshot.status === 'fulfilled') {
      changes.account_snapshot = accountSnapshot.value
      changes.last_success_at = changes.completed_at
      changes.last_error = null
    } else {
      changes.last_error = accountSnapshot.reason?.message || String(accountSnapshot.reason)
    }
    await updateState(changes)
  } catch (error) {
    await updateState({
      running_pid: null,
      running_at: null,
      last_error: error?.message || String(error)
    }).catch(() => null)
  }
}

export async function getAutoSyncStatus() {
  const state = await readState()
  return {
    enabled: !isDisabled(),
    recharge_delay: AUTO_SYNC_RECHARGE_DELAY_TEXT,
    state_path: AUTO_SYNC_STATE_PATH,
    last_started_at: state.last_started_at,
    last_success_at: state.last_success_at,
    completed_at: state.completed_at,
    running: Boolean(state.running_pid && ageMs(state.running_at) < 2 * 60 * 1000),
    last_error: state.last_error,
    account_snapshot: state.account_snapshot || null,
    npm_update: state.npm_update || null
  }
}

export async function refreshNow(serviceOptions = {}) {
  await runAutoSyncWorker({ updateNpm: false, serviceOptions })
  return getAutoSyncStatus()
}

export function isAutoSyncWorkerArgs(args = []) {
  return args.includes(BACKGROUND_FLAG)
}
