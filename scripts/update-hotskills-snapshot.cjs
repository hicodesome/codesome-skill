#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { buildSnapshot, fetchReadme, validateSnapshot } = require('./hotskills-readme-parser.cjs')

const root = path.resolve(__dirname, '..')
const snapshotPath = path.join(root, 'src', 'data', 'hotskills', 'dbskill.json')
const snapshotModulePath = path.join(root, 'src', 'data', 'hotskills', 'dbskill.js')
const args = new Set(process.argv.slice(2))
const write = args.has('--write')

function stable(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function comparable(snapshot) {
  const copy = JSON.parse(JSON.stringify(snapshot))
  if (copy.snapshot) delete copy.snapshot.generated_at
  return copy
}

function moduleSource(snapshot) {
  return `const dbskill = ${JSON.stringify(snapshot, null, 2)}\n\nexport default dbskill\n`
}

async function main() {
  const current = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
  validateSnapshot(current)
  const currentModuleSource = fs.existsSync(snapshotModulePath)
    ? fs.readFileSync(snapshotModulePath, 'utf8')
    : ''

  const readme = await fetchReadme()
  const next = buildSnapshot(readme)
  const currentStable = stable(comparable(current))
  const nextStable = stable(comparable(next))
  const changed = currentStable !== nextStable
  const moduleChanged = currentModuleSource !== moduleSource(current)

  console.log(`current_version=${current.latest_readme_version}`)
  console.log(`upstream_version=${next.latest_readme_version}`)
  console.log(`current_skill_count=${current.skill_count}`)
  console.log(`upstream_skill_count=${next.skill_count}`)
  console.log(`current_snapshot_sha=${hash(currentStable)}`)
  console.log(`upstream_snapshot_sha=${hash(nextStable)}`)
  console.log(`changed=${changed}`)
  console.log(`module_changed=${moduleChanged}`)

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`)
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `upstream_version=${next.latest_readme_version}\n`)
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `skill_count=${next.skill_count}\n`)
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `snapshot_sha=${hash(nextStable)}\n`)
  }

  if ((changed || moduleChanged) && write) {
    const target = changed ? next : current
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true })
    if (changed) {
      fs.writeFileSync(snapshotPath, stable(target), 'utf8')
      console.log(`wrote ${path.relative(root, snapshotPath)}`)
    }
    fs.writeFileSync(snapshotModulePath, moduleSource(target), 'utf8')
    console.log(`wrote ${path.relative(root, snapshotModulePath)}`)
  }

  if ((changed || moduleChanged) && !write) process.exitCode = 2
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
