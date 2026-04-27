import { resolveAccountContext } from '../accounts/accounts.js'
import { getOption } from '../output/format.js'

export async function resolveCommandAccount(args, options = {}) {
  return resolveAccountContext({
    account: getOption(args, '--account'),
    createIfMissing: Boolean(options.createIfMissing)
  })
}

export function accountServiceOptions(account) {
  return { account: account.alias }
}

export function accountJson(account) {
  return { alias: account.alias }
}

export function printAccountLine(account) {
  console.log(`当前账号：${account.alias}`)
}
