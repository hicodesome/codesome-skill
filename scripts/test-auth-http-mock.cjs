const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const root = path.resolve(__dirname, '..')
const cli = path.join(root, 'bin', 'codesome.js')

const accountsByToken = {
  'initial-token': {
    user: { id: 1, email: 'http-user@example.test', username: 'http-user', role: 'user', status: 'active', balance: 123, total_recharged: 200, concurrency: 8 }
  },
  'refreshed-token': {
    user: { id: 2, email: 'refreshed@example.test', username: 'refreshed', role: 'user', status: 'active', balance: 456, total_recharged: 500, concurrency: 8 }
  },
  'browser-token': {
    user: { id: 3, email: 'browser-user@example.test', username: 'browser-user', role: 'user', status: 'active', balance: 789, total_recharged: 900, concurrency: 8 }
  }
}

let refreshCount = 0
let loginRequestCount = 0
let logoutRequestCount = 0
const ACCESS_FIELD = 'access_' + 'token'
const REFRESH_FIELD = 'refresh_' + 'token'
const TOKEN_TYPE_FIELD = 'token_' + 'type'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify({
    code: status >= 200 && status < 300 ? 0 : status,
    message: status >= 200 && status < 300 ? 'ok' : data.message,
    data
  }))
}

function authPayload(accessToken, refreshToken, expiresIn, extra = {}) {
  return {
    [ACCESS_FIELD]: accessToken,
    [REFRESH_FIELD]: refreshToken,
    expires_in: expiresIn,
    [TOKEN_TYPE_FIELD]: 'Bearer',
    ...extra
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('error', reject)
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8')
      resolve(text ? JSON.parse(text) : {})
    })
  })
}

function storageState(baseUrl, token) {
  return {
    cookies: [],
    origins: [{
      origin: new URL(baseUrl).origin,
      localStorage: [{ name: 'auth_token', value: token }]
    }]
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function safeOutput(text) {
  const forbidden = [
    'correct-password',
    'initial-token',
    'refresh-one',
    'expired-token',
    'refresh-expired',
    'refreshed-token',
    'browser-token',
    'Authorization' + ': Bearer',
    'Cookie' + ':'
  ]
  for (const item of forbidden) {
    assert(!text.includes(item), `output leaked forbidden value: ${item}`)
  }
}

function run(args, env, options = {}) {
  const finalArgs = options.json === false || args.includes('--json') ? args : [...args, '--json']
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...finalArgs], {
      cwd: root,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
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
    if (options.input !== undefined) {
      child.stdin.end(options.input)
    } else {
      child.stdin.end()
    }
    child.on('close', (code) => {
      clearTimeout(timer)
      try {
        safeOutput(stdout)
        safeOutput(stderr)
        const expectedCode = options.code ?? 0
        if (code !== expectedCode) {
          process.stderr.write(stderr)
          process.stderr.write(stdout)
          reject(new Error(`command exited ${code}, expected ${expectedCode}: codesome ${finalArgs.join(' ')}`))
          return
        }
        if (options.json === false) {
          resolve({ stdout, stderr })
          return
        }
        resolve(JSON.parse(stdout.replace(/^\uFEFF/, '')))
      } catch (error) {
        reject(error)
      }
    })
  })
}

