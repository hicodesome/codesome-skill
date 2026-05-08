const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const npmExecPath = process.env.npm_execpath
const npmCommand = npmExecPath ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm')
const npmBaseArgs = npmExecPath ? [npmExecPath] : []

function fail(message, details = []) {
  console.error(message)
  for (const detail of details) console.error(` - ${detail}`)
  process.exit(1)
}

function normalize(filePath) {
  return filePath.replace(/\\/g, '/')
}

function readPackageJson() {
  return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
}

function runNpmPackDryRun() {
  const result = spawnSync(npmCommand, [...npmBaseArgs, 'pack', '--dry-run', '--json'], {
    cwd: root,
    encoding: 'utf8',
    shell: false
  })

  const stdoutText = result.stdout ? String(result.stdout) : ''
  const stderrText = result.stderr ? String(result.stderr) : ''

  if (result.error) {
    fail('npm pack --dry-run failed to start.', [result.error.message])
  }

  if (result.status !== 0) {
    fail('npm pack --dry-run failed.', [
      stderrText.trim() || stdoutText.trim() || `exit ${result.status}`
    ])
  }

  const stdout = stdoutText.trim()
  const jsonStart = stdout.indexOf('[')
  if (jsonStart < 0) fail('npm pack --dry-run did not return JSON output.', [stdout])

  try {
    return JSON.parse(stdout.slice(jsonStart))
  } catch (error) {
    fail('Failed to parse npm pack --dry-run JSON output.', [error.message, stdout])
  }
}

const manifest = readPackageJson()

if (manifest.private === true) fail('package.json must not be private for public npm publishing.')
if (manifest.license !== 'Apache-2.0') fail('package.json license must be Apache-2.0.')
if (manifest.name !== 'codesome-cli') fail('package name must stay codesome-cli.')
if (!manifest.bin?.codesome || !manifest.bin?.['codesome-hotskills']) {
  fail('package.json must expose both codesome and codesome-hotskills bin entries.')
}
if (manifest.publishConfig?.access !== 'public') fail('publishConfig.access must be public.')
if (manifest.publishConfig?.provenance !== true) fail('publishConfig.provenance must be true.')
if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
  fail('package.json must use an explicit files whitelist.')
}

const packResult = runNpmPackDryRun()[0]
if (!packResult?.files?.length) fail('npm pack --dry-run returned no files.')

const files = packResult.files.map((entry) => normalize(entry.path))
const fileSet = new Set(files)

const requiredFiles = [
  'package.json',
  'README.md',
  'LICENSE',
  'CHANGELOG.md',
  'SECURITY.md',
  'SKILL.md',
  'bin/codesome.js',
  'bin/codesome-hotskills.js',
  'src/cli.js',
  'src/api/client.js',
  'src/auth/auth.js',
  'src/commands/hotskills.js',
  'src/data/hotskills/dbskill.js',
  'src/data/hotskills/dbskill.json',
  'references/basic-usage.md',
  'scripts/scan-public-safety.cjs',
  'scripts/hotskills-readme-parser.cjs',
  'scripts/update-hotskills-snapshot.cjs',
  'scripts/repair-npm-install.sh',
  'scripts/repair-npm-install.ps1',
  'scripts/verify-repair-scripts.cjs'
]

const missing = requiredFiles.filter((filePath) => !fileSet.has(filePath))
if (missing.length > 0) fail('npm package is missing required files.', missing)

const forbiddenPatterns = [
  /^\.env(?:\.|$)/,
  /^\.npmrc$/,
  /^\.github\//,
  /^\.git\//,
  /^dist\//,
  /^build\//,
  /^node_modules\//,
  /^debug-site-inspect\//,
  /^sessions?\//,
  /^secrets?\//,
  /^screenshots?\//,
  /^traces?\//,
  /^playwright\//,
  /^docs\//,
  /^images\//,
  /(?:^|\/)(?:task_plan|progress|findings)\.md$/,
  /(?:^|\/)token-(?:search|validation)-results\.json$/,
  /(?:^|\/)key-config-acceptance-plan-2026-04-27\.md$/,
  /\.(?:exe|dll|so|dylib|png|jpg|jpeg|gif|webp|ico|zip|gz|tgz|7z|har|trace)$/i,
  /(?:storage-state\.json|session\/|sessions\/|\.auth\/)/i
]

const forbiddenFiles = files.filter((filePath) => forbiddenPatterns.some((pattern) => pattern.test(filePath)))
if (forbiddenFiles.length > 0) fail('npm package contains forbidden files.', forbiddenFiles)

const unpackedSize = Number(packResult.unpackedSize || 0)
if (unpackedSize > 2_000_000) {
  fail('npm package unpacked size is unexpectedly large.', [`${unpackedSize} bytes`])
}

console.log(`npm_package=${packResult.name}@${packResult.version}`)
console.log(`npm_package_files=${files.length}`)
console.log(`npm_package_unpacked_size=${unpackedSize}`)
console.log('npm package dry-run audit passed.')
