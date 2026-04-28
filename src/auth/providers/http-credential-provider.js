import { ApiError } from '../../api/errors.js'
import { requestApiJson } from '../../api/http.js'

export async function loginWithHttpCredentials(options = {}) {
  const body = {
    email: options.email,
    password: options.password
  }
  if (options.turnstileToken) body.turnstile_token = options.turnstileToken

  const first = await requestApiJson(options.baseUrl, 'POST', '/auth/login', {
    body,
    timezone: false,
    timeoutMs: options.timeoutMs
  })

  if (first?.requires_2fa) {
    if (!options.totpCode) {
      return first
    }
    return requestApiJson(options.baseUrl, 'POST', '/auth/login/2fa', {
      body: {
        temp_token: first.temp_token,
        totp_code: options.totpCode
      },
      timezone: false,
      timeoutMs: options.timeoutMs
    })
  }

  if (!first?.access_token) {
    throw new ApiError('HTTP 登录没有返回有效凭证，请改用 codesome auth login --browser。', {
      code: 'NO_ACCESS_TOKEN'
    })
  }

  return first
}

export async function completeTotpLogin(options = {}) {
  return requestApiJson(options.baseUrl, 'POST', '/auth/login/2fa', {
    body: {
      temp_token: options.tempToken,
      totp_code: options.totpCode
    },
    timezone: false,
    timeoutMs: options.timeoutMs
  })
}
