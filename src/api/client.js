import fs from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'
import { STORAGE_STATE_PATH, resolveBaseUrl } from '../config/paths.js'
import { redact } from '../output/redact.js'

export class ApiError extends Error {
  constructor(message, details = {}) {
    super(message)
    this.name = 'ApiError'
    this.details = details
  }
}

async function loadStorageState() {
  try {
    return JSON.parse(await fs.readFile(STORAGE_STATE_PATH, 'utf8'))
  } catch {
    throw new ApiError('???????? codesome auth login?', { code: 'NO_SESSION' })
  }
}

function findAuthToken(storageState, baseUrl) {
  const origin = new URL(baseUrl).origin
  const originState = (storageState.origins || []).find((item) => item.origin === origin)
  return originState?.localStorage?.find((item) => item.name === 'auth_token')?.value || null
}

function buildUrl(baseUrl, path, params = {}) {
  const normalized = path.startsWith('/api/v1/') ? path : `/api/v1${path.startsWith('/') ? path : `/${path}`}`
  const url = new URL(normalized, baseUrl)
  const timezone = params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'
  url.searchParams.set('timezone', timezone)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (key === 'timezone') continue
    url.searchParams.set(key, String(value))
  }
  return url
}

function requestText(url, init) {
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

async function parseResponse(response, method, path) {
  const payload = parseBody(response.text)

  if (!response.ok) {
    throw new ApiError(`?????${method} ${path} HTTP ${response.status}`, {
      status: response.status,
      path,
      body: payload
    })
  }

  if (payload && typeof payload === 'object' && 'code' in payload && payload.code !== 0) {
    throw new ApiError(`???????${payload.message || payload.msg || payload.code}`, {
      status: response.status,
      path,
      body: payload
    })
  }

  return payload?.data ?? payload
}

export async function createApiClient(options = {}) {
  const baseUrl = resolveBaseUrl(options.baseUrl)
  const storageState = await loadStorageState()
  const authToken = findAuthToken(storageState, baseUrl)
  if (!authToken) {
    throw new ApiError('????? auth token?????? codesome auth login?', { code: 'NO_AUTH_TOKEN' })
  }

  async function requestJson(method, path, body, params) {
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${authToken}`
    }
    const init = { method, headers }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
      headers['Content-Length'] = Buffer.byteLength(init.body)
    }
    const response = await requestText(buildUrl(baseUrl, path, params), init)
    return parseResponse(response, method, path)
  }

  return {
    baseUrl,
    apiBaseUrl: `${baseUrl}/api/v1`,
    get(path, params = {}) {
      return requestJson('GET', path, undefined, params)
    },
    post(path, body = {}, params = {}) {
      return requestJson('POST', path, body, params)
    },
    put(path, body = {}, params = {}) {
      return requestJson('PUT', path, body, params)
    },
    delete(path, params = {}) {
      return requestJson('DELETE', path, undefined, params)
    },
    async close() {}
  }
}

export async function withApiClient(options, callback) {
  const client = await createApiClient(options)
  try {
    return await callback(client)
  } finally {
    await client.close()
  }
}
