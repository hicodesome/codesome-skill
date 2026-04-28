const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{8,}/g,
  /(ghp_|github_pat_|gho_|ghu_|ghs_)[A-Za-z0-9_]+/g,
  /(authorization\s*[:=]\s*bearer\s+)[^\s"']+/gi,
  /(cookie\s*[:=]\s*)[^\n]+/gi,
  /(password\s*[:=]\s*)[^\n,}]+/gi,
  /(token\s*[:=]\s*)[^\n,}]+/gi,
  /(temp_token\s*[:=]\s*)[^\n,}]+/gi,
  /((?:redeem[_\s-]?code|redemption[_\s-]?code)\s*[:=]\s*["']?)[^"',}\s]+/gi,
  /\b[A-Z0-9]{4,8}(?:-[A-Z0-9]{4,8}){1,5}\b/g
]

export function maskApiKey(value) {
  if (!value || typeof value !== 'string') return value
  if (value.length <= 8) return '****'
  return `${value.slice(0, 3)}****${value.slice(-4)}`
}

export function maskRedeemCode(value) {
  if (!value || typeof value !== 'string') return value
  const text = value.trim()
  if (!text) return text
  if (text.length <= 8) return '****'
  if (text.length <= 12) return `${text.slice(0, 2)}****${text.slice(-2)}`
  return `${text.slice(0, 4)}****${text.slice(-4)}`
}

export function redact(value) {
  let text = typeof value === 'string' ? value : JSON.stringify(value)
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (match, prefix = '') => {
      return typeof prefix === 'string' ? `${prefix}[REDACTED]` : '[REDACTED]'
    })
  }
  return text
}
