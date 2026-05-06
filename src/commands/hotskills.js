import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import readline from 'node:readline/promises'
import { hasFlag, printJson } from '../output/format.js'

const SKILLS = [
  {
    name: 'dbskill',
    display_name: 'dbskill',
    title: 'dbskill',
    summary: 'GitHub README 信息获取中。',
    repo: 'https://github.com/dontbesilent2025/dbskill',
    readme_url: 'https://raw.githubusercontent.com/dontbesilent2025/dbskill/main/README.md',
    installer_source: 'dontbesilent2025/dbskill',
    latest_readme_version: undefined,
    skill_count: 0,
    readme_lead: [],
    readme_intro: [],
    readme_updates: [],
    install_commands: [],
    core_skills: [],
    install_notes: [
      '确认安装后会调用 skills CLI。',
      '默认按全局安装处理，方便不同项目和 Agent 客户端复用。',
      '如只想安装到当前项目，可加 --project；如只安装到特定目录，可加 --target-dir。',
      '真实安装会自动给底层 skills CLI 加 --yes，避免进入交互选择。'
    ]
  }
]

const HOTSKILLS_FETCH_TIMEOUT_MS = 3500
const INSTALL_FLAGS = new Set(['--confirm', '--project', '--copy', '--yes', '--json', '--markdown'])
const LIST_FLAGS = new Set(['--json', '--markdown', '--install', '--no-install', '--yes', '--project', '--copy'])

export async function handleHotskills(args) {
  const subcommand = args[0]
  const skills = await getHotskills()

  if (subcommand === '--help' || subcommand === '-h' || subcommand === 'help') {
    printHotskillsHelp()
    return
  }

  if (!subcommand || subcommand === 'list' || subcommand.startsWith('--')) {
    await handleSkillList(skills, subcommand === 'list' ? args.slice(1) : args)
    return
  }

  if (subcommand === 'info') {
    const skill = requireSkill(skills, args[1])
    if (!skill) return
    printSkillInfo(skill, args.slice(2))
    return
  }

  if (subcommand === 'install') {
    const skill = requireSkill(skills, args[1])
    if (!skill) return
    const installArgs = args.slice(2)
    if (installArgs.includes('--help') || installArgs.includes('-h')) {
      printInstallHelp(skill)
      return
    }
    await installSkill(skill, installArgs)
    return
  }

  console.error(`未知 hotskills 命令：${subcommand}`)
  printHotskillsHelp()
  process.exitCode = 2
}

async function handleSkillList(skills, args) {
  const parsed = parseListArgs(args)
  if (!parsed.ok) {
    console.error(parsed.error)
    printHotskillsHelp()
    process.exitCode = 2
    return
  }

  printSkillList(skills, args)
  if (parsed.options.json || parsed.options.markdown) return

  const skill = skills[0]
  if (!skill) return

  if (parsed.options.install) {
    await installSkill(skill, buildListInstallArgs(parsed.options))
    return
  }

  if (parsed.options.noInstall || !process.stdin.isTTY || !process.stdout.isTTY) return

  const answer = await askInstallConfirmation()
  if (/^(y|yes)$/iu.test(answer)) {
    await installSkill(skill, buildListInstallArgs({ ...parsed.options, confirm: true, yes: true }))
    return
  }
  console.log('已取消安装。')
}

