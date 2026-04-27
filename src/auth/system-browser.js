import fs from 'node:fs/promises'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'
import WebSocket from 'ws'
import { findBrowser } from './browser.js'
import { CODESOME_HOME, getAccountDir, resolveBaseUrl } from '../config/paths.js'

const CDP_PORT_BASE = 19425
const CDP_PORT_RANGE = 1000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function requestJson(url, options = {}) {
  const parsed = new URL(url)
  return new Promise((resolve, reject) => {
    const req = http.request(parsed, { method: options.method || 'GET' }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`CDP request failed: ${res.statusCode} ${url}`))
          return
        }
        resolve(JSON.parse(text))
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function cdpSend(ws, method, params = {}) {
  const id = cdpSend.nextId++
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => {
    const onMessage = (raw) => {
      const message = JSON.parse(String(raw))
      if (message.id !== id) return
      ws.off('message', onMessage)
      if (message.error) reject(new Error(message.error.message || method))
      else resolve(message.result || {})
    }
    ws.on('message', onMessage)
  })
}
cdpSend.nextId = 1

function connectWebSocket(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    ws.once('open', () => resolve(ws))
    ws.once('error', reject)
  })
}

export function accountPort(alias) {
  const text = String(alias || 'default')
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return CDP_PORT_BASE + (hash % CDP_PORT_RANGE)
}

export function accountBrowserProfileDir(alias) {
  return alias ? path.join(getAccountDir(alias), 'browser-profile') : path.join(CODESOME_HOME, 'browser-profile')
}

async function waitForCdp(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      return await requestJson(`http://127.0.0.1:${port}/json/version`)
    } catch (error) {
      lastError = error
      await sleep(300)
    }
  }
  throw lastError || new Error('Cannot connect to local browser debugging port.')
}

function isAuthPage(url) {
  try {
    const parsed = new URL(url)
    return /\/login|\/register|\/forgot-password|\/reset-password|\/email-verify|\/auth\/callback/i.test(parsed.pathname)
  } catch {
    return true
  }
}

function toPlaywrightCookie(cookie) {
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path || '/',
    expires: cookie.expires || -1,
    httpOnly: Boolean(cookie.httpOnly),
    secure: Boolean(cookie.secure),
    sameSite: cookie.sameSite === 'Strict' ? 'Strict' : cookie.sameSite === 'Lax' ? 'Lax' : 'None'
  }
}

async function readTabState(tab, baseUrl) {
  const ws = await connectWebSocket(tab.webSocketDebuggerUrl)
  try {
    await cdpSend(ws, 'Runtime.enable')
    await cdpSend(ws, 'Network.enable')
    const urlResult = await cdpSend(ws, 'Runtime.evaluate', {
      expression: 'location.href',
      returnByValue: true
    })
    const evalResult = await cdpSend(ws, 'Runtime.evaluate', {
      expression: 'JSON.stringify(Object.entries(localStorage).map(([name,value]) => ({name,value})))',
      returnByValue: true
    })
    const cookiesResult = await cdpSend(ws, 'Network.getAllCookies')
    const origin = new URL(baseUrl).origin
    const localStorage = JSON.parse(evalResult.result?.value || '[]')
    return {
      final_url: urlResult.result?.value || tab.url || '',
      storageState: {
        cookies: (cookiesResult.cookies || []).map(toPlaywrightCookie),
        origins: [{ origin, localStorage }]
      }
    }
  } finally {
    ws.close()
  }
}

function hasAuthToken(state) {
  return state.origins[0].localStorage.some((item) => item.name === 'auth_token' && item.value)
}

async function findLoggedInCodesomeTab(port, baseUrl) {
  const tabs = await requestJson(`http://127.0.0.1:${port}/json`)
  const candidates = tabs.filter((tab) => tab.type === 'page' && tab.url && tab.url.startsWith(baseUrl))
  for (const tab of candidates) {
    const result = await readTabState(tab, baseUrl).catch(() => null)
    if (result && hasAuthToken(result.storageState) && !isAuthPage(result.final_url)) return result
  }
  return null
}

export async function loginWithSystemBrowser(options = {}) {
  const baseUrl = resolveBaseUrl(options.baseUrl)
  const timeoutMs = Number(options.timeoutMs || 10 * 60 * 1000)
  const accountAlias = options.accountAlias || 'default'
  const cdpPort = accountPort(accountAlias)
  const profileDir = accountBrowserProfileDir(accountAlias)
  const browserPath = findBrowser()
  if (!browserPath) {
    throw new Error('未安装 Codesome 专用浏览器。请先运行 codesome browser install 安装 Chrome for Testing；登录不会使用系统 Chrome/Edge 或 CODESOME_BROWSER_PATH。')
  }

  await fs.mkdir(profileDir, { recursive: true })
  const child = spawn(browserPath, [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    `${baseUrl}/login`
  ], { detached: true, stdio: 'ignore' })
  child.unref()

  await waitForCdp(cdpPort)
  await requestJson(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(`${baseUrl}/login`)}`, { method: 'PUT' }).catch(() => null)

  const startedAt = Date.now()
  let lastUrl = `${baseUrl}/login`
  while (Date.now() - startedAt < timeoutMs) {
    const loggedIn = await findLoggedInCodesomeTab(cdpPort, baseUrl)
    if (loggedIn) return loggedIn
    const tabs = await requestJson(`http://127.0.0.1:${cdpPort}/json`).catch(() => [])
    const firstCodesome = tabs.find((tab) => tab.type === 'page' && tab.url && tab.url.startsWith(baseUrl))
    if (firstCodesome?.url) lastUrl = firstCodesome.url
    await sleep(1500)
  }

  throw new Error(`Login timed out. Last page: ${lastUrl}`)
}
