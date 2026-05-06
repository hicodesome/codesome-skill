import { getAutoSyncStatus, refreshNow } from '../services/auto-sync.js'
import { hasFlag, printJson } from '../output/format.js'
import { accountServiceOptions, resolveCommandAccount } from './account-context.js'

function dateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('zh-CN')
}

export async function handleSync(args) {
  const subcommand = args[0] || 'status'
  if (subcommand === '--help' || subcommand === '-h' || subcommand === 'help') {
    printSyncHelp()
    return
  }
  if (!['status', 'refresh'].includes(subcommand)) {
    console.error(`未知 sync 命令：${subcommand}`)
    printSyncHelp()
    process.exitCode = 2
    return
  }

  const json = hasFlag(args, '--json')
  const status = subcommand === 'refresh'
    ? await refreshNow(accountServiceOptions(await resolveCommandAccount(args)))
    : await getAutoSyncStatus()
  if (json) {
    printJson(status)
    return
  }

  console.log(subcommand === 'refresh' ? 'Codesome 同步已刷新' : 'Codesome 自动同步状态')
  console.log(`自动同步：${status.enabled ? '已启用' : '已关闭'}`)
  console.log(`后台任务：${status.running ? '运行中' : '空闲'}`)
  console.log(`最近成功：${dateTime(status.last_success_at)}`)
  console.log(`最近完成：${dateTime(status.completed_at)}`)
  console.log(`充值同步延迟：${status.recharge_delay}`)
  if (status.account_snapshot?.account) {
    console.log(`账号状态：${status.account_snapshot.account.status || '-'}`)
    console.log(`余额快照：$${Number(status.account_snapshot.account.balance || 0).toFixed(2)}`)
  }
  if (status.npm_update?.updated) console.log('CLI 版本：已尝试更新到 npm latest')
  if (status.last_error) console.log(`最近错误：${status.last_error}`)
}

export function printSyncHelp() {
  console.log(`Codesome sync commands

Usage:
  codesome sync status [--json]
  codesome sync refresh [--account <alias>] [--instance <name>] [--json]

Every normal CLI invocation starts a best-effort background sync. Use refresh when recharge status has not appeared yet.
`)
}