function parseListArgs(args) {
  const options = {
    json: false,
    markdown: false,
    install: false,
    noInstall: false,
    confirm: false,
    yes: false,
    global: true,
    copy: false,
    targetDir: undefined,
    agents: []
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--agent') {
      const value = args[index + 1]
      if (!value || value.startsWith('--')) return { ok: false, error: '--agent 需要指定客户端名称。' }
      options.agents.push(value)
      index += 1
      continue
    }
    if (arg.startsWith('--agent=')) {
      const value = arg.slice('--agent='.length)
      if (!value) return { ok: false, error: '--agent 需要指定客户端名称。' }
      options.agents.push(value)
      continue
    }
    if (arg === '--target-dir') {
      const value = args[index + 1]
      if (!value || value.startsWith('--')) return { ok: false, error: '--target-dir 需要指定目录。' }
      options.targetDir = path.resolve(value)
      options.global = false
      index += 1
      continue
    }
    if (arg.startsWith('--target-dir=')) {
      const value = arg.slice('--target-dir='.length)
      if (!value) return { ok: false, error: '--target-dir 需要指定目录。' }
      options.targetDir = path.resolve(value)
      options.global = false
      continue
    }
    if (!LIST_FLAGS.has(arg)) return { ok: false, error: `不支持的 hotskills 参数：${arg}` }
    if (arg === '--json') options.json = true
    if (arg === '--markdown') options.markdown = true
    if (arg === '--install') options.install = true
    if (arg === '--no-install') options.noInstall = true
    if (arg === '--yes') {
      options.yes = true
      options.confirm = true
      options.install = true
    }
    if (arg === '--project') options.global = false
    if (arg === '--copy') options.copy = true
  }

  if (options.install && options.noInstall) return { ok: false, error: '--install 和 --no-install 不能同时使用。' }
  if ((options.json || options.markdown) && (options.install || options.noInstall || options.yes)) {
    return { ok: false, error: '--json/--markdown 不能和安装参数同时使用。' }
  }

  return { ok: true, options }
}

function buildListInstallArgs(options) {
  const args = ['--confirm']
  for (const agent of options.agents || []) args.push('--agent', agent)
  if (!options.global) args.push('--project')
  if (options.targetDir) args.push('--target-dir', options.targetDir)
  if (options.copy) args.push('--copy')
  if (options.yes) args.push('--yes')
  return args
}

async function askInstallConfirmation() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    return (await rl.question('是否安装 dbskill？输入 Y 安装，输入 N 跳过：')).trim()
  } finally {
    rl.close()
  }
}

function requireSkill(skills, name) {
  if (!name || name === '--help' || name === '-h') {
    printHotskillsHelp()
    return undefined
  }
  const skill = skills.find((item) => item.name === name)
  if (!skill) {
    console.error(`未知推荐 skill：${name}`)
    console.error(`当前可用：${skills.map((item) => item.name).join(', ')}`)
    process.exitCode = 2
    return undefined
  }
  return skill
}

async function getHotskills() {
  const skills = SKILLS.map((skill) => ({ ...skill }))
  const updated = await Promise.all(skills.map(refreshSkillMetadata))
  return updated
}

async function refreshSkillMetadata(skill) {
  if (skill.name !== 'dbskill') return skill
  try {
    const readme = await fetchText(skill.readme_url)
    const readmeInfo = parseReadme(readme)
    return {
      ...skill,
      title: readmeInfo.title || skill.title,
      summary: readmeInfo.summary || skill.summary,
      latest_readme_version: readmeInfo.version,
      skill_count: readmeInfo.skills.length,
      readme_lead: readmeInfo.lead,
      readme_intro: readmeInfo.intro,
      readme_updates: readmeInfo.updates,
      install_commands: readmeInfo.installCommands,
      core_skills: readmeInfo.skills,
      upstream: {
        source: 'github-readme',
        refreshed_at: new Date().toISOString(),
        readme: skill.readme_url
      }
    }
  } catch {
    return {
      ...skill,
      upstream: {
        source: 'bundled-fallback'
      }
    }
  }
}

