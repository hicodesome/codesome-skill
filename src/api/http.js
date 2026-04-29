import http from 'node:http'
import https from 'node:https'
import { redact } from '../output/redact.js'
import { ApiError } from './errors.js'
import { assertTrustedCredentialOrigin } from './trusted-origin.js'

export function buildApiUrl(baseUrl, path, params = {}, options = {}) {
  const normalized = path.startsWith('/api/v1/') ? path : `/api/v1${path.startsWith('/') ? path : `/${path}`}`
  const url = new URL(normalized, baseUrl)
  if (options.timezone !== false) {
    const timezone = params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
    url.searchParams.set('timezone', timezone)
  }
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (key === 'timezone') continue
    url.searchParams.set(key, String(value))
  }
  return url
}

export function requestText(url, init = {}) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'http:' ? http : https
    const req = transport.request(url, init, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: Buffer.concat(chunks).toString('utf8')
        })
      })
    })
    req.on('error', reject)
    if (init.timeoutMs) {
      req.setTimeout(Number(init.timeoutMs), () => {
        req.destroy(new Error(`Request timed out after ${init.timeoutMs}ms`))
      })
    }
    if (init.body) req.write(init.body)
    req.end()
  })
}

function parseBody(text) {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return { raw: redact(text) }
  }
}

export async function parseApiResponse(response, method, path) {
  const payload = parseBody(response.text)

  if (!response.ok) {
    throw new ApiError(`请求失败：${method} ${path} HTTP ${response.status}`, {
      status: response.status,
      path,
      body: payload
    })
  }

  if (payload && typeof payload === 'object' && 'code' in payload && payload.code !== 0) {
    throw new ApiError(`请求失败：${payload.message || payload.msg || payload.code}`, {
      status: response.status,
      path,
      body: payload
    })
  }

  return payload?.data ?? payload
}

const CREDENTIAL_BODY_KEYS = new Set([
  'access_token',
  'auth_token',
  'password',
  'refresh_token',
  'temp_token',
  'token'
])

function headersContainAuthorization(headers = {}) {
  return Object.entries(headers).some(([key, value]) => {
    return key.toLowerCase() === 'authorization' && value !== undefined && value !== null && String(value).trim() !== ''
  })
}

function bodyContainsCredential(value) {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some((item) => bodyContainsCredential(item))
  return Object.entries(value).some(([key, item]) => {
    return CREDENTIAL_BODY_KEYS.has(key.toLowerCase()) || bodyContainsCredential(item)
  })
}

function isCredentialBearingRequest(options = {}) {
  return Boolean(
    options.token ||
    headersContainAuthorization(options.headers) ||
    bodyContainsCredential(options.body)
  )
}

export async function requestApiJson(baseUrl, method, path, options = {}) {
  if (isCredentialBearingRequest(options)) {
    assertTrustedCredentialOrigin(baseUrl, { trustedOrigins: options.trustedOrigins })
  }
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  }
  const init = { method, headers, timeoutMs: options.timeoutMs }
  if (options.token) headers.Authorization = `Bearer ${options.token}`
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(options.body)
    headers['Content-Length'] = Buffer.byteLength(init.body)
  }
  const response = await requestText(buildApiUrl(baseUrl, path, options.params || {}, { timezone: options.timezone }), init)
  return parseApiResponse(response, method, path)
}
