import { login, logout, getAuthStatus } from './auth/auth.js'
import { handleBalance } from './commands/balance.js'
import { handleSubscription } from './commands/subscriptions.js'
import { handleUsage } from './commands/usage.js'
import { handleKey } from './commands/keys.js'
import { handleGroup } from './commands/groups.js'
import { handleAccount } from './commands/accounts.js'
import { handleInstance } from './commands/instances.js'
import { handleBrowser } from './commands/browser.js'
import { handleRedeem } from './commands/redeem.js'
import { handleHotskills } from './commands/hotskills.js'
import { runCommand } from './commands/run.js'
import { hasFlag, printJson, getOption } from './output/format.js'

const VERSION = '0.5.2-rc.1'

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

  if (command === 'instance') {
    await runCommand(() => handleInstance(args.slice(1)))
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

  if (command === 'redeem') {
    await runCommand(() => handleRedeem(args.slice(1)))
    return
  }

  if (command === 'hotskills') {
    await runCommand(() => handleHotskills(args.slice(1)))
    return
  }

  if (['config', 'doctor'].includes(command)) {
    console.error(`命令尚未实现：codesome ${command}${subcommand ? ` ${subcommand}` : ''}`)
    console.error('当前已实现：auth、instance、account、browser、balance、subscription、usage、key、group、redeem、hotskills、version、help。')
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
  const instance = getOption(args, '--instance')
  const username = getOption(args, '--username') || getOption(args, '--email')
  const totpCode = getOption(args, '--totp-code')

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printAuthHelp()
    return
  }

  if (hasFlag(args, '--help') || hasFlag(args, '-h')) {
    printAuthHelp()
    return
  }

  if (subcommand === 'status') {
    const status = await getAuthStatus({ verify: hasFlag(args, '--verify'), baseUrl, account, instance })
    if (json) {
      printJson(status)
      return
    }
    console.log(`当前账号：${status.account_alias}`)
    console.log(`当前实例：${status.instance_id}`)
    console.log(`当前状态：${status.logged_in ? '已登录' : '未登录'}`)
    console.log(`凭证来源：${status.token_source || '-'}`)
    console.log(`后台地址：${status.base_url}`)
    console.log(`HTTP 凭证文件：${status.credentials_path}`)
    console.log(`登录态文件：${status.session_path}`)
    if (status.credentials_exists !== undefined) console.log(`HTTP 凭证：${status.credentials_exists ? '已保存' : '未保存'}`)
    if (status.session_exists !== undefined) console.log(`浏览器登录态：${status.session_exists ? '已保存' : '未保存'}`)
    if (status.cookie_count !== undefined) console.log(`Cookie 数量：${status.cookie_count}`)
    if (status.checked_remote) console.log(`远程校验：${status.logged_in ? '通过' : '未通过'}`)
    console.log(status.message)
    return
  }

  if (subcommand === 'login') {
    const result = await login({
      baseUrl,
      timeoutMs,
      account,
      instance,
      username,
      totpCode,
      passwordStdin: hasFlag(args, '--password-stdin'),
      browser: hasFlag(args, '--browser')
    })
    if (json) {
      printJson(result)
      return
    }
    console.log(result.message)
    console.log(`实例：${result.instance_id}`)
    console.log(`账号别名：${result.account_alias}`)
    console.log(`凭证来源：${result.token_source}`)
    if (result.credentials_path) console.log(`HTTP 凭证文件：${result.credentials_path}`)
    if (result.session_path) console.log(`浏览器登录态文件：${result.session_path}`)
    if (result.cookie_count !== undefined) console.log(`Cookie 数量：${result.cookie_count}`)
    return
  }

  if (subcommand === 'logout') {
    const result = await logout({ account, instance, baseUrl, timeoutMs })
    if (json) {
      printJson(result)
      return
    }
    console.log(result.message)
    console.log(`实例：${result.instance_id}`)
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
  auth login       使用账号密码 HTTP 登录，并保存本地凭证
  auth status      查看本地登录态状态
  auth logout      清理本地登录态
  instance list    本机登记任意 Sub2API 自部署实例
  account list     管理本机保存的多个 Codesome 账号
  browser install  安装 Codesome 专用 Chrome for Testing（浏览器兜底登录用）
  browser status   查看 Codesome 专用浏览器运行时
  browser uninstall 删除 Codesome 专用浏览器运行时
  balance show     查询普通按量余额和用量概览
  subscription list/active
  usage stats/recent/key
  key list/show/create/update/switch-group/delete
  group list
  redeem apply/history
  hotskills        查看优秀 Agent Skills，并安全安装白名单推荐项
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
  codesome auth login [--instance <name>] [--account <alias>] [--username <email>] [--password-stdin] [--totp-code <code>] [--browser] [--base-url <url>] [--timeout-ms <ms>] [--json]
  codesome auth status [--instance <name>] [--account <alias>] [--verify] [--base-url <url>] [--json]
  codesome auth logout [--instance <name>] [--account <alias>] [--base-url <url>] [--json]

Examples:
  codesome auth login
  codesome instance add my-sub2api --base-url https://api.example.com
  codesome auth login --instance my-sub2api
  codesome auth login --account work --username user@example.com
  type password.txt | codesome auth login --username user@example.com --password-stdin
  codesome auth login --browser
  codesome auth status
  codesome auth status --verify

Instance note:
  自定义实例通过 instance add 在本机登记，任意 Sub2API 兼容 HTTPS 地址均可使用，无需平台审核。
`)
}



