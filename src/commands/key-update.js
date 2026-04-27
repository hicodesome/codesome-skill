import { updateKey } from '../services/key-update.js'
import { getOption, hasFlag, printJson } from '../output/format.js'
import { maskApiKey } from '../output/redact.js'

export async function handleKeyUpdate(args) {
  const json = hasFlag(args, '--json')
  const data = await updateKey({
    id: getOption(args, '--id'),
    name: getOption(args, '--name'),
    newName: getOption(args, '--new-name'),
    group: getOption(args, '--group'),
    groupId: getOption(args, '--group-id'),
    status: getOption(args, '--status')
  })

  const safe = makeSafe(data)
  if (json) {
    printJson(safe)
    return
  }

  console.log('API Key 更新成功')
  console.log('')
  console.log(`原名称：${data.before.name}`)
  console.log(`新名称：${data.after.name}`)
  if (data.group_resolution) {
    console.log(`目标分组：${data.group_resolution.group?.name || data.group_resolution.group_id}`)
  }
  console.log(`状态：${data.after.status}`)
}

export async function handleKeySwitchGroup(args) {
  const confirm = hasFlag(args, '--confirm')
  const name = getOption(args, '--name')
  const group = getOption(args, '--group')
  const groupId = getOption(args, '--group-id')
  if (!confirm) {
    console.log('即将切换 API Key 分组（预检）')
    console.log('')
    console.log(`Key：${name || getOption(args, '--id') || '-'}`)
    console.log(`目标分组：${group || groupId || '-'}`)
    console.log('')
    console.log('此操作可能改变计费方式（月卡/按量）。如确认执行，请追加 --confirm。')
    return
  }

  await handleKeyUpdate(['--name', name, ...(group ? ['--group', group] : []), ...(groupId ? ['--group-id', groupId] : [])])
}

function makeSafe(data) {
  const safe = JSON.parse(JSON.stringify(data, (key, value) => {
    if (key === 'key' && typeof value === 'string') return maskApiKey(value)
    if (key === 'user') return undefined
    return value
  }))
  if (safe.after) {
    safe.after = {
      id: safe.after.id,
      name: safe.after.name,
      key: safe.after.key,
      group_id: safe.after.group_id,
      group: safe.after.group ? {
        id: safe.after.group.id,
        name: safe.after.group.name,
        platform: safe.after.group.platform,
        subscription_type: safe.after.group.subscription_type,
        rate_multiplier: safe.after.group.rate_multiplier,
        status: safe.after.group.status
      } : undefined,
      status: safe.after.status,
      quota: safe.after.quota,
      quota_used: safe.after.quota_used,
      expires_at: safe.after.expires_at,
      last_used_at: safe.after.last_used_at,
      rate_limit_5h: safe.after.rate_limit_5h,
      rate_limit_1d: safe.after.rate_limit_1d,
      rate_limit_7d: safe.after.rate_limit_7d,
      updated_at: safe.after.updated_at
    }
  }
  return safe
}

export function printKeyUpdateHelp() {
  console.log(`Codesome key update

Usage:
  codesome key update --name <name> --new-name <new-name>
  codesome key update --name <name> --group <group-name>
  codesome key update --name <name> --status active|inactive
  codesome key switch-group --name <name> --group <group-name> --confirm

Notes:
  switch-group without --confirm is a dry-run warning.
`)
}
