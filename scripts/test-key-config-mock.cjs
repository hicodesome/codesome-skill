const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const { spawn, spawnSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const cli = path.join(root, 'bin', 'codesome.js')
const verify = path.join(root, 'scripts', 'verify-key-config-output.cjs')
const token = 'mock-token'

let nextKeyId = 1001
const groups = [
  {
    id: 10,
    name: 'codex',
    description: 'Mock Codex group',
    platform: 'anthropic',
    status: 'active',
    subscription_type: 'standard',
    rate_multiplier: 1
  }
]
const keys = []

function fullKey(suffix) {
  return 'sk-' + suffix
}

function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ code: status >= 200 && status < 300 ? 0 : status, data }))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      try {
        resolve(text ? JSON.parse(text) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function normalizeKey(item) {
  return {
    ...item,
    group: groups.find((group) => group.id === item.group_id) || null
  }
}

function listKeys(url) {
  const search = url.searchParams.get('search')
  const page = Number(url.searchParams.get('page') || 1)
  const pageSize = Number(url.searchParams.get('page_size') || 20)
  let items = keys
  if (search) items = items.filter((item) => item.name.includes(search))
  const start = (page - 1) * pageSize
  return {
    page,
    page_size: pageSize,
    total: items.length,
    items: items.slice(start, start + pageSize).map(normalizeKey)
  }
}

function createKey(body) {
  const now = new Date().toISOString()
  const key = {
    id: nextKeyId++,
    name: body.name,
    key: body.custom_key || fullKey('mockcreatedkey123456789012345'),
    group_id: body.group_id,
    status: 'active',
    ip_whitelist: Array.isArray(body.ip_whitelist) ? body.ip_whitelist : [],
    ip_blacklist: Array.isArray(body.ip_blacklist) ? body.ip_blacklist : [],
    quota: body.quota || 0,
    quota_used: 0,
    expires_at: body.expires_in_days ? new Date(Date.now() + Number(body.expires_in_days) * 86400000).toISOString() : null,
    created_at: now,
    updated_at: now,
    last_used_at: null,
    rate_limit_5h: body.rate_limit_5h || 0,
    rate_limit_1d: body.rate_limit_1d || 0,
    rate_limit_7d: body.rate_limit_7d || 0,
    usage_5h: 0,
    usage_1d: 0,
    usage_7d: 0
  }
  keys.push(key)
  return normalizeKey(key)
}

function updateKey(id, body) {
  const key = keys.find((item) => item.id === id)
  if (!key) return null
  for (const field of ['name', 'group_id', 'status', 'ip_whitelist', 'ip_blacklist', 'quota', 'rate_limit_5h', 'rate_limit_1d', 'rate_limit_7d']) {
    if (Object.prototype.hasOwnProperty.call(body, field)) key[field] = body[field]
  }
  if (Object.prototype.hasOwnProperty.call(body, 'expires_at')) key.expires_at = body.expires_at || null
  if (body.reset_quota) key.quota_used = 0
  if (body.reset_rate_limit_usage) {
    key.usage_5h = 0
    key.usage_1d = 0
    key.usage_7d = 0
  }
  key.updated_at = new Date().toISOString()
  return normalizeKey(key)
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  if (process.env.CODESOME_TEST_DEBUG) console.error(`mock: ${req.method} ${url.pathname}`)
  if (req.headers.authorization !== `Bearer ${token}`) {
    send(res, 401, { message: 'unauthorized' })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/groups/available') {
    send(res, 200, groups)
    return
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/groups/rates') {
    send(res, 200, {})
    return
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/keys') {
    send(res, 200, listKeys(url))
    return
  }
  if (req.method === 'POST' && url.pathname === '/api/v1/keys') {
    send(res, 200, createKey(await readBody(req)))
    return
  }
  const match = url.pathname.match(/^\/api\/v1\/keys\/(\d+)$/)
  if (match && req.method === 'PUT') {
    const updated = updateKey(Number(match[1]), await readBody(req))
    send(res, updated ? 200 : 404, updated || { message: 'not found' })
    return
  }
  if (match && req.method === 'DELETE') {
    const index = keys.findIndex((item) => item.id === Number(match[1]))
    if (index >= 0) keys.splice(index, 1)
    send(res, index >= 0 ? 200 : 404, { deleted: index >= 0 })
    return
  }
  send(res, 404, { message: 'not found' })
}

function run(args, env, file, mode) {
  if (process.env.CODESOME_TEST_DEBUG) console.error(`run: codesome ${args.join(' ')}`)
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args, '--json'], {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`command timed out: codesome ${args.join(' ')}`))
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
        reject(new Error(`command failed: codesome ${args.join(' ')}`))
        return
      }
      fs.writeFileSync(file, stdout)
      const checked = spawnSync(process.execPath, [verify, file, mode], {
        cwd: root,
        encoding: 'utf8',
        timeout: 30000
      })
      if (checked.status !== 0) {
        process.stderr.write(checked.stderr)
        process.stderr.write(checked.stdout)
        reject(new Error(`verification failed: ${mode}`))
        return
      }
      resolve(JSON.parse(stdout))
    })
  })
}

