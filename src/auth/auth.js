import fs from 'node:fs/promises'
import path from 'node:path'
import { resolveBaseUrl } from '../config/paths.js'
import { resolveAccountContext, updateAccountRecord } from '../accounts/accounts.js'
import { createApiClient } from '../api/client.js'
import { requestApiJson } from '../api/http.js'
import { completeTotpLogin, loginWithHttpCredentials } from './providers/http-credential-provider.js'
import { findAuthToken } from './providers/browser-session-provider.js'
import {
  credentialsExist,
  loadCredentials,
  removeCredentials,
  safeCredentialSummary
} from './secret-store.js'
import { saveAuthResponseCredentials } from './token-source.js'
import { promptPassword, promptText, readStdinSecret } from './prompt.js'

const DEFAULT_LOGIN_TIMEOUT_MS = 10 * 60 * 1000

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function ensureDirs(accountContext) {
  await fs.mkdir(accountContext.sessionDir, { recursive: true })
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

function safeUser(user) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status
  }
}

async function loginWithBrowser(account, baseUrl, timeoutMs) {
  await ensureDirs(account)
  const { loginWithSystemBrowser } = await import('./system-browser.js')
  const loginState = await loginWithSystemBrowser({ baseUrl, timeoutMs, accountAlias: account.alias })
  await writeJson(account.storageStatePath, loginState.storageState)
  const savedAt = new Date().toISOString()
  await writeJson(account.configPath, {
    account_alias: account.alias,
    base_url: baseUrl,
    saved_at: savedAt,
    final_url: loginState.final_url,
    credential_source: 'browser-session'
  })
  await updateAccountRecord(account.alias, {
    base_url: baseUrl,
    saved_at: savedAt,
    final_url: loginState.final_url
  })
  await removeCredentials(account)
  const summary = cookieSummary(loginState.storageState)
  return {
    account_alias: account.alias,
    logged_in: true,
    token_source: 'browser-session',
    session_path: account.storageStatePath,
    credentials_path: account.credentialsPath,
    config_path: account.configPath,
    final_url: loginState.final_url,
    saved_at: savedAt,
    cookie_count: summary.cookie_count,
    origin_count: summary.origin_count,
    domains: summary.domains,
    message: '浏览器登录态已保存。'
  }
}

async function resolveLoginEmail(options) {
  const value = (options.username || options.email || '').trim()
  if (value) return value
  return promptText('Codesome 邮箱：')
}

async function resolveLoginPassword(options) {
  if (options.password !== undefined) return options.password
  if (options.passwordStdin) {
    const value = await readStdinSecret()
    if (!value) throw new Error('--password-stdin 没有读取到密码。')
    return value
  }
  return promptPassword('Codesome 密码：')
}

export async function getAuthStatus(options = {}) {
  const account = await resolveAccountContext({
    account: options.account,
    createIfMissing: !options.account,
    baseUrl: options.baseUrl
  })
  const baseUrl = resolveBaseUrl(options.baseUrl || process.env.CODESOME_BASE_URL || account.baseUrl)
  const sessionExists = await exists(account.storageStatePath)
  const configExists = await exists(account.configPath)
  const httpCredentialsExist = await credentialsExist(account)
  const result = {
    account_alias: account.alias,
    current_account: account.current,
    logged_in: false,
    token_source: null,
    credentials_exists: httpCredentialsExist,
    credentials_path: account.credentialsPath,
    session_exists: sessionExists,
    session_path: account.storageStatePath,
    config_path: account.configPath,
    base_url: baseUrl,
    checked_remote: false,
    message: ''
  }

  if (httpCredentialsExist) {
    const summary = await safeCredentialSummary(account)
    if (summary?.unreadable) {
      result.credentials_unreadable = true
      result.message = 'HTTP 登录凭证无法读取，请重新登录。'
    } else {
      result.logged_in = true
      result.token_source = 'credentials'
      result.credential = summary
      result.message = 'HTTP 登录凭证存在。'
    }
  }

  if (sessionExists) {
    try {
      const storageState = await readJson(account.storageStatePath)
      Object.assign(result, cookieSummary(storageState))
      result.browser_auth_token_exists = Boolean(findAuthToken(storageState, baseUrl))
      if (!result.logged_in && result.browser_auth_token_exists) {
        result.logged_in = true
        result.token_source = 'browser-session'
        result.message = '浏览器登录态存在。'
      }
    } catch {
      result.session_warning = '浏览器登录态文件损坏。'
    }
  }

  if (!result.logged_in && !result.message) {
    result.message = '未找到登录凭证，请先运行 codesome auth login。'
  }

  if (options.verify) {
    result.checked_remote = true
    let client
    try {
      client = await createApiClient({ account: account.alias, baseUrl })
      await client.get('/auth/me')
      result.http_status = 200
      result.logged_in = true
      result.token_source = client.account.token_source
      result.message = '远程校验通过。'
    } catch (error) {
      result.logged_in = false
      result.http_status = error?.details?.status ?? null
      result.message = '远程校验未通过，请重新运行 codesome auth login。'
    } finally {
      await client?.close()
    }
  }

  if (configExists) {
    try {
      const config = await readJson(account.configPath)
      if (config.account_hint) result.account_hint = config.account_hint
      if (config.saved_at) result.saved_at = config.saved_at
      if (config.credential_source) result.config_credential_source = config.credential_source
    } catch {
      result.config_warning = '配置文件读取失败。'
    }
  }

  return result
}

