const fs = require('fs')

const file = process.argv[2]
const mode = process.argv[3]

if (!file || !mode) {
  console.error('usage: node verify-key-config-output.cjs <json-file> <show|preview|updated|created>')
  process.exit(2)
}

const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
const data = JSON.parse(text)
const leaks = text.match(/sk-[A-Za-z0-9_-]{20,}/g) || []
const forbiddenPatterns = [/auth_token/i, /refresh_token/i, /authorization/i, /cookie/i, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/i]
const forbiddenHits = forbiddenPatterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source)
const result = {
  mode,
  has_key: Boolean(data.key || data.before || data.after),
  dry_run: Boolean(data.dry_run),
  updated: Boolean(data.updated),
  leak_count: leaks.length,
  forbidden_count: forbiddenHits.length,
  has_user: /\b"user"\s*:/.test(text)
}

console.log(JSON.stringify(result))

if (mode === 'show' && !data.key) process.exit(1)
if (mode === 'preview' && (!data.dry_run || !data.requires_confirm)) process.exit(1)
if (mode === 'updated' && !data.updated) process.exit(1)
if (mode === 'created' && !data.key?.delivery) process.exit(1)
if (leaks.length) process.exit(1)
if (forbiddenHits.length) process.exit(1)
if (result.has_user) process.exit(1)
