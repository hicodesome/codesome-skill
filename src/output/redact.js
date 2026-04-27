const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{8,}/g,
  /(ghp_|github_pat_|gho_|ghu_|ghs_)[A-Za-z0-9_]+/g,
  /(authorization\s*[:=]\s*bearer\s+)[^\s"']+/gi,
  /(cookie\s*[:=]\s*)[^\n]+/gi,
  /(token\s*[:=]\s*)[^\n,}]+/gi
]

export function maskApiKey(value) {
  if (!value || typeof value !== 'string') return value
  if (value.length <= 8) return '****'
  return `${value.slice(0, 3)}****${value.slice(-4)}`
}

export function redact(value) {
  let text = typeof value === 'string' ? value : JSON.stringify(value)
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (match, prefix = '') => `${prefix}[REDACTED]`)
  }
  return text
}
