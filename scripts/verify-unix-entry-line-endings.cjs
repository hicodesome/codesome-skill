const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')

function existingFiles(...relativePaths) {
  return relativePaths
    .map((relativePath) => path.join(root, relativePath))
    .filter((filePath) => fs.existsSync(filePath))
}

function listBinEntrypoints() {
  const binDir = path.join(root, 'bin')
  if (!fs.existsSync(binDir)) return []
  return fs.readdirSync(binDir)
    .filter((name) => name.endsWith('.js'))
    .map((name) => path.join(binDir, name))
}

const files = [
  ...existingFiles('install.sh'),
  ...existingFiles(path.join('scripts', 'repair-npm-install.sh')),
  ...listBinEntrypoints()
]

const badFiles = files.filter((filePath) => fs.readFileSync(filePath).includes(0x0d))

if (badFiles.length > 0) {
  console.error('Unix entrypoint files must use LF line endings:')
  for (const filePath of badFiles) console.error(` - ${path.relative(root, filePath)}`)
  process.exit(1)
}

console.log('Unix entrypoint line endings are LF-only.')
