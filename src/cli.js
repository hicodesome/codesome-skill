import { login, logout, getAuthStatus } from './auth/auth.js'
import { handleBalance } from './commands/balance.js'
import { handleSubscription } from './commands/subscriptions.js'
import { handleUsage } from './commands/usage.js'
import { handleKey } from './commands/keys.js'
import { handleGroup } from './commands/groups.js'
import { runCommand } from './commands/run.js'
import { hasFlag, printJson, getOption } from './output/format.js'

const VERSION = '0.1.0'

export async function main(args) {
  const [command, subcommand] = args

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    printHelp()
    return
  }

  if (command === 'version' || command === '--version' || command === '-v') {
    console.log(`codesome ${VERSION}`)
    return
  }

  if (command === 'auth') {
    await handleAuth(subcommand, args.slice(2))
    return
  }

  if (command === 'balance') {
    await runCommand(() => handleBalance(args.slice(1)))
    return
  }

  if (command === 'subscription') {
    await runCommand(() => handleSubscription(args.slice(1)))
    return
  }

  if (command === 'usage') {
    await runCommand(() => handleUsage(args.slice(1)))
    return
  }

  if (command === 'key') {
    await runCommand(() => handleKey(args.slice(1)))
    return
  }

  if (command === 'group') {
    await runCommand(() => handleGroup(args.slice(1)))
    return
  }

  if (['config', 'doctor'].includes(command)) {
    console.error(`命令尚未实现：codesome ${command}${subcommand ? ` ${subcommand}` : ''}`)
    console.error('当前已实现：auth login/status/logout、balance show、version、help。')
    process.exitCode = 2
    return
  }

  console.error(`未知命令：${command}`)
  printHelp()
  process.exitCode = 2
}

async function handleAuth(subcommand, args) {
  const json = hasFlag(args, '--json')
  const baseUrl = getOption(args, '--base-url')
  const timeoutMs = getOption(args, '--timeout-ms')

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printAuthHelp()
    return
  }

  if (subcommand === 'status') {
    const status = await getAuthStatus({ verify: hasFlag(args, '--verify'), baseUrl })
    if (json) {
      printJson(status)
      return
    }
    console.log(`当前状态：${status.logged_in ? '已登录（本地登录态存在）' : '未登录'}`)
    console.log(`后台地址：${status.base_url}`)
    console.log(`登录态文件：${status.session_path}`)
    if (status.cookie_count !== undefined) console.log(`Cookie 数量：${status.cookie_count}`)
    if (status.checked_remote) console.log(`远程校验：${status.logged_in ? '通过' : '未通过'}`)
    console.log(status.message)
    return
  }

  if (subcommand === 'login') {
    const result = await login({ baseUrl, timeoutMs })
    if (json) {
      printJson(result)
      return
    }
    console.log(result.message)
    console.log(`登录态文件：${result.session_path}`)
    console.log(`Cookie 数量：${result.cookie_count}`)
    return
  }

  if (subcommand === 'logout') {
    const result = await logout()
    if (json) {
      printJson(result)
      return
    }
    console.log(result.message)
    for (const filePath of result.removed) console.log(`已删除：${filePath}`)
    return
  }

  console.error(`未知 auth 命令：${subcommand}`)
  printAuthHelp()
  process.exitCode = 2
}

function printHelp() {
  console.log(`Codesome CLI

Usage:
  codesome <command> [options]

Commands:
  auth login       打开浏览器登录 Codesome，并保存本地登录态
  auth status      查看本地登录态状态
  auth logout      清理本地登录态
  balance show     查询普通按量余额和用量概览
  version          显示版本

Planned commands:
  key list/create/update/switch-group/delete
  group list
  subscription list/active
  usage stats/recent
  config codex/claude-code/clean
  doctor codex/claude-code

Global safety:
  不打印 Cookie、Token、Session、完整 API Key。
`)
}

function printAuthHelp() {
  console.log(`Codesome auth commands

Usage:
  codesome auth login [--base-url <url>] [--timeout-ms <ms>] [--json]
  codesome auth status [--verify] [--base-url <url>] [--json]
  codesome auth logout [--json]

Examples:
  codesome auth login
  codesome auth status
  codesome auth status --verify
`)
}




