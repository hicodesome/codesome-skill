import { deleteKey, previewDeleteKey } from '../services/key-delete.js'
import { getOption, hasFlag, printJson } from '../output/format.js'
import { maskApiKey } from '../output/redact.js'
import { accountJson, accountServiceOptions, printAccountLine, resolveCommandAccount } from './account-context.js'

function safeKey(key) {
  if (!key) return null
  return {
    id: key.id,
    name: key.name,
    key: maskApiKey(key.key),
    group_id: key.group_id,
    group: key.group ? {
      id: key.group.id,
      name: key.group.name,
      platform: key.group.platform,
      subscription_type: key.group.subscription_type,
      rate_multiplier: key.group.rate_multiplier,
      status: key.group.status
    } : undefined,
    status: key.status,
    quota: key.quota,
    quota_used: key.quota_used,
    expires_at: key.expires_at,
    last_used_at: key.last_used_at,
    created_at: key.created_at
  }
}

function makeOptions(args, account) {
  return {
    ...accountServiceOptions(account),
    id: getOption(args, '--id'),
    name: getOption(args, '--name'),
    baseUrl: getOption(args, '--base-url')
  }
}

export async function handleKeyDelete(args) {
  const json = hasFlag(args, '--json')
  const confirm = hasFlag(args, '--confirm')
  const account = await resolveCommandAccount(args)
  const options = makeOptions(args, account)

  if (!confirm) {
    const preview = await previewDeleteKey(options)
    const safe = {
      dry_run: true,
      requires_confirm: true,
      account_context: accountJson(account),
      key: safeKey(preview.key),
      next_command: `codesome key delete --account ${account.alias} ${options.id ? `--id ${options.id}` : `--name "${preview.key.name}"`} --confirm`
    }
    if (json) {
      printJson(safe)
      return
    }
    console.log('危险操作：删除 API Key（预检）')
    printAccountLine(account)
    console.log('')
    console.log(`名称：${safe.key.name}`)
    console.log(`Key：${safe.key.key}`)
    console.log(`分组：${safe.key.group?.name || safe.key.group_id || '-'}`)
    console.log(`状态：${safe.key.status || '-'}`)
    console.log('')
    console.log('删除后，所有使用这个 Key 的客户端都会失效。')
    console.log('如确认删除，请重新执行：')
    console.log(safe.next_command)
    return
  }

  const result = await deleteKey(options)
  const safe = {
    deleted: true,
    account_context: accountJson(account),
    key: safeKey(result.key),
    result: result.result
  }
  if (json) {
    printJson(safe)
    return
  }
  console.log('API Key 删除成功')
  printAccountLine(account)
  console.log('')
  console.log(`名称：${safe.key.name}`)
  console.log(`Key：${safe.key.key}`)
  console.log(`分组：${safe.key.group?.name || safe.key.group_id || '-'}`)
}

export function printKeyDeleteHelp() {
  console.log(`Codesome key delete

Usage:
  codesome key delete [--account <alias>] --name <name>
  codesome key delete [--account <alias>] --name <name> --confirm
  codesome key delete [--account <alias>] --id <id> --confirm

Notes:
  Without --confirm this command only previews the target key.
  Delete is destructive and cannot be undone.
`)
}
