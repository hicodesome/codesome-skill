import fs from 'node:fs/promises'
import path from 'node:path'
import {
  DEFAULT_BASE_URL,
  INSTANCES_DIR,
  INSTANCES_INDEX_PATH,
  getAccountDir,
  getInstanceAccountConfigPath,
  getInstanceAccountCredentialsPath,
  getInstanceAccountDir,
  getInstanceAccountsDir,
  getInstanceAccountsIndexPath,
  getInstanceAccountSessionDir,
  getInstanceAccountStorageStatePath,
  getInstanceDir,
  resolveBaseUrl
} from '../config/paths.js'
import {
  DEFAULT_ACCOUNT_ALIAS,
  resolveAccountContext,
  updateAccountRecord,
  validateAccountAlias
} from '../accounts/accounts.js'
import { DEV_INSECURE_BASE_URL_FLAG } from '../api/trusted-origin.js'

export const DEFAULT_INSTANCE_ID = 'codesome'
export const SUB2API_ADAPTER = 'sub2api'

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

function flagEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

export function validateInstanceId(value) {
  const id = String(value || '').trim()
  if (!id) throw new Error('实例名称不能为空。')
  if (id.length > 64) throw new Error('实例名称不能超过 64 个字符。')
  if (id === '.' || id === '..' || id.includes('..')) {
    throw new Error('实例名称不能包含路径穿越字符。')
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) {
    throw new Error('实例名称只能包含英文字母、数字、点号、下划线和短横线，且必须以字母或数字开头。')
  }
  return id
}

function normalizeInstanceRecord(id, record = {}) {
  const safeId = validateInstanceId(id)
  const timestamp = nowIso()
  const baseUrl = safeId === DEFAULT_INSTANCE_ID
    ? DEFAULT_BASE_URL
    : resolveBaseUrl(record.base_url)
  return {
    id: safeId,
    name: record.name || safeId,
    base_url: baseUrl,
    adapter: record.adapter || SUB2API_ADAPTER,
    trusted_at: record.trusted_at || timestamp,
    created_at: record.created_at || timestamp,
    updated_at: record.updated_at || record.created_at || timestamp
  }
}

function defaultInstanceRecord() {
  const timestamp = nowIso()
  return {
    id: DEFAULT_INSTANCE_ID,
    name: 'Codesome',
    base_url: DEFAULT_BASE_URL,
    adapter: SUB2API_ADAPTER,
    trusted_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp
  }
}

function emptyIndex() {
  const defaultRecord = defaultInstanceRecord()
  return {
    version: 1,
    current: DEFAULT_INSTANCE_ID,
    instances: {
      [DEFAULT_INSTANCE_ID]: defaultRecord
    }
  }
}

function normalizeIndex(value) {
  const raw = value && typeof value === 'object' ? value : {}
  const normalized = emptyIndex()
  if (typeof raw.current === 'string') normalized.current = raw.current
  for (const [id, record] of Object.entries(raw.instances || {})) {
    try {
      normalized.instances[validateInstanceId(id)] = normalizeInstanceRecord(id, record)
    } catch {
      // Ignore malformed records rather than trusting paths from disk.
    }
  }
  const existingDefault = normalized.instances[DEFAULT_INSTANCE_ID] || {}
  const fallbackDefault = defaultInstanceRecord()
  normalized.instances[DEFAULT_INSTANCE_ID] = {
    ...fallbackDefault,
    created_at: existingDefault.created_at || fallbackDefault.created_at,
    trusted_at: existingDefault.trusted_at || fallbackDefault.trusted_at,
    updated_at: existingDefault.updated_at || existingDefault.created_at || fallbackDefault.updated_at
  }
  if (!normalized.instances[normalized.current]) normalized.current = DEFAULT_INSTANCE_ID
  return normalized
}

async function readIndex() {
  await fs.mkdir(INSTANCES_DIR, { recursive: true })
  return normalizeIndex(await readJsonSafe(INSTANCES_INDEX_PATH))
}

async function writeIndex(index) {
  await writeJson(INSTANCES_INDEX_PATH, normalizeIndex(index))
}

function assertInstanceBaseUrlAllowed(baseUrl, env = process.env) {
  const normalized = resolveBaseUrl(baseUrl)
  let url
  try {
    url = new URL(normalized)
  } catch {
    throw new Error(`实例后台地址无效：${baseUrl}`)
  }
  if (url.username || url.password) throw new Error('实例后台地址不能包含用户名或密码。')
  const originBaseUrl = url.origin
  if (url.protocol === 'https:') return originBaseUrl
  if (url.protocol === 'http:' && isLoopbackHost(url.hostname) && flagEnabled(env[DEV_INSECURE_BASE_URL_FLAG])) {
    return originBaseUrl
  }
  throw new Error(`自定义 Sub2API 实例必须使用 HTTPS；本地 mock 需显式设置 ${DEV_INSECURE_BASE_URL_FLAG}=1。`)
}