async function fetchText(url) {
  const response = await fetchWithTimeout(url, {
    headers: {
      accept: 'text/plain, text/markdown, */*',
      'user-agent': 'codesome-cli'
    }
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), HOTSKILLS_FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function parseReadme(readme) {
  const lines = readme.split(/\r?\n/u)
  const title = extractReadmeTitle(lines)
  const lead = extractReadmeLead(lines)
  const intro = extractReadmeIntro(lines)
  const updates = extractReadmeUpdates(lines)
  const installCommands = extractReadmeInstallCommands(lines)
  const skills = extractReadmeSkills(lines)

  return {
    title,
    lead,
    summary: intro[0],
    version: extractReadmeVersion(readme),
    intro,
    updates,
    installCommands,
    skills
  }
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
  if (!match) return undefined
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

function publicSkill(skill) {
  return {
    name: skill.name,
    display_name: skill.display_name,
    title: skill.title,
    summary: skill.summary,
    repo: skill.repo,
    readme_url: skill.readme_url,
    installer_source: skill.installer_source,
    latest_readme_version: skill.latest_readme_version,
    skill_count: skill.skill_count,
    readme_lead: skill.readme_lead,
    readme_intro: skill.readme_intro,
    readme_updates: skill.readme_updates,
    install_commands: skill.install_commands,
    core_skills: skill.core_skills,
    upstream: skill.upstream,
    install_preview_command: buildInstallCommand(skill, { global: true, agents: [] }).display
  }
}

function printSkillList(skills, args) {
  if (hasFlag(args, '--json')) {
    printJson({ items: skills.map(publicSkill) })
    return
  }

  if (hasFlag(args, '--markdown')) {
    console.log('# Codesome Hot Skills')
    console.log('')
    for (const skill of skills) {
      console.log(`## ${skill.display_name}`)
      console.log('')
      console.log(skill.summary)
      console.log('')
      console.log(`- 来源：${skill.repo}`)
      if (skill.latest_readme_version) console.log(`- README 标注版本：${skill.latest_readme_version}`)
      console.log(`- README：${skill.readme_url}`)
      console.log(`- 查看详情：\`codesome hotskills info ${skill.name}\``)
      console.log(`- 立即安装：\`codesome hotskills install ${skill.name} --confirm\``)
      console.log('')
    }
    return
  }

  for (const skill of skills) {
    for (const paragraph of skill.readme_lead) console.log(paragraph)
    if (!skill.readme_lead.length) console.log(skill.summary)
    console.log('')
  }
}

function printSkillInfo(skill, args) {
  if (hasFlag(args, '--json')) {
    printJson(publicSkill(skill))
    return
  }

  if (hasFlag(args, '--markdown')) {
    console.log(`# ${skill.display_name}`)
    console.log('')
    console.log(skill.summary)
    console.log('')
    console.log('## README 顶部介绍')
    for (const item of skill.readme_lead) console.log(`- ${item}`)
    console.log('')
    console.log('## README 工具箱')
    for (const item of skill.core_skills) console.log(`- \`${item.trigger}\`：${item.description}`)
    console.log('')
    console.log('## 安装')
    console.log('')
    console.log('```bash')
    console.log(`codesome hotskills install ${skill.name}`)
    console.log(`codesome hotskills install ${skill.name} --confirm`)
    console.log('```')
    console.log('')
    console.log(`来源：${skill.repo}`)
    console.log(`README：${skill.readme_url}`)
    return
  }

  console.log(`${skill.display_name} - ${skill.title}`)
  console.log('')
  console.log(`简介：${skill.summary}`)
  console.log(`来源：${skill.repo}`)
  console.log(`README：${skill.readme_url}`)
  console.log(`README 标注版本：${skill.latest_readme_version}`)
  console.log('')
  console.log('README 顶部介绍')
  for (const item of skill.readme_lead) console.log(`- ${item}`)
  console.log('')
  console.log('README 工具箱')
  for (const item of skill.core_skills) {
    console.log(`- ${item.trigger} (${item.name})`)
    console.log(`  ${item.description}`)
  }
  if (skill.install_commands.length) {
    console.log('')
    console.log('README 安装命令')
    for (const command of skill.install_commands) console.log(`- ${command}`)
  }
  console.log('')
  console.log('安装')
  console.log(`- 查看安装信息：codesome hotskills install ${skill.name}`)
  console.log(`- 立即安装：codesome hotskills install ${skill.name} --confirm`)
  console.log(`- 指定客户端：codesome hotskills install ${skill.name} --confirm --agent codex`)
  console.log(`- 当前项目安装：codesome hotskills install ${skill.name} --confirm --project`)
  console.log(`- 临时目录安装：codesome hotskills install ${skill.name} --confirm --target-dir C:\\Users\\joe\\Downloads --copy`)
}

async function installSkill(skill, args) {
  const parsed = parseInstallArgs(args)
  if (!parsed.ok) {
    console.error(parsed.error)
    printInstallHelp(skill)
    process.exitCode = 2
    return
  }

  const command = buildInstallCommand(skill, parsed.options)
  const payload = {
    skill: publicSkill(skill),
    will_write: parsed.options.confirm,
    command: command.display,
    safety: {
      curated_only: true,
      default_scope: parsed.options.global ? 'global' : 'project',
      requires_confirm: true
    }
  }

  if (parsed.options.json && !parsed.options.confirm) {
    printJson(payload)
    return
  }

  if (!parsed.options.confirm) {
    if (parsed.options.markdown) {
      printInstallPreviewMarkdown(skill, command.display, parsed.options)
      return
    }
    printInstallPreview(skill, command.display, parsed.options)
    return
  }

  if (parsed.options.markdown || parsed.options.json) {
    console.error('--confirm 暂不支持 --json 或 --markdown；真实安装会输出 skills CLI 的交互日志。')
    process.exitCode = 2
    return
  }

  console.log(`准备安装：${skill.display_name}`)
  console.log(`执行命令：${command.display}`)
  if (command.cwd) console.log(`工作目录：${command.cwd}`)
  console.log('')
  if (command.cwd) await fs.mkdir(command.cwd, { recursive: true })
  const code = await run(command.bin, command.args, command.cwd)
  if (code !== 0) process.exitCode = code
}

function parseInstallArgs(args) {
  const options = {
    confirm: false,
    global: true,
    copy: false,
    yes: false,
    json: false,
    markdown: false,
    targetDir: undefined,
    agents: []
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--agent') {
      const value = args[index + 1]
      if (!value || value.startsWith('--')) return { ok: false, error: '--agent 需要指定客户端名称。' }
      options.agents.push(value)
      index += 1
      continue
    }
    if (arg.startsWith('--agent=')) {
      const value = arg.slice('--agent='.length)
      if (!value) return { ok: false, error: '--agent 需要指定客户端名称。' }
      options.agents.push(value)
      continue
    }
    if (arg === '--target-dir') {
      const value = args[index + 1]
      if (!value || value.startsWith('--')) return { ok: false, error: '--target-dir 需要指定目录。' }
      options.targetDir = path.resolve(value)
      options.global = false
      index += 1
      continue
    }
    if (arg.startsWith('--target-dir=')) {
      const value = arg.slice('--target-dir='.length)
      if (!value) return { ok: false, error: '--target-dir 需要指定目录。' }
      options.targetDir = path.resolve(value)
      options.global = false
      continue
    }
    if (!INSTALL_FLAGS.has(arg)) return { ok: false, error: `不支持的 install 参数：${arg}` }
    if (arg === '--confirm') options.confirm = true
    if (arg === '--project') options.global = false
    if (arg === '--copy') options.copy = true
    if (arg === '--yes') options.yes = true
    if (arg === '--json') options.json = true
    if (arg === '--markdown') options.markdown = true
  }

  return { ok: true, options }
}

function buildInstallCommand(skill, options) {
  const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const args = ['--yes', '--package', 'skills', 'skills', 'add', skill.installer_source]
  if (options.global) args.push('--global')
  for (const agent of options.agents || []) args.push('--agent', agent)
  if (options.copy) args.push('--copy')
  args.push('--yes')
  return {
    bin,
    args,
    cwd: options.targetDir,
    display: ['npx', ...args].join(' ')
  }
}

function printInstallPreview(skill, command, options) {
  console.log(`安装信息：${skill.display_name}`)
  console.log('')
  console.log(`来源：${skill.repo}`)
  console.log(`README：${skill.readme_url}`)
  console.log(`范围：${options.global ? '全局用户目录' : '当前项目目录'}`)
  if (options.targetDir) console.log(`目标目录：${options.targetDir}`)
  if (options.agents.length) console.log(`客户端：${options.agents.join(', ')}`)
  else console.log('客户端：由 skills CLI 检测或交互选择')
  console.log('')
  console.log('安全提示')
  for (const note of skill.install_notes) console.log(`- ${note}`)
  console.log('- Codesome 只允许安装内置白名单中的推荐 skill。')
  console.log('')
  console.log('将执行')
  console.log(command)
  console.log('')
  console.log(`确认安装：${buildCodesomeInstallCommand(skill, options)}`)
}

function printInstallPreviewMarkdown(skill, command, options) {
  console.log(`# ${skill.display_name} 安装信息`)
  console.log('')
  console.log(`- 来源：${skill.repo}`)
  console.log(`- README：${skill.readme_url}`)
  console.log(`- 范围：${options.global ? '全局用户目录' : '当前项目目录'}`)
  if (options.targetDir) console.log(`- 目标目录：${options.targetDir}`)
  console.log(`- 客户端：${options.agents.length ? options.agents.join(', ') : '由 skills CLI 检测或交互选择'}`)
  console.log('')
  console.log('## 安全提示')
  for (const note of skill.install_notes) console.log(`- ${note}`)
  console.log('- Codesome 只允许安装内置白名单中的推荐 skill。')
  console.log('')
  console.log('## 将执行')
  console.log('')
  console.log('```bash')
  console.log(command)
  console.log('```')
  console.log('')
  console.log(`确认安装：\`${buildCodesomeInstallCommand(skill, options)}\``)
}

function buildCodesomeInstallCommand(skill, options) {
  const parts = ['codesome', 'hotskills', 'install', skill.name, '--confirm']
  for (const agent of options.agents || []) parts.push('--agent', agent)
  if (!options.global) parts.push('--project')
  if (options.targetDir) parts.push('--target-dir', quoteArg(options.targetDir))
  if (options.copy) parts.push('--copy')
  if (options.yes) parts.push('--yes')
  return parts.join(' ')
}

function quoteArg(value) {
  return /[\s"]/u.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value
}

function printInstallHelp(skill) {
  console.log(`Codesome hotskills install ${skill.name}

Usage:
  codesome hotskills install ${skill.name} [--confirm] [--agent <name>] [--project] [--target-dir <dir>] [--copy] [--yes] [--json]

Examples:
  codesome hotskills install ${skill.name}
  codesome hotskills install ${skill.name} --confirm
  codesome hotskills install ${skill.name} --confirm --agent codex
  codesome hotskills install ${skill.name} --confirm --project --copy
  codesome hotskills install ${skill.name} --confirm --target-dir C:\\Users\\joe\\Downloads --copy
`)
}

function printHotskillsHelp() {
  console.log(`Codesome hotskills commands

Usage:
  codesome hotskills [--json] [--markdown] [--install|--no-install] [--yes] [--agent <name>] [--project] [--target-dir <dir>] [--copy]
  codesome hotskills info <name> [--json] [--markdown]
  codesome hotskills install <name> [--confirm] [--agent <name>] [--project] [--target-dir <dir>] [--copy] [--yes] [--json]

Examples:
  codesome hotskills
  codesome hotskills --install --yes
  codesome hotskills --install --yes --agent codex
  codesome hotskills info dbskill
  codesome hotskills install dbskill
  codesome hotskills install dbskill --confirm --agent codex
`)
}

function run(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('error', (error) => {
      console.error(`安装命令启动失败：${error.message}`)
      resolve(1)
    })
    child.on('close', (code) => resolve(code || 0))
  })
}
