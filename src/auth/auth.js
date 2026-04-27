import fs from 'node:fs/promises'
import path from 'node:path'
import { loginWithSystemBrowser } from './system-browser.js'
import { resolveBaseUrl } from '../config/paths.js'
import { resolveAccountContext, updateAccountRecord } from '../accounts/accounts.js'
import { createApiClient } from '../api/client.js'

const DEFAULT_LOGIN_TIMEOUT_MS = 10 * 60 * 1000

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function ensureDirs(accountContext) {
  await fs.mkdir(accountContext.sessionDir, { recursive: true })
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function cookieSummary(storageState) {
  const cookies = Array.isArray(storageState?.cookies) ? storageState.cookies : []
  const origins = Array.isArray(storageState?.origins) ? storageState.origins : []
  const domains = [...new Set(cookies.map((cookie) => cookie.domain).filter(Boolean))]
  return {
    cookie_count: cookies.length,
    origin_count: origins.length,
    domains
  }
}

export async function getAuthStatus(options = {}) {
  const account = await resolveAccountContext({
    account: options.account,
    createIfMissing: !options.account,
    baseUrl: options.baseUrl
  })
  const baseUrl = resolveBaseUrl(options.baseUrl || process.env.CODESOME_BASE_URL || account.baseUrl)
  const sessionExists = await exists(account.storageStatePath)
  const configExists = await exists(account.configPath)
  const result = {
    account_alias: account.alias,
    current_account: account.current,
    logged_in: false,
    session_exists: sessionExists,
    session_path: account.storageStatePath,
    config_path: account.configPath,
    base_url: baseUrl,
    checked_remote: false,
    message: ''
  }

  if (!sessionExists) {
    result.message = '未找到登录态，请先运行 codesome auth login。'
    return result
  }

  try {
    const storageState = await readJson(account.storageStatePath)
    Object.assign(result, cookieSummary(storageState))
    result.logged_in = true
    result.message = '本地登录态存在。'
  } catch {
    result.logged_in = false
    result.message = '登录态文件损坏，请重新运行 codesome auth login。'
    return result
  }

  if (options.verify) {
    result.checked_remote = true
    try {
      const client = await createApiClient({ account: account.alias, baseUrl })
      await client.get('/auth/me')
      result.http_status = 200
      result.logged_in = true
      result.message = '远程校验通过。'
      await client.close()
    } catch (error) {
      result.logged_in = false
      result.http_status = error?.details?.status ?? null
      result.message = '远程校验未通过，请重新运行 codesome auth login。'
    }
  }

  if (configExists) {
    try {
      const config = await readJson(account.configPath)
      if (config.account_hint) result.account_hint = config.account_hint
      if (config.saved_at) result.saved_at = config.saved_at
    } catch {
      result.config_warning = '配置文件读取失败。'
    }
  }

  return result
}

export async function login(options = {}) {
  const account = await resolveAccountContext({ account: options.account, createIfMissing: true, baseUrl: options.baseUrl })
  const baseUrl = resolveBaseUrl(options.baseUrl || process.env.CODESOME_BASE_URL || account.baseUrl)
  const timeoutMs = Number(options.timeoutMs || DEFAULT_LOGIN_TIMEOUT_MS)
  await ensureDirs(account)

  console.log(`Opening Codesome account "${account.alias}": ${baseUrl}`)
  console.log('Please sign in in the Codesome-managed browser. The CLI will not read your password.')
  console.log('The session is saved automatically after login; do not press Enter.')

  const loginState = await loginWithSystemBrowser({ baseUrl, timeoutMs, accountAlias: account.alias })
  await writeJson(account.storageStatePath, loginState.storageState)
  const savedAt = new Date().toISOString()
  await writeJson(account.configPath, {
    account_alias: account.alias,
    base_url: baseUrl,
    saved_at: savedAt,
    final_url: loginState.final_url
  })
  await updateAccountRecord(account.alias, {
    base_url: baseUrl,
    saved_at: savedAt,
    final_url: loginState.final_url
  })
  const summary = cookieSummary(loginState.storageState)
  return {
    account_alias: account.alias,
    logged_in: true,
    session_path: account.storageStatePath,
    config_path: account.configPath,
    final_url: loginState.final_url,
    saved_at: savedAt,
    cookie_count: summary.cookie_count,
    origin_count: summary.origin_count,
    domains: summary.domains,
    message: 'Login session saved.'
  }
}

export async function logout(options = {}) {
  const account = await resolveAccountContext({ account: options.account, createIfMissing: !options.account })
  const removed = []
  for (const filePath of [account.storageStatePath, account.configPath]) {
    if (await exists(filePath)) {
      await fs.rm(filePath, { force: true })
      removed.push(filePath)
    }
  }
  return {
    account_alias: account.alias,
    logged_in: false,
    removed,
    message: removed.length ? '登录态已清理。' : '本地没有登录态。'
  }
}
