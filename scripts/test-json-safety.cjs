const assert = require('assert')
const { spawnSync } = require('child_process')

const fullKey = 'sk-' + 'testjsonsafety1234567890'
const result = spawnSync(process.execPath, [
  '--input-type=module',
  '-e',
  `import { printJson } from './src/output/format.js'; printJson({ items: [{ api_key: { name: 'demo', key: '${fullKey}' } }] })`
], {
  cwd: process.cwd(),
  encoding: 'utf8'
})

if (result.status !== 0) {
  process.stderr.write(result.stderr)
  process.exit(result.status || 1)
}

assert(!result.stdout.includes(fullKey), 'JSON output leaked a full API key')
const data = JSON.parse(result.stdout.replace(/^\uFEFF/, ''))
assert.strictEqual(data.items[0].api_key.key, 'sk-****7890')

console.log(JSON.stringify({ ok: true, checked: ['recursive-json-api-key-redaction'] }))