export async function login(options = {}) {
  const account = await resolveAccountContext({ account: options.account, createIfMissing: true, baseUrl: options.baseUrl })
  const baseUrl = resolveBaseUrl(options.baseUrl || process.env.CODESOME_BASE_URL || account.baseUrl)
  const timeoutMs = Number(options.timeoutMs || DEFAULT_LOGIN_TIMEOUT_MS)

  if (options.browser) {
    return loginWithBrowser(account, baseUrl, timeoutMs)
  }

  const email = await resolveLoginEmail(options)
  const password = await resolveLoginPassword(options)
  let authResponse = await loginWithHttpCredentials({ baseUrl, email, password, timeoutMs })
  if (authResponse?.requires_2fa) {
    const code = options.totpCode || await promptText(`2FA 验证码${authResponse.user_email_masked ? `（${authResponse.user_email_masked}）` : ''}：`)
    authResponse = await completeTotpLogin({
      baseUrl,
      tempToken: authResponse.temp_token,
      totpCode: code,
      timeoutMs
    })
  }

  const credentials = await saveAuthResponseCredentials(account, baseUrl, authResponse)
  const savedAt = credentials.saved_at
  await writeJson(account.configPath, {
    account_alias: account.alias,
    base_url: baseUrl,
    saved_at: savedAt,
    account_hint: authResponse.user?.email || email,
    credential_source: 'http'
  })
  await updateAccountRecord(account.alias, {
    base_url: baseUrl,
    saved_at: savedAt,
    final_url: `${baseUrl}/dashboard`
  })

  return {
    account_alias: account.alias,
    logged_in: true,
    token_source: 'credentials',
    credentials_path: account.credentialsPath,
    session_path: account.storageStatePath,
    config_path: account.configPath,
    base_url: baseUrl,
    saved_at: savedAt,
    user: safeUser(authResponse.user),
    message: 'HTTP 登录凭证已保存。'
  }
}

export async function logout(options = {}) {
  const account = await resolveAccountContext({ account: options.account, createIfMissing: !options.account })
  const baseUrl = resolveBaseUrl(options.baseUrl || process.env.CODESOME_BASE_URL || account.baseUrl)
  const credentials = await loadCredentials(account).catch(() => null)
  if (credentials?.refresh_token) {
    await requestApiJson(baseUrl, 'POST', '/auth/logout', {
      body: { refresh_token: credentials.refresh_token },
      token: credentials.access_token,
      timezone: false,
      timeoutMs: options.timeoutMs
    }).catch(() => null)
  }

  const removed = []
  if (await removeCredentials(account)) removed.push(account.credentialsPath)
  for (const filePath of [account.storageStatePath, account.configPath]) {
    if (await exists(filePath)) {
      await fs.rm(filePath, { force: true })
      removed.push(filePath)
    }
  }
  return {
    account_alias: account.alias,
    logged_in: false,
    removed,
    message: removed.length ? '本地登录凭证已清理。' : '本地没有登录凭证。'
  }
}
