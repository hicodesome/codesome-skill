import { getKeyUsage, getRecentUsage, getUsageStats } from '../services/usage.js'
import { getOption, hasFlag, printJson } from '../output/format.js'
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

function compactNumber(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '-'
  return Number(value).toLocaleString('en-US')
}

function dateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN')
}

export async function handleUsage(args) {
  const subcommand = args[0]
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printUsageHelp()
    return
  }

  const json = hasFlag(args, '--json')
  const account = await resolveCommandAccount(args)
  const serviceOptions = accountServiceOptions(account)
  const days = getOption(args, '--days') || 7
  const startDate = getOption(args, '--start-date')
  const endDate = getOption(args, '--end-date')

  if (subcommand === 'stats') {
    const data = await getUsageStats({ ...serviceOptions, days, startDate, endDate })
    if (json) {
      printJson({ account_context: accountJson(account), ...data })
      return
    }
    printStats(data, account)
    return
  }

  if (subcommand === 'recent') {
    const data = await getRecentUsage({
      ...serviceOptions,
      days,
      startDate,
      endDate,
      page: positiveIntegerOption(args, ['--page'], 1),
      pageSize: positiveIntegerOption(args, ['--page-size', '--limit'], 10)
    })
    if (json) {
      printJson({ account_context: accountJson(account), ...data })
      return
    }
    printRecent(data, account)
    return
  }

  if (subcommand === 'key') {
    const data = await getKeyUsage({
      ...serviceOptions,
      name: getOption(args, '--name'),
      days: getOption(args, '--days') || 30,
      startDate,
      endDate,
      recentLimit: positiveIntegerOption(args, ['--recent-limit'], 5),
      scanPageSize: positiveIntegerOption(args, ['--scan-page-size'], 500)
    })
    if (json) {
      printJson({ account_context: accountJson(account), ...data })
      return
    }
    printKeyUsage(data, account)
    return
  }

  console.error(`未知 usage 命令：${subcommand}`)
  printUsageHelp()
  process.exitCode = 2
}

function printStats(data, account) {
  const stats = data.stats || {}
  console.log(`Codesome 用量统计 (${data.range.start_date} ~ ${data.range.end_date})`)
  printAccountLine(account)
  console.log('')
  console.log(`总请求数：${compactNumber(stats.total_requests ?? stats.total_count ?? stats.requests)}`)
  console.log(`总 Token：${compactNumber(stats.total_tokens)}`)
  console.log(`输入 Token：${compactNumber(stats.input_tokens)}`)
  console.log(`输出 Token：${compactNumber(stats.output_tokens)}`)
  console.log(`总消费：${money(stats.total_actual_cost ?? stats.actual_cost)} 实际 / ${money(stats.total_cost ?? stats.cost)} 标准`)
  if (stats.avg_duration_ms || stats.average_duration_ms) {
    console.log(`平均耗时：${Number(stats.avg_duration_ms ?? stats.average_duration_ms).toFixed(0)}ms`)
  }
}

function printRecent(data, account) {
  console.log(`Codesome 最近用量 (${data.range.start_date} ~ ${data.range.end_date})`)
  printAccountLine(account)
  console.log('')
  if (!data.items.length) {
    console.log('没有用量记录。')
    return
  }
  for (const item of data.items) {
    const keyName = item.api_key?.name || item.api_key_name || item.key_name || '-'
    console.log(`- ${item.created_at || item.timestamp || '-'} | ${keyName} | ${item.model || '-'} | ${item.billing_mode || '-'}`)
    console.log(`  费用：${money(item.actual_cost ?? item.cost)} | Token：${compactNumber(item.total_tokens ?? item.tokens)}`)
  }
}

function printKeyUsage(data, account) {
  const key = data.key
  console.log(`Codesome Key 用量：${key.name}`)
  printAccountLine(account)
  console.log('')
  console.log(`Key：${key.masked_key}`)
  console.log(`分组：${key.group}`)
  console.log(`状态：${key.status}`)
  console.log(`最近使用：${dateTime(key.last_used_at)}`)
  console.log(`创建时间：${dateTime(key.created_at)}`)
  for (const result of data.results) {
    console.log('')
    console.log(`${result.label} (${result.range.start_date} ~ ${result.range.end_date})`)
    console.log(`请求数：${compactNumber(result.requests)}`)
    console.log(`Token：${compactNumber(result.total_tokens)} 总 / ${compactNumber(result.input_tokens)} 输入 / ${compactNumber(result.output_tokens)} 输出 / ${compactNumber(result.cache_tokens)} 缓存`)
    console.log(`消费：${money(result.actual_cost)} 实际 / ${money(result.total_cost)} 标准`)
    console.log(`首次使用：${dateTime(result.first_at)}`)
    console.log(`最近使用：${dateTime(result.last_at)}`)
    if (Object.keys(result.models || {}).length) console.log(`模型：${formatCounts(result.models)}`)
    if (Object.keys(result.groups || {}).length) console.log(`分组：${formatCounts(result.groups)}`)
    if (result.recent?.length) {
      console.log('最近记录：')
      for (const item of result.recent) {
        console.log(`- ${dateTime(item.created_at)} | ${item.model} | ${item.group} | ${money(item.actual_cost)} | Token ${compactNumber(item.total_tokens)}`)
      }
    }
  }
}

function formatCounts(value) {
  return Object.entries(value).map(([name, count]) => `${name} x${count}`).join(', ')
}

export function printUsageHelp() {
  console.log(`Codesome usage commands

Usage:
  codesome usage stats [--account <alias>] [--days 7] [--start-date YYYY-MM-DD --end-date YYYY-MM-DD] [--json]
  codesome usage recent [--account <alias>] [--days 7] [--page 1] [--page-size 10] [--limit 10] [--json]
  codesome usage key --account <alias> --name <key_name> [--days 30] [--start-date YYYY-MM-DD --end-date YYYY-MM-DD] [--recent-limit 5] [--scan-page-size 500] [--json]

Shows selected-range usage statistics, recent usage records, or usage aggregated by a specific API Key name.
`)
}
