const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const root = path.resolve(__dirname, '..')
const cli = path.join(root, 'bin', 'codesome.js')
const token = 'mock-auto-sync-token'
const now = '2026-05-06T08:00:00Z'

let profileCount = 0
let statsCount = 0
let subscriptionCount = 0
let publicSettingsCount = 0

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ code: status >= 200 && status < 300 ? 0 : status, data }))
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function writeSession(home, baseUrl) {
  writeJson(path.join(home, 'session', 'storage-state.json'), {
    cookies: [],
    origins: [{
      origin: baseUrl,
      localStorage: [{ name: 'auth_token', value: token }]
    }]
  })
  writeJson(path.join(home, 'config.json'), {
    base_url: baseUrl,
    saved_at: now,
    final_url: `${baseUrl}/dashboard`
  })
}

function run(args, env, options = {}) {
  const finalArgs = options.json === false || args.includes('--json') ? args : [...args, '--json']
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
      const expectedCode = options.code ?? 0
      if (code !== expectedCode) {
        process.stderr.write(stderr)
        process.stderr.write(stdout)
        reject(new Error(`command exited ${code}, expected ${expectedCode}: codesome ${finalArgs.join(' ')}`))
        return
      }
      resolve({ stdout, stderr, code })
    })
  })
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  if (req.headers.authorization !== `Bearer ${token}`) {
    send(res, 401, { message: 'unauthorized' })
    return
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/auth/me') {
    profileCount += 1
    send(res, 200, {
      id: 1,
      email: 'auto-sync@example.com',
      username: 'auto-sync',
      status: 'active',
      balance: 42.5,
      total_recharged: 100,
      concurrency: 5,
      rpm_limit: 60
    })
    return
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/usage/dashboard/stats') {
    statsCount += 1
    send(res, 200, {
      today_cost: 1,
      today_actual_cost: 0.8,
      total_cost: 12,
      total_actual_cost: 9.5,
      today_requests: 3,
      total_requests: 30
    })
    return
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/subscriptions/active') {
    subscriptionCount += 1
    send(res, 200, [{ id: 1, status: 'active', group: { id: 2, name: 'codex' } }])
    return
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/settings/public') {
    publicSettingsCount += 1
    send(res, 200, {
      site_name: 'mock-sub2api',
      api_base_url: `${url.origin}/gateway`,
      custom_endpoints: []
    })
    return
  }
  send(res, 404, { message: 'not found' })
}

async function main() {
  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      send(res, 500, { message: error.message })
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codesome-auto-sync-'))
  writeSession(home, baseUrl)

  const env = {
    ...process.env,
    CODESOME_HOME: home,
    CODESOME_BASE_URL: baseUrl,
    CODESOME_DEV_ALLOW_INSECURE_BASE_URL: '1',
    CODESOME_AUTO_SYNC: '0',
    CODESOME_AUTO_NPM_UPDATE: '0'
  }

  try {
    const refreshed = await run(['sync', 'refresh'], env)
    const refreshData = JSON.parse(refreshed.stdout)
    assert(refreshData.last_success_at, 'sync refresh did not record success')
    assert(refreshData.account_snapshot.account.balance === 42.5, 'sync refresh did not save balance snapshot')
    assert(refreshData.account_snapshot.api_base_url === `${baseUrl}/gateway`, 'sync refresh did not save api_base_url snapshot')
    assert(refreshData.account_snapshot.use_base_urls.openai_base_url === `${baseUrl}/gateway/v1`, 'sync refresh computed OpenAI base url incorrectly')
    assert(profileCount === 1, 'sync refresh should call /auth/me once')
    assert(statsCount === 1, 'sync refresh should call dashboard stats once')
    assert(subscriptionCount === 1, 'sync refresh should call active subscriptions once')
    assert(publicSettingsCount === 1, 'sync refresh should call public settings once')

    const balance = await run(['balance', 'show', '--refresh'], env)
    const balanceData = JSON.parse(balance.stdout)
    assert(balanceData.sync.last_success_at, 'balance --refresh did not include sync status')
    assert(balanceData.account.balance === 42.5, 'balance show did not return latest remote balance')
    assert(balanceData.sync.recharge_delay.includes('10-60 秒'), 'sync delay range missing')

    const text = await run(['balance', 'show', '--refresh'], env, { json: false })
    assert(text.stdout.includes('手动刷新：codesome balance show --refresh'), 'text output did not show manual refresh fallback')
    assert(text.stdout.includes('10-60 秒'), 'text output did not show delay range')

    console.log(JSON.stringify({
      ok: true,
      profile_count: profileCount,
      stats_count: statsCount,
      subscription_count: subscriptionCount,
      public_settings_count: publicSettingsCount
    }))
  } finally {
    server.close()
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
