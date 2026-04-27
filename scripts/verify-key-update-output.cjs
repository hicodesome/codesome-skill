const fs = require('fs')

const file = process.argv[2]
const expectedStatus = process.argv[3]

if (!file || !expectedStatus) {
  console.error('usage: node verify-key-update-output.cjs <json-file> <expected-status>')
  process.exit(2)
}

const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
const data = JSON.parse(text)
const leaks = text.match(/sk-[A-Za-z0-9]{20,}/g) || []
const forbiddenPatterns = [/auth_token/i, /refresh_token/i, /authorization/i, /cookie/i, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/i]
const forbiddenHits = forbiddenPatterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source)
const result = {
  name: data.after?.name,
  status: data.after?.status,
  leak_count: leaks.length,
  forbidden_count: forbiddenHits.length,
  has_user: Boolean(data.after?.user)
}

console.log(JSON.stringify(result))

if (result.status !== expectedStatus) process.exit(1)
if (leaks.length) process.exit(1)
if (forbiddenHits.length) process.exit(1)
if (result.has_user) process.exit(1)

