import { buildApiUrl, parseApiResponse, requestText } from './http.js'
import { refreshTokenSource, resolveTokenSource } from '../auth/token-source.js'
import { ApiError } from './errors.js'

export { ApiError } from './errors.js'

export async function createApiClient(options = {}) {
  let tokenSource = await resolveTokenSource(options)
  const { account, baseUrl } = tokenSource

  async function requestJson(method, path, body, params, retry = true) {
    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${tokenSource.token}`
    }
    const init = { method, headers }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
      headers['Content-Length'] = Buffer.byteLength(init.body)
    }
    const response = await requestText(buildApiUrl(baseUrl, path, params), init)
    try {
      return await parseApiResponse(response, method, path)
    } catch (error) {
      if (retry && error instanceof ApiError && error.details?.status === 401) {
        tokenSource = await refreshTokenSource(tokenSource, options)
        return requestJson(method, path, body, params, false)
      }
      throw error
    }
  }

  return {
    account: {
      alias: account.alias,
      token_source: tokenSource.source,
      credentials_path: tokenSource.credentials_path,
      session_path: account.storageStatePath,
      config_path: account.configPath
    },
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
