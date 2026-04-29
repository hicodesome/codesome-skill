import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { hasFlag, printJson } from '../output/format.js'

const SKILLS = [
  {
    name: 'dbskill',
    display_name: 'dbskill',
    title: 'dontbesilent 商业诊断工具箱',
    summary: '从 12,307 条推文中提炼方法论，做成 13 个 Claude Code / Codex 可用的 Agent skills。',
    repo: 'https://github.com/dontbesilent2025/dbskill',
    installer_source: 'dontbesilent2025/dbskill',
    license: 'CC BY-NC 4.0',
    latest_readme_version: 'v2.6.7',
    skill_count: 13,
    best_for: [
      '商业模式诊断、方向判断和问题消解',
      '对标分析、内容创作、小红书标题和短视频开头优化',
      'Agent 工作台迁移，统一 Claude Code / Codex 的规则和 skill bridge'
    ],
    core_skills: [
      { name: 'dbs', trigger: '/dbs', description: '主入口，根据问题自动路由到合适诊断工具' },
      { name: 'dbs-diagnosis', trigger: '/dbs-diagnosis', description: '商业模式诊断，消解问题或拆解业务' },
      { name: 'dbs-benchmark', trigger: '/dbs-benchmark', description: '对标分析，用五重过滤法排除噪音' },
      { name: 'dbs-content', trigger: '/dbs-content', description: '内容创作诊断，判断选题如何做成好内容' },
      { name: 'dbs-hook', trigger: '/dbs-hook', description: '短视频开头优化，诊断并生成方案' },
      { name: 'dbs-xhs-title', trigger: '/dbs-xhs-title', description: '小红书标题公式，从 75 个公式中选用' },
      { name: 'dbs-ai-check', trigger: '/dbs-ai-check', description: 'AI 写作特征识别，默认只诊断不改写' },
      { name: 'dbs-agent-migration', trigger: '/dbs-agent-migration', description: 'Agent 工作台迁移，整理 Claude Code / Codex 双端一致性' }
    ],
    install_notes: [
      '默认安装预检不写入文件；追加 --confirm 才会调用 skills CLI。',
      '默认按全局安装处理，方便不同项目和 Agent 客户端复用。',
      '如只想安装到当前项目，可加 --project；如只安装到特定目录，可加 --target-dir。',
      '真实安装会自动给底层 skills CLI 加 --yes，避免进入交互选择。'
    ]
  }
]

const INSTALL_FLAGS = new Set(['--confirm', '--project', '--copy', '--yes', '--json', '--markdown'])

export async function handleHotskills(args) {
  const subcommand = args[0]

  if (!subcommand || subcommand === 'list' || subcommand === '--json' || subcommand === '--markdown') {
    printSkillList(args)
    return
  }

  if (subcommand === '--help' || subcommand === '-h' || subcommand === 'help') {
    printHotskillsHelp()
    return
  }

  if (subcommand === 'info') {
    const skill = requireSkill(args[1])
    if (!skill) return
    printSkillInfo(skill, args.slice(2))
    return
  }

  if (subcommand === 'install') {
    const skill = requireSkill(args[1])
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

function requireSkill(name) {
  if (!name || name === '--help' || name === '-h') {
    printHotskillsHelp()
    return undefined
  }
  const skill = SKILLS.find((item) => item.name === name)
  if (!skill) {
    console.error(`未知推荐 skill：${name}`)
    console.error(`当前可用：${SKILLS.map((item) => item.name).join(', ')}`)
    process.exitCode = 2
    return undefined
  }
  return skill
}

function publicSkill(skill) {
  return {
    name: skill.name,
    display_name: skill.display_name,
    title: skill.title,
    summary: skill.summary,
    repo: skill.repo,
    installer_source: skill.installer_source,
    license: skill.license,
    latest_readme_version: skill.latest_readme_version,
    skill_count: skill.skill_count,
    best_for: skill.best_for,
    core_skills: skill.core_skills,
    install_preview_command: buildInstallCommand(skill, { global: true, agents: [] }).display
  }
}

function printSkillList(args) {
  if (hasFlag(args, '--json')) {
    printJson({ items: SKILLS.map(publicSkill) })
    return
  }

  if (hasFlag(args, '--markdown')) {
    console.log('# Codesome Hot Skills')
    console.log('')
    for (const skill of SKILLS) {
      console.log(`## ${skill.display_name}`)
      console.log('')
      console.log(skill.summary)
      console.log('')
      console.log(`- 来源：${skill.repo}`)
      console.log(`- 许可证：${skill.license}`)
      console.log(`- 查看详情：\`codesome hotskills info ${skill.name}\``)
      console.log(`- 安装预检：\`codesome hotskills install ${skill.name}\``)
      console.log('')
    }
    return
  }

  console.log('Codesome Hot Skills')
  console.log('')
  console.log('精选 Agent Skill 导航。默认用窄屏友好的文本卡片展示，不自动安装。')
  console.log('')
  for (const skill of SKILLS) {
    console.log(`${skill.display_name} - ${skill.title}`)
    console.log(`用途：${skill.summary}`)
    console.log(`适合：${skill.best_for.slice(0, 2).join('；')}`)
    console.log(`包含：${skill.skill_count} 个 skills，核心入口 ${skill.core_skills[0].trigger}`)
    console.log(`详情：codesome hotskills info ${skill.name}`)
    console.log(`安装预检：codesome hotskills install ${skill.name}`)
    console.log(`来源：${skill.repo}`)
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
    console.log('## 适合场景')
    for (const item of skill.best_for) console.log(`- ${item}`)
    console.log('')
    console.log('## 核心 skills')
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
    console.log(`许可证：${skill.license}`)
    return
  }

  console.log(`${skill.display_name} - ${skill.title}`)
  console.log('')
  console.log(`简介：${skill.summary}`)
  console.log(`来源：${skill.repo}`)
  console.log(`许可证：${skill.license}`)
  console.log(`README 标注版本：${skill.latest_readme_version}`)
  console.log('')
  console.log('适合场景')
  for (const item of skill.best_for) console.log(`- ${item}`)
  console.log('')
  console.log('核心 skills')
  for (const item of skill.core_skills) {
    console.log(`- ${item.trigger} (${item.name})`)
    console.log(`  ${item.description}`)
  }
  console.log('')
  console.log('安装')
  console.log(`- 预检：codesome hotskills install ${skill.name}`)
  console.log(`- 执行：codesome hotskills install ${skill.name} --confirm`)
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
  const args = ['--yes', 'skills', 'add', skill.installer_source]
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
  console.log(`安装预检：${skill.display_name}`)
  console.log('')
  console.log(`来源：${skill.repo}`)
  console.log(`许可证：${skill.license}`)
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
  console.log(`# ${skill.display_name} 安装预检`)
  console.log('')
  console.log(`- 来源：${skill.repo}`)
  console.log(`- 许可证：${skill.license}`)
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
  codesome hotskills [--json] [--markdown]
  codesome hotskills info <name> [--json] [--markdown]
  codesome hotskills install <name> [--confirm] [--agent <name>] [--project] [--target-dir <dir>] [--copy] [--yes] [--json]

Examples:
  codesome hotskills
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
