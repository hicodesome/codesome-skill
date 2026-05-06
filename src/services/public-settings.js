import { withApiClient } from '../api/client.js'

function normalizeUrl(value) {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    url.hash = ''
    url.search = ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return trimmed.replace(/\/+$/, '')
  }
}

export function normalizePublicSettings(data = {}) {
  return {
    site_name: data.site_name || null,
    api_base_url: normalizeUrl(data.api_base_url),
    custom_endpoints: Array.isArray(data.custom_endpoints)
      ? data.custom_endpoints.map((item) => ({
        name: item?.name || null,
        endpoint: normalizeUrl(item?.endpoint),
        description: item?.description || ''
      })).filter((item) => item.endpoint)
      : []
  }
}

export function buildUseBaseUrls(publicSettings = {}) {
  const apiBaseUrl = normalizeUrl(publicSettings.api_base_url)
  if (!apiBaseUrl) {
    return {
      api_base_url: null,
      openai_base_url: null,
      anthropic_base_url: null,
      gemini_base_url: null,
      antigravity_base_url: null,
      antigravity_gemini_base_url: null
    }
  }

  const root = apiBaseUrl.replace(/\/v1\/?$/, '').replace(/\/+$/, '')
  const v1 = root.endsWith('/v1') ? root : `${root}/v1`
  const antigravityRoot = `${root}/antigravity`
  const antigravityV1 = antigravityRoot.endsWith('/v1') ? antigravityRoot : `${antigravityRoot}/v1`
  const geminiV1Beta = root.endsWith('/v1beta') ? root : `${root}/v1beta`
  const antigravityGeminiV1Beta = antigravityRoot.endsWith('/v1beta') ? antigravityRoot : `${antigravityRoot}/v1beta`

  return {
    api_base_url: apiBaseUrl,
    openai_base_url: v1,
    anthropic_base_url: apiBaseUrl,
    gemini_base_url: geminiV1Beta,
    antigravity_base_url: antigravityV1,
    antigravity_gemini_base_url: antigravityGeminiV1Beta
  }
}

export async function getPublicSettings(options = {}) {
  return withApiClient(options, async (client) => {
    const data = await client.get('/settings/public')
    return {
      console_base_url: client.baseUrl,
      ...normalizePublicSettings(data)
    }
  })
}
