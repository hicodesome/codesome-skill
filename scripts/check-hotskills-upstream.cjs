#!/usr/bin/env node

const { spawnSync } = require('node:child_process')
const { buildSnapshot, fetchReadme } = require('./hotskills-readme-parser.cjs')

async function main() {
  const readme = await fetchReadme()
  const upstream = buildSnapshot(readme)

  const cli = spawnSync(process.execPath, ['./bin/codesome.js', 'hotskills', 'info', 'dbskill', '--json'], {
    encoding: 'utf8'
  })
  if (cli.status !== 0) {
    process.stderr.write(cli.stderr || cli.stdout)
    process.exit(cli.status || 1)
  }

  const payload = JSON.parse(cli.stdout)
  const failures = []
  if (payload.latest_readme_version !== upstream.latest_readme_version) {
    failures.push(`version mismatch: CLI=${payload.latest_readme_version} upstream=${upstream.latest_readme_version}`)
  }
  if (payload.skill_count !== upstream.skill_count) {
    failures.push(`skill_count mismatch: CLI=${payload.skill_count} upstream=${upstream.skill_count}`)
  }
  if (!['github-readme', 'local-cache', 'bundled-snapshot'].includes(payload.upstream?.source)) {
    failures.push(`CLI did not use GitHub metadata source: ${payload.upstream?.source || 'missing'}`)
  }
  if (payload.upstream?.readme !== upstream.readme_url) {
    failures.push(`README URL mismatch: CLI=${payload.upstream?.readme || 'missing'} upstream=${upstream.readme_url}`)
  }

  console.log(`dbskill upstream version: ${upstream.latest_readme_version}`)
  console.log(`dbskill upstream skill count: ${upstream.skill_count}`)
  console.log(`dbskill upstream skills: ${upstream.core_skills.map((item) => item.name).sort().join(', ')}`)

  if (failures.length) {
    for (const failure of failures) console.error(failure)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
