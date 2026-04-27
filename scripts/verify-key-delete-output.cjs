const fs = require('fs')

const file = process.argv[2]
const mode = process.argv[3]

if (!file || !mode) {
  console.error('usage: node verify-key-delete-output.cjs <json-file> <preview|deleted>')
  process.exit(2)
}

const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
const data = JSON.parse(text)
const leaks = text.match(/sk-[A-Za-z0-9]{20,}/g) || []
const forbiddenPatterns = [/auth_token/i, /refresh_token/i, /authorization/i, /cookie/i, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/i]
const forbiddenHits = forbiddenPatterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source)
const result = {
  mode,
  name: data.key?.name,
  dry_run: Boolean(data.dry_run),
  deleted: Boolean(data.deleted),
  leak_count: leaks.length,
  forbidden_count: forbiddenHits.length,
  has_user: Boolean(data.key?.user)
}

console.log(JSON.stringify(result))

if (mode === 'preview' && (!data.dry_run || !data.requires_confirm)) process.exit(1)
if (mode === 'deleted' && !data.deleted) process.exit(1)
if (leaks.length) process.exit(1)
if (forbiddenHits.length) process.exit(1)
if (result.has_user) process.exit(1)

