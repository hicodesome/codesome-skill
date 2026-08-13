import { getKeyDetails, previewUpdateKey, updateKey } from '../services/key-update.js'
import { getUseKeyInfo } from '../services/keys.js'
import { getOption, hasFlag, printJson } from '../output/format.js'
import { maskApiKey } from '../output/redact.js'
import { buildAioUseKeyInfo, normalizeAioApiKey } from '../config/aio.js'
import { accountJson, accountServiceOptions, printAccountLine, resolveCommandAccount } from './account-context.js'

function makeSafe(data) {
  function sanitize(value, path = []) {
    const field = path[path.length - 1]
    const parent = path[path.length - 2]
    if (field === 'user' || field === 'custom_key') return undefined
    if (typeof value === 'string') {
      if (field === 'api_key') return maskApiKey(value)
      if (field === 'key' && parent !== 'source') return maskApiKey(value)
      return value
    }
    if (Array.isArray(value)) return value.map((item, index) => sanitize(item, [...path, String(index)]))
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .map(([key, item]) => [key, sanitize(item, [...path, key])])
          .filter(([, item]) => item !== undefined)
      )
    }
    return value
  }

  return sanitize(data)
}

function makeOptions(args, account) {
  return {
    ...accountServiceOptions(account),
    id: getOption(args, '--id'),
    name: getOption(args, '--name'),
    baseUrl: getOption(args, '--base-url'),
    newName: getOption(args, '--new-name'),
    group: getOption(args, '--group'),
    groupId: getOption(args, '--group-id'),
    status: getOption(args, '--status'),
    quota: getOption(args, '--quota'),
    expiresAt: getOption(args, '--expires-at'),
    expiresInDays: getOption(args, '--expires-in-days'),
    clearExpiresAt: hasFlag(args, '--clear-expires-at') || hasFlag(args, '--no-expiry'),
    rateLimit5h: getOption(args, '--rate-limit-5h'),
    rateLimit1d: getOption(args, '--rate-limit-1d'),
    rateLimit7d: getOption(args, '--rate-limit-7d'),
    ipWhitelist: getOption(args, '--ip-whitelist'),
    ipBlacklist: getOption(args, '--ip-blacklist'),
    clearIpWhitelist: hasFlag(args, '--clear-ip-whitelist'),
    clearIpBlacklist: hasFlag(args, '--clear-ip-blacklist'),
    resetQuotaUsed: hasFlag(args, '--reset-quota-used'),
    resetRateLimitUsage: hasFlag(args, '--reset-rate-limit-usage')
  }
}

function formatValue(value) {
  if (value === undefined || value === null || value === '') return '未设置'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '空'
  if (typeof value === 'object') {
    if ('name' in value || 'id' in value) return value.name ? `${value.name} (#${value.id})` : `#${value.id}`
    return Object.entries(value).map(([key, item]) => `${key}=${formatValue(item)}`).join(', ')
  }
  return String(value)
}

function printChanges(changes) {
  for (const change of changes) {
    console.log(`${change.label}：${formatValue(change.before)} -> ${formatValue(change.after)}`)
  }
}

function printKeyDetails(key, account) {
  console.log(`Codesome API Key：${key.name}`)
  printAccountLine(account)
  console.log('')
  console.log(`ID：${key.id}`)
  console.log(`Key：${key.key || key.masked_key}`)
  console.log(`分组：${key.group?.name || key.group_id || '-'}`)
  console.log(`状态：${key.status || '-'}`)
  console.log(`限额：${formatValue(key.quota ?? 0)}，已用：${formatValue(key.quota_used ?? 0)}`)
  console.log(`过期时间：${formatValue(key.expires_at)}`)
  console.log(`速率限制：5h=${formatValue(key.rate_limit_5h ?? 0)}，1d=${formatValue(key.rate_limit_1d ?? 0)}，7d=${formatValue(key.rate_limit_7d ?? 0)}`)
  console.log(`速率窗口用量：5h=${formatValue(key.usage_5h ?? key.usage?.usage_5h ?? 0)}，1d=${formatValue(key.usage_1d ?? key.usage?.usage_1d ?? 0)}，7d=${formatValue(key.usage_7d ?? key.usage?.usage_7d ?? 0)}`)
  console.log(`IP 白名单：${formatValue(key.ip_whitelist || [])}`)
  console.log(`IP 黑名单：${formatValue(key.ip_blacklist || [])}`)
  console.log(`最近使用：${formatValue(key.last_used_at)}`)
  console.log(`创建时间：${formatValue(key.created_at)}`)
  console.log(`更新时间：${formatValue(key.updated_at)}`)
}