function runWithoutVerify(args, env) {
  if (process.env.CODESOME_TEST_DEBUG) console.error(`run: codesome ${args.join(' ')}`)
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`command timed out: codesome ${args.join(' ')}`))
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
        reject(new Error(`command failed: codesome ${args.join(' ')}`))
        return
      }
      resolve(stdout)
    })
  })
}

async function main() {
  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      send(res, 500, { message: error.message })
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codesome-key-config-'))
  const sessionDir = path.join(home, 'session')
  fs.mkdirSync(sessionDir, { recursive: true })
  fs.writeFileSync(path.join(sessionDir, 'storage-state' + '.json'), JSON.stringify({
    cookies: [],
    origins: [{
      origin: baseUrl,
      localStorage: [{ name: 'auth_token', value: token }]
    }]
  }))

  const env = {
    ...process.env,
    CODESOME_HOME: home,
    CODESOME_BASE_URL: baseUrl
  }
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codesome-key-config-output-'))
  const customKey = fullKey('mockcustomkey123456789012345')

  try {
    const created = await run([
      'key', 'create',
      '--name', 'mock-config-key',
      '--group', 'codex',
      '--custom-key', customKey,
      '--quota', '2',
      '--expires-in-days', '7',
      '--rate-limit-5h', '0.5',
      '--rate-limit-1d', '1.5',
      '--rate-limit-7d', '3.5',
      '--ip-whitelist', '127.0.0.1',
      '--ip-blacklist', '192.0.2.1'
    ], env, path.join(outDir, 'created.json'), 'created')

    const shown = await run(['key', 'show', '--name', created.key.name], env, path.join(outDir, 'show.json'), 'show')
    if (shown.key.quota !== 2) throw new Error('show did not return created quota')

    const preview = await run([
      'key', 'update',
      '--name', created.key.name,
      '--quota', '10',
      '--expires-at', '2030-01-02T03:04:05Z',
      '--rate-limit-5h', '1',
      '--rate-limit-1d', '2',
      '--rate-limit-7d', '3',
      '--ip-whitelist', '10.0.0.1,10.0.0.2',
      '--ip-blacklist', '203.0.113.1'
    ], env, path.join(outDir, 'preview.json'), 'preview')
    if (keys[0].quota !== 2) throw new Error('dry-run mutated quota')
    if (preview.changes.length < 6) throw new Error('dry-run did not report expected changes')

    const updated = await run([
      'key', 'update',
      '--name', created.key.name,
      '--quota', '10',
      '--expires-at', '2030-01-02T03:04:05Z',
      '--rate-limit-5h', '1',
      '--rate-limit-1d', '2',
      '--rate-limit-7d', '3',
      '--ip-whitelist', '10.0.0.1,10.0.0.2',
      '--ip-blacklist', '203.0.113.1',
      '--confirm'
    ], env, path.join(outDir, 'updated.json'), 'updated')
    if (updated.after.quota !== 10) throw new Error('confirmed update did not change quota')
    if (updated.after.ip_whitelist.length !== 2) throw new Error('confirmed update did not change whitelist')

    const cleared = await run([
      'key', 'update',
      '--name', created.key.name,
      '--clear-expires-at',
      '--clear-ip-whitelist',
      '--clear-ip-blacklist',
      '--reset-quota-used',
      '--reset-rate-limit-usage',
      '--confirm'
    ], env, path.join(outDir, 'cleared.json'), 'updated')
    if (cleared.after.expires_at !== null) throw new Error('clear expiry failed')
    if (cleared.after.ip_whitelist.length || cleared.after.ip_blacklist.length) throw new Error('clear IP lists failed')

    await runWithoutVerify(['key', 'delete', '--name', created.key.name, '--confirm', '--json'], env)
    if (keys.length !== 0) throw new Error('delete did not remove mock key')

    console.log(JSON.stringify({
      ok: true,
      created: created.key.name,
      output_dir: outDir,
      checked: ['created', 'show', 'preview', 'updated', 'cleared', 'deleted']
    }))
  } finally {
    server.close()
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
