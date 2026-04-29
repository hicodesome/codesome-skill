import { resolveInstanceAccountContext } from '../instances/instances.js'
import { resolveBaseUrl } from '../config/paths.js'
import { ApiError } from '../api/errors.js'
import { requestApiJson } from '../api/http.js'
import { loadCredentials, saveCredentials } from './secret-store.js'
import { loadBrowserSessionToken } from './providers/browser-session-provider.js'

const TOKEN_REFRESH_BUFFER_MS = 120 * 1000

function now() {
  return Date.now()
}

function expiresAtFromSeconds(expiresIn) {
  return expiresIn ? now() + Number(expiresIn) * 1000 : null
}

function isExpiring(credentials) {
  if (!credentials?.expires_at) return false
  return Number(credentials.expires_at) <= now() + TOKEN_REFRESH_BUFFER_MS
}

function requireAccessToken(response, code = 'NO_ACCESS_TOKEN') {
  if (response?.access_token) return
  throw new ApiError('HTTP 登录没有返回有效凭证，请改用 codesome auth login --browser。', { code })
}

export function credentialFromAuthResponse(accountContext, baseUrl, response) {
  requireAccessToken(response)
  return {
    version: 1,
    source: 'http',
    account_alias: accountContext.alias,
    base_url: baseUrl,
    access_token: response.access_token,
    refresh_token: response.refresh_token || null,
    token_type: response.token_type || 'Bearer',
    expires_at: expiresAtFromSeconds(response.expires_in),
    saved_at: new Date().toISOString(),
    user: response.user ? {
      id: response.user.id,
      email: response.user.email,
      username: response.user.username,
      role: response.user.role,
      status: response.user.status
    } : null
  }
}

export async function saveAuthResponseCredentials(accountContext, baseUrl, response) {
  const credentials = credentialFromAuthResponse(accountContext, baseUrl, response)
  await saveCredentials(accountContext, credentials)
  return credentials
}

async function refreshCredentials(accountContext, baseUrl, credentials, options = {}) {
  if (!credentials?.refresh_token) {
    throw new ApiError(`账号 ${accountContext.alias} 的 HTTP 登录凭证已过期，请重新运行 codesome auth login --account ${accountContext.alias}。`, {
      code: 'TOKEN_EXPIRED',
      account_alias: accountContext.alias,
      credentials_path: accountContext.credentialsPath
    })
  }

  const data = await requestApiJson(baseUrl, 'POST', '/auth/refresh', {
    body: { refresh_token: credentials.refresh_token },
    timezone: false,
    timeoutMs: options.timeoutMs,
    trustedOrigins: options.trustedOrigins || accountContext.trustedOrigins
  })
  requireAccessToken(data, 'REFRESH_NO_ACCESS_TOKEN')
  const next = {
    ...credentials,
    access_token: data.access_token,
    refresh_token: data.refresh_token || credentials.refresh_token,
    token_type: data.token_type || credentials.token_type || 'Bearer',
    expires_at: expiresAtFromSeconds(data.expires_in),
    saved_at: new Date().toISOString()
  }
  await saveCredentials(accountContext, next)
  return next
}

async function loadHttpCredentials(accountContext, baseUrl, options = {}) {
  let credentials
  try {
    credentials = await loadCredentials(accountContext)
  } catch {
    throw new ApiError(`账号 ${accountContext.alias} 的 HTTP 登录凭证无法读取，请重新运行 codesome auth login --account ${accountContext.alias}。`, {
      code: 'CREDENTIALS_UNREADABLE',
      account_alias: accountContext.alias,
      credentials_path: accountContext.credentialsPath
    })
  }
  if (!credentials?.access_token) return null
  if (credentials.base_url && resolveBaseUrl(credentials.base_url) !== baseUrl) return null
  if (isExpiring(credentials)) {
    credentials = await refreshCredentials(accountContext, baseUrl, credentials, options)
  }
  return {
    token: credentials.access_token,
    source: 'credentials',
    credentials_path: accountContext.credentialsPath,
    credentials
  }
}

export async function resolveTokenSource(options = {}) {
  const account = options.accountContext || await resolveInstanceAccountContext({
    instance: options.instance,
    account: options.account,
    baseUrl: options.baseUrl
  })
  const baseUrl = resolveBaseUrl(account.baseUrl)

  const httpCredentials = await loadHttpCredentials(account, baseUrl, {
    ...options,
    trustedOrigins: account.trustedOrigins
  })
  if (httpCredentials) {
    return {
      account,
      baseUrl,
      token: httpCredentials.token,
      source: httpCredentials.source,
      credentials_path: httpCredentials.credentials_path,
      session_path: account.storageStatePath,
      trusted_origins: account.trustedOrigins
    }
  }

  const browserSession = await loadBrowserSessionToken(account, baseUrl)
  if (browserSession) {
    return {
      account,
      baseUrl,
      token: browserSession.token,
      source: browserSession.source,
      credentials_path: account.credentialsPath,
      session_path: browserSession.session_path,
      trusted_origins: account.trustedOrigins
    }
  }

  const instanceHint = account.instance_id && account.instance_id !== 'codesome' ? ` --instance ${account.instance_id}` : ''
  throw new ApiError(`账号 ${account.alias} 未找到可用登录凭证，请先运行 codesome auth login${instanceHint} --account ${account.alias}。`, {
    code: 'NO_SESSION',
    instance_id: account.instance_id,
    account_alias: account.alias,
    credentials_path: account.credentialsPath,
    session_path: account.storageStatePath
  })
}

export async function refreshTokenSource(tokenSource, options = {}) {
  if (tokenSource.source !== 'credentials') {
    throw new ApiError(`账号 ${tokenSource.account.alias} 的浏览器登录态已失效，请重新运行 codesome auth login --account ${tokenSource.account.alias}。`, {
      code: 'TOKEN_EXPIRED',
      account_alias: tokenSource.account.alias,
      session_path: tokenSource.session_path
    })
  }
  const credentials = await loadCredentials(tokenSource.account)
  const refreshed = await refreshCredentials(tokenSource.account, tokenSource.baseUrl, credentials, {
    ...options,
    trustedOrigins: tokenSource.trusted_origins
  })
  return {
    ...tokenSource,
    token: refreshed.access_token,
    trusted_origins: tokenSource.trusted_origins
  }
}
