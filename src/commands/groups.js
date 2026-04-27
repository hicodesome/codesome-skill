import { listGroups } from '../services/groups.js'
import { getOption, hasFlag, printJson } from '../output/format.js'

function moneyLimit(value) {
  const numeric = Number(value || 0)
  return numeric > 0 ? `$${numeric.toFixed(2)}` : '-'
}

export async function handleGroup(args) {
  const subcommand = args[0]
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printGroupHelp()
    return
  }

  if (subcommand !== 'list') {
    console.error(`未知 group 命令：${subcommand}`)
    printGroupHelp()
    process.exitCode = 2
    return
  }

  const json = hasFlag(args, '--json')
  const platform = getOption(args, '--platform')
  const type = getOption(args, '--type')
  const data = await listGroups()
  let items = data.items
  if (platform) items = items.filter((item) => item.platform === platform)
  if (type) items = items.filter((item) => item.subscription_type === type)

  if (json) {
    printJson({ items, warnings: data.warnings })
    return
  }

  console.log(`Codesome 可用分组（${items.length}）`)
  console.log('')
  for (const item of items) {
    const typeLabel = item.subscription_type === 'subscription' ? '订阅/月卡' : '按量/标准'
    console.log(`- ${item.name}`)
    console.log(`  平台：${item.platform} | 类型：${typeLabel} | 状态：${item.status}`)
    console.log(`  倍率：${item.rate_multiplier ?? '-'}x | 专属：${item.is_exclusive ? '是' : '否'}`)
    console.log(`  限额：每日 ${moneyLimit(item.daily_limit_usd)} / 每周 ${moneyLimit(item.weekly_limit_usd)} / 每月 ${moneyLimit(item.monthly_limit_usd)}`)
    if (item.description) console.log(`  说明：${item.description}`)
  }
}

export function printGroupHelp() {
  console.log(`Codesome group commands

Usage:
  codesome group list [--platform anthropic|openai|gemini|antigravity] [--type standard|subscription] [--json]

Shows available groups for the current user without exposing internal routing details.
`)
}
