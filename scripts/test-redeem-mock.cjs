const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const { spawn, spawnSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const cli = path.join(root, 'bin', 'codesome.js')
const verify = path.join(root, 'scripts', 'verify-redeem-output.cjs')
const token = 'mock-redeem-token'

const balanceCode = 'MOCK-REDEEM-BALANCE-123456'
const subscriptionCode = 'MOCK-REDEEM-SUB-222222'
const resultShapeCode = 'MOCK-REDEEM-CONC-333333'
const usedCode = 'MOCK-REDEEM-USED-444444'
const adminCode = 'MOCK-ADMIN-ADJUST-555555'
const allCodes = [balanceCode, subscriptionCode, resultShapeCode, usedCode, adminCode]

let postCount = 0
let lastRedeemBody = null
const now = '2026-04-27T13:30:00Z'
const history = [
  {
    id: 1,
    code: balanceCode,
    type: 'balance',
    value: 10,
    status: 'used',
    used_at: now,
    created_at: '2026-04-27T13:00:00Z'
  },
  {
    id: 2,
    code: subscriptionCode,
    type: 'subscription',
    value: 30,
    status: 'used',
    used_at: now,
    created_at: '2026-04-27T13:05:00Z',
    group_id: 10,
    validity_days: 30,
    group: { id: 10, name: 'codex' }
  },
  {
    id: 3,
    code: adminCode,
    type: 'admin_balance',
    value: -2,
    status: 'used',
    used_at: now,
    created_at: '2026-04-27T13:10:00Z',
    notes: `manual adjustment for ${adminCode}`
  }
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
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

function writeSession(home, baseUrl) {
  writeJson(path.join(home, 'session', 'storage-state' + '.json'), storageState(baseUrl))
  writeJson(path.join(home, 'config.json'), {
    base_url: baseUrl,
    saved_at: now,
    final_url: `${baseUrl}/dashboard`
  })
}

function assertSafeOutput(text) {
  const forbidden = [
    ...allCodes,
    token,
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
        assertSafeOutput(stdout)
        assertSafeOutput(stderr)
        const expectedCode = options.code ?? 0
        if (code !== expectedCode) {
          process.stderr.write(stderr)
          process.stderr.write(stdout)
          reject(new Error(`command exited ${code}, expected ${expectedCode}: codesome ${finalArgs.join(' ')}`))
          return
        }
        resolve({ stdout, stderr, code })
      } catch (error) {
        reject(error)
      }
    })
  })
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  if (process.env.CODESOME_TEST_DEBUG) console.error(`mock: ${req.method} ${url.pathname}`)
  if (req.headers.authorization !== `Bearer ${token}`) {
    send(res, 401, { message: 'unauthorized' })
    return
  }

  if (req.method === 'GET' && url.pathname === '/api/v1/redeem/history') {
    send(res, 200, history)
    return
  }

  if (req.method === 'POST' && url.pathname === '/api/v1/redeem') {
    postCount += 1
    const body = await readBody(req)
    lastRedeemBody = body
    if (body.code === usedCode) {
      send(res, 409, { message: `redeem code ${body.code} already used` })
      return
    }
    if (body.code === resultShapeCode) {
      send(res, 200, {
        message: `redeemed ${body.code}`,
        type: 'concurrency',
        value: 3,
        new_concurrency: 8
      })
      return
    }
    send(res, 200, {
      id: 99,
      code: body.code,
      type: 'balance',
      value: 10,
      status: 'used',
      used_at: now,
      created_at: now
    })
    return
  }

  send(res, 404, { message: 'not found' })
}

function verifyJson(file, mode) {
  const checked = spawnSync(process.execPath, [verify, file, mode, ...allCodes], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000
  })
  if (checked.status !== 0) {
    process.stderr.write(checked.stderr)
    process.stderr.write(checked.stdout)
    throw new Error(`verification failed: ${mode}`)
  }
}

async function main() {
  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      send(res, 500, { message: error.message })
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const baseUrl = `http://127.0.0.1:${server.address().port}`
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codesome-redeem-'))
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codesome-redeem-output-'))
  writeSession(home, baseUrl)

  const env = {
    ...process.env,
    CODESOME_HOME: home,
    CODESOME_BASE_URL: baseUrl
  }

  try {
    const preview = await run(['redeem', 'apply', '--code', balanceCode], env)
    fs.writeFileSync(path.join(outDir, 'preview.json'), preview.stdout)
    verifyJson(path.join(outDir, 'preview.json'), 'preview')
    assert(postCount === 0, 'preview unexpectedly called POST /redeem')

    const previewText = await run(['redeem', 'apply', '--code', balanceCode], env, { json: false })
    assert(previewText.stdout.includes('本次未兑换'), 'text preview did not explain dry-run behavior')
    assert(postCount === 0, 'text preview unexpectedly called POST /redeem')

    const redeemed = await run(['redeem', 'apply', '--code', balanceCode, '--confirm'], env)
    fs.writeFileSync(path.join(outDir, 'redeemed.json'), redeemed.stdout)
    verifyJson(path.join(outDir, 'redeemed.json'), 'redeemed')
    assert(postCount === 1, 'confirm did not call POST /redeem exactly once')
    assert(lastRedeemBody?.code === balanceCode, 'confirm did not send original code to mock API')

    const resultShape = await run(['redeem', 'apply', '--code', resultShapeCode, '--confirm'], env)
    fs.writeFileSync(path.join(outDir, 'result-shape.json'), resultShape.stdout)
    verifyJson(path.join(outDir, 'result-shape.json'), 'redeemed')
    const resultShapeData = JSON.parse(resultShape.stdout)
    assert(resultShapeData.redeem.message === 'redeemed [REDACTED]', 'result-shape message was not redacted')
    assert(resultShapeData.redeem.new_concurrency === 8, 'result-shape response was not normalized')

    const hist = await run(['redeem', 'history'], env)
    fs.writeFileSync(path.join(outDir, 'history.json'), hist.stdout)
    verifyJson(path.join(outDir, 'history.json'), 'history')
    const historyData = JSON.parse(hist.stdout)
    assert(historyData.items.length === 3, 'history did not return mock items')
    assert(historyData.items[1].group.name === 'codex', 'subscription history group missing')
    assert(historyData.items[2].notes === 'manual adjustment for [REDACTED]', 'history notes were not redacted')

    await run(['redeem', 'apply', '--code', usedCode, '--confirm'], env, { code: 1 })

    console.log(JSON.stringify({
      ok: true,
      output_dir: outDir,
      post_count: postCount,
      checked: ['preview', 'preview-text', 'redeemed', 'result-shape', 'history', 'error-redaction']
    }))
  } finally {
    server.close()
  }
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
