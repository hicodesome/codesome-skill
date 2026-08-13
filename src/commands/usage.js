import { analyzeUsage, exportUsageCsv, getKeyUsage, getRecentUsage, getUsageStats } from '../services/usage.js'
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
  const days = getOption(args, '--days') || 7
  const startDate = getOption(args, '--start-date')
  const endDate = getOption(args, '--end-date')

  if (subcommand === 'analyze') {
    const input = getOption(args, '--input')
    const account = input ? null : await resolveCommandAccount(args)
    const data = await analyzeUsage({
      ...(account ? accountServiceOptions(account) : {}),
      input,
      days: getOption(args, '--days') || 30,
      startDate,
      endDate,
      pageSize: positiveIntegerOption(args, ['--page-size', '--limit'], 1000),
      scanMaxPages: positiveIntegerOption(args, ['--scan-max-pages'], 800),
      topLimit: positiveIntegerOption(args, ['--top'], 10),
      onProgress: input || hasFlag(args, '--quiet') ? undefined : printScanProgress
    })
    if (json) {
      printJson(account ? { account_context: accountJson(account), ...data } : data)
      return
    }
    printAnalysis(data, account)
    return
  }

  const account = await resolveCommandAccount(args)
  const serviceOptions = accountServiceOptions(account)

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
      scanPageSize: positiveIntegerOption(args, ['--scan-page-size'], 500),
      scanMaxPages: positiveIntegerOption(args, ['--scan-max-pages'], 800)
    })
    if (json) {
      printJson({ account_context: accountJson(account), ...data })
      return
    }
    printKeyUsage(data, account)
    return
  }

  if (subcommand === 'export') {
    const data = await exportUsageCsv({
      ...serviceOptions,
      days: getOption(args, '--days') || 30,
      startDate,
      endDate,
      output: getOption(args, '--output'),
      pageSize: positiveIntegerOption(args, ['--page-size', '--limit'], 1000),
      scanMaxPages: positiveIntegerOption(args, ['--scan-max-pages'], 800),
      onProgress: hasFlag(args, '--quiet') ? undefined : printExportProgress
    })
    if (json) {
      printJson({ account_context: accountJson(account), ...data })
      return
    }
    printExport(data, account)
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

function printExportProgress(progress) {
  const total = Number(progress.total || 0)
  const pages = total > 0 ? Math.ceil(total / progress.page_size) : '?'
  const totalText = total > 0 ? compactNumber(total) : '?'
  process.stderr.write(`\r导出进度：第 ${progress.page}/${pages} 页，${compactNumber(progress.records)}/${totalText} 条`)
  if (total > 0 && progress.records >= total) process.stderr.write('\n')
}

function printScanProgress(progress) {
  const total = Number(progress.total || 0)
  const pages = total > 0 ? Math.ceil(total / progress.page_size) : '?'
  const totalText = total > 0 ? compactNumber(total) : '?'
  process.stderr.write(`\r扫描进度：第 ${progress.page}/${pages} 页，${compactNumber(progress.records)}/${totalText} 条`)
  if (total > 0 && progress.records >= total) process.stderr.write('\n')
}

function printExport(data, account) {
  console.log(`Codesome 用量导出 (${data.range.start_date} ~ ${data.range.end_date})`)
  printAccountLine(account)
  console.log('')
  console.log(`输出文件：${data.output_path}`)
  console.log(`导出记录：${compactNumber(data.records)} / ${compactNumber(data.server_total_records)}`)
  console.log(`扫描分页：${compactNumber(data.scanned_pages)} 页，page_size=${data.page_size}`)
}

function printAnalysis(data, account) {
  const range = data.range || {}
  console.log(`Codesome 用量分析 (${range.start_date || '-'} ~ ${range.end_date || '-'})`)
  if (account) printAccountLine(account)
  if (data.input_path) console.log(`输入文件：${data.input_path}`)
  console.log('')
  printAnalysisMetrics('总计', data.totals)
  printAnalysisMetrics('高倍率 (>1x)', data.high_multiplier)
  printAnalysisSection('Top Key', data.top_keys, formatKeyAnalysisItem)
  printAnalysisSection('Top Model', data.top_models, (item) => item.model || '-')
  printAnalysisSection('Top Group', data.top_groups, formatGroupAnalysisItem)
  printAnalysisSection('倍率', data.by_rate_multiplier, (item) => `${item.rate_multiplier}x`)
  printAnalysisSection('按天', data.by_day, (item) => item.day || '-')
  if (data.warnings?.length) {
    console.log('')
    console.log('提示：')
    for (const warning of data.warnings) console.log(`- ${warning}`)
  }
}

function printAnalysisMetrics(label, metrics = {}) {
  console.log(`${label}：请求 ${compactNumber(metrics.requests)}，计费 ${money(metrics.billed_cost)}，原价 ${money(metrics.original_cost)}，差额 ${money(metrics.cost_delta)}，Token ${compactNumber(metrics.total_tokens)}，缓存占比 ${percent(metrics.cache_token_share)}`)
}

function printAnalysisSection(title, items = [], labeler) {
  if (!items.length) return
  console.log('')
  console.log(`${title}：`)
  for (const item of items) {
    console.log(`- ${labeler(item)} | 请求 ${compactNumber(item.requests)} | 计费 ${money(item.billed_cost)} | 原价 ${money(item.original_cost)} | Token ${compactNumber(item.total_tokens)} | 缓存 ${percent(item.cache_token_share)}`)
  }
}

function formatKeyAnalysisItem(item) {
  const id = item.api_key_id === null || item.api_key_id === undefined ? 'unknown' : item.api_key_id
  return `${item.api_key_name || '-'} (#${id})`
}

function formatGroupAnalysisItem(item) {
  const id = item.group_id === null || item.group_id === undefined ? 'unknown' : item.group_id
  return `${item.group_name || '-'} (#${id})`
}

function percent(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '-'
  return `${(Number(value) * 100).toFixed(1)}%`
}

function formatCounts(value) {
  return Object.entries(value).map(([name, count]) => `${name} x${count}`).join(', ')
}

export function printUsageHelp() {
  console.log(`Codesome usage commands

Usage:
  codesome usage stats [--account <alias>] [--days 7] [--start-date YYYY-MM-DD --end-date YYYY-MM-DD] [--json]
  codesome usage recent [--account <alias>] [--days 7] [--page 1] [--page-size 10] [--limit 10] [--json]
  codesome usage key --account <alias> --name <key_name> [--days 30] [--start-date YYYY-MM-DD --end-date YYYY-MM-DD] [--recent-limit 5] [--scan-page-size 500] [--scan-max-pages 800] [--json]
  codesome usage export [--account <alias>] [--days 30] [--start-date YYYY-MM-DD --end-date YYYY-MM-DD] [--output usage.csv] [--page-size 1000] [--scan-max-pages 800] [--json]
  codesome usage analyze [--account <alias>] [--input usage.csv] [--days 30] [--start-date YYYY-MM-DD --end-date YYYY-MM-DD] [--page-size 1000] [--scan-max-pages 800] [--top 10] [--json]

Shows selected-range usage statistics, recent usage records, API-Key usage aggregation, CSV export, or heavy-user analysis.
`)
}
