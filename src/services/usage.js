import { open, readFile } from 'node:fs/promises'
import path from 'node:path'
import { withApiClient } from '../api/client.js'
import { maskApiKey } from '../output/redact.js'

const DEFAULT_SCAN_MAX_PAGES = 800
const DEFAULT_EXPORT_PAGE_SIZE = 1000
const DEFAULT_ANALYZE_TOP_LIMIT = 10

function dateRange(days = 7) {
  const end = new Date()
  const start = new Date(end.getTime() - (Number(days) - 1) * 86400000)
  return {
    start_date: formatLocalDate(start),
    end_date: formatLocalDate(end)
  }
}

function monthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    start_date: formatLocalDate(start),
    end_date: formatLocalDate(now)
  }
}

function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function emptyAggregation() {
  return {
    requests: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_tokens: 0,
    total_tokens: 0,
    total_cost: 0,
    actual_cost: 0,
    models: new Map(),
    groups: new Map(),
    first_at: null,
    last_at: null,
    recent: []
  }
}

function addMap(map, key) {
  const name = key || '-'
  map.set(name, (map.get(name) || 0) + 1)
}

function addUsageItem(aggregation, item, recentLimit) {
  aggregation.requests += 1
  const inputTokens = Number(item.input_tokens || 0)
  const outputTokens = Number(item.output_tokens || 0)
  const cacheTokens = Number(item.cache_read_tokens || 0) + Number(item.cache_creation_tokens || 0) + Number(item.cache_creation_5m_tokens || 0) + Number(item.cache_creation_1h_tokens || 0)
  const totalTokens = inputTokens + outputTokens + cacheTokens

  aggregation.input_tokens += inputTokens
  aggregation.output_tokens += outputTokens
  aggregation.cache_tokens += cacheTokens
  aggregation.total_tokens += totalTokens
  aggregation.total_cost += Number(item.total_cost || 0)
  aggregation.actual_cost += Number(item.actual_cost || 0)
  addMap(aggregation.models, item.model)
  addMap(aggregation.groups, item.group?.name || String(item.group_id || '-'))

  const createdAt = item.created_at || null
  if (createdAt && (!aggregation.first_at || createdAt < aggregation.first_at)) aggregation.first_at = createdAt
  if (createdAt && (!aggregation.last_at || createdAt > aggregation.last_at)) aggregation.last_at = createdAt
  if (aggregation.recent.length < recentLimit) {
    aggregation.recent.push({
      created_at: createdAt,
      model: item.model || '-',
      group: item.group?.name || item.group_id || '-',
      actual_cost: roundMoney(item.actual_cost),
      total_cost: roundMoney(item.total_cost),
      total_tokens: totalTokens
    })
  }
}

function serializeAggregation(label, range, aggregation, scannedRecords, serverTotalRecords) {
  return {
    label,
    range,
    requests: aggregation.requests,
    input_tokens: aggregation.input_tokens,
    output_tokens: aggregation.output_tokens,
    cache_tokens: aggregation.cache_tokens,
    total_tokens: aggregation.total_tokens,
    total_cost: roundMoney(aggregation.total_cost),
    actual_cost: roundMoney(aggregation.actual_cost),
    first_at: aggregation.first_at,
    last_at: aggregation.last_at,
    models: Object.fromEntries([...aggregation.models.entries()].sort((a, b) => b[1] - a[1])),
    groups: Object.fromEntries([...aggregation.groups.entries()].sort((a, b) => b[1] - a[1])),
    recent: aggregation.recent,
    scanned_records: scannedRecords,
    server_total_records: serverTotalRecords
  }
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(6))
}

function roundShare(value) {
  return Number(Number(value || 0).toFixed(4))
}

