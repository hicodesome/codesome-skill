const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist')

function fail(message, details = []) {
  console.error(message)
  for (const detail of details) console.error(` - ${detail}`)
  process.exit(1)
}

const platforms = [
  'windows-amd64.exe',
  'linux-amd64',
  'linux-arm64',
  'darwin-amd64',
  'darwin-arm64'
]

const requiredFiles = [
  ...platforms.map((platform) => `codesome-${platform}`),
  ...platforms.map((platform) => `codesome-hotskills-${platform}`),
  'checksums.txt'
]

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(dist, file)))
if (missing.length > 0) fail('Release build is missing required assets.', missing)

const checksumPath = path.join(dist, 'checksums.txt')
const rootChecksumPath = path.join(root, 'checksums.txt')
const checksumText = fs.readFileSync(checksumPath, 'utf8')
const rootChecksumText = fs.readFileSync(rootChecksumPath, 'utf8')
if (rootChecksumText !== checksumText) {
  fail('Root checksums.txt must match dist/checksums.txt.')
}
const checksumFiles = checksumText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.split(/\s+/).at(-1))

const missingChecksums = requiredFiles
  .filter((file) => file !== 'checksums.txt')
  .filter((file) => !checksumFiles.includes(file))

if (missingChecksums.length > 0) fail('checksums.txt is missing required assets.', missingChecksums)

const unexpectedChecksums = checksumFiles.filter((file) => !requiredFiles.includes(file))
if (unexpectedChecksums.length > 0) fail('checksums.txt contains unexpected assets.', unexpectedChecksums)

console.log(`release_asset_count=${requiredFiles.length}`)
console.log('release asset audit passed.')
