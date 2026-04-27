import { withApiClient } from '../api/client.js'

function normalizeGroup(group, rates = {}) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    platform: group.platform,
    status: group.status,
    subscription_type: group.subscription_type,
    rate_multiplier: rates[group.id] ?? group.rate_multiplier,
    default_rate_multiplier: group.rate_multiplier,
    is_exclusive: group.is_exclusive,
    daily_limit_usd: group.daily_limit_usd,
    weekly_limit_usd: group.weekly_limit_usd,
    monthly_limit_usd: group.monthly_limit_usd,
    claude_code_only: group.claude_code_only,
    allow_messages_dispatch: group.allow_messages_dispatch,
    require_oauth_only: group.require_oauth_only,
    require_privacy_set: group.require_privacy_set,
    rpm_limit: group.rpm_limit
  }
}

export async function listGroups(options = {}) {
  return withApiClient(options, async (client) => {
    const [groups, rates] = await Promise.allSettled([
      client.get('/groups/available'),
      client.get('/groups/rates')
    ])
    if (groups.status === 'rejected') throw groups.reason
    const rateMap = rates.status === 'fulfilled' ? rates.value || {} : {}
    return {
      items: (groups.value || []).map((group) => normalizeGroup(group, rateMap)),
      warnings: rates.status === 'rejected' ? ['group rates unavailable'] : []
    }
  })
}
