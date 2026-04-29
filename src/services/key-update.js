import { withApiClient } from '../api/client.js'
import { resolveGroupId } from './group-resolver.js'
import { listKeys, normalizeKeyForOutput } from './keys.js'

const STATUS_VALUES = new Set(['active', 'inactive'])

function hasValue(value) {
  return value !== undefined && value !== null
}

function parseUsd(value, label) {
  if (!hasValue(value)) return undefined
  const amount = Number(String(value).trim())
  if (!Number.isFinite(amount) || amount < 0) throw new Error(`${label} 必须是大于等于 0 的数字。`)
  return amount
}

function parsePositiveInteger(value, label) {
  if (!hasValue(value)) return undefined
  const amount = Number(String(value).trim())
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`${label} 必须是正整数。`)
  return amount
}

function parseList(value) {
  if (!hasValue(value)) return undefined
  return String(value).split(/[,\n]/).map((item) => item.trim()).filter(Boolean)
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : []
}

function formatGroup(key) {
  if (key.group?.name) return { id: key.group.id, name: key.group.name }
  if (key.group_id !== undefined && key.group_id !== null) return { id: key.group_id, name: null }
  return null
}

function addChange(changes, field, label, before, after) {
  changes.push({ field, label, before, after })
}

function parseExpiresAt(options) {
  if (options.clearExpiresAt) return ''
  if (hasValue(options.expiresAt)) {
    const raw = String(options.expiresAt).trim()
    if (!raw || ['none', 'never', 'null', 'clear'].includes(raw.toLowerCase())) return ''
    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) throw new Error('--expires-at 必须是有效时间，或使用 none/never/clear 清空。')
    return parsed.toISOString()
  }

  const days = parsePositiveInteger(options.expiresInDays, '--expires-in-days')
  if (days === undefined) return undefined
  return new Date(Date.now() + days * 86400000).toISOString()
}

async function buildUpdatePlan(key, options = {}) {
  const payload = {}
  const changes = []
  let groupResolution = null

  if (hasValue(options.newName)) {
    const name = String(options.newName).trim()
    if (!name) throw new Error('--new-name 不能为空。')
    payload.name = name
    addChange(changes, 'name', '名称', key.name, name)
  }

  if (hasValue(options.status)) {
    const status = String(options.status).trim()
    if (!STATUS_VALUES.has(status)) throw new Error('--status 只支持 active 或 inactive。')
    payload.status = status
    addChange(changes, 'status', '状态', key.status, status)
  }

  if (hasValue(options.group) || hasValue(options.groupId)) {
    groupResolution = await resolveGroupId(options.groupId || options.group, options)
    payload.group_id = groupResolution.group_id
    addChange(changes, 'group', '分组', formatGroup(key), groupResolution.group ? {
      id: groupResolution.group.id,
      name: groupResolution.group.name
    } : {
      id: groupResolution.group_id,
      name: null
    })
  }

  const quota = parseUsd(options.quota, '--quota')
  if (quota !== undefined) {
    payload.quota = quota
    addChange(changes, 'quota', '限额', key.quota ?? 0, quota)
  }

  const expiresAt = parseExpiresAt(options)
  if (expiresAt !== undefined) {
    payload.expires_at = expiresAt
    addChange(changes, 'expires_at', '过期时间', key.expires_at || null, expiresAt || null)
  }

  const rateLimit5h = parseUsd(options.rateLimit5h, '--rate-limit-5h')
  if (rateLimit5h !== undefined) {
    payload.rate_limit_5h = rateLimit5h
    addChange(changes, 'rate_limit_5h', '5 小时速率限制', key.rate_limit_5h ?? 0, rateLimit5h)
  }

  const rateLimit1d = parseUsd(options.rateLimit1d, '--rate-limit-1d')
  if (rateLimit1d !== undefined) {
    payload.rate_limit_1d = rateLimit1d
    addChange(changes, 'rate_limit_1d', '1 天速率限制', key.rate_limit_1d ?? 0, rateLimit1d)
  }

  const rateLimit7d = parseUsd(options.rateLimit7d, '--rate-limit-7d')
  if (rateLimit7d !== undefined) {
    payload.rate_limit_7d = rateLimit7d
    addChange(changes, 'rate_limit_7d', '7 天速率限制', key.rate_limit_7d ?? 0, rateLimit7d)
  }

  const whitelist = options.clearIpWhitelist ? [] : parseList(options.ipWhitelist)
  if (whitelist !== undefined) {
    payload.ip_whitelist = whitelist
    addChange(changes, 'ip_whitelist', 'IP 白名单', normalizeArray(key.ip_whitelist), whitelist)
  }

  const blacklist = options.clearIpBlacklist ? [] : parseList(options.ipBlacklist)
  if (blacklist !== undefined) {
    payload.ip_blacklist = blacklist
    addChange(changes, 'ip_blacklist', 'IP 黑名单', normalizeArray(key.ip_blacklist), blacklist)
  }

  if (options.resetQuotaUsed) {
    payload.reset_quota = true
    addChange(changes, 'quota_used', '已用限额', key.quota_used ?? 0, 0)
  }

  if (options.resetRateLimitUsage) {
    payload.reset_rate_limit_usage = true
    addChange(changes, 'rate_limit_usage', '速率窗口用量', {
      usage_5h: key.usage_5h ?? key.usage?.usage_5h ?? 0,
      usage_1d: key.usage_1d ?? key.usage?.usage_1d ?? 0,
      usage_7d: key.usage_7d ?? key.usage?.usage_7d ?? 0
    }, {
      usage_5h: 0,
      usage_1d: 0,
      usage_7d: 0
    })
  }

  if (!Object.keys(payload).length) {
    throw new Error('没有要更新的字段。可用：--new-name、--group、--status、--quota、--expires-at、--expires-in-days、--rate-limit-5h、--rate-limit-1d、--rate-limit-7d、--ip-whitelist、--ip-blacklist。')
  }

  const target = {
    ...key,
    name: payload.name ?? key.name,
    group_id: payload.group_id ?? key.group_id,
    group: groupResolution?.group || key.group,
    status: payload.status ?? key.status,
    ip_whitelist: payload.ip_whitelist ?? key.ip_whitelist,
    ip_blacklist: payload.ip_blacklist ?? key.ip_blacklist,
    quota: payload.quota ?? key.quota,
    quota_used: payload.reset_quota ? 0 : key.quota_used,
    expires_at: Object.prototype.hasOwnProperty.call(payload, 'expires_at') ? payload.expires_at || null : key.expires_at,
    rate_limit_5h: payload.rate_limit_5h ?? key.rate_limit_5h,
    rate_limit_1d: payload.rate_limit_1d ?? key.rate_limit_1d,
    rate_limit_7d: payload.rate_limit_7d ?? key.rate_limit_7d,
    usage_5h: payload.reset_rate_limit_usage ? 0 : key.usage_5h,
    usage_1d: payload.reset_rate_limit_usage ? 0 : key.usage_1d,
    usage_7d: payload.reset_rate_limit_usage ? 0 : key.usage_7d
  }

  return { payload, changes, target, groupResolution }
}