function instanceOrigin(instance) {
  return new URL(resolveBaseUrl(instance.base_url)).origin
}

export async function ensureInstancesIndex() {
  const index = await readIndex()
  await writeIndex(index)
  return index
}

export async function listInstances() {
  const index = await ensureInstancesIndex()
  const items = Object.values(index.instances).map((item) => ({
    ...item,
    current: item.id === index.current,
    dir: item.id === DEFAULT_INSTANCE_ID ? null : getInstanceDir(item.id)
  }))
  return { current: index.current, items }
}

export async function addInstance(id, options = {}) {
  const safeId = validateInstanceId(id)
  if (safeId === DEFAULT_INSTANCE_ID) throw new Error(`内置实例已存在：${DEFAULT_INSTANCE_ID}`)
  const baseUrl = assertInstanceBaseUrlAllowed(options.baseUrl, options.env)
  const index = await ensureInstancesIndex()
  if (index.instances[safeId]) throw new Error(`实例已存在：${safeId}`)
  const timestamp = nowIso()
  index.instances[safeId] = {
    id: safeId,
    name: options.name || safeId,
    base_url: baseUrl,
    adapter: SUB2API_ADAPTER,
    trusted_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp
  }
  if (options.makeCurrent) index.current = safeId
  await writeIndex(index)
  return {
    ...index.instances[safeId],
    current: index.current === safeId,
    dir: getInstanceDir(safeId)
  }
}

export async function switchInstance(id) {
  const safeId = validateInstanceId(id)
  const index = await ensureInstancesIndex()
  const instance = index.instances[safeId]
  if (!instance) throw new Error(`实例不存在：${safeId}`)
  index.current = safeId
  instance.updated_at = nowIso()
  await writeIndex(index)
  return { ...instance, current: true, dir: safeId === DEFAULT_INSTANCE_ID ? null : getInstanceDir(safeId) }
}

export async function removeInstance(id, options = {}) {
  const safeId = validateInstanceId(id)
  if (safeId === DEFAULT_INSTANCE_ID) throw new Error('内置 Codesome 实例不能删除。')
  const index = await ensureInstancesIndex()
  const instance = index.instances[safeId]
  if (!instance) throw new Error(`实例不存在：${safeId}`)
  const dir = getInstanceDir(safeId)
  if (!options.confirm) {
    return {
      dry_run: true,
      requires_confirm: true,
      instance: { ...instance, dir }
    }
  }
  await assertInsideInstancesDir(dir)
  await fs.rm(dir, { recursive: true, force: true })
  delete index.instances[safeId]
  if (index.current === safeId) index.current = DEFAULT_INSTANCE_ID
  await writeIndex(index)
  return {
    deleted: true,
    instance: { ...instance, dir },
    current: index.current
  }
}

async function assertInsideInstancesDir(targetPath) {
  const root = path.resolve(INSTANCES_DIR)
  const target = path.resolve(targetPath)
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error('实例路径解析异常，已取消操作。')
  }
}

export async function resolveInstanceContext(options = {}) {
  const index = await ensureInstancesIndex()
  const requested = options.instance || process.env.CODESOME_INSTANCE || index.current || DEFAULT_INSTANCE_ID
  const safeId = validateInstanceId(requested)
  const instance = index.instances[safeId]
  if (!instance) throw new Error(`实例不存在：${safeId}。请先运行 codesome instance add ${safeId} --base-url <url>。`)
  return {
    ...instance,
    current: index.current === safeId,
    dir: safeId === DEFAULT_INSTANCE_ID ? null : getInstanceDir(safeId),
    trustedOrigins: safeId === DEFAULT_INSTANCE_ID ? [] : [instanceOrigin(instance)]
  }
}

function emptyAccountsIndex() {
  return {
    version: 1,
    current: null,
    accounts: {}
  }
}

function normalizeAccountsIndex(value) {
  const index = value && typeof value === 'object' ? value : emptyAccountsIndex()
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
        final_url: record.final_url
      }
    } catch {
      // Ignore malformed records.
    }
  }
  if (normalized.current && !normalized.accounts[normalized.current]) normalized.current = null
  return normalized
}

async function readInstanceAccountsIndex(instance) {
  await fs.mkdir(getInstanceAccountsDir(instance.id), { recursive: true })
  return normalizeAccountsIndex(await readJsonSafe(getInstanceAccountsIndexPath(instance.id)))
}

async function writeInstanceAccountsIndex(instance, index) {
  await writeJson(getInstanceAccountsIndexPath(instance.id), normalizeAccountsIndex(index))
}

