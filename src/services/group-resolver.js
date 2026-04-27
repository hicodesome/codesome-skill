import { listGroups } from './groups.js'

export async function resolveGroupId(groupNameOrId, options = {}) {
  if (groupNameOrId === undefined || groupNameOrId === null || groupNameOrId === '') {
    throw new Error('必须指定分组：--group <name> 或 --group-id <id>。可先运行 codesome group list。')
  }

  if (/^\d+$/.test(String(groupNameOrId))) {
    return { group_id: Number(groupNameOrId), group: null, matched_by: 'id' }
  }

  const data = await listGroups(options)
  const query = String(groupNameOrId).trim().toLowerCase()
  const exact = data.items.filter((group) => group.name.toLowerCase() === query)
  if (exact.length === 1) return { group_id: exact[0].id, group: exact[0], matched_by: 'exact' }

  const partial = data.items.filter((group) => group.name.toLowerCase().includes(query))
  if (partial.length === 1) return { group_id: partial[0].id, group: partial[0], matched_by: 'partial' }

  if (exact.length > 1 || partial.length > 1) {
    const candidates = (exact.length > 1 ? exact : partial).map((group) => `${group.id}: ${group.name}`).join(', ')
    throw new Error(`分组名称不唯一，请使用 --group-id。候选：${candidates}`)
  }

  throw new Error(`找不到分组：${groupNameOrId}。可先运行 codesome group list。`)
}
