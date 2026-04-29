import { resolveBaseUrl } from '../config/paths.js'
import { ApiError } from './errors.js'

export const TRUSTED_CREDENTIAL_ORIGINS = [
  'https://cc.codesome.ai'
]

export const DEV_INSECURE_BASE_URL_FLAG = 'CODESOME_DEV_ALLOW_INSECURE_BASE_URL'

function flagEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())
}

function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
}

function normalizeExtraOrigins(origins = []) {
  return origins.map((origin) => {
    try {
      return new URL(resolveBaseUrl(origin)).origin
    } catch {
      return null
    }
  }).filter(Boolean)
}

function extraOriginAllowed(url, origins, env) {
  if (!origins.includes(url.origin)) return false
  if (url.protocol === 'https:') return true
  return url.protocol === 'http:' && isLoopbackHost(url.hostname) && flagEnabled(env[DEV_INSECURE_BASE_URL_FLAG])
}

export function isTrustedCredentialOrigin(baseUrl, options = {}) {
  const env = options.env || process.env
  const extraOrigins = normalizeExtraOrigins(options.trustedOrigins || options.allowedOrigins || [])
  let url
  try {
    url = new URL(resolveBaseUrl(baseUrl))
  } catch {
    return {
      trusted: false,
      reason: 'invalid-url',
      origin: null
    }
  }

  const origin = url.origin
  if (TRUSTED_CREDENTIAL_ORIGINS.includes(origin) || extraOriginAllowed(url, extraOrigins, env)) {
    return {
      trusted: true,
      reason: 'trusted-origin',
      origin
    }
  }

  if (
    url.protocol === 'http:' &&
    isLoopbackHost(url.hostname) &&
    flagEnabled(env[DEV_INSECURE_BASE_URL_FLAG])
  ) {
    return {
      trusted: true,
      reason: 'explicit-local-dev-allow',
      origin
    }
  }

  return {
    trusted: false,
    reason: url.protocol === 'https:' ? 'untrusted-host' : 'insecure-protocol',
    origin
  }
}

export function assertTrustedCredentialOrigin(baseUrl, options = {}) {
  const result = isTrustedCredentialOrigin(baseUrl, options)
  if (result.trusted) return result

  const target = result.origin || '无效 URL'
  const allowedOrigins = [...TRUSTED_CREDENTIAL_ORIGINS, ...normalizeExtraOrigins(options.trustedOrigins || options.allowedOrigins || [])]
  throw new ApiError(
    `已阻止凭据请求发往未本机登记的不可信后台地址：${target}。这不是平台审核；自定义 Sub2API 地址请先运行 codesome instance add <name> --base-url ${target}，再使用 codesome auth login --instance <name>。默认已信任：${allowedOrigins.join('、')}；本地 mock 需显式设置 ${DEV_INSECURE_BASE_URL_FLAG}=1。`,
    {
      code: 'UNTRUSTED_CREDENTIAL_ORIGIN',
      base_url: result.origin,
      reason: result.reason,
      allowed_origins: allowedOrigins,
      dev_flag: DEV_INSECURE_BASE_URL_FLAG
    }
  )
}