function instanceAccountPaths(instance, alias) {
  const safeAlias = validateAccountAlias(alias)
  return {
    alias: safeAlias,
    dir: getInstanceAccountDir(instance.id, safeAlias),
    sessionDir: getInstanceAccountSessionDir(instance.id, safeAlias),
    storageStatePath: getInstanceAccountStorageStatePath(instance.id, safeAlias),
    credentialsPath: getInstanceAccountCredentialsPath(instance.id, safeAlias),
    configPath: getInstanceAccountConfigPath(instance.id, safeAlias),
    browserProfileDir: path.join(getInstanceAccountDir(instance.id, safeAlias), 'browser-profile')
  }
}

async function addInstanceAccount(instance, alias, options = {}) {
  const safeAlias = validateAccountAlias(alias)
  const index = await readInstanceAccountsIndex(instance)
  if (index.accounts[safeAlias]) throw new Error(`账号已存在：${safeAlias}`)
  const timestamp = nowIso()
  const paths = instanceAccountPaths(instance, safeAlias)
  await fs.mkdir(paths.sessionDir, { recursive: true })
  index.accounts[safeAlias] = {
    alias: safeAlias,
    created_at: timestamp,
    updated_at: timestamp,
    base_url: instance.base_url
  }
  if (options.makeCurrent || !index.current) index.current = safeAlias
  await writeInstanceAccountsIndex(instance, index)
  return resolveCustomInstanceAccountContext(instance, { account: safeAlias })
}

async function resolveCustomInstanceAccountContext(instance, options = {}) {
  const requestedAlias = options.account || process.env.CODESOME_ACCOUNT
  const index = await readInstanceAccountsIndex(instance)
  const hasAccounts = Object.keys(index.accounts).length > 0
  const alias = requestedAlias
    ? validateAccountAlias(requestedAlias)
    : index.current || DEFAULT_ACCOUNT_ALIAS

  if (!index.accounts[alias]) {
    if (!options.createIfMissing && (requestedAlias || hasAccounts)) {
      throw new Error(`账号不存在：${alias}`)
    }
    return addInstanceAccount(instance, alias, { makeCurrent: !hasAccounts })
  }

  const paths = instanceAccountPaths(instance, alias)
  const config = await readJsonSafe(paths.configPath)
  const record = index.accounts[alias]
  return decorateAccountContext({
    alias,
    current: alias === index.current,
    storageStatePath: paths.storageStatePath,
    sessionPath: paths.storageStatePath,
    sessionDir: paths.sessionDir,
    credentialsPath: paths.credentialsPath,
    configPath: paths.configPath,
    accountDir: paths.dir,
    browserProfileDir: paths.browserProfileDir,
    baseUrl: instance.base_url,
    savedAt: config?.saved_at || record.saved_at,
    finalUrl: config?.final_url || record.final_url
  }, instance)
}

function decorateAccountContext(account, instance) {
  return {
    ...account,
    instance,
    instance_id: instance.id,
    instance_name: instance.name,
    instance_current: instance.current,
    instance_base_url: instance.base_url,
    baseUrl: instance.id === DEFAULT_INSTANCE_ID ? account.baseUrl || instance.base_url : instance.base_url,
    trustedOrigins: instance.trustedOrigins || [],
    browserProfileDir: account.browserProfileDir || path.join(getAccountDir(account.alias), 'browser-profile'),
    browserPortAlias: instance.id === DEFAULT_INSTANCE_ID ? account.alias : `${instance.id}:${account.alias}`
  }
}

export async function resolveInstanceAccountContext(options = {}) {
  const instance = await resolveInstanceContext({ instance: options.instance })
  if (instance.id === DEFAULT_INSTANCE_ID) {
    const account = await resolveAccountContext({
      account: options.account,
      createIfMissing: options.createIfMissing,
      baseUrl: options.baseUrl
    })
    return decorateAccountContext(account, {
      ...instance,
      base_url: options.baseUrl || account.baseUrl || process.env.CODESOME_BASE_URL || instance.base_url
    })
  }
  return resolveCustomInstanceAccountContext(instance, options)
}

export async function updateResolvedAccountRecord(accountContext, changes = {}) {
  if (accountContext.instance_id === DEFAULT_INSTANCE_ID) {
    return updateAccountRecord(accountContext.alias, changes)
  }
  const instance = accountContext.instance
  const index = await readInstanceAccountsIndex(instance)
  if (!index.accounts[accountContext.alias]) throw new Error(`账号不存在：${accountContext.alias}`)
  index.accounts[accountContext.alias] = {
    ...index.accounts[accountContext.alias],
    ...changes,
    alias: accountContext.alias,
    base_url: instance.base_url,
    updated_at: nowIso()
  }
  if (!index.current) index.current = accountContext.alias
  await writeInstanceAccountsIndex(instance, index)
  return index.accounts[accountContext.alias]
}