function printUseKeyInfo(data, account) {
  const key = data.key
  const useKey = data.use_key
  const group = key.group?.name || key.group_id || '-'
  console.log(`Codesome 使用密钥：${key.name}`)
  if (account) printAccountLine(account)
  console.log('')
  console.log(`Key：${useKey.api_key_masked || key.key || key.masked_key}`)
  console.log(`Base URL：${useKey.base_url || '-'}`)
  console.log(`分组：${group}`)
  console.log(`平台：${useKey.platform || '-'}`)
  console.log(`状态：${useKey.status || '-'}`)
  if (useKey.site_name) console.log(`体系：${useKey.site_name}`)
  if (useKey.base_urls?.claude_code_base_url) console.log(`Claude Code Base URL：${useKey.base_urls.claude_code_base_url}`)
  if (useKey.base_urls?.codex_base_url) console.log(`Codex Base URL：${useKey.base_urls.codex_base_url}`)
  if (useKey.base_urls?.openai_base_url) console.log(`OpenAI Base URL：${useKey.base_urls.openai_base_url}`)
  if (useKey.base_urls?.anthropic_base_url) console.log(`Anthropic Base URL：${useKey.base_urls.anthropic_base_url}`)
  if (useKey.base_urls?.gemini_base_url) console.log(`Gemini Base URL：${useKey.base_urls.gemini_base_url}`)
  if (useKey.base_urls?.antigravity_base_url) console.log(`Antigravity Base URL：${useKey.base_urls.antigravity_base_url}`)
  if (useKey.sites?.api_stats_url) console.log(`用量查询：${useKey.sites.api_stats_url}`)
  const sources = [useKey.source?.key, useKey.source?.public_settings].filter(Boolean)
  console.log(`读取来源：${sources.join(' + ')}`)
  for (const warning of useKey.warnings || []) console.log(`警告：${warning}`)
}

export async function handleKeyShow(args) {
  const json = hasFlag(args, '--json')
  const account = await resolveCommandAccount(args)
  const key = await getKeyDetails({
    ...accountServiceOptions(account),
    id: getOption(args, '--id'),
    name: getOption(args, '--name'),
    groupId: getOption(args, '--group-id'),
    baseUrl: getOption(args, '--base-url')
  })

  const safe = makeSafe({ account_context: accountJson(account), key })
  if (json) {
    printJson(safe)
    return
  }
  printKeyDetails(safe.key, account)
}

export async function handleKeyUse(args) {
  const json = hasFlag(args, '--json')
  const apiKey = getOption(args, '--api-key') || getOption(args, '--key')
  if (apiKey !== undefined) {
    const normalizedApiKey = normalizeAioApiKey(apiKey)
    const data = buildAioUseKeyInfo(normalizedApiKey, {
      name: getOption(args, '--name') || 'AIO API Key',
      maskedKey: maskApiKey(normalizedApiKey)
    })
    const safe = makeSafe(data)
    if (json) {
      printJson(safe)
      return
    }
    printUseKeyInfo(safe, null)
    return
  }

  const account = await resolveCommandAccount(args)
  const serviceOptions = {
    ...accountServiceOptions(account),
    id: getOption(args, '--id'),
    name: getOption(args, '--name'),
    groupId: getOption(args, '--group-id'),
    baseUrl: getOption(args, '--base-url')
  }
  const key = await getKeyDetails(serviceOptions)
  const data = await getUseKeyInfo(key, serviceOptions)
  const safe = makeSafe({ account_context: accountJson(account), ...data })

  if (json) {
    printJson(safe)
    return
  }
  printUseKeyInfo(safe, account)
}

