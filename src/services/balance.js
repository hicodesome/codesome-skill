import { withApiClient } from '../api/client.js'

export async function getBalance(options = {}) {
  return withApiClient(options, async (client) => {
    const [profile, dashboardStats] = await Promise.allSettled([
      client.get('/auth/me'),
      client.get('/usage/dashboard/stats')
    ])

    if (profile.status === 'rejected') throw profile.reason

    const user = profile.value
    const stats = dashboardStats.status === 'fulfilled' ? dashboardStats.value : null

    return {
      account: {
        id: user.id,
        email: user.email,
        username: user.username,
        status: user.status,
        balance: user.balance,
        total_recharged: user.total_recharged,
        concurrency: user.concurrency,
        rpm_limit: user.rpm_limit
      },
      usage: stats ? {
        today_cost: stats.today_cost,
        today_actual_cost: stats.today_actual_cost,
        total_cost: stats.total_cost,
        total_actual_cost: stats.total_actual_cost,
        today_requests: stats.today_requests,
        total_requests: stats.total_requests,
        rpm: stats.rpm,
        tpm: stats.tpm
      } : null,
      warnings: dashboardStats.status === 'rejected' ? ['usage dashboard stats unavailable'] : []
    }
  })
}