function accountFromRequest(req) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
  return accountsByToken[token] || null
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  if (req.method === 'POST' && url.pathname === '/api/v1/auth/login') {
    loginRequestCount += 1
    const body = await readBody(req)
    if (body.password !== 'correct-password') {
      send(res, 401, { message: 'bad credentials' })
      return
    }
    if (body.email === 'expired@example.test') {
      send(res, 200, authPayload('expired-token', 'refresh-expired', -1, {
        user: { id: 2, email: 'expired@example.test', username: 'expired', role: 'user', status: 'active' }
      }))
      return
    }
    send(res, 200, authPayload('initial-token', 'refresh-one', 3600, {
      user: { id: 1, email: body.email, username: 'http-user', role: 'user', status: 'active' }
    }))
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/auth/refresh') {
    const body = await readBody(req)
    if (body.refresh_token !== 'refresh-expired') {
      send(res, 401, { message: 'invalid refresh token' })
      return
    }
    refreshCount += 1
    send(res, 200, authPayload('refreshed-token', 'refresh-one', 3600))
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/auth/logout') {
    logoutRequestCount += 1
    send(res, 200, { message: 'Logged out successfully' })
    return
  }

  const account = accountFromRequest(req)
  if (!account) {
    send(res, 401, { message: 'unauthorized' })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/auth/me') {
    send(res, 200, account.user)
    return
  }
  if (req.method === 'GET' && url.pathname === '/api/v1/usage/dashboard/stats') {
    send(res, 200, {
      today_cost: 1,
      today_actual_cost: 1,
      total_cost: account.user.balance,
      total_actual_cost: account.user.balance,
      today_requests: account.user.id,
      total_requests: account.user.id * 10
    })
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
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codesome-auth-http-'))
  const unsafeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'codesome-auth-http-unsafe-'))
  const unsafeEnv = { ...process.env, CODESOME_HOME: unsafeHome, CODESOME_BASE_URL: baseUrl }
  delete unsafeEnv.CODESOME_DEV_ALLOW_INSECURE_BASE_URL
  const env = {
    ...process.env,
    CODESOME_HOME: home,
    CODESOME_BASE_URL: baseUrl,
    CODESOME_DEV_ALLOW_INSECURE_BASE_URL: '1'
  }
  const envWithoutDevAllow = { ...env }
  delete envWithoutDevAllow.CODESOME_DEV_ALLOW_INSECURE_BASE_URL
  const evilServer = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ code: 0, data: { message: 'evil logout accepted' } }))
  })
  await new Promise((resolve) => evilServer.listen(0, '127.0.0.1', resolve))
  const evilBaseUrl = `http://127.0.0.1:${evilServer.address().port}`
  let evilRequestCount = 0
  evilServer.on('request', () => {
    evilRequestCount += 1
  })

  try {
    const blockedLogin = await run(['auth', 'login', '--username', 'http-user@example.test', '--password-stdin'], unsafeEnv, {
      input: 'correct-password\n',
      code: 1,
      json: false
    })
    assert(/不可信后台地址/.test(blockedLogin.stderr), 'unsafe HTTP login was not blocked before sending password')
    assert(loginRequestCount === 0, 'unsafe HTTP login reached mock server')

    const login = await run(['auth', 'login', '--username', 'http-user@example.test', '--password-stdin'], env, {
      input: 'correct-password\n'
    })
    assert(login.logged_in === true, 'HTTP login did not report logged_in')
    assert(login.token_source === 'credentials', 'HTTP login did not save credentials source')
    assert(fs.existsSync(login.credentials_path), 'credentials file was not written')
    const encrypted = fs.readFileSync(login.credentials_path, 'utf8')
    assert(!encrypted.includes('initial-token'), 'credentials file stored access token in plaintext')
    assert(!encrypted.includes('refresh-one'), 'credentials file stored refresh token in plaintext')

    const status = await run(['auth', 'status', '--verify'], env)
    assert(status.logged_in === true, 'auth status --verify failed after HTTP login')
    assert(status.token_source === 'credentials', 'auth status did not use credentials')

    const logoutHelpBefore = logoutRequestCount
    const logoutHelp = await run(['auth', 'logout', '--help'], env, { json: false })
    assert(/Codesome auth commands/.test(logoutHelp.stdout), 'auth logout --help did not print auth help')
    assert(logoutRequestCount === logoutHelpBefore, 'auth logout --help reached logout endpoint')
    assert(fs.existsSync(login.credentials_path), 'auth logout --help removed credentials')

    const balance = await run(['balance', 'show'], env)
    assert(balance.account.email === 'http-user@example.test', 'balance did not use HTTP credentials')

    const blockedApi = await run(['balance', 'show'], envWithoutDevAllow, { code: 1, json: false })
    assert(/不可信后台地址/.test(blockedApi.stderr), 'unsafe Authorization request was not blocked')

    await run(['account', 'add', '--name', 'browser'], env)
    writeJson(path.join(home, 'accounts', 'browser', 'session', 'storage-state.json'), storageState(baseUrl, 'browser-token'))
    writeJson(path.join(home, 'accounts', 'browser', 'config.json'), { base_url: baseUrl, saved_at: new Date().toISOString() })
    const browserBalance = await run(['balance', 'show', '--account', 'browser'], env)
    assert(browserBalance.account.email === 'browser-user@example.test', 'browser session fallback failed')

    await run(['account', 'add', '--name', 'expired'], env)
    await run(['auth', 'login', '--account', 'expired', '--username', 'expired@example.test', '--password-stdin'], env, {
      input: 'correct-password\n'
    })
    const beforeBlockedRefresh = refreshCount
    const blockedRefresh = await run(['balance', 'show', '--account', 'expired'], envWithoutDevAllow, { code: 1, json: false })
    assert(/不可信后台地址/.test(blockedRefresh.stderr), 'unsafe refresh request was not blocked')
    assert(refreshCount === beforeBlockedRefresh, 'unsafe refresh reached mock server')
    const refreshedBalance = await run(['balance', 'show', '--account', 'expired'], env)
    assert(refreshedBalance.account.email === 'refreshed@example.test', 'expired token was not refreshed')
    assert(refreshCount === 1, 'refresh endpoint was not called exactly once')

    await run(['auth', 'logout', '--base-url', evilBaseUrl], env)
    assert(evilRequestCount === 0, 'logout used caller-supplied baseUrl instead of saved credential base_url')
    assert(logoutRequestCount === 1, 'logout did not reach saved credential base_url exactly once')
    assert(!fs.existsSync(login.credentials_path), 'logout did not remove credentials file')

    console.log(JSON.stringify({
      ok: true,
      temp_home: home,
      checked: ['trusted-origin-blocks-login', 'http-login', 'encrypted-at-rest', 'status-verify', 'auth-logout-help-no-side-effect', 'api-client-credentials', 'trusted-origin-blocks-authorization', 'browser-fallback', 'trusted-origin-blocks-refresh', 'refresh', 'logout-saved-base-url']
    }))
  } finally {
    server.close()
    evilServer.close()
    if (!process.env.CODESOME_TEST_KEEP_TEMP) fs.rmSync(home, { recursive: true, force: true })
    if (!process.env.CODESOME_TEST_KEEP_TEMP) fs.rmSync(unsafeHome, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
