const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const root = path.resolve(__dirname, '..')
const cli = path.join(root, 'bin', 'codesome.js')

const accountsByToken = {
  'legacy-token': {
    alias: 'default',
    user: { id: 1, email: 'default-user', username: 'default', status: 'active', balance: 100, total_recharged: 150 },
    key: { id: 101, name: 'default-key', key: 'default-secret-key', group_id: 10, status: 'active' }
  },
  'alpha-token': {
    alias: 'alpha',
    user: { id: 2, email: 'alpha-user', username: 'alpha', status: 'active', balance: 200, total_recharged: 250 },
    key: { id: 201, name: 'alpha-key', key: 'alpha-secret-key', group_id: 10, status: 'active' }
  },
  'beta-token': {
    alias: 'beta',
    user: { id: 3, email: 'beta-user', username: 'beta', status: 'active', balance: 300, total_recharged: 350 },
    key: { id: 301, name: 'beta-key', key: 'beta-secret-key', group_id: 10, status: 'active' }
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ code: status >= 200 && status < 300 ? 0 : status, data }))
}

function storageState(baseUrl, token) {
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

function writeLegacySession(home, baseUrl, token) {
  writeJson(path.join(home, 'session', 'storage-state.json'), storageState(baseUrl, token))
  writeJson(path.join(home, 'config.json'), {
    base_url: baseUrl,
    saved_at: '2026-04-27T00:00:00.000Z',
    final_url: `${baseUrl}/dashboard`
  })
}

function writeAccountSession(home, alias, baseUrl, token) {
  writeJson(path.join(home, 'accounts', alias, 'session', 'storage-state.json'), storageState(baseUrl, token))
  writeJson(path.join(home, 'accounts', alias, 'config.json'), {
    account_alias: alias,
    base_url: baseUrl,
    saved_at: '2026-04-27T00:00:00.000Z',
    final_url: `${baseUrl}/dashboard`
  })
}

function safeOutput(text) {
  const forbidden = [
    'legacy-token',
    'alpha-token',
    'beta-token',
    'default-secret-key',
    'alpha-secret-key',
    'beta-secret-key',
    'Authorization' + ': Bearer',
    'Cookie' + ':'
  ]
  for (const item of forbidden) {
    assert(!text.includes(item), `output leaked forbidden value: ${item}`)
  }
}

function run(args, env, options = {}) {
  const finalArgs = options.json === false || args.includes('--json') ? args : [...args, '--json']
  if (process.env.CODESOME_TEST_DEBUG) console.error(`run: codesome ${finalArgs.join(' ')}`)
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
  if (process.env.CODESOME_TEST_DEBUG) console.error(`mock: ${req.method} ${url.pathname}`)
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
  if (req.method === 'GET' && url.pathname === '/api/v1/keys') {
    send(res, 200, {
      page: 1,
      page_size: Number(url.searchParams.get('page_size') || 20),
      total: 1,
      items: [{
        ...account.key,
        group: { id: 10, name: 'codex', platform: 'anthropic', subscription_type: 'standard', rate_multiplier: 1, status: 'active' },
        quota: 0,
        quota_used: 0,
        created_at: '2026-04-27T00:00:00.000Z',
        updated_at: '2026-04-27T00:00:00.000Z',
        last_used_at: null
      }]
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
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codesome-multi-account-'))
  const env = { ...process.env, CODESOME_HOME: home, CODESOME_BASE_URL: baseUrl }

  try {
    writeLegacySession(home, baseUrl, 'legacy-token')
    const migrated = await run(['account', 'list'], env)
    assert(migrated.current === 'default', 'legacy account did not become current default')
    assert(migrated.items.some((item) => item.alias === 'default' && item.session_exists), 'legacy session was not migrated')

    const defaultBalance = await run(['balance', 'show'], env)
    assert(defaultBalance.account_context.alias === 'default', 'default balance did not use default account context')
    assert(defaultBalance.account.balance === 100, 'default balance used the wrong token')

    await run(['account', 'add', '--name', 'alpha'], env)
    await run(['account', 'add', '--name', 'beta'], env)
    writeAccountSession(home, 'alpha', baseUrl, 'alpha-token')
    writeAccountSession(home, 'beta', baseUrl, 'beta-token')

    const fakeExternalBrowser = path.join(home, 'fake-external-browser.exe')
    fs.writeFileSync(fakeExternalBrowser, '')
    const browserEnv = { ...env, CODESOME_BROWSER_PATH: fakeExternalBrowser }
    const browserStatus = await run(['browser', 'status', '--account', 'alpha'], browserEnv)
    assert(browserStatus.browser_source === 'missing', 'browser status should not use external browser')
    assert(browserStatus.external_browser_ignored === true, 'external browser should be reported as ignored')
    assert(browserStatus.profile_dir.endsWith(path.join('accounts', 'alpha', 'browser-profile')), 'browser profile should be account-specific')

    await run(['account', 'switch', 'beta'], env)
    const current = await run(['account', 'current'], env)
    assert(current.alias === 'beta', 'account switch did not update current account')

    const currentBalance = await run(['balance', 'show'], env)
    assert(currentBalance.account_context.alias === 'beta', 'current account was not used by default')
    assert(currentBalance.account.balance === 300, 'current account balance used the wrong token')

    const alphaBalance = await run(['balance', 'show', '--account', 'alpha'], env)
    assert(alphaBalance.account_context.alias === 'alpha', '--account alpha was not reported in JSON')
    assert(alphaBalance.account.balance === 200, '--account alpha used the wrong token')

    const alphaKeys = await run(['key', 'list', '--account', 'alpha'], env)
    const betaKeys = await run(['key', 'list', '--account', 'beta'], env)
    assert(alphaKeys.items[0].name === 'alpha-key', 'alpha key list used the wrong account')
    assert(betaKeys.items[0].name === 'beta-key', 'beta key list used the wrong account')

    await run(['account', 'rename', 'alpha', 'client-a'], env)
    const renamedKeys = await run(['key', 'list', '--account', 'client-a'], env)
    assert(renamedKeys.items[0].name === 'alpha-key', 'renamed account did not retain its session')

    const removePreview = await run(['account', 'remove', 'beta'], env)
    assert(removePreview.dry_run && removePreview.requires_confirm, 'account remove did not dry-run without --confirm')
    const afterPreview = await run(['account', 'list'], env)
    assert(afterPreview.items.some((item) => item.alias === 'beta'), 'dry-run removed account')

    await run(['account', 'remove', 'beta', '--confirm'], env)
    const afterRemove = await run(['account', 'list'], env)
    assert(!afterRemove.items.some((item) => item.alias === 'beta'), 'confirmed remove did not delete account')

    const invalid = await run(['account', 'add', '--name', '..bad'], env, { code: 1, json: false })
    assert(/路径穿越字符/.test(invalid.stderr), 'invalid alias did not report path traversal rejection')

    await run(['account', 'add', '--name', 'empty'], env)
    const missingSession = await run(['balance', 'show', '--account', 'empty'], env, { code: 1, json: false })
    assert(/codesome auth login --account empty/.test(missingSession.stderr), 'missing session did not suggest account-specific login')

    console.log(JSON.stringify({
      ok: true,
      temp_home: home,
      checked: ['legacy-migration', 'managed-browser-required', 'current-account', 'explicit-account', 'rename', 'remove-confirm', 'invalid-alias', 'missing-session']
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
