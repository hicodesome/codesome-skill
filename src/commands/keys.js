import { listKeys } from '../services/keys.js'
import { getOption, hasFlag, printJson } from '../output/format.js'
import { handleKeyCreate, printKeyCreateHelp } from './key-create.js'
import { handleKeyDelete, printKeyDeleteHelp } from './key-delete.js'
import { handleKeyShow, handleKeySwitchGroup, handleKeyUpdate, printKeyUpdateHelp } from './key-update.js'
import { accountJson, accountServiceOptions, printAccountLine, resolveCommandAccount } from './account-context.js'

function positiveIntegerOption(args, names, fallback) {
  for (const name of names) {
    const value = getOption(args, name)
    if (value !== undefined) {
      const parsed = Number(String(value).trim())
      if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} 必须是正整数。`)
      return parsed
    }
  }
  return fallback
}

function money(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '-'
  return `$${Number(value).toFixed(4)}`
}

function dateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN')
}

export async function handleKey(args) {
  const subcommand = args[0]
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printKeyHelp()
    return
  }

  if (subcommand === 'show' || subcommand === 'update' || subcommand === 'switch-group') {
    if (hasFlag(args, '--help') || hasFlag(args, '-h')) {
      printKeyUpdateHelp()
      return
    }
    if (subcommand === 'show') await handleKeyShow(args.slice(1))
    else if (subcommand === 'switch-group') await handleKeySwitchGroup(args.slice(1))
    else await handleKeyUpdate(args.slice(1))
    return
  }

  if (subcommand === 'create') {
    if (hasFlag(args, '--help') || hasFlag(args, '-h')) {
      printKeyCreateHelp()
      return
    }
    await handleKeyCreate(args.slice(1))
    return
  }

  if (subcommand === 'delete') {
    if (hasFlag(args, '--help') || hasFlag(args, '-h')) {
      printKeyDeleteHelp()
      return
    }
    await handleKeyDelete(args.slice(1))
    return
  }

  if (subcommand !== 'list') {
    console.error(`未知或尚未实现 key 命令：${subcommand}`)
    printKeyHelp()
    process.exitCode = 2
    return
  }

  const json = hasFlag(args, '--json')
  const account = await resolveCommandAccount(args)
  const page = positiveIntegerOption(args, ['--page'], 1)
  const pageSize = positiveIntegerOption(args, ['--page-size', '--limit'], 20)
  const data = await listKeys({
    ...accountServiceOptions(account),
    page,
    pageSize,
    search: getOption(args, '--search'),
    status: getOption(args, '--status'),
    groupId: getOption(args, '--group-id')
  })

  if (json) {
    printJson({ account_context: accountJson(account), ...data })
    return
  }

  console.log(`Codesome API Key 列表（${data.total ?? data.items.length}）`)
  printAccountLine(account)
  console.log('')
  if (!data.items.length) {
    console.log('没有 API Key。')
    return
  }
  for (const item of data.items) {
    const group = item.group?.name || `Group #${item.group_id || '-'}`
    const type = item.group?.subscription_type === 'subscription' ? '订阅' : `${item.group?.rate_multiplier ?? '-'}x`
    console.log(`- ${item.name}`)
    console.log(`  Key：${item.key}`)
    console.log(`  分组：${group} (${type})`)
    console.log(`  状态：${item.status}`)
    console.log(`  配额：${item.quota ? `${money(item.quota_used)} / ${money(item.quota)}` : '无限制'}`)
    console.log(`  最近使用：${dateTime(item.last_used_at)}`)
    console.log(`  创建时间：${dateTime(item.created_at)}`)
  }
}

export function printKeyHelp() {
  console.log(`Codesome key commands

Usage:
  codesome key list [--account <alias>] [--page 1] [--page-size 20] [--limit 20] [--search <text>] [--status active|inactive] [--json]
  codesome key show [--account <alias>] --name <name> [--group-id <id>] [--json]
  codesome key create [--account <alias>] --name <name> --group <group-name>
  codesome key update [--account <alias>] --name <name> --quota <usd> --confirm
  codesome key update [--account <alias>] --name <name> --expires-at <iso|none> --confirm
  codesome key update [--account <alias>] --name <name> --rate-limit-5h <usd> --rate-limit-1d <usd> --rate-limit-7d <usd> --confirm
  codesome key update [--account <alias>] --name <name> --ip-whitelist <a,b> --ip-blacklist <a,b> --confirm
  codesome key switch-group [--account <alias>] --name <name> --group <group-name> --confirm
  codesome key delete [--account <alias>] --name <name> [--confirm]

Shows, creates, updates, or deletes API keys. Output always masks key values.
`)
}
