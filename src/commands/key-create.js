import { createKey } from '../services/key-write.js'
import { getOption, hasFlag, printJson } from '../output/format.js'
import { deliverSecret } from '../output/secret-delivery.js'
import { accountJson, accountServiceOptions, printAccountLine, resolveCommandAccount } from './account-context.js'

export async function handleKeyCreate(args) {
  const json = hasFlag(args, '--json')
  const account = await resolveCommandAccount(args)
  const result = await createKey({
    ...accountServiceOptions(account),
    name: getOption(args, '--name'),
    baseUrl: getOption(args, '--base-url'),
    group: getOption(args, '--group'),
    groupId: getOption(args, '--group-id'),
    quota: getOption(args, '--quota'),
    expiresInDays: getOption(args, '--expires-in-days'),
    rateLimit5h: getOption(args, '--rate-limit-5h'),
    rateLimit1d: getOption(args, '--rate-limit-1d'),
    rateLimit7d: getOption(args, '--rate-limit-7d'),
    ipWhitelist: getOption(args, '--ip-whitelist'),
    ipBlacklist: getOption(args, '--ip-blacklist'),
    customKey: getOption(args, '--custom-key')
  })

  const delivery = await deliverSecret(result.key.key, {
    saveTo: getOption(args, '--save-to') || undefined,
    copy: hasFlag(args, '--copy')
  })

  const safeResult = {
    key: {
      ...result.key,
      key: undefined,
      delivery
    },
    group_resolution: result.group_resolution
  }

  if (json) {
    printJson({ account: accountJson(account), ...safeResult })
    return
  }

  console.log('API Key 创建成功')
  printAccountLine(account)
  console.log('')
  console.log(`名称：${result.key.name}`)
  console.log(`Key：${delivery.masked}`)
  console.log(`分组：${result.group_resolution.group?.name || result.key.group_id}`)
  if (delivery.file_path) console.log(`完整 Key 已保存到：${delivery.file_path}`)
  if (delivery.copied) console.log('完整 Key 已复制到剪贴板。')
  console.log('请妥善保存；终端不会直接打印完整 Key。')
}

export function printKeyCreateHelp() {
  console.log(`Codesome key create

Usage:
  codesome key create [--account <alias>] --name <name> --group <group-name>
  codesome key create [--account <alias>] --name <name> --group-id <id>

Options:
  --save-to <path>          Save full key to a specific local file
  --copy                    Copy full key to clipboard
  --custom-key <key>        Use a custom API key value
  --quota <usd>             Set total key quota, 0/unset = unlimited
  --expires-in-days <days>  Set expiry in days
  --rate-limit-5h <usd>     Set 5-hour spend limit
  --rate-limit-1d <usd>     Set 1-day spend limit
  --rate-limit-7d <usd>     Set 7-day spend limit
  --ip-whitelist <a,b>      Comma-separated IP whitelist
  --ip-blacklist <a,b>      Comma-separated IP blacklist
`)
}
