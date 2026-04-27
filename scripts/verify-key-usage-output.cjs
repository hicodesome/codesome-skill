const fs = require('fs')
const file = process.argv[2]
const expectedRequests = Number(process.argv[3])
const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
const data = JSON.parse(text)
const leaks = text.match(/sk-[A-Za-z0-9]{20,}/g) || []
const result = {
  key: data.key?.name,
  requests: data.results?.[0]?.requests,
  leak_count: leaks.length
}
console.log(JSON.stringify(result))
if (leaks.length) process.exit(1)
if (!Number.isNaN(expectedRequests) && result.requests !== expectedRequests) process.exit(1)
