const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const root = path.resolve(__dirname, '..')
const cli = path.join(root, 'bin', 'codesome.js')
const token = 'pagination-usage-token'

const keys = Array.from({ length: 28 }, (_, index) => ({
  id: 5000 + index,
  name: index === 24 ? 'target-heavy' : [5, 6].includes(index) ? 'duplicate-name' : `mock-key-${String(index + 1).padStart(2, '0')}`,
  key: `sk-mock-secret-${index}`,
  group_id: index % 2 ? 20 : 10,
  group: { id: index % 2 ? 20 : 10, name: index % 2 ? 'batch-b' : 'batch-a', platform: 'anthropic', subscription_type: 'standard', rate_multiplier: 1, status: 'active' },
  status: 'active',
  quota: 0,
  quota_used: 0,
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
  last_used_at: null
}))

const targetKey = keys.find((item) => item.name === 'target-heavy')
const usageItems = Array.from({ length: 65 }, (_, index) => {
  const isTarget = index % 2 === 0
  const apiKey = isTarget ? targetKey : keys[index % keys.length]
  const createdAt = new Date(Date.UTC(2026, 4, 5, 12, 0, 0) - index * 60000).toISOString()
  return {
    id: 9000 + index,
    api_key_id: apiKey.id,
    api_key: { id: apiKey.id, name: apiKey.name },
    group_id: apiKey.group_id,
    group: apiKey.group,
    model: isTarget ? 'claude-sonnet-4' : 'claude-haiku-4',
    billing_mode: 'standard',
    input_tokens: isTarget ? 10 : 1,
    output_tokens: isTarget ? 20 : 2,
    cache_read_tokens: 0,
    cache_creation_tokens: 0,
    total_cost: isTarget ? 0.2 : 0.01,
    actual_cost: isTarget ? 0.1 : 0.005,
    created_at: createdAt
  }
})

const requests = []

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ code: status >= 200 && status < 300 ? 0 : status, data }))
}

function storageState(baseUrl) {
  return {
    cookies: [],
    origins: [{
      origin: baseUrl,
      localStorage: [{ name: 'auth_token', value: token }]
    }]
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function listKeys(url) {
  const search = url.searchParams.get('search')
  const groupId = url.searchParams.get('group_id')
  const page = Number(url.searchParams.get('page') || 1)
  const pageSize = Number(url.searchParams.get('page_size') || 20)
  let items = keys
  if (search) items = items.filter((item) => item.name.includes(search))
  if (groupId) items = items.filter((item) => Number(item.group_id) === Number(groupId))
  const start = (page - 1) * pageSize
  return { page, page_size: pageSize, total: items.length, items: items.slice(start, start + pageSize) }
}

function listUsage(url) {
  const page = Number(url.searchParams.get('page') || 1)
  const pageSize = Number(url.searchParams.get('page_size') || 10)
  const apiKeyId = url.searchParams.get('api_key_id')
  let items = usageItems
  if (apiKeyId) {
    items = usageItems.filter((item) => Number(item.api_key_id) === Number(apiKeyId)).slice(0, 5)
  }
  const start = (page - 1) * pageSize
  return { page, page_size: pageSize, total: items.length, items: items.slice(start, start + pageSize) }
}

function run(args, env) {
  const finalArgs = args.includes('--json') ? args : [...args, '--json']
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...finalArgs], {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`command timed out: codesome ${finalArgs.join(' ')}`))
    }, 30000)
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        process.stderr.write(stderr)
        process.stderr.write(stdout)
        reject(new Error(`command failed: codesome ${finalArgs.join(' ')}`))
        return
      }
      resolve(JSON.parse(stdout.replace(/^\uFEFF/, '')))
    })
  })
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  requests.push({ method: req.method, pathname: url.pathname, search: url.search })
  if (req.headers.authorization !== `Bearer ${token}`) {
    send(res, 401, { message: 'unauthorized' })
    return
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/keys') {
    send(res, 200, listKeys(url))
    return
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/usage') {
    send(res, 200, listUsage(url))
    return
  }
  send(res, 404, { message: 'not found' })
}

async function main() {
  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => send(res, 500, { message: error.message }))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codesome-pagination-usage-'))
  writeJson(path.join(home, 'session', 'storage-state' + '.json'), storageState(baseUrl))
  writeJson(path.join(home, 'config.json'), { base_url: baseUrl, saved_at: '2026-05-05T00:00:00.000Z' })
  const env = { ...process.env, CODESOME_HOME: home, CODESOME_BASE_URL: baseUrl, CODESOME_DEV_ALLOW_INSECURE_BASE_URL: '1' }

  try {
    const keyPage = await run(['key', 'list', '--page', '2', '--page-size', '10'], env)
    assert(keyPage.page === 2, 'key list did not preserve page')
    assert(keyPage.page_size === 10, 'key list did not preserve page size')
    assert(keyPage.items[0].name === 'mock-key-11', 'key list returned the wrong page')

    const recentPage = await run(['usage', 'recent', '--days', '18', '--page', '3', '--limit', '7'], env)
    assert(recentPage.page === 3, 'usage recent did not preserve page')
    assert(recentPage.page_size === 7, 'usage recent did not preserve page size')
    assert(recentPage.items[0].id === usageItems[14].id, 'usage recent returned the wrong page')

    const duplicateKey = await run(['key', 'show', '--name', 'duplicate-name', '--group-id', '10'], env)
    assert(duplicateKey.key.id === 5006, 'key show did not disambiguate duplicate names by group id')

    const keyUsage = await run(['usage', 'key', '--name', 'target-heavy', '--days', '18', '--scan-page-size', '25'], env)
    const result = keyUsage.results.find((item) => item.label.includes('18'))
    const expectedRequests = usageItems.filter((item) => item.api_key_id === targetKey.id).length
    assert(result.requests === expectedRequests, 'usage key did not aggregate all matching records')
    assert(result.scanned_records === usageItems.length, 'usage key did not scan all usage records')
    assert(Math.abs(result.actual_cost - expectedRequests * 0.1) < 0.000001, 'usage key aggregated the wrong cost')

    const usageQueries = requests
      .filter((item) => item.pathname === '/api/v1/usage')
      .map((item) => item.search)
    assert(!usageQueries.some((query) => query.includes('api_key_id=')), 'usage key still used server-side api_key_id filtering')

    console.log(JSON.stringify({
      ok: true,
      checked: ['key-list-pagination', 'usage-recent-pagination', 'key-show-group-disambiguation', 'usage-key-full-scan-aggregation']
    }))
  } finally {
    server.close()
    if (!process.env.CODESOME_TEST_KEEP_TEMP) fs.rmSync(home, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
