import { resolveInstanceAccountContext } from '../instances/instances.js'
import { getOption } from '../output/format.js'

export async function resolveCommandAccount(args, options = {}) {
  return resolveInstanceAccountContext({
    instance: getOption(args, '--instance'),
    account: getOption(args, '--account'),
    createIfMissing: Boolean(options.createIfMissing),
    baseUrl: getOption(args, '--base-url')
  })
}

export function accountServiceOptions(account) {
  return {
    accountContext: account,
    instance: account.instance_id,
    account: account.alias,
    baseUrl: account.baseUrl
  }
}

export function accountJson(account) {
  return {
    alias: account.alias,
    instance_id: account.instance_id,
    instance_name: account.instance_name,
    base_url: account.baseUrl
  }
}

export function printAccountLine(account) {
  console.log(`当前账号：${account.alias}`)
  if (account.instance_id) console.log(`当前实例：${account.instance_id}`)
  if (account.baseUrl) console.log(`后台地址：${account.baseUrl}`)
}
