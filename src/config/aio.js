export const AIO_SITE = {
  system: 'aio',
  name: 'Codesome AIO',
  key_prefix: 'cr_',
  homepage_url: 'https://aio.codesome.ai',
  api_stats_url: 'https://aio.codesome.ai/admin-next/api-stats',
  purchase_url: 'https://fk.codesome.cn',
  claude_code_base_url: 'https://v5.codesome.cn/api',
  codex_base_url: 'https://v5.codesome.cn/openai'
}

export function isAioApiKey(value) {
  return typeof value === 'string' && value.trim().startsWith(AIO_SITE.key_prefix)
}

export function normalizeAioApiKey(value) {
  const key = String(value || '').trim()
  if (!isAioApiKey(key)) throw new Error('AIO API Key 必须以 cr_ 开头。')
  return key
}

function maskAioApiKey(value) {
  if (!value || value.length <= 8) return '****'
  return `${value.slice(0, 3)}****${value.slice(-4)}`
}

export function buildAioUseKeyInfo(apiKey, options = {}) {
  const key = normalizeAioApiKey(apiKey)
  const maskedKey = options.maskedKey || maskAioApiKey(key)
  return {
    key: {
      id: null,
      name: options.name || 'AIO API Key',
      key: maskedKey,
      masked_key: maskedKey,
      group: null,
      group_id: null,
      status: 'usable'
    },
    use_key: {
      system: AIO_SITE.system,
      site_name: AIO_SITE.name,
      api_key: maskedKey,
      api_key_masked: maskedKey,
      base_url: AIO_SITE.codex_base_url,
      api_base_url: AIO_SITE.codex_base_url,
      platform: 'aio',
      status: 'usable',
      allow_messages_dispatch: true,
      base_urls: {
        claude_code_base_url: AIO_SITE.claude_code_base_url,
        anthropic_base_url: AIO_SITE.claude_code_base_url,
        codex_base_url: AIO_SITE.codex_base_url,
        openai_base_url: AIO_SITE.codex_base_url
      },
      sites: {
        homepage_url: AIO_SITE.homepage_url,
        api_stats_url: AIO_SITE.api_stats_url,
        purchase_url: AIO_SITE.purchase_url
      },
      source: {
        key: 'direct cr_ API key',
        public_settings: null,
        console_base_url: AIO_SITE.homepage_url
      },
      warnings: []
    },
    public_settings: null
  }
}
