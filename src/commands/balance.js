import { getBalance } from '../services/balance.js'
import { hasFlag, printJson } from '../output/format.js'
import { accountJson, accountServiceOptions, printAccountLine, resolveCommandAccount } from './account-context.js'

function money(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '-'
  return `$${Number(value).toFixed(2)}`
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '-'
  const [name, domain] = email.split('@')
  return `${name.slice(0, 1)}***${name.slice(-1)}@${domain}`
}

export async function handleBalance(args) {
  const subcommand = args[0]
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printBalanceHelp()
    return
  }

  if (subcommand !== 'show') {
    console.error(`未知 balance 命令：${subcommand}`)
    printBalanceHelp()
    process.exitCode = 2
    return
  }

  const json = hasFlag(args, '--json')
  const account = await resolveCommandAccount(args)
  const data = await getBalance(accountServiceOptions(account))
  if (json) {
    printJson({ account_context: accountJson(account), ...data })
    return
  }

  console.log('Codesome 账户余额')
  printAccountLine(account)
  console.log('')
  console.log(`账号：${maskEmail(data.account.email)}`)
  console.log(`状态：${data.account.status}`)
  console.log(`普通按量余额：${money(data.account.balance)}`)
  console.log(`累计充值：${money(data.account.total_recharged)}`)
  if (data.usage) {
    console.log('')
    console.log('用量概览')
    console.log(`今日消费：${money(data.usage.today_actual_cost)} 实际 / ${money(data.usage.today_cost)} 标准`)
    console.log(`累计消费：${money(data.usage.total_actual_cost)} 实际 / ${money(data.usage.total_cost)} 标准`)
    console.log(`今日请求：${data.usage.today_requests ?? '-'}`)
    console.log(`累计请求：${data.usage.total_requests ?? '-'}`)
  }
}

export function printBalanceHelp() {
  console.log(`Codesome balance commands

Usage:
  codesome balance show [--account <alias>] [--json]

Shows account pay-as-you-go balance and dashboard usage summary.
`)
}
