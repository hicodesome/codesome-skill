import { login, logout, getAuthStatus } from './auth/auth.js'
import { handleBalance } from './commands/balance.js'
import { handleSubscription } from './commands/subscriptions.js'
import { handleUsage } from './commands/usage.js'
import { handleKey } from './commands/keys.js'
import { handleGroup } from './commands/groups.js'
import { handleAccount } from './commands/accounts.js'
import { handleBrowser } from './commands/browser.js'
import { runCommand } from './commands/run.js'
import { hasFlag, printJson, getOption } from './output/format.js'

const VERSION = '0.2.0'

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
    await runCommand(() => handleAuth(subcommand, args.slice(2)))
    return
  }

  if (command === 'account') {
    await runCommand(() => handleAccount(args.slice(1)))
    return
  }

  if (command === 'browser') {
    await runCommand(() => handleBrowser(args.slice(1)))
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
    console.error('当前已实现：auth、account、browser、balance、subscription、usage、key、group、version、help。')
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
  const account = getOption(args, '--account')

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printAuthHelp()
    return
  }

  if (subcommand === 'status') {
    const status = await getAuthStatus({ verify: hasFlag(args, '--verify'), baseUrl, account })
    if (json) {
      printJson(status)
      return
    }
    console.log(`当前账号：${status.account_alias}`)
    console.log(`当前状态：${status.logged_in ? '已登录（本地登录态存在）' : '未登录'}`)
    console.log(`后台地址：${status.base_url}`)
    console.log(`登录态文件：${status.session_path}`)
    if (status.cookie_count !== undefined) console.log(`Cookie 数量：${status.cookie_count}`)
    if (status.checked_remote) console.log(`远程校验：${status.logged_in ? '通过' : '未通过'}`)
    console.log(status.message)
    return
  }

  if (subcommand === 'login') {
    const result = await login({ baseUrl, timeoutMs, account })
    if (json) {
      printJson(result)
      return
    }
    console.log(result.message)
    console.log(`账号别名：${result.account_alias}`)
    console.log(`登录态文件：${result.session_path}`)
    console.log(`Cookie 数量：${result.cookie_count}`)
    return
  }

  if (subcommand === 'logout') {
    const result = await logout({ account })
    if (json) {
      printJson(result)
      return
    }
    console.log(result.message)
    console.log(`账号别名：${result.account_alias}`)
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
  auth login       打开 Codesome 专用浏览器登录，并保存本地登录态
  auth status      查看本地登录态状态
  auth logout      清理本地登录态
  account list     管理本机保存的多个 Codesome 账号
  browser install  安装 Codesome 专用 Chrome for Testing
  browser status   查看 Codesome 专用浏览器运行时
  browser uninstall 删除 Codesome 专用浏览器运行时
  balance show     查询普通按量余额和用量概览
  subscription list/active
  usage stats/recent/key
  key list/show/create/update/switch-group/delete
  group list
  version          显示版本

Planned commands:
  config codex/claude-code/clean
  doctor codex/claude-code

Global safety:
  不打印 Cookie、Token、Session、完整 API Key。
`)
}

function printAuthHelp() {
  console.log(`Codesome auth commands

Usage:
  codesome auth login [--account <alias>] [--base-url <url>] [--timeout-ms <ms>] [--json]
  codesome auth status [--account <alias>] [--verify] [--base-url <url>] [--json]
  codesome auth logout [--account <alias>] [--json]

Examples:
  codesome auth login
  codesome auth login --account work
  codesome auth status
  codesome auth status --verify
`)
}




