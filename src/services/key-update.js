import { withApiClient } from '../api/client.js'
import { resolveGroupId } from './group-resolver.js'
import { listKeys } from './keys.js'

export async function findKeyByName(name, options = {}) {
  const query = String(name || '').trim()
  if (!query) throw new Error('必须指定 Key 名称：--name <name>。')
  const data = await listKeys({
    baseUrl: options.baseUrl,
    pageSize: 100,
    search: query
  })
  const exact = data.items.filter((item) => item.name === query)
  if (exact.length === 1) return exact[0]
  if (exact.length > 1) throw new Error(`找到多个同名 Key：${query}。请先改名或后续使用 --id。`)
  if (data.items.length === 1) return data.items[0]
  if (data.items.length > 1) {
    throw new Error(`Key 名称不唯一，请更精确。候选：${data.items.map((item) => item.name).join(', ')}`)
  }
  throw new Error(`找不到 Key：${query}`)
}

export async function updateKey(options = {}) {
  const key = options.id ? { id: Number(options.id), name: options.name || `#${options.id}` } : await findKeyByName(options.name, options)
  const payload = {}
  if (options.newName) payload.name = options.newName
  if (options.status) payload.status = options.status
  let groupResolution = null
  if (options.group || options.groupId) {
    groupResolution = await resolveGroupId(options.groupId || options.group, options)
    payload.group_id = groupResolution.group_id
  }
  if (!Object.keys(payload).length) {
    throw new Error('没有要更新的字段。可用：--new-name <name>、--group <group>、--status active|inactive。')
  }

  return withApiClient(options, async (client) => {
    const updated = await client.put(`/keys/${key.id}`, payload)
    return {
      before: key,
      after: updated,
      payload,
      group_resolution: groupResolution
    }
  })
}
