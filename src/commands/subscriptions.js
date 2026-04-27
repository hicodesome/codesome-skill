import { listActiveSubscriptions, listSubscriptions } from '../services/subscriptions.js'
import { hasFlag, printJson } from '../output/format.js'
import { accountJson, accountServiceOptions, printAccountLine, resolveCommandAccount } from './account-context.js'

function money(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '-'
  return `$${Number(value).toFixed(2)}`
}

function dateOnly(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('zh-CN')
}

function daysLeft(value) {
  if (!value) return '-'
  const diff = new Date(value).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

export async function handleSubscription(args) {
  const subcommand = args[0]
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printSubscriptionHelp()
    return
  }

  if (!['list', 'active'].includes(subcommand)) {
    console.error(`未知 subscription 命令：${subcommand}`)
    printSubscriptionHelp()
    process.exitCode = 2
    return
  }

  const json = hasFlag(args, '--json')
  const account = await resolveCommandAccount(args)
  const items = subcommand === 'active'
    ? await listActiveSubscriptions(accountServiceOptions(account))
    : await listSubscriptions(accountServiceOptions(account))
  if (json) {
    printJson({ account_context: accountJson(account), items })
    return
  }

  console.log(subcommand === 'active' ? 'Codesome 当前有效月卡/订阅' : 'Codesome 月卡/订阅列表')
  printAccountLine(account)
  console.log('')
  if (!items.length) {
    console.log('未找到订阅。')
    return
  }

  for (const item of items) {
    console.log(`- ${item.group.name || `Group #${item.group.id}`} (${item.group.platform || '-'})`)
    console.log(`  状态：${item.status}`)
    console.log(`  到期：${dateOnly(item.expires_at)}，剩余 ${daysLeft(item.expires_at)} 天`)
    if (item.group.daily_limit_usd) {
      console.log(`  每日：${money(item.usage.daily_usage_usd)} / ${money(item.group.daily_limit_usd)}，剩余 ${money(item.usage.daily_remaining_usd)}`)
    }
    if (item.group.weekly_limit_usd) {
      console.log(`  每周：${money(item.usage.weekly_usage_usd)} / ${money(item.group.weekly_limit_usd)}，剩余 ${money(item.usage.weekly_remaining_usd)}`)
    }
    if (item.group.monthly_limit_usd) {
      console.log(`  每月：${money(item.usage.monthly_usage_usd)} / ${money(item.group.monthly_limit_usd)}，剩余 ${money(item.usage.monthly_remaining_usd)}`)
    }
    console.log(`  倍率：${item.group.rate_multiplier ?? '-'}x`)
  }
}

export function printSubscriptionHelp() {
  console.log(`Codesome subscription commands

Usage:
  codesome subscription active [--account <alias>] [--json]
  codesome subscription list [--account <alias>] [--json]

Shows monthly-card/subscription packages, limits, usage, remaining quota, and expiry.
`)
}
