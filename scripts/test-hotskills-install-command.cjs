#!/usr/bin/env node

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'codesome-hotskills-install-'))
const binDir = path.join(tmp, 'bin')
const homeDir = path.join(tmp, 'home')
const targetDir = path.join(tmp, 'project target')
const logFile = path.join(tmp, 'npx-args.json')

fs.mkdirSync(binDir, { recursive: true })
fs.mkdirSync(homeDir, { recursive: true })

const shim = `#!/usr/bin/env node
const fs = require('node:fs')
fs.writeFileSync(${JSON.stringify(logFile)}, JSON.stringify({
  argv: process.argv.slice(2),
  cwd: process.cwd()
}, null, 2))
process.exit(0)
`

fs.writeFileSync(path.join(binDir, 'npx'), shim, { mode: 0o755 })
fs.writeFileSync(path.join(binDir, 'npx.cmd'), `@echo off\r\nnode "${path.join(binDir, 'npx').replace(/\\/g, '\\\\')}" %*\r\n`)

const env = {
  ...process.env,
  PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}`,
  HOME: homeDir,
  USERPROFILE: homeDir,
  NO_COLOR: '1'
}

function run(args) {
  return spawnSync(process.execPath, [path.join(root, 'bin/codesome.js'), ...args], {
    cwd: root,
    env,
    encoding: 'utf8'
  })
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

try {
  const preview = run(['hotskills', 'install', 'dbskill'])
  assert(preview.status === 0, `preview failed: ${preview.stderr || preview.stdout}`)
  assert(preview.stdout.includes('npx --yes --package skills skills add dontbesilent2025/dbskill --global --yes'), 'preview did not show explicit npx package command')
  assert(!fs.existsSync(logFile), 'preview unexpectedly executed npx')

  const confirmed = run([
    'hotskills',
    'install',
    'dbskill',
    '--confirm',
    '--agent',
    'codex',
    '--project',
    '--target-dir',
    targetDir,
    '--copy',
    '--yes'
  ])
  assert(confirmed.status === 0, `confirmed install failed: ${confirmed.stderr || confirmed.stdout}`)
  assert(confirmed.stdout.includes('执行命令：npx --yes --package skills skills add dontbesilent2025/dbskill --agent codex --copy --yes'), 'confirmed output did not show explicit npx package command')
  assert(fs.existsSync(logFile), 'confirmed install did not execute npx shim')

  const recorded = JSON.parse(fs.readFileSync(logFile, 'utf8'))
  assert(recorded.cwd === targetDir, `target cwd mismatch: ${recorded.cwd}`)
  assert(JSON.stringify(recorded.argv) === JSON.stringify([
    '--yes',
    '--package',
    'skills',
    'skills',
    'add',
    'dontbesilent2025/dbskill',
    '--agent',
    'codex',
    '--copy',
    '--yes'
  ]), `npx argv mismatch: ${JSON.stringify(recorded.argv)}`)

  console.log('hotskills install command verified')
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}
