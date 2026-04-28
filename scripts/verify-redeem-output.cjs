const fs = require('fs')

const file = process.argv[2]
const mode = process.argv[3]
const secrets = process.argv.slice(4).filter(Boolean)

if (!file || !mode) {
  console.error('usage: node verify-redeem-output.cjs <json-file> <preview|redeemed|history> [secret...]')
  process.exit(2)
}

const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
const data = JSON.parse(text)
const leaks = secrets.filter((secret) => text.includes(secret))
const forbiddenPatterns = [/auth_token/i, /refresh_token/i, /authorization/i, /cookie/i]
const forbiddenHits = forbiddenPatterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source)

const result = {
  mode,
  leak_count: leaks.length,
  forbidden_count: forbiddenHits.length,
  has_account: Boolean(data.account),
  action: data.action,
  items: Array.isArray(data.items) ? data.items.length : undefined
}

console.log(JSON.stringify(result))

if (!data.account) process.exit(1)
if (mode === 'preview' && (data.action !== 'preview' || data.will_redeem !== false || data.requires_confirm !== true)) process.exit(1)
if (mode === 'redeemed' && (data.action !== 'redeemed' || !data.redeem)) process.exit(1)
if (mode === 'history' && !Array.isArray(data.items)) process.exit(1)
if (leaks.length) process.exit(1)
if (forbiddenHits.length) process.exit(1)