export async function findKeyByName(name, options = {}) {
  const query = String(name || '').trim()
  if (!query) throw new Error('必须指定 Key 名称：--name <name>。')
  const data = await listKeys({
    ...options,
    pageSize: 100,
    search: query
  })
  const exact = data.items.filter((item) => item.name === query)
  if (exact.length === 1) return exact[0]
  if (exact.length > 1) throw new Error(`找到多个同名 Key：${query}。请使用 --id。`)
  if (data.items.length === 1) return data.items[0]
  if (data.items.length > 1) {
    throw new Error(`Key 名称不唯一，请更精确。候选：${data.items.map((item) => item.name).join(', ')}`)
  }
  throw new Error(`找不到 Key：${query}`)
}

export async function findKeyById(id, options = {}) {
  const keyId = Number(id)
  if (!Number.isInteger(keyId) || keyId <= 0) throw new Error('--id 必须是正整数。')
  const pageSize = 100
  let page = 1
  while (true) {
    const data = await listKeys({ ...options, page, pageSize })
    const match = data.items.find((item) => Number(item.id) === keyId)
    if (match) return match
    if (!data.items.length || data.items.length < pageSize || page * pageSize >= Number(data.total || 0)) break
    page += 1
    if (page > 300) throw new Error('Key 列表分页超过安全上限，已停止。')
  }
  throw new Error(`找不到 Key ID：${keyId}`)
}

export async function getKeyDetails(options = {}) {
  if (options.id) return findKeyById(options.id, options)
  return findKeyByName(options.name, options)
}

export async function previewUpdateKey(options = {}) {
  const key = await getKeyDetails(options)
  const plan = await buildUpdatePlan(key, options)
  return {
    dry_run: true,
    requires_confirm: true,
    before: key,
    target: plan.target,
    changes: plan.changes,
    payload: plan.payload,
    group_resolution: plan.groupResolution
  }
}

export async function updateKey(options = {}) {
  const preview = await previewUpdateKey(options)
  return withApiClient(options, async (client) => {
    const updated = await client.put(`/keys/${preview.before.id}`, preview.payload)
    return {
      dry_run: false,
      updated: true,
      before: preview.before,
      target: preview.target,
      after: normalizeKeyForOutput(updated),
      changes: preview.changes,
      payload: preview.payload,
      group_resolution: preview.group_resolution
    }
  })
}