export async function handleKeyUpdate(args) {
  const json = hasFlag(args, '--json')
  const confirm = hasFlag(args, '--confirm')
  const account = await resolveCommandAccount(args)
  const options = makeOptions(args, account)
  const data = confirm ? await updateKey(options) : await previewUpdateKey(options)
  const safe = makeSafe({ account_context: accountJson(account), ...data })

  if (json) {
    printJson(safe)
    return
  }

  if (!confirm) {
    console.log('API Key 更新预检')
    printAccountLine(account)
    console.log('')
    console.log(`名称：${safe.before.name}`)
    console.log(`Key：${safe.before.key || safe.before.masked_key}`)
    console.log(`ID：${safe.before.id}`)
    console.log('')
    console.log('将要修改：')
    printChanges(safe.changes)
    console.log('')
    console.log('本次未写入。确认执行请追加 --confirm。')
    return
  }

  console.log('API Key 更新成功')
  printAccountLine(account)
  console.log('')
  console.log(`名称：${safe.after.name}`)
  console.log(`Key：${safe.after.key || safe.after.masked_key}`)
  console.log(`ID：${safe.after.id}`)
  console.log('')
  console.log('已修改：')
  printChanges(safe.changes)
}

export async function handleKeySwitchGroup(args) {
  await handleKeyUpdate(args)
  if (!hasFlag(args, '--confirm') && !hasFlag(args, '--json')) {
    console.log('提醒：切换分组可能改变计费方式（月卡/按量）。')
  }
}

export function printKeyUpdateHelp() {
  console.log(`Codesome key update

Usage:
  codesome key show [--account <alias>] --name <name> [--group-id <id>] [--json]
  codesome key show [--account <alias>] --id <id> [--json]
  codesome key use [--account <alias>] --name <name> [--json]
  codesome key use [--account <alias>] --id <id> [--json]
  codesome key use --api-key cr_xxx [--json]
  codesome key update [--account <alias>] --name <name> --new-name <new-name> [--confirm]
  codesome key update [--account <alias>] --name <name> --group <group-name> [--confirm]
  codesome key update [--account <alias>] --name <name> --status active|inactive [--confirm]
  codesome key update [--account <alias>] --name <name> --quota <usd> [--confirm]
  codesome key update [--account <alias>] --name <name> --expires-at <iso|none> [--confirm]
  codesome key update [--account <alias>] --name <name> --expires-in-days <days> [--confirm]
  codesome key update [--account <alias>] --name <name> --rate-limit-5h <usd> --rate-limit-1d <usd> --rate-limit-7d <usd> [--confirm]
  codesome key update [--account <alias>] --name <name> --ip-whitelist <a,b> --ip-blacklist <a,b> [--confirm]
  codesome key switch-group [--account <alias>] --name <name> --group <group-name> [--confirm]

Options:
  --clear-expires-at       Clear key expiry
  --clear-ip-whitelist     Set IP whitelist to empty
  --clear-ip-blacklist     Set IP blacklist to empty
  --reset-quota-used       Reset quota used counter
  --reset-rate-limit-usage Reset rate-limit usage windows

Notes:
  Without --confirm, update and switch-group only query the current key and print a dry-run diff.
  key use reads V3/Sub2API base_url from public settings. For AIO cr_ keys, --api-key prints the fixed Claude Code and Codex v5 base URLs without calling V3 APIs.
  JSON and text output always mask key values.
`)
}
