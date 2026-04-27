import { findEnvBrowser, findSystemBrowser } from '../auth/browser.js'
import { accountBrowserProfileDir, accountPort } from '../auth/system-browser.js'
import { resolveAccountContext } from '../accounts/accounts.js'
import { getOption, hasFlag, printJson } from '../output/format.js'
import { browserStatus, installBrowser, uninstallBrowser } from '../services/browser-runtime.js'

export async function handleBrowser(args) {
  const subcommand = args[0]
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printBrowserHelp()
    return
  }

  if (subcommand === 'install') {
    const result = await installBrowser({ force: hasFlag(args, '--force') })
    if (hasFlag(args, '--json')) {
      printJson(result)
      return
    }
    console.log(result.reused ? 'Codesome 专用浏览器已是最新版本。' : 'Codesome 专用浏览器安装完成。')
    console.log(`版本：${result.version}`)
    console.log(`平台：${result.platform}`)
    console.log(`浏览器路径：${result.browser_path}`)
    return
  }

  if (subcommand === 'uninstall') {
    const result = await uninstallBrowser({ confirm: hasFlag(args, '--confirm') })
    if (hasFlag(args, '--json')) {
      printJson(result)
      return
    }
    if (result.dry_run) {
      console.log('危险操作：删除 Codesome 专用浏览器（预检）')
      console.log(`浏览器目录：${result.browser_root}`)
      console.log('如确认删除，请重新执行：codesome browser uninstall --confirm')
      return
    }
    console.log('Codesome 专用浏览器已删除。')
    console.log(`浏览器目录：${result.browser_root}`)
    return
  }

  if (subcommand !== 'status') {
    console.error(`未知 browser 命令：${subcommand}`)
    printBrowserHelp()
    process.exitCode = 2
    return
  }

  const json = hasFlag(args, '--json')
  const account = await resolveAccountContext({ account: getOption(args, '--account'), createIfMissing: true })
  const status = await browserStatus()
  const data = {
    ...status,
    account_alias: account.alias,
    profile_dir: accountBrowserProfileDir(account.alias),
    cdp_port: accountPort(account.alias),
    external_browser_ignored: Boolean(findEnvBrowser() || findSystemBrowser())
  }

  if (json) {
    printJson(data)
    return
  }

  console.log('Codesome 浏览器状态')
  console.log('')
  console.log(`浏览器来源：${data.browser_source}`)
  console.log(`浏览器路径：${data.browser_path || '-'}`)
  console.log(`浏览器根目录：${data.browser_root}`)
  if (data.version) console.log(`版本：${data.version}`)
  console.log(`账号别名：${data.account_alias}`)
  console.log(`Profile：${data.profile_dir}`)
  console.log(`调试端口：${data.cdp_port}`)
  if (data.external_browser_ignored) console.log('外部 Chrome/Edge 已忽略；登录只使用 Codesome 专用浏览器。')
  if (data.install_hint) console.log(data.install_hint)
}

export function printBrowserHelp() {
  console.log(`Codesome browser commands

Usage:
  codesome browser status [--account <alias>] [--json]
  codesome browser install [--force] [--json]
  codesome browser uninstall [--confirm] [--json]

Installs and manages the mandatory Codesome Chrome for Testing runtime.
`)
}
