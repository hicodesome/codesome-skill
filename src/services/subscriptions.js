import { withApiClient } from '../api/client.js'

function normalizeSubscription(item) {
  const group = item.group || {}
  return {
    id: item.id,
    status: item.status,
    starts_at: item.starts_at,
    expires_at: item.expires_at,
    group: {
      id: group.id,
      name: group.name,
      platform: group.platform,
      subscription_type: group.subscription_type,
      daily_limit_usd: group.daily_limit_usd,
      weekly_limit_usd: group.weekly_limit_usd,
      monthly_limit_usd: group.monthly_limit_usd,
      rate_multiplier: group.rate_multiplier,
      status: group.status
    },
    usage: {
      daily_usage_usd: item.daily_usage_usd,
      weekly_usage_usd: item.weekly_usage_usd,
      monthly_usage_usd: item.monthly_usage_usd,
      daily_remaining_usd: remaining(group.daily_limit_usd, item.daily_usage_usd),
      weekly_remaining_usd: remaining(group.weekly_limit_usd, item.weekly_usage_usd),
      monthly_remaining_usd: remaining(group.monthly_limit_usd, item.monthly_usage_usd)
    },
    windows: {
      daily_window_start: item.daily_window_start,
      weekly_window_start: item.weekly_window_start,
      monthly_window_start: item.monthly_window_start
    }
  }
}

function remaining(limit, used) {
  const numericLimit = Number(limit || 0)
  if (numericLimit <= 0) return null
  return Math.max(0, numericLimit - Number(used || 0))
}

export async function listSubscriptions(options = {}) {
  return withApiClient(options, async (client) => {
    const data = await client.get('/subscriptions')
    const items = Array.isArray(data) ? data : data?.items || []
    return items.map(normalizeSubscription)
  })
}

export async function listActiveSubscriptions(options = {}) {
  return withApiClient(options, async (client) => {
    const data = await client.get('/subscriptions/active')
    const items = Array.isArray(data) ? data : data?.items || []
    return items.map(normalizeSubscription)
  })
}
