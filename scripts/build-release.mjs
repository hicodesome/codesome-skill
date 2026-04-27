import fs from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import crypto from 'node:crypto'

const root = process.cwd()
const dist = path.join(root, 'dist')
const buildDir = path.join(dist, 'build')
const bundlePath = path.join(buildDir, 'codesome-bundle.cjs')
await fs.mkdir(buildDir, { recursive: true })

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) process.exit(result.status || 1)
}

run('npx', [
  'esbuild',
  './bin/codesome.js',
  '--bundle',
  '--platform=node',
  '--target=node18',
  '--format=cjs',
  '--external:playwright',
  `--outfile=${bundlePath}`
])

const targets = [
  { pkg: 'node18-win-x64', file: 'codesome-windows-amd64.exe' },
  { pkg: 'node18-linux-x64', file: 'codesome-linux-amd64' },
  { pkg: 'node18-linux-arm64', file: 'codesome-linux-arm64', crossHost: true },
  { pkg: 'node18-macos-x64', file: 'codesome-darwin-amd64', crossHost: true },
  { pkg: 'node18-macos-arm64', file: 'codesome-darwin-arm64', crossHost: true }
]

for (const target of targets) {
  const args = [
    'pkg',
    bundlePath,
    '--targets',
    target.pkg
  ]
  if (target.crossHost) {
    args.push('--no-bytecode', '--public', '--public-packages', '*')
  }
  args.push('--output', path.join(dist, target.file))
  run('npx', args)
}

const lines = []
for (const target of targets) {
  const full = path.join(dist, target.file)
  const buf = await fs.readFile(full)
  const hash = crypto.createHash('sha256').update(buf).digest('hex')
  lines.push(`${hash}  ${target.file}`)
}
await fs.writeFile(path.join(dist, 'checksums.txt'), `${lines.join('\n')}\n`, 'utf8')
console.log(`Wrote ${path.join(dist, 'checksums.txt')}`)
