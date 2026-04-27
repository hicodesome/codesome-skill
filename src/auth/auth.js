import fs from 'node:fs/promises'
import path from 'node:path'
import { loadChromium, launchChromium } from './browser.js'
import { loginWithSystemBrowser } from './system-browser.js'
import { CONFIG_PATH, SESSION_DIR, STORAGE_STATE_PATH, resolveBaseUrl } from '../config/paths.js'

const DEFAULT_LOGIN_TIMEOUT_MS = 10 * 60 * 1000
const LOGIN_POLL_INTERVAL_MS = 1500

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function ensureDirs() {
  await fs.mkdir(SESSION_DIR, { recursive: true })
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function cookieSummary(storageState) {
  const cookies = Array.isArray(storageState?.cookies) ? storageState.cookies : []
  const origins = Array.isArray(storageState?.origins) ? storageState.origins : []
  const domains = [...new Set(cookies.map((cookie) => cookie.domain).filter(Boolean))]
  return {
    cookie_count: cookies.length,
    origin_count: origins.length,
    domains
  }
}

function isAuthPage(url) {
  try {
    const parsed = new URL(url)
    return /\/login|\/register|\/forgot-password|\/reset-password|\/email-verify|\/auth\/callback/i.test(parsed.pathname)
  } catch {
    return true
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForLoginComplete(page, context, timeoutMs) {
  const startedAt = Date.now()
  let lastUrl = page.url()

  while (Date.now() - startedAt < timeoutMs) {
    if (page.isClosed()) {
      throw new Error('登录窗口已关闭，未保存登录态。')
    }

    lastUrl = page.url()
    const storageState = await context.storageState()
    const summary = cookieSummary(storageState)
    const hasAuthToken = (storageState.origins || []).some((origin) =>
      (origin.localStorage || []).some((item) => item.name === 'auth_token' && item.value)
    )
    const leftAuthPage = !isAuthPage(lastUrl)

    if (leftAuthPage && hasAuthToken) {
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {})
      return { storageState, final_url: lastUrl, ...summary }
    }

    await sleep(LOGIN_POLL_INTERVAL_MS)
  }

  throw new Error(`登录等待超时，请确认已经完成登录。最后页面：${lastUrl}`)
}

export async function getAuthStatus(options = {}) {
  const baseUrl = resolveBaseUrl(options.baseUrl)
  const sessionExists = await exists(STORAGE_STATE_PATH)
  const configExists = await exists(CONFIG_PATH)
  const result = {
    logged_in: false,
    session_exists: sessionExists,
    session_path: STORAGE_STATE_PATH,
    config_path: CONFIG_PATH,
    base_url: baseUrl,
    checked_remote: false,
    message: ''
  }

  if (!sessionExists) {
    result.message = '未找到登录态，请先运行 codesome auth login。'
    return result
  }

  try {
    const storageState = await readJson(STORAGE_STATE_PATH)
    Object.assign(result, cookieSummary(storageState))
    result.logged_in = true
    result.message = '本地登录态存在。'
  } catch {
    result.logged_in = false
    result.message = '登录态文件损坏，请重新运行 codesome auth login。'
    return result
  }

  if (options.verify) {
    result.checked_remote = true
    const chromium = await loadChromium()
    const browser = await launchChromium(chromium, { headless: true })
    try {
      const context = await browser.newContext({ storageState: STORAGE_STATE_PATH })
      const page = await context.newPage()
      const response = await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 })
      const url = page.url()
      result.final_url = url
      result.http_status = response?.status() ?? null
      result.logged_in = !isAuthPage(url)
      result.message = result.logged_in ? '远程校验通过。' : '远程校验未通过，请重新运行 codesome auth login。'
      await context.close()
    } finally {
      await browser.close()
    }
  }

  if (configExists) {
    try {
      const config = await readJson(CONFIG_PATH)
      if (config.account_hint) result.account_hint = config.account_hint
      if (config.saved_at) result.saved_at = config.saved_at
    } catch {
      result.config_warning = '配置文件读取失败。'
    }
  }

  return result
}

export async function login(options = {}) {
  const baseUrl = resolveBaseUrl(options.baseUrl)
  const timeoutMs = Number(options.timeoutMs || DEFAULT_LOGIN_TIMEOUT_MS)
  await ensureDirs()

  console.log(`Opening Codesome: ${baseUrl}`)
  console.log('Please sign in in the browser. The CLI will not read your password.')
  console.log('The session is saved automatically after login; do not press Enter.')

  if (process.pkg) {
    const loginState = await loginWithSystemBrowser({ baseUrl, timeoutMs })
    await writeJson(STORAGE_STATE_PATH, loginState.storageState)
    const savedAt = new Date().toISOString()
    await writeJson(CONFIG_PATH, {
      base_url: baseUrl,
      saved_at: savedAt,
      final_url: loginState.final_url
    })
    const summary = cookieSummary(loginState.storageState)
    return {
      logged_in: true,
      session_path: STORAGE_STATE_PATH,
      config_path: CONFIG_PATH,
      final_url: loginState.final_url,
      saved_at: savedAt,
      cookie_count: summary.cookie_count,
      origin_count: summary.origin_count,
      domains: summary.domains,
      message: 'Login session saved.'
    }
  }

  const chromium = await loadChromium()
  const browser = await launchChromium(chromium, { headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    const loginState = await waitForLoginComplete(page, context, timeoutMs)
    await writeJson(STORAGE_STATE_PATH, loginState.storageState)
    const savedAt = new Date().toISOString()
    await writeJson(CONFIG_PATH, {
      base_url: baseUrl,
      saved_at: savedAt,
      final_url: loginState.final_url
    })
    return {
      logged_in: true,
      session_path: STORAGE_STATE_PATH,
      config_path: CONFIG_PATH,
      final_url: loginState.final_url,
      saved_at: savedAt,
      cookie_count: loginState.cookie_count,
      origin_count: loginState.origin_count,
      domains: loginState.domains,
      message: 'Login session saved.'
    }
  } finally {
    await context.close().catch(() => {})
    await browser.close().catch(() => {})
  }
}

export async function logout() {
  const removed = []
  for (const filePath of [STORAGE_STATE_PATH, CONFIG_PATH]) {
    if (await exists(filePath)) {
      await fs.rm(filePath, { force: true })
      removed.push(filePath)
    }
  }
  return {
    logged_in: false,
    removed,
    message: removed.length ? '登录态已清理。' : '本地没有登录态。'
  }
}