function numericValue(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback
  const normalized = String(value).trim().replace(/^\$/, '').replace(/,/g, '')
  if (!normalized || normalized === '-') return fallback
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

function nullableNumber(value) {
  if (value === undefined || value === null || value === '') return null
  const normalized = String(value).trim().replace(/,/g, '')
  if (!normalized || normalized === '-') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function csvCell(value) {
  if (value === undefined || value === null) return ''
  const text = String(value)
  const escaped = text.replace(/"/g, '""')
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${escaped}` : escaped
  return /[,"\n\r]/.test(guarded) ? `"${guarded}"` : guarded
}

function requestTypeLabel(item) {
  const value = item.request_type || item.stream
  if (value === 'ws_v2') return 'WS'
  if (value === 'stream' || value === true) return 'Stream'
  if (value === 'sync' || value === false) return 'Sync'
  return 'Unknown'
}

function usageCsvHeader() {
  return [
    'Time',
    'API Key ID',
    'API Key Name',
    'Group ID',
    'Group Name',
    'Model',
    'Reasoning Effort',
    'Inbound Endpoint',
    'Type',
    'Billing Mode',
    'Input Tokens',
    'Output Tokens',
    'Cache Read Tokens',
    'Cache Creation Tokens',
    'Rate Multiplier',
    'Billed Cost',
    'Original Cost',
    'First Token (ms)',
    'Duration (ms)'
  ]
}

function usageCsvRows(items) {
  const rows = items.map((item) => [
    item.created_at,
    item.api_key_id ?? item.api_key?.id ?? '',
    item.api_key?.name || item.api_key_name || item.key_name || '',
    item.group_id ?? item.group?.id ?? '',
    item.group?.name || item.group_name || '',
    item.model,
    item.reasoning_effort || '',
    item.inbound_endpoint || '',
    requestTypeLabel(item),
    item.billing_mode || '',
    item.input_tokens ?? 0,
    item.output_tokens ?? 0,
    item.cache_read_tokens ?? 0,
    item.cache_creation_tokens ?? 0,
    item.rate_multiplier ?? 1,
    Number(item.actual_cost || 0).toFixed(8),
    Number(item.total_cost || 0).toFixed(8),
    item.first_token_ms ?? '',
    item.duration_ms ?? ''
  ])
  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}

function parseCsvRows(text) {
  const source = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
  const rows = []
  let row = []
  let cell = ''
  let quoted = false

  function pushCell() {
    row.push(cell)
    cell = ''
  }

  function pushRow() {
    pushCell()
    if (row.some((value) => value !== '')) rows.push(row)
    row = []
  }

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
    } else if (char === ',') {
      pushCell()
    } else if (char === '\n') {
      pushRow()
    } else if (char !== '\r') {
      cell += char
    }
  }

  if (cell || row.length) pushRow()
  return rows
}

function headerIndex(headers, name) {
  return headers.findIndex((header) => header.trim() === name)
}

function csvCellByHeader(row, headers, name) {
  const index = headerIndex(headers, name)
  return index >= 0 ? row[index] : ''
}

function parseUsageCsv(text) {
  const rows = parseCsvRows(text)
  if (!rows.length) return { items: [], warnings: ['CSV 文件没有可分析的行。'] }

  const headers = rows[0].map((value) => value.replace(/^\uFEFF/, '').trim())
  const warnings = []
  if (headerIndex(headers, 'API Key ID') < 0) warnings.push('输入 CSV 缺少 API Key ID，Key 归因只能按名称合并，无法区分同名 Key。')
  if (headerIndex(headers, 'Group ID') < 0) warnings.push('输入 CSV 缺少 Group ID，分组归因只能按名称合并。')

  const items = rows.slice(1).map((row) => {
    const groupId = nullableNumber(csvCellByHeader(row, headers, 'Group ID'))
    const groupName = csvCellByHeader(row, headers, 'Group Name')
    return {
      created_at: csvCellByHeader(row, headers, 'Time'),
      api_key_id: nullableNumber(csvCellByHeader(row, headers, 'API Key ID')),
      api_key: { name: csvCellByHeader(row, headers, 'API Key Name') },
      group_id: groupId,
      group: groupName ? { id: groupId, name: groupName } : null,
      model: csvCellByHeader(row, headers, 'Model'),
      billing_mode: csvCellByHeader(row, headers, 'Billing Mode'),
      input_tokens: numericValue(csvCellByHeader(row, headers, 'Input Tokens')),
      output_tokens: numericValue(csvCellByHeader(row, headers, 'Output Tokens')),
      cache_read_tokens: numericValue(csvCellByHeader(row, headers, 'Cache Read Tokens')),
      cache_creation_tokens: numericValue(csvCellByHeader(row, headers, 'Cache Creation Tokens')),
      rate_multiplier: numericValue(csvCellByHeader(row, headers, 'Rate Multiplier'), 1),
      actual_cost: numericValue(csvCellByHeader(row, headers, 'Billed Cost')),
      total_cost: numericValue(csvCellByHeader(row, headers, 'Original Cost'))
    }
  })

  return { items, warnings }
}

function usageDay(value) {
  if (!value) return '-'
  const text = String(value)
  const match = text.match(/\d{4}-\d{2}-\d{2}/)
  if (match) return match[0]
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? '-' : formatLocalDate(date)
}

function normalizeAnalysisItem(item) {
  const inputTokens = numericValue(item.input_tokens)
  const outputTokens = numericValue(item.output_tokens)
  const cacheTokens = numericValue(item.cache_read_tokens) +
    numericValue(item.cache_creation_tokens) +
    numericValue(item.cache_creation_5m_tokens) +
    numericValue(item.cache_creation_1h_tokens)
  const apiKeyId = nullableNumber(item.api_key_id ?? item.api_key?.id)
  const groupId = nullableNumber(item.group_id ?? item.group?.id)
  const apiKeyName = item.api_key?.name || item.api_key_name || item.key_name || '-'
  const groupName = item.group?.name || item.group_name || (groupId === null ? '-' : `Group #${groupId}`)

  return {
    created_at: item.created_at || item.timestamp || null,
    day: usageDay(item.created_at || item.timestamp),
    api_key_id: apiKeyId,
    api_key_name: apiKeyName || '-',
    group_id: groupId,
    group_name: groupName || '-',
    model: item.model || '-',
    rate_multiplier: numericValue(item.rate_multiplier ?? item.group?.rate_multiplier, 1),
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_tokens: cacheTokens,
    total_tokens: inputTokens + outputTokens + cacheTokens,
    billed_cost: numericValue(item.actual_cost ?? item.cost),
    original_cost: numericValue(item.total_cost)
  }
}

function emptyMetrics(extra = {}) {
  return {
    ...extra,
    requests: 0,
    billed_cost: 0,
    original_cost: 0,
    cost_delta: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_tokens: 0,
    total_tokens: 0,
    cache_token_share: 0
  }
}

function addMetrics(metrics, item) {
  metrics.requests += 1
  metrics.billed_cost += item.billed_cost
  metrics.original_cost += item.original_cost
  metrics.cost_delta += item.billed_cost - item.original_cost
  metrics.input_tokens += item.input_tokens
  metrics.output_tokens += item.output_tokens
  metrics.cache_tokens += item.cache_tokens
  metrics.total_tokens += item.total_tokens
}

function finalizeMetrics(metrics) {
  return {
    ...metrics,
    billed_cost: roundMoney(metrics.billed_cost),
    original_cost: roundMoney(metrics.original_cost),
    cost_delta: roundMoney(metrics.cost_delta),
    cache_token_share: metrics.total_tokens ? roundShare(metrics.cache_tokens / metrics.total_tokens) : 0
  }
}

function ensureBucket(map, key, extra) {
  if (!map.has(key)) map.set(key, emptyMetrics(extra))
  return map.get(key)
}

function sortedBuckets(map, limit = DEFAULT_ANALYZE_TOP_LIMIT) {
  return [...map.values()]
    .map(finalizeMetrics)
    .sort((a, b) => b.billed_cost - a.billed_cost || b.requests - a.requests)
    .slice(0, limit)
}

function createUsageAnalysisAccumulator(source, options = {}) {
  const topLimit = Number(options.topLimit || DEFAULT_ANALYZE_TOP_LIMIT)
  const totals = emptyMetrics()
  const highMultiplier = emptyMetrics({ threshold: 1 })
  const days = new Map()
  const keys = new Map()
  const models = new Map()
  const groups = new Map()
  const multipliers = new Map()
  const warnings = [...(options.warnings || [])]
  let records = 0
  let minDay = null
  let maxDay = null
  let missingApiKeyId = false
  let missingGroupId = false

  function add(rawItems) {
    for (const rawItem of rawItems) {
      const item = normalizeAnalysisItem(rawItem)
      records += 1
      addMetrics(totals, item)
      if (item.rate_multiplier > 1) addMetrics(highMultiplier, item)

      if (item.day !== '-') {
        if (!minDay || item.day < minDay) minDay = item.day
        if (!maxDay || item.day > maxDay) maxDay = item.day
      }
      if (item.api_key_id === null) missingApiKeyId = true
      if (item.group_id === null) missingGroupId = true

      addMetrics(ensureBucket(days, item.day, { day: item.day }), item)
      addMetrics(ensureBucket(keys, item.api_key_id === null ? `name:${item.api_key_name}` : `id:${item.api_key_id}`, {
        api_key_id: item.api_key_id,
        api_key_name: item.api_key_name,
        group_id: item.group_id,
        group_name: item.group_name
      }), item)
      addMetrics(ensureBucket(models, item.model, { model: item.model }), item)
      addMetrics(ensureBucket(groups, item.group_id === null ? `name:${item.group_name}` : `id:${item.group_id}`, {
        group_id: item.group_id,
        group_name: item.group_name
      }), item)
      addMetrics(ensureBucket(multipliers, String(item.rate_multiplier), { rate_multiplier: item.rate_multiplier }), item)
    }
  }

  function finish(extra = {}) {
    const finalWarnings = [...warnings]
    if (missingApiKeyId && !finalWarnings.some((warning) => warning.includes('API Key ID'))) {
      finalWarnings.push('部分记录缺少 API Key ID，Key 归因可能按名称合并。')
    }
    if (missingGroupId && !finalWarnings.some((warning) => warning.includes('Group ID'))) {
      finalWarnings.push('部分记录缺少 Group ID，分组归因可能按名称合并。')
    }
    return {
      source,
      ...extra,
      range: extra.range || { start_date: minDay, end_date: maxDay },
      records,
      totals: finalizeMetrics(totals),
      high_multiplier: finalizeMetrics(highMultiplier),
      by_day: [...days.values()].map(finalizeMetrics).sort((a, b) => String(a.day).localeCompare(String(b.day))),
      top_keys: sortedBuckets(keys, topLimit),
      top_models: sortedBuckets(models, topLimit),
      top_groups: sortedBuckets(groups, topLimit),
      by_rate_multiplier: sortedBuckets(multipliers, topLimit),
      warnings: finalWarnings
    }
  }

  return { add, finish }
}

async function findKeyByName(client, name) {
  const data = await client.get('/keys', {
    page: 1,
    page_size: 100,
    search: name,
    sort_by: 'created_at',
    sort_order: 'desc'
  })
  const exact = (data.items || []).filter((item) => item.name === name)
  if (exact.length === 1) return exact[0]
  if (exact.length > 1) {
    throw new Error(`找到多个同名 Key：${name}，请先重命名后再查询。`)
  }
  const fuzzy = data.items || []
  if (fuzzy.length > 1) {
    const names = fuzzy.map((item) => item.name).join(', ')
    throw new Error(`没有找到精确名称 ${name}，但找到多个相似 Key：${names}。请使用精确 --name。`)
  }
  if (fuzzy.length === 1) return fuzzy[0]
  throw new Error(`未找到 API Key：${name}`)
}

function normalizeRecentUsageItem(item) {
  const result = { ...item }
  if (result.api_key && typeof result.api_key === 'object') {
    const apiKey = { ...result.api_key }
    const masked = apiKey.masked_key || maskApiKey(apiKey.key)
    if (apiKey.key) apiKey.key = masked
    if (!apiKey.masked_key && masked) apiKey.masked_key = masked
    result.api_key = apiKey
  }
  if (typeof result.key === 'string' && result.key.startsWith('sk-')) result.key = maskApiKey(result.key)
  if (typeof result.api_key_key === 'string' && result.api_key_key.startsWith('sk-')) {
    result.api_key_key = maskApiKey(result.api_key_key)
  }
  return result
}

async function aggregateKeyUsage(client, keyId, range, recentLimit, scanPageSize, scanMaxPages = DEFAULT_SCAN_MAX_PAGES) {
  const aggregation = emptyAggregation()
  const pageSize = scanPageSize
  let page = 1
  let scannedRecords = 0
  let serverTotalRecords = 0

  while (true) {
    const data = await client.get('/usage', {
      page,
      page_size: pageSize,
      start_date: range.start_date,
      end_date: range.end_date,
      sort_by: 'created_at',
      sort_order: 'desc'
    })
    const items = data.items || []
    serverTotalRecords = data.total ?? serverTotalRecords
    for (const item of items) {
      scannedRecords += 1
      if (Number(item.api_key_id) === Number(keyId)) addUsageItem(aggregation, item, recentLimit)
    }
    if (!items.length || items.length < pageSize || page * pageSize >= Number(data.total || 0)) break
    page += 1
    if (page > scanMaxPages) throw new Error(`用量分页超过安全上限 ${scanMaxPages} 页，已停止。`)
  }

  return serializeAggregation('', range, aggregation, scannedRecords, serverTotalRecords)
}

export async function getUsageStats(options = {}) {
  const range = dateRange(options.days || 7)
  return withApiClient(options, async (client) => {
    const data = await client.get('/usage/stats', {
      start_date: options.startDate || range.start_date,
      end_date: options.endDate || range.end_date
    })
    return {
      range: {
        start_date: options.startDate || range.start_date,
        end_date: options.endDate || range.end_date
      },
      stats: data
    }
  })
}

export async function getRecentUsage(options = {}) {
  const range = dateRange(options.days || 7)
  return withApiClient(options, async (client) => {
    const data = await client.get('/usage', {
      page: options.page || 1,
      page_size: options.pageSize || 10,
      start_date: options.startDate || range.start_date,
      end_date: options.endDate || range.end_date,
      sort_by: 'created_at',
      sort_order: 'desc'
    })
    return {
      range: {
        start_date: options.startDate || range.start_date,
        end_date: options.endDate || range.end_date
      },
      page: data.page,
      page_size: data.page_size,
      total: data.total,
      items: (data.items || []).map(normalizeRecentUsageItem)
    }
  })
}

export async function exportUsageCsv(options = {}) {
  const range = dateRange(options.days || 30)
  const startDate = options.startDate || range.start_date
  const endDate = options.endDate || range.end_date
  const pageSize = Number(options.pageSize || DEFAULT_EXPORT_PAGE_SIZE)
  const scanMaxPages = Number(options.scanMaxPages || DEFAULT_SCAN_MAX_PAGES)
  if (!Number.isInteger(pageSize) || pageSize <= 0) throw new Error('--page-size 必须是正整数。')
  if (!Number.isInteger(scanMaxPages) || scanMaxPages <= 0) throw new Error('--scan-max-pages 必须是正整数。')

  return withApiClient(options, async (client) => {
    let page = 1
    let total = 0
    let records = 0
    let file

    try {
      const outputPath = path.resolve(options.output || `usage_${startDate}_to_${endDate}.csv`)
      file = await open(outputPath, 'w')
      await file.write(`\uFEFF${usageCsvHeader().map(csvCell).join(',')}\n`)

      while (true) {
        const data = await client.get('/usage', {
          page,
          page_size: pageSize,
          start_date: startDate,
          end_date: endDate,
          sort_by: 'created_at',
          sort_order: 'desc'
        })
        const pageItems = data.items || []
        total = Number(data.total || total || 0)
        const csvRows = usageCsvRows(pageItems)
        if (csvRows) await file.write(`${csvRows}\n`)
        records += pageItems.length
        if (options.onProgress) options.onProgress({ page, page_size: pageSize, records, total })
        if (!pageItems.length || pageItems.length < pageSize || page * pageSize >= total) break
        if (page >= scanMaxPages) throw new Error(`用量分页超过安全上限 ${scanMaxPages} 页，已停止。`)
        page += 1
      }

      return {
        range: { start_date: startDate, end_date: endDate },
        output_path: outputPath,
        records,
        server_total_records: total,
        scanned_pages: page,
        page_size: pageSize
      }
    } finally {
      if (file) await file.close()
    }
  })
}

async function analyzeLiveUsage(options = {}) {
  const range = dateRange(options.days || 30)
  const startDate = options.startDate || range.start_date
  const endDate = options.endDate || range.end_date
  const pageSize = Number(options.pageSize || DEFAULT_EXPORT_PAGE_SIZE)
  const scanMaxPages = Number(options.scanMaxPages || DEFAULT_SCAN_MAX_PAGES)
  if (!Number.isInteger(pageSize) || pageSize <= 0) throw new Error('--page-size 必须是正整数。')
  if (!Number.isInteger(scanMaxPages) || scanMaxPages <= 0) throw new Error('--scan-max-pages 必须是正整数。')

  return withApiClient(options, async (client) => {
    const accumulator = createUsageAnalysisAccumulator('live', { topLimit: options.topLimit })
    let page = 1
    let total = 0
    let records = 0

    while (true) {
      const data = await client.get('/usage', {
        page,
        page_size: pageSize,
        start_date: startDate,
        end_date: endDate,
        sort_by: 'created_at',
        sort_order: 'desc'
      })
      const pageItems = data.items || []
      total = Number(data.total || total || 0)
      accumulator.add(pageItems)
      records += pageItems.length
      if (options.onProgress) options.onProgress({ page, page_size: pageSize, records, total })
      if (!pageItems.length || pageItems.length < pageSize || page * pageSize >= total) break
      if (page >= scanMaxPages) throw new Error(`用量分页超过安全上限 ${scanMaxPages} 页，已停止。`)
      page += 1
    }

    return accumulator.finish({
      range: { start_date: startDate, end_date: endDate },
      server_total_records: total,
      scanned_pages: page,
      page_size: pageSize
    })
  })
}

async function analyzeCsvUsage(options = {}) {
  const inputPath = path.resolve(options.input)
  const text = await readFile(inputPath, 'utf8')
  const parsed = parseUsageCsv(text)
  const accumulator = createUsageAnalysisAccumulator('csv', {
    topLimit: options.topLimit,
    warnings: parsed.warnings
  })
  accumulator.add(parsed.items)
  return accumulator.finish({ input_path: inputPath })
}

export async function analyzeUsage(options = {}) {
  if (options.input) return analyzeCsvUsage(options)
  return analyzeLiveUsage(options)
}

export async function getKeyUsage(options = {}) {
  if (!options.name) throw new Error('缺少 --name <key_name>。')
  const recentLimit = Number(options.recentLimit || 5)
  const scanPageSize = Number(options.scanPageSize || 500)
  const scanMaxPages = Number(options.scanMaxPages || DEFAULT_SCAN_MAX_PAGES)
  if (!Number.isInteger(scanPageSize) || scanPageSize <= 0) throw new Error('--scan-page-size 必须是正整数。')
  if (!Number.isInteger(scanMaxPages) || scanMaxPages <= 0) throw new Error('--scan-max-pages 必须是正整数。')
  return withApiClient(options, async (client) => {
    const key = await findKeyByName(client, options.name)
    const customRange = options.startDate || options.endDate ? {
      start_date: options.startDate || dateRange(options.days || 30).start_date,
      end_date: options.endDate || dateRange(options.days || 30).end_date
    } : null
    const ranges = customRange ? [
      { label: '自定义范围', range: customRange }
    ] : [
      { label: '本月', range: monthRange() },
      { label: `近 ${Number(options.days || 30)} 天`, range: dateRange(options.days || 30) }
    ]
    const results = []
    for (const item of ranges) {
      const result = await aggregateKeyUsage(client, key.id, item.range, recentLimit, scanPageSize, scanMaxPages)
      result.label = item.label
      results.push(result)
    }
    return {
      key: {
        id: key.id,
        name: key.name,
        masked_key: maskApiKey(key.key),
        group: key.group?.name || key.group_id,
        status: key.status,
        last_used_at: key.last_used_at || null,
        created_at: key.created_at || null
      },
      results
    }
  })
}
