import { withApiClient } from '../api/client.js'
import { maskApiKey } from '../output/redact.js'

function normalizeList(value) {
  return Array.isArray(value) ? value : []
}

function normalizeKey(item) {
  const group = item.group || {}
  const maskedKey = maskApiKey(item.key)
  return {
    id: item.id,
    name: item.name,
    key: maskedKey,
    masked_key: maskedKey,
    group: group.name ? {
      id: group.id,
      name: group.name,
      platform: group.platform,
      subscription_type: group.subscription_type,
      rate_multiplier: group.rate_multiplier,
      status: group.status
    } : null,
    group_id: item.group_id,
    status: item.status,
    ip_whitelist: normalizeList(item.ip_whitelist),
    ip_blacklist: normalizeList(item.ip_blacklist),
    quota: item.quota,
    quota_used: item.quota_used,
    expires_at: item.expires_at,
    last_used_at: item.last_used_at,
    created_at: item.created_at,
    updated_at: item.updated_at,
    rate_limit_5h: item.rate_limit_5h,
    rate_limit_1d: item.rate_limit_1d,
    rate_limit_7d: item.rate_limit_7d,
    usage_5h: item.usage_5h,
    usage_1d: item.usage_1d,
    usage_7d: item.usage_7d,
    reset_5h_at: item.reset_5h_at,
    reset_1d_at: item.reset_1d_at,
    reset_7d_at: item.reset_7d_at,
    usage: {
      usage_5h: item.usage_5h,
      usage_1d: item.usage_1d,
      usage_7d: item.usage_7d,
      rate_limit_5h: item.rate_limit_5h,
      rate_limit_1d: item.rate_limit_1d,
      rate_limit_7d: item.rate_limit_7d
    }
  }
}

export function normalizeKeyForOutput(item) {
  return normalizeKey(item)
}

export async function listKeys(options = {}) {
  return withApiClient(options, async (client) => {
    const data = await client.get('/keys', {
      page: options.page || 1,
      page_size: options.pageSize || 20,
      sort_by: options.sortBy || 'created_at',
      sort_order: options.sortOrder || 'desc',
      search: options.search,
      status: options.status,
      group_id: options.groupId
    })
    return {
      page: data.page,
      page_size: data.page_size,
      total: data.total,
      items: (data.items || []).map(normalizeKey)
    }
  })
}
