const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const root = path.resolve(__dirname, '..')
const cli = path.join(root, 'bin', 'codesome.js')

const ACCESS_FIELD = 'access_' + 'token'
const REFRESH_FIELD = 'refresh_' + 'token'
const TOKEN_TYPE_FIELD = 'token_' + 'type'

let loginRequestCount = 0
let logoutRequestCount = 0

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

function authPayload(accessToken, refreshToken, expiresIn, user) {
  return {
    [ACCESS_FIELD]: accessToken,
    [REFRESH_FIELD]: refreshToken,
    [TOKEN_TYPE_FIELD]: 'Bearer',
    expires_in: expiresIn,
    user
  }
}

function safeOutput(text) {
  const forbidden = [
    'correct-password',
    'custom-access-token',
    'custom-refresh-token',
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
    if (options.input !== undefined) child.stdin.end(options.input)
    else child.stdin.end()
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

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)

  if (req.method === 'POST' && url.pathname === '/api/v1/auth/login') {
    loginRequestCount += 1
    const body = await readBody(req)
    if (body.password !== 'correct-password') {
      send(res, 401, { message: 'bad credentials' })
      return
    }
    send(res, 200, authPayload('custom-access-token', 'custom-refresh-token', 3600, {
      id: 10,
      email: body.email,
      username: 'custom-user',
      role: 'user',
      status: 'active'
    }))
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/auth/logout') {
    logoutRequestCount += 1
    send(res, 200, { message: 'Logged out successfully' })
    return
  }

  const auth = req.headers.authorization || ''
  if (auth !== 'Bearer custom-access-token') {
    send(res, 401, { message: 'unauthorized' })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/auth/me') {
    send(res, 200, {
      id: 10,
      email: 'custom-user@example.test',
      username: 'custom-user',
      role: 'user',
      status: 'active'
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/usage/dashboard/stats') {
    send(res, 200, {
      today_cost: 1.5,
      today_actual_cost: 1.25,
      total_cost: 9,
      total_actual_cost: 7,
      today_requests: 3,
      total_requests: 30
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

  const evilServer = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ code: 0, data: { message: 'evil accepted' } }))
  })
  await new Promise((resolve) => evilServer.listen(0, '127.0.0.1', resolve))
  const evilBaseUrl = `http://127.0.0.1:${evilServer.address().port}`
  let evilRequestCount = 0
  evilServer.on('request', () => {
    evilRequestCount += 1
  })

  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codesome-instance-'))
  const unsafeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'codesome-instance-unsafe-'))
  const env = {
    ...process.env,
    CODESOME_HOME: home,
    CODESOME_DEV_ALLOW_INSECURE_BASE_URL: '1'
  }
  const unsafeEnv = { ...process.env, CODESOME_HOME: unsafeHome }
  delete unsafeEnv.CODESOME_DEV_ALLOW_INSECURE_BASE_URL

  try {
    const defaultStatus = await run(['auth', 'status'], env)
    assert(defaultStatus.instance_id === 'codesome', 'default auth status did not use codesome instance')
    assert(defaultStatus.credentials_path.endsWith(path.join('.codesome', 'accounts', 'default', 'credentials.enc')) || defaultStatus.credentials_path.endsWith(path.join('accounts', 'default', 'credentials.enc')), 'default instance did not use legacy account directory')

    const blockedLogin = await run(['auth', 'login', '--base-url', baseUrl, '--username', 'blocked@example.test', '--password-stdin'], unsafeEnv, {
      input: 'correct-password\n',
      code: 1,
      json: false
    })
    assert(/不可信后台地址/.test(blockedLogin.stderr), 'unregistered base-url login was not blocked')
    assert(loginRequestCount === 0, 'unregistered base-url login reached mock server')

    const blockedAdd = await run(['instance', 'add', 'blocked', '--base-url', baseUrl], unsafeEnv, { code: 1, json: false })
    assert(/必须使用 HTTPS|本地 mock/.test(blockedAdd.stderr), 'unsafe instance add did not require dev flag')

    const offlineBaseUrl = 'https://offline-sub2api.example.test'
    const offlineAdded = await run(['instance', 'add', 'offline', '--base-url', `${offlineBaseUrl}/dashboard`], unsafeEnv)
    assert(offlineAdded.added === true, 'offline https instance add did not report added')
    assert(offlineAdded.instance.base_url === offlineBaseUrl, 'offline https instance did not normalize dashboard link to origin')
    const offlineStatus = await run(['instance', 'status', 'offline'], unsafeEnv)
    assert(offlineStatus.base_url === offlineBaseUrl, 'offline https instance status mismatch')
    await run(['instance', 'remove', 'offline', '--confirm'], unsafeEnv)

    const added = await run(['instance', 'add', 'custom', '--base-url', baseUrl], env)
    assert(added.added === true, 'instance add did not report added')
    assert(added.instance.id === 'custom', 'instance id mismatch')
    assert(added.instance.base_url === baseUrl, 'instance base_url mismatch')

    const listed = await run(['instance', 'list'], env)
    assert(listed.current === 'codesome', 'instance add should not switch current by default')
    assert(listed.items.some((item) => item.id === 'custom' && item.base_url === baseUrl), 'instance list missing custom')

    const current = await run(['instance', 'current'], env)
    assert(current.id === 'codesome', 'default current instance should remain codesome')

    const switched = await run(['instance', 'switch', 'custom'], env)
    assert(switched.switched === true && switched.instance.id === 'custom', 'instance switch failed')

    const status = await run(['instance', 'status', 'custom'], env)
    assert(status.id === 'custom' && status.current === true, 'instance status did not report custom current')

    const login = await run(['auth', 'login', '--instance', 'custom', '--username', 'custom-user@example.test', '--password-stdin'], env, {
      input: 'correct-password\n'
    })
    assert(login.logged_in === true, 'custom instance login failed')
    assert(login.instance_id === 'custom', 'login did not report custom instance')
    assert(login.credentials_path.endsWith(path.join('instances', 'custom', 'accounts', 'default', 'credentials.enc')), 'custom credentials path was not instance-scoped')
    assert(fs.existsSync(login.credentials_path), 'custom credentials file missing')
    assert(loginRequestCount === 1, 'custom login did not reach mock exactly once')

    const verified = await run(['auth', 'status', '--instance', 'custom', '--verify'], env)
    assert(verified.logged_in === true, 'custom instance verify failed')
    assert(verified.instance_id === 'custom', 'verify did not report custom instance')
    assert(verified.token_source === 'credentials', 'verify did not use credentials')

    const customBalance = await run(['balance', 'show', '--instance', 'custom'], env)
    assert(customBalance.account_context.instance_id === 'custom', 'business command did not report custom instance context')
    assert(customBalance.account_context.base_url === baseUrl, 'business command did not use custom instance baseUrl')
    assert(customBalance.account.id === 10, 'business command did not call custom instance auth/me')
    assert(customBalance.usage.today_requests === 3, 'business command did not read custom instance dashboard stats')

    const missingInstance = await run(['balance', 'show', '--instance', 'missing-instance'], env, { code: 1, json: false })
    assert(/实例不存在：missing-instance/.test(missingInstance.stderr), 'business command ignored missing instance')

    await run(['auth', 'logout', '--instance', 'custom', '--base-url', evilBaseUrl], env)
    assert(evilRequestCount === 0, 'custom logout used caller-supplied evil baseUrl')
    assert(logoutRequestCount === 1, 'custom logout did not hit saved instance baseUrl')
    assert(!fs.existsSync(login.credentials_path), 'custom logout did not remove credentials')

    const removePreview = await run(['instance', 'remove', 'custom'], env)
    assert(removePreview.dry_run === true && removePreview.requires_confirm === true, 'instance remove did not dry-run')
    await run(['instance', 'remove', 'custom', '--confirm'], env)
    const afterRemove = await run(['instance', 'list'], env)
    assert(!afterRemove.items.some((item) => item.id === 'custom'), 'instance remove did not delete custom')
    assert(afterRemove.current === 'codesome', 'current instance did not fall back to codesome')

    console.log(JSON.stringify({
      ok: true,
      temp_home: home,
      checked: ['instance-add-list-current-switch-status-remove', 'offline-https-instance-add-no-review', 'unregistered-base-url-blocked', 'custom-instance-login', 'custom-instance-verify', 'business-command-custom-instance', 'business-command-missing-instance-blocked', 'instance-scoped-credentials', 'logout-saved-instance-base-url', 'default-instance-legacy-account-dir']
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
