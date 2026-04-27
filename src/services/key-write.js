import { withApiClient } from '../api/client.js'
import { maskApiKey } from '../output/redact.js'
import { resolveGroupId } from './group-resolver.js'

function normalizeCreatedKey(item) {
  return {
    id: item.id,
    name: item.name,
    key: item.key,
    masked_key: maskApiKey(item.key),
    group_id: item.group_id,
    status: item.status,
    ip_whitelist: Array.isArray(item.ip_whitelist) ? item.ip_whitelist : [],
    ip_blacklist: Array.isArray(item.ip_blacklist) ? item.ip_blacklist : [],
    quota: item.quota,
    quota_used: item.quota_used,
    expires_at: item.expires_at,
    created_at: item.created_at,
    rate_limit_5h: item.rate_limit_5h,
    rate_limit_1d: item.rate_limit_1d,
    rate_limit_7d: item.rate_limit_7d,
    group: item.group ? {
      id: item.group.id,
      name: item.group.name,
      platform: item.group.platform,
      subscription_type: item.group.subscription_type,
      rate_multiplier: item.group.rate_multiplier
    } : null
  }
}

function parseList(value) {
  if (!value) return []
  return String(value).split(',').map((item) => item.trim()).filter(Boolean)
}

export async function createKey(options = {}) {
  const name = String(options.name || '').trim()
  if (!name) throw new Error('必须指定 Key 名称：--name <name>。')

  const resolvedGroup = await resolveGroupId(options.groupId || options.group, options)
  const payload = {
    name,
    group_id: resolvedGroup.group_id
  }

  if (options.customKey) payload.custom_key = options.customKey
  const whitelist = parseList(options.ipWhitelist)
  const blacklist = parseList(options.ipBlacklist)
  if (whitelist.length) payload.ip_whitelist = whitelist
  if (blacklist.length) payload.ip_blacklist = blacklist
  if (Number(options.quota) > 0) payload.quota = Number(options.quota)
  if (Number(options.expiresInDays) > 0) payload.expires_in_days = Number(options.expiresInDays)
  if (Number(options.rateLimit5h) > 0) payload.rate_limit_5h = Number(options.rateLimit5h)
  if (Number(options.rateLimit1d) > 0) payload.rate_limit_1d = Number(options.rateLimit1d)
  if (Number(options.rateLimit7d) > 0) payload.rate_limit_7d = Number(options.rateLimit7d)

  return withApiClient(options, async (client) => {
    const created = await client.post('/keys', payload)
    return {
      key: normalizeCreatedKey(created),
      group_resolution: resolvedGroup
    }
  })
}
