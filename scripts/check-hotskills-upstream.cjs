#!/usr/bin/env node

const { spawnSync } = require('node:child_process')

const REPO = 'dontbesilent2025/dbskill'
const USER_AGENT = 'codesome-cli'

async function main() {
  const readmeUrl = `https://raw.githubusercontent.com/${REPO}/main/README.md`
  const readme = await fetchText(readmeUrl)
  const upstreamVersion = extractReadmeVersion(readme)
  const upstreamSkillNames = extractReadmeSkillNames(readme)

  const cli = spawnSync(process.execPath, ['./bin/codesome.js', 'hotskills', 'info', 'dbskill', '--json'], {
    encoding: 'utf8'
  })
  if (cli.status !== 0) {
    process.stderr.write(cli.stderr || cli.stdout)
    process.exit(cli.status || 1)
  }

  const payload = JSON.parse(cli.stdout)
  const failures = []
  if (payload.latest_readme_version !== upstreamVersion) {
    failures.push(`version mismatch: CLI=${payload.latest_readme_version} upstream=${upstreamVersion}`)
  }
  if (payload.skill_count !== upstreamSkillNames.length) {
    failures.push(`skill_count mismatch: CLI=${payload.skill_count} upstream=${upstreamSkillNames.length}`)
  }
  if (payload.upstream?.source !== 'github-readme') {
    failures.push(`CLI did not use GitHub metadata source: ${payload.upstream?.source || 'missing'}`)
  }
  if (payload.upstream?.readme !== readmeUrl) {
    failures.push(`README URL mismatch: CLI=${payload.upstream?.readme || 'missing'} upstream=${readmeUrl}`)
  }

  console.log(`dbskill upstream version: ${upstreamVersion}`)
  console.log(`dbskill upstream skill count: ${upstreamSkillNames.length}`)
  console.log(`dbskill upstream skills: ${upstreamSkillNames.join(', ')}`)

  if (failures.length) {
    for (const failure of failures) console.error(failure)
    process.exit(1)
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'text/plain, */*',
      'user-agent': USER_AGENT
    }
  })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  return response.text()
}

function extractReadmeVersion(readme) {
  const match = readme.match(/最新更新：\s*(v?\d+(?:\.\d+){1,3})/u)
  if (!match) throw new Error('README version marker not found')
  return match[1].startsWith('v') ? match[1] : `v${match[1]}`
}

function extractReadmeSkillNames(readme) {
  const names = []
  const seen = new Set()
  for (const rawLine of readme.split(/\r?\n/u)) {
    const match = rawLine.trim().match(/^\|\s*`([^`]+)`(?:\s*或\s*`[^`]+`)?\s*\|\s*([^|]+)\|/u)
    if (!match) continue
    const trigger = match[1].trim()
    if (!trigger.startsWith('/')) continue
    const name = trigger.slice(1)
    if (seen.has(name)) continue
    seen.add(name)
    names.push(name)
  }
  return names.sort()
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
