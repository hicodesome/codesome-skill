import fs from 'node:fs/promises'
import path from 'node:path'
import {
  ACCOUNTS_DIR,
  ACCOUNTS_INDEX_PATH,
  CONFIG_PATH,
  STORAGE_STATE_PATH,
  getAccountConfigPath,
  getAccountDir,
  getAccountSessionDir,
  getAccountStorageStatePath
} from '../config/paths.js'

export const DEFAULT_ACCOUNT_ALIAS = 'default'

function nowIso() {
  return new Date().toISOString()
}

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readJsonSafe(filePath) {
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

function emptyIndex() {
  return {
    version: 1,
    current: null,
    accounts: {}
  }
}

export function validateAccountAlias(value) {
  const alias = String(value || '').trim()
  if (!alias) throw new Error('账号别名不能为空。')
  if (alias.length > 64) throw new Error('账号别名不能超过 64 个字符。')
  if (alias === '.' || alias === '..' || alias.includes('..')) {
    throw new Error('账号别名不能包含路径穿越字符。')
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(alias)) {
    throw new Error('账号别名只能包含英文字母、数字、点号、下划线和短横线，且必须以字母或数字开头。')
  }
  return alias
}

function safeAccountPaths(alias) {
  const safeAlias = validateAccountAlias(alias)
  return {
    alias: safeAlias,
    dir: getAccountDir(safeAlias),
    sessionDir: getAccountSessionDir(safeAlias),
    storageStatePath: getAccountStorageStatePath(safeAlias),
    configPath: getAccountConfigPath(safeAlias)
  }
}

function assertInsideAccountsDir(targetPath) {
  const root = path.resolve(ACCOUNTS_DIR)
  const target = path.resolve(targetPath)
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error('账号路径解析异常，已取消操作。')
  }
}

function normalizeIndex(value) {
  const index = value && typeof value === 'object' ? value : emptyIndex()
  const normalized = {
    version: 1,
    current: typeof index.current === 'string' ? index.current : null,
    accounts: {}
  }
  for (const [alias, record] of Object.entries(index.accounts || {})) {
    try {
      const safeAlias = validateAccountAlias(alias)
      normalized.accounts[safeAlias] = {
        alias: safeAlias,
        created_at: record.created_at || nowIso(),
        updated_at: record.updated_at || record.created_at || nowIso(),
        base_url: record.base_url,
        saved_at: record.saved_at,
        final_url: record.final_url,
        migrated_from_legacy: Boolean(record.migrated_from_legacy)
      }
    } catch {
      // Ignore invalid records instead of trusting a malformed index.
    }
  }
  if (normalized.current && !normalized.accounts[normalized.current]) {
    normalized.current = null
  }
  return normalized
}

async function readIndex() {
  await fs.mkdir(ACCOUNTS_DIR, { recursive: true })
  return normalizeIndex(await readJsonSafe(ACCOUNTS_INDEX_PATH))
}

async function writeIndex(index) {
  await writeJson(ACCOUNTS_INDEX_PATH, normalizeIndex(index))
}

async function copyLegacyFile(sourcePath, targetPath) {
  if (!(await exists(sourcePath)) || await exists(targetPath)) return false
  await fs.mkdir(path.dirname(targetPath), { recursive: true })
  await fs.copyFile(sourcePath, targetPath)
  return true
}

async function migrateLegacyDefault(index) {
  const hasLegacySession = await exists(STORAGE_STATE_PATH)
  const hasLegacyConfig = await exists(CONFIG_PATH)
  if (!hasLegacySession && !hasLegacyConfig) return false
  if (index.accounts[DEFAULT_ACCOUNT_ALIAS]) return false

  const paths = safeAccountPaths(DEFAULT_ACCOUNT_ALIAS)
  const legacyConfig = await readJsonSafe(CONFIG_PATH)
  const timestamp = nowIso()
  await fs.mkdir(paths.sessionDir, { recursive: true })
  await copyLegacyFile(STORAGE_STATE_PATH, paths.storageStatePath)
  await copyLegacyFile(CONFIG_PATH, paths.configPath)
  index.accounts[DEFAULT_ACCOUNT_ALIAS] = {
    alias: DEFAULT_ACCOUNT_ALIAS,
    created_at: timestamp,
    updated_at: timestamp,
    base_url: legacyConfig?.base_url,
    saved_at: legacyConfig?.saved_at,
    final_url: legacyConfig?.final_url,
    migrated_from_legacy: true
  }
  if (!index.current) index.current = DEFAULT_ACCOUNT_ALIAS
  return true
}

export async function ensureAccountsIndex() {
  const index = await readIndex()
  let changed = await migrateLegacyDefault(index)
  if (!index.current && Object.keys(index.accounts).length) {
    index.current = Object.keys(index.accounts)[0]
    changed = true
  }
  if (changed) await writeIndex(index)
  return index
}

export async function listAccounts() {
  const index = await ensureAccountsIndex()
  const items = []
  for (const record of Object.values(index.accounts)) {
    const paths = safeAccountPaths(record.alias)
    items.push({
      alias: record.alias,
      current: record.alias === index.current,
      session_exists: await exists(paths.storageStatePath),
      session_path: paths.storageStatePath,
      config_path: paths.configPath,
      base_url: record.base_url,
      saved_at: record.saved_at,
      created_at: record.created_at,
      updated_at: record.updated_at,
      migrated_from_legacy: record.migrated_from_legacy
    })
  }
  return { current: index.current, items }
}

