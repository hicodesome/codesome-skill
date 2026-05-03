import fs from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import crypto from 'node:crypto'

const root = process.cwd()
const dist = path.join(root, 'dist')
const buildDir = path.join(dist, 'build')
await fs.mkdir(buildDir, { recursive: true })

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) process.exit(result.status || 1)
}

const targets = [
  { pkg: 'node18-win-x64', suffix: 'windows-amd64.exe' },
  { pkg: 'node18-linux-x64', suffix: 'linux-amd64' },
  { pkg: 'node18-linux-arm64', suffix: 'linux-arm64', crossHost: true },
  { pkg: 'node18-macos-x64', suffix: 'darwin-amd64', crossHost: true },
  { pkg: 'node18-macos-arm64', suffix: 'darwin-arm64', crossHost: true }
]

const entrypoints = [
  { name: 'codesome', entry: './bin/codesome.js' },
  { name: 'codesome-hotskills', entry: './bin/codesome-hotskills.js' }
]

const releaseFiles = []

for (const entrypoint of entrypoints) {
  const bundlePath = path.join(buildDir, `${entrypoint.name}-bundle.cjs`)
  run('npx', [
    'esbuild',
    entrypoint.entry,
    '--bundle',
    '--platform=node',
    '--target=node18',
    '--format=cjs',
    `--outfile=${bundlePath}`
  ])

  for (const target of targets) {
    const outputFile = `${entrypoint.name}-${target.suffix}`
    const args = [
      'pkg',
      bundlePath,
      '--targets',
      target.pkg
    ]
    if (target.crossHost) {
      args.push('--no-bytecode', '--public', '--public-packages', '*')
    }
    args.push('--output', path.join(dist, outputFile))
    run('npx', args)
    releaseFiles.push(outputFile)
  }
}

const lines = []
for (const file of releaseFiles) {
  const full = path.join(dist, file)
  const buf = await fs.readFile(full)
  const hash = crypto.createHash('sha256').update(buf).digest('hex')
  lines.push(`${hash}  ${file}`)
}
const checksumText = `${lines.join('\n')}\n`
await fs.writeFile(path.join(dist, 'checksums.txt'), checksumText, 'utf8')
await fs.writeFile(path.join(root, 'checksums.txt'), checksumText, 'utf8')
console.log(`Wrote ${path.join(dist, 'checksums.txt')}`)
console.log(`Wrote ${path.join(root, 'checksums.txt')}`)
