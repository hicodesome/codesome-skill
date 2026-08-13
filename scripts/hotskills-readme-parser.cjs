const REPO = 'dontbesilent2025/dbskill'
const README_URL = `https://raw.githubusercontent.com/${REPO}/main/README.md`
const USER_AGENT = 'codesome-cli'

async function fetchReadme() {
  const response = await fetch(README_URL, {
    headers: {
      accept: 'text/plain, text/markdown, */*',
      'user-agent': USER_AGENT
    }
  })
  if (!response.ok) throw new Error(`${README_URL} returned HTTP ${response.status}`)
  return response.text()
}

function parseReadme(readme) {
  const lines = readme.split(/\r?\n/u)
  const title = extractReadmeTitle(lines)
  const lead = extractReadmeLead(lines)
  const intro = extractReadmeIntro(lines)
  const updates = extractReadmeUpdates(lines)
  const installCommands = extractReadmeInstallCommands(lines)
  const skills = extractReadmeSkills(lines)
  const version = extractReadmeVersion(readme)
  const summary = intro[0] || lead.find((line) => !line.startsWith('最新更新：')) || ''

  return {
    title,
    summary,
    latest_readme_version: version,
    skill_count: skills.length,
    readme_lead: lead,
    readme_intro: intro,
    readme_updates: updates,
    install_commands: installCommands,
    core_skills: skills
  }
}

function buildSnapshot(readme, generatedAt = new Date().toISOString()) {
  const parsed = parseReadme(readme)
  const snapshot = {
    name: 'dbskill',
    display_name: 'dbskill',
    title: parsed.title || 'dbskill',
    summary: parsed.summary,
    repo: `https://github.com/${REPO}`,
    readme_url: README_URL,
    installer_source: REPO,
    latest_readme_version: parsed.latest_readme_version,
    skill_count: parsed.skill_count,
    readme_lead: parsed.readme_lead,
    readme_intro: parsed.readme_intro,
    readme_updates: parsed.readme_updates,
    install_commands: parsed.install_commands,
    core_skills: parsed.core_skills,
    snapshot: {
      source: 'github-readme',
      generated_at: generatedAt
    }
  }
  validateSnapshot(snapshot)
  return snapshot
}

function validateSnapshot(snapshot) {
  const failures = []
  if (snapshot.name !== 'dbskill') failures.push('name must be dbskill')
  if (!snapshot.summary) failures.push('summary is required')
  if (!/^v\d+\.\d+\.\d+/u.test(snapshot.latest_readme_version || '')) failures.push('latest_readme_version is required')
  if (!Number.isInteger(snapshot.skill_count) || snapshot.skill_count < 1) failures.push('skill_count must be positive')
  if (!Array.isArray(snapshot.core_skills) || !snapshot.core_skills.some((item) => item.trigger === '/dbs')) {
    failures.push('core_skills must include /dbs')
  }
  if (snapshot.core_skills.length !== snapshot.skill_count) {
    failures.push(`core_skills length ${snapshot.core_skills.length} does not match skill_count ${snapshot.skill_count}`)
  }
  if (failures.length) throw new Error(`invalid hotskills snapshot: ${failures.join('; ')}`)
}

function extractReadmeTitle(lines) {
  const heading = lines.find((line) => line.trim().startsWith('# '))
  return heading ? heading.replace(/^#\s+/u, '').trim() : undefined
}

function extractReadmeLead(lines) {
  const lead = []
  let inLead = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.startsWith('# ')) {
      inLead = true
      continue
    }
    if (!inLead) continue
    if (line.startsWith('## 如何安装')) break
    if (!line || line === '---' || line.startsWith('!')) continue
    lead.push(stripMarkdown(line))
  }

  return lead
}

function extractReadmeIntro(lines) {
  const intro = []
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('# ') || line === '---' || line.startsWith('!')) continue
    if (line.startsWith('## ')) break
    if (line.startsWith('**最新更新')) continue
    if (line.startsWith('**v')) continue
    if (line.startsWith('**作者')) continue
    intro.push(stripMarkdown(line))
  }
  return intro
}

function extractReadmeVersion(readme) {
  const match = readme.match(/最新更新：\s*(v?\d+(?:\.\d+){1,3})/u)
  if (!match) throw new Error('README version marker not found')
  return match[1].startsWith('v') ? match[1] : `v${match[1]}`
}

function extractReadmeUpdates(lines) {
  const updates = []
  for (const rawLine of lines) {
    const line = rawLine.trim()
    const match = line.match(/^\*\*(v?\d+(?:\.\d+){1,3})\s+新增\*\*：(.+)$/u)
    if (match) updates.push(`${match[1].startsWith('v') ? match[1] : `v${match[1]}`} 新增：${stripMarkdown(match[2])}`)
  }
  return updates
}

function extractReadmeInstallCommands(lines) {
  const commands = []
  let inInstallSection = false
  let inCodeBlock = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === '## 如何安装 dbskill') {
      inInstallSection = true
      continue
    }
    if (inInstallSection && line.startsWith('## ')) break
    if (!inInstallSection) continue
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock && line) commands.push(line)
  }
  return commands
}

function extractReadmeSkills(lines) {
  const skills = []
  const seen = new Set()
  for (const rawLine of lines) {
    const line = rawLine.trim()
    const match = line.match(/^\|\s*`([^`]+)`(?:\s*或\s*`[^`]+`)?\s*\|\s*([^|]+)\|/u)
    if (!match) continue
    const trigger = match[1].trim()
    if (!trigger.startsWith('/')) continue
    const name = trigger.slice(1)
    if (seen.has(name)) continue
    seen.add(name)
    skills.push({
      name,
      trigger,
      description: stripMarkdown(match[2].trim())
    })
  }
  return skills
}

function stripMarkdown(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
    .replace(/`([^`]+)`/gu, '$1')
    .replace(/\*\*([^*]+)\*\*/gu, '$1')
    .trim()
}

module.exports = {
  README_URL,
  buildSnapshot,
  fetchReadme,
  parseReadme,
  validateSnapshot
}