export async function addAccount(alias, options = {}) {
  const safeAlias = validateAccountAlias(alias)
  const index = await ensureAccountsIndex()
  if (index.accounts[safeAlias]) throw new Error(`账号已存在：${safeAlias}`)
  const timestamp = nowIso()
  const paths = safeAccountPaths(safeAlias)
  await fs.mkdir(paths.sessionDir, { recursive: true })
  index.accounts[safeAlias] = {
    alias: safeAlias,
    created_at: timestamp,
    updated_at: timestamp,
    base_url: options.baseUrl
  }
  if (options.makeCurrent || !index.current) index.current = safeAlias
  await writeIndex(index)
  return resolveAccountContext({ account: safeAlias, createIfMissing: false })
}

export async function switchAccount(alias) {
  const safeAlias = validateAccountAlias(alias)
  const index = await ensureAccountsIndex()
  if (!index.accounts[safeAlias]) throw new Error(`账号不存在：${safeAlias}`)
  index.current = safeAlias
  index.accounts[safeAlias].updated_at = nowIso()
  await writeIndex(index)
  return resolveAccountContext({ account: safeAlias, createIfMissing: false })
}

export async function renameAccount(oldAlias, newAlias) {
  const safeOld = validateAccountAlias(oldAlias)
  const safeNew = validateAccountAlias(newAlias)
  if (safeOld === safeNew) throw new Error('新旧账号别名相同。')
  const index = await ensureAccountsIndex()
  if (!index.accounts[safeOld]) throw new Error(`账号不存在：${safeOld}`)
  if (index.accounts[safeNew]) throw new Error(`账号已存在：${safeNew}`)

  const oldPaths = safeAccountPaths(safeOld)
  const newPaths = safeAccountPaths(safeNew)
  assertInsideAccountsDir(oldPaths.dir)
  assertInsideAccountsDir(newPaths.dir)
  if (await exists(newPaths.dir)) throw new Error(`账号目录已存在：${safeNew}`)
  if (await exists(oldPaths.dir)) {
    await fs.mkdir(ACCOUNTS_DIR, { recursive: true })
    await fs.rename(oldPaths.dir, newPaths.dir)
  }

  const record = index.accounts[safeOld]
  delete index.accounts[safeOld]
  index.accounts[safeNew] = {
    ...record,
    alias: safeNew,
    updated_at: nowIso()
  }
  if (index.current === safeOld) index.current = safeNew
  await writeIndex(index)
  return resolveAccountContext({ account: safeNew, createIfMissing: false })
}

export async function removeAccount(alias, options = {}) {
  const safeAlias = validateAccountAlias(alias)
  const index = await ensureAccountsIndex()
  const record = index.accounts[safeAlias]
  if (!record) throw new Error(`账号不存在：${safeAlias}`)
  const paths = safeAccountPaths(safeAlias)
  if (!options.confirm) {
    return {
      dry_run: true,
      requires_confirm: true,
      account: await accountSummary(safeAlias, record, index)
    }
  }

  assertInsideAccountsDir(paths.dir)
  await fs.rm(paths.dir, { recursive: true, force: true })
  delete index.accounts[safeAlias]
  if (index.current === safeAlias) {
    index.current = Object.keys(index.accounts)[0] || null
  }
  await writeIndex(index)
  return {
    deleted: true,
    account: {
      alias: safeAlias,
      session_path: paths.storageStatePath,
      config_path: paths.configPath
    },
    current: index.current
  }
}

async function accountSummary(alias, record, index) {
  const paths = safeAccountPaths(alias)
  return {
    alias,
    current: alias === index.current,
    session_exists: await exists(paths.storageStatePath),
    session_path: paths.storageStatePath,
    config_path: paths.configPath,
    base_url: record.base_url,
    saved_at: record.saved_at
  }
}

export async function resolveAccountContext(options = {}) {
  const requestedAlias = options.account || process.env.CODESOME_ACCOUNT
  const index = await ensureAccountsIndex()
  const hasAccounts = Object.keys(index.accounts).length > 0
  const alias = requestedAlias
    ? validateAccountAlias(requestedAlias)
    : index.current || DEFAULT_ACCOUNT_ALIAS

  if (!index.accounts[alias]) {
    if (!options.createIfMissing && (requestedAlias || hasAccounts)) {
      throw new Error(`账号不存在：${alias}`)
    }
    return addAccount(alias, { makeCurrent: !hasAccounts, baseUrl: options.baseUrl })
  }

  const paths = safeAccountPaths(alias)
  const config = await readJsonSafe(paths.configPath)
  const record = index.accounts[alias]
  return {
    alias,
    current: alias === index.current,
    storageStatePath: paths.storageStatePath,
    sessionPath: paths.storageStatePath,
    sessionDir: paths.sessionDir,
    configPath: paths.configPath,
    accountDir: paths.dir,
    baseUrl: options.baseUrl || config?.base_url || record.base_url,
    savedAt: config?.saved_at || record.saved_at,
    finalUrl: config?.final_url || record.final_url
  }
}

export async function updateAccountRecord(alias, changes = {}) {
  const safeAlias = validateAccountAlias(alias)
  const index = await ensureAccountsIndex()
  if (!index.accounts[safeAlias]) throw new Error(`账号不存在：${safeAlias}`)
  index.accounts[safeAlias] = {
    ...index.accounts[safeAlias],
    ...changes,
    alias: safeAlias,
    updated_at: nowIso()
  }
  if (!index.current) index.current = safeAlias
  await writeIndex(index)
  return index.accounts[safeAlias]
}
