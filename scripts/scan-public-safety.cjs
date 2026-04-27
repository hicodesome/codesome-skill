const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const json = args.includes('--json')
const failOnWarning = args.includes('--fail-on-warning')
const publicMode = args.includes('--public')
const targets = args.filter((arg) => !arg.startsWith('--'))
const publicTargets = [
  'src',
  path.join('bin', 'codesome.js'),
  'scripts',
  'package.json',
  'package-lock.json',
  'install.ps1',
  'install.sh',
  'README.md',
  'BUILD.md',
  'TESTING.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'SKILL.md',
  path.join('docs', 'templates'),
  'references'
].filter((entry) => fs.existsSync(entry))
const roots = publicMode ? publicTargets : (targets.length ? targets : ['.'])

const excludedDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'debug-site-inspect',
  'sessions',
  'secrets',
  'screenshots',
  'traces',
  'playwright'
])

const excludedFiles = new Set([
  '.gh-token.tmp'
])

const excludedExts = new Set([
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.zip',
  '.gz',
  '.tgz',
  '.7z',
  '.har',
  '.trace'
])

const patterns = [
  {
    id: 'github-classic-token',
    severity: 'blocker',
    re: new RegExp('g' + 'hp_[A-Za-z0-9_]{20,}', 'g')
  },
  {
    id: 'github-fine-grained-token',
    severity: 'blocker',
    re: new RegExp('github_' + 'pat_[A-Za-z0-9_]{20,}', 'g')
  },
  {
    id: 'full-api-key',
    severity: 'blocker',
    re: new RegExp('s' + 'k-[A-Za-z0-9]{12,}', 'g')
  },
  {
    id: 'bearer-token-literal',
    severity: 'blocker',
    re: /Authorization\s*[:=]\s*['"]?Bearer\s+[A-Za-z0-9._-]{10,}/gi
  },
  {
    id: 'cookie-header-value',
    severity: 'blocker',
    re: /(?:Cookie|Set-Cookie)\s*:\s*[^;\s]{8,}/gi
  },
  {
    id: 'auth-token-value',
    severity: 'blocker',
    re: /(?:auth_token|refresh_token|access_token)\s*["']?\s*[:=]\s*["'][A-Za-z0-9._-]{12,}["']/gi
  },
  {
    id: 'private-email-marker',
    severity: 'blocker',
    re: new RegExp('luci' + 'ca7025', 'gi')
  },
  {
    id: 'session-artifact-path',
    severity: 'warning',
    re: /(?:storage-state\.json|session\/|sessions\/|\.auth\/)/gi
  }
]

function shouldSkip(filePath) {
  const base = path.basename(filePath)
  if (excludedFiles.has(base)) return true
  const ext = path.extname(base).toLowerCase()
  return excludedExts.has(ext)
}

function walk(entry, files) {
  const stat = fs.statSync(entry)
  if (stat.isDirectory()) {
    const base = path.basename(entry)
    if (excludedDirs.has(base)) return
    for (const child of fs.readdirSync(entry)) {
      walk(path.join(entry, child), files)
    }
    return
  }
  if (stat.isFile() && !shouldSkip(entry)) files.push(entry)
}

function isProbablyBinary(buffer) {
  const sampleLength = Math.min(buffer.length, 4096)
  for (let index = 0; index < sampleLength; index += 1) {
    if (buffer[index] === 0) return true
  }
  return false
}

function lineNumberFor(text, offset) {
  let line = 1
  for (let index = 0; index < offset; index += 1) {
    if (text.charCodeAt(index) === 10) line += 1
  }
  return line
}

function scanFile(filePath) {
  const buffer = fs.readFileSync(filePath)
  if (isProbablyBinary(buffer)) return []
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '')
  const hits = []
  for (const pattern of patterns) {
    pattern.re.lastIndex = 0
    let match
    while ((match = pattern.re.exec(text)) !== null) {
      hits.push({
        file: path.relative(process.cwd(), filePath),
        line: lineNumberFor(text, match.index),
        id: pattern.id,
        severity: pattern.severity
      })
      if (match.index === pattern.re.lastIndex) pattern.re.lastIndex += 1
    }
  }
  return hits
}

const files = []
for (const root of roots) {
  const fullPath = path.resolve(root)
  if (!fs.existsSync(fullPath)) {
    console.error(`missing scan target: ${root}`)
    process.exit(2)
  }
  walk(fullPath, files)
}

const hits = files.flatMap(scanFile)
const blockers = hits.filter((hit) => hit.severity === 'blocker')
const warnings = hits.filter((hit) => hit.severity === 'warning')

const result = {
  scanned_files: files.length,
  blocker_count: blockers.length,
  warning_count: warnings.length,
  hits
}

if (json) {
  console.log(JSON.stringify(result, null, 2))
} else {
  console.log(`scanned_files=${result.scanned_files}`)
  console.log(`blocker_count=${result.blocker_count}`)
  console.log(`warning_count=${result.warning_count}`)
  for (const hit of hits) {
    console.log(`${hit.severity}\t${hit.id}\t${hit.file}:${hit.line}`)
  }
}

if (blockers.length > 0) process.exit(1)
if (failOnWarning && warnings.length > 0) process.exit(1)
