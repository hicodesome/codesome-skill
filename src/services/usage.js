import { withApiClient } from '../api/client.js'
import { maskApiKey } from '../output/redact.js'

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

async function aggregateKeyUsage(client, keyId, range, recentLimit, scanPageSize) {
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
    if (page > 300) throw new Error('用量分页超过安全上限，已停止。')
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

export async function getKeyUsage(options = {}) {
  if (!options.name) throw new Error('缺少 --name <key_name>。')
  const recentLimit = Number(options.recentLimit || 5)
  const scanPageSize = Number(options.scanPageSize || 500)
  if (!Number.isInteger(scanPageSize) || scanPageSize <= 0) throw new Error('--scan-page-size 必须是正整数。')
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
      const result = await aggregateKeyUsage(client, key.id, item.range, recentLimit, scanPageSize)
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
