import { applyRedeem, listRedeemHistory, previewRedeem } from '../services/redeem.js'
import { AUTO_SYNC_RECHARGE_DELAY_TEXT, refreshNow } from '../services/auto-sync.js'
import { getOption, hasFlag, printJson } from '../output/format.js'
import { accountJson, accountServiceOptions, printAccountLine, resolveCommandAccount } from './account-context.js'

function money(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '-'
  return `$${Number(value).toFixed(2)}`
}

function dateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN')
}

function isAdminAdjustment(type) {
  return type === 'admin_balance' || type === 'admin_concurrency'
}

function formatValue(item) {
  if (item.type === 'balance' || item.type === 'admin_balance') {
    const sign = Number(item.value) >= 0 ? '+' : ''
    return `${sign}${money(item.value)}`
  }
  if (item.type === 'subscription') {
    const days = item.validity_days ?? Math.round(Number(item.value || 0))
    const group = item.group?.name ? ` ${item.group.name}` : ''
    return `${days} 天${group}`
  }
  if (item.value === undefined || item.value === null) return '-'
  const sign = Number(item.value) >= 0 ? '+' : ''
  return `${sign}${item.value} 并发`
}

function printRedeemItem(item) {
  if (item.message) console.log(`消息：${item.message}`)
  console.log(`兑换码：${isAdminAdjustment(item.type) ? '管理员调整' : item.code}`)
  console.log(`类型：${item.type || '-'}`)
  console.log(`面值：${formatValue(item)}`)
  console.log(`状态：${item.status || '-'}`)
  console.log(`使用时间：${dateTime(item.used_at)}`)
  if (item.created_at) console.log(`创建时间：${dateTime(item.created_at)}`)
  if (item.group?.name) console.log(`分组：${item.group.name}`)
  if (item.validity_days !== undefined) console.log(`有效天数：${item.validity_days}`)
  if (item.new_balance !== undefined) console.log(`新余额：${money(item.new_balance)}`)
  if (item.new_concurrency !== undefined) console.log(`新并发：${item.new_concurrency}`)
  if (item.notes) console.log(`备注：${item.notes}`)
}

export async function handleRedeem(args) {
  const subcommand = args[0]
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printRedeemHelp()
    return
  }

  if (subcommand === 'apply') {
    if (hasFlag(args, '--help') || hasFlag(args, '-h')) {
      printRedeemApplyHelp()
      return
    }
    await handleRedeemApply(args.slice(1))
    return
  }

  if (subcommand === 'history') {
    if (hasFlag(args, '--help') || hasFlag(args, '-h')) {
      printRedeemHistoryHelp()
      return
    }
    await handleRedeemHistory(args.slice(1))
    return
  }

  console.error(`未知 redeem 命令：${subcommand}`)
  printRedeemHelp()
  process.exitCode = 2
}

async function handleRedeemApply(args) {
  const json = hasFlag(args, '--json')
  const confirm = hasFlag(args, '--confirm')
  const code = getOption(args, '--code')
  if (!String(code || '').trim()) {
    console.error('必须指定兑换码：--code <code>。')
    process.exitCode = 2
    return
  }

  const options = {
    baseUrl: getOption(args, '--base-url'),
    code
  }
  const preview = previewRedeem(options)
  const account = preview.action === 'aio_key_detected'
    ? null
    : await resolveCommandAccount(args)
  Object.assign(options, account ? accountServiceOptions(account) : {})
  const result = confirm ? await applyRedeem(options) : previewRedeem(options)
  const syncStatus = confirm && result.action === 'redeemed' ? await refreshNow(options) : null

  if (json) {
    printJson({ account: account ? accountJson(account) : null, sync: syncStatus, ...result })
    return
  }

  if (result.action === 'aio_key_detected') {
    console.log('Codesome AIO Key 识别')
    console.log('')
    console.log(`Key：${result.code}`)
    console.log(result.message)
    console.log(`Claude Code Base URL：${result.base_urls.claude_code_base_url}`)
    console.log(`Codex Base URL：${result.base_urls.codex_base_url}`)
    console.log(`用量查询：${result.sites.api_stats_url}`)
    return
  }

  if (!confirm) {
    console.log('Codesome 兑换预检')
    printAccountLine(account)
    console.log('')
    console.log(`兑换码：${result.code}`)
    console.log('本次未兑换。确认执行请追加 --confirm。')
    return
  }

  console.log('Codesome 兑换成功')
  printAccountLine(account)
  console.log('')
  printRedeemItem(result.redeem)
  console.log('')
  console.log(`状态同步：已触发刷新。充值后${AUTO_SYNC_RECHARGE_DELAY_TEXT}`)
  console.log('兜底刷新：codesome balance show --refresh')
}

async function handleRedeemHistory(args) {
  const json = hasFlag(args, '--json')
  const account = await resolveCommandAccount(args)
  const items = await listRedeemHistory({
    ...accountServiceOptions(account),
    baseUrl: getOption(args, '--base-url')
  })

  if (json) {
    printJson({ account: accountJson(account), items })
    return
  }

  console.log('Codesome 兑换记录')
  printAccountLine(account)
  console.log('')
  if (!items.length) {
    console.log('暂无兑换记录。')
    return
  }
  for (const item of items) {
    const code = isAdminAdjustment(item.type) ? '管理员调整' : item.code
    console.log(`- ${item.type || '-'} ${formatValue(item)} ${item.status || '-'} ${dateTime(item.used_at)}`)
    console.log(`  兑换码：${code || '-'}`)
    if (item.group?.name) console.log(`  分组：${item.group.name}`)
    if (item.notes) console.log(`  备注：${item.notes}`)
  }
}

export function printRedeemHelp() {
  console.log(`Codesome redeem commands

Usage:
  codesome redeem apply --code <code> [--account <alias>] [--json]
  codesome redeem apply --code <code> --confirm [--account <alias>] [--json]
  codesome redeem history [--account <alias>] [--json]

Redeems Codesome redemption codes and shows redemption history. Apply runs as a dry-run preview unless --confirm is provided.
AIO cr_ keys are API keys and do not need redeeming; the CLI detects them without calling the redeem endpoint.
Output always masks redemption codes.
`)
}

function printRedeemApplyHelp() {
  console.log(`Codesome redeem apply

Usage:
  codesome redeem apply --code <code> [--account <alias>] [--json]
  codesome redeem apply --code <code> --confirm [--account <alias>] [--json]

Without --confirm, this only previews the operation and does not call the redeem endpoint.
AIO cr_ keys are API keys and do not need redeeming; even with --confirm, no redeem write is performed.
`)
}

function printRedeemHistoryHelp() {
  console.log(`Codesome redeem history

Usage:
  codesome redeem history [--account <alias>] [--json]

Shows recent redemption history. Output always masks redemption codes.
`)
}
