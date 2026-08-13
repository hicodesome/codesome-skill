import { ApiError, withApiClient } from '../api/client.js'
import { maskRedeemCode, redact } from '../output/redact.js'
import { AIO_SITE, isAioApiKey } from '../config/aio.js'

function requireCode(value) {
  const code = String(value || '').trim()
  if (!code) throw new Error('必须指定兑换码：--code <code>。')
  return code
}

function sanitizeText(value, rawCode) {
  if (value === undefined || value === null) return value
  let text = redact(String(value))
  if (rawCode) text = text.split(rawCode).join('[REDACTED]')
  return text
}

function sanitizeValue(value, rawCode) {
  if (typeof value === 'string') return sanitizeText(value, rawCode)
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, rawCode))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeValue(item, rawCode)])
    )
  }
  return value
}

function sanitizeError(error, rawCode) {
  if (!rawCode) return error
  const body = error instanceof ApiError ? error.details?.body : null
  const remoteMessage = body?.detail || body?.message || body?.data?.detail || body?.data?.message || body?.msg || body?.data?.msg
  if (remoteMessage) {
    error.message = `兑换失败：${sanitizeText(remoteMessage, rawCode)}`
  } else if (typeof error.message === 'string') {
    error.message = sanitizeText(error.message, rawCode)
  }
  if (error instanceof ApiError && error.details?.body) {
    error.details.body = sanitizeValue(error.details.body, rawCode)
  }
  return error
}

function normalizeGroup(group) {
  if (!group) return null
  return {
    id: group.id,
    name: group.name
  }
}

function unwrapRedeemPayload(payload) {
  if (payload?.redeem_code) return payload.redeem_code
  if (payload?.redeem) return payload.redeem
  return payload || {}
}

export function normalizeRedeemResult(payload, inputCode) {
  const item = unwrapRedeemPayload(payload)
  const group = normalizeGroup(item.group)
  return {
    id: item.id,
    code: maskRedeemCode(item.code || inputCode),
    message: item.message ? sanitizeText(item.message, inputCode) : undefined,
    type: item.type,
    value: item.value,
    status: item.status || (item.used_at ? 'used' : undefined),
    used_at: item.used_at,
    created_at: item.created_at,
    new_balance: item.new_balance,
    new_concurrency: item.new_concurrency,
    group,
    group_id: item.group_id ?? group?.id,
    validity_days: item.validity_days,
    notes: item.notes ? sanitizeText(item.notes, inputCode || item.code) : undefined
  }
}

export function normalizeRedeemHistory(items) {
  const list = Array.isArray(items) ? items : items?.items || []
  return list.map((item) => normalizeRedeemResult(item, item?.code))
}

export function previewRedeem(options = {}) {
  const code = requireCode(options.code)
  if (isAioApiKey(code)) {
    return {
      action: 'aio_key_detected',
      code: maskRedeemCode(code),
      will_redeem: false,
      requires_confirm: false,
      key_system: AIO_SITE.system,
      message: '检测到 AIO cr_ API Key。它本身就是 API key，不需要兑换；本次未调用兑换接口。',
      sites: {
        homepage_url: AIO_SITE.homepage_url,
        api_stats_url: AIO_SITE.api_stats_url,
        purchase_url: AIO_SITE.purchase_url
      },
      base_urls: {
        claude_code_base_url: AIO_SITE.claude_code_base_url,
        codex_base_url: AIO_SITE.codex_base_url
      }
    }
  }
  return {
    action: 'preview',
    code: maskRedeemCode(code),
    will_redeem: false,
    requires_confirm: true
  }
}

export async function applyRedeem(options = {}) {
  const code = requireCode(options.code)
  if (isAioApiKey(code)) {
    return previewRedeem({ ...options, code })
  }
  try {
    return await withApiClient(options, async (client) => {
      const data = await client.post('/redeem', { code })
      return {
        action: 'redeemed',
        redeem: normalizeRedeemResult(data, code)
      }
    })
  } catch (error) {
    throw sanitizeError(error, code)
  }
}

export async function listRedeemHistory(options = {}) {
  return withApiClient(options, async (client) => {
    const data = await client.get('/redeem/history')
    return normalizeRedeemHistory(data)
  })
}
