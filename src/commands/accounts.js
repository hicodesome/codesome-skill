import {
  addAccount,
  listAccounts,
  removeAccount,
  renameAccount,
  resolveAccountContext,
  switchAccount
} from '../accounts/accounts.js'
import { getOption, hasFlag, printJson } from '../output/format.js'

export async function handleAccount(args) {
  const subcommand = args[0]
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printAccountHelp()
    return
  }

  const json = hasFlag(args, '--json')

  if (subcommand === 'list') {
    const data = await listAccounts()
    if (json) {
      printJson(data)
      return
    }
    console.log(`Codesome 本机账号（${data.items.length}）`)
    console.log('')
    if (!data.items.length) {
      console.log('还没有账号。可运行 codesome account add --name <alias> 或 codesome auth login --account <alias>。')
      return
    }
    for (const item of data.items) {
      console.log(`- ${item.alias}${item.current ? ' *' : ''}`)
      console.log(`  登录态：${item.session_exists ? '已保存' : '未登录'}`)
      console.log(`  后台地址：${item.base_url || '-'}`)
      console.log(`  登录态文件：${item.session_path}`)
    }
    return
  }

  if (subcommand === 'current') {
    const account = await resolveAccountContext({ createIfMissing: false })
    const data = {
      alias: account.alias,
      session_path: account.sessionPath,
      config_path: account.configPath,
      base_url: account.baseUrl || null
    }
    if (json) {
      printJson(data)
      return
    }
    console.log(`当前账号：${account.alias}`)
    console.log(`登录态文件：${account.sessionPath}`)
    console.log(`配置文件：${account.configPath}`)
    if (account.baseUrl) console.log(`后台地址：${account.baseUrl}`)
    return
  }

  if (subcommand === 'add') {
    const name = getOption(args, '--name') || args[1]
    const account = await addAccount(name)
    const data = { added: true, account: { alias: account.alias, session_path: account.sessionPath, config_path: account.configPath } }
    if (json) {
      printJson(data)
      return
    }
    console.log(`账号已添加：${account.alias}`)
    console.log(`登录态文件：${account.sessionPath}`)
    console.log(`下一步：codesome auth login --account ${account.alias}`)
    return
  }

  if (subcommand === 'switch') {
    const name = args[1]
    const account = await switchAccount(name)
    const data = { switched: true, current: account.alias }
    if (json) {
      printJson(data)
      return
    }
    console.log(`当前账号已切换为：${account.alias}`)
    return
  }

  if (subcommand === 'rename') {
    const oldName = args[1]
    const newName = args[2]
    const account = await renameAccount(oldName, newName)
    const data = { renamed: true, account: { alias: account.alias, session_path: account.sessionPath, config_path: account.configPath } }
    if (json) {
      printJson(data)
      return
    }
    console.log(`账号已重命名：${oldName} -> ${account.alias}`)
    console.log(`登录态文件：${account.sessionPath}`)
    return
  }

  if (subcommand === 'remove') {
    const name = args[1] || getOption(args, '--name')
    const confirm = hasFlag(args, '--confirm')
    const result = await removeAccount(name, { confirm })
    if (json) {
      printJson(result)
      return
    }
    if (!confirm) {
      console.log('危险操作：删除本机账号登录态（预检）')
      console.log('')
      console.log(`账号：${result.account.alias}`)
      console.log(`当前账号：${result.account.current ? '是' : '否'}`)
      console.log(`登录态：${result.account.session_exists ? '已保存' : '未登录'}`)
      console.log(`登录态文件：${result.account.session_path}`)
      console.log('')
      console.log('删除后，此账号的本地登录态和配置会被移除。')
      console.log(`如确认删除，请重新执行：codesome account remove ${result.account.alias} --confirm`)
      return
    }
    console.log(`账号已删除：${result.account.alias}`)
    console.log(`当前账号：${result.current || '-'}`)
    return
  }

  console.error(`未知 account 命令：${subcommand}`)
  printAccountHelp()
  process.exitCode = 2
}

export function printAccountHelp() {
  console.log(`Codesome account commands

Usage:
  codesome account list [--json]
  codesome account current [--json]
  codesome account add --name <alias>
  codesome account switch <alias>
  codesome account rename <old> <new>
  codesome account remove <alias> [--confirm]

Alias:
  只能包含英文字母、数字、点号、下划线和短横线，不能包含路径穿越字符。
`)
}
