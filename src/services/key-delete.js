import { withApiClient } from '../api/client.js'
import { findKeyByName } from './key-update.js'

export async function previewDeleteKey(options = {}) {
  const key = options.id ? { id: Number(options.id), name: options.name || `#${options.id}` } : await findKeyByName(options.name, options)
  return { key }
}

export async function deleteKey(options = {}) {
  const preview = await previewDeleteKey(options)
  return withApiClient(options, async (client) => {
    const result = await client.delete(`/keys/${preview.key.id}`)
    return {
      key: preview.key,
      deleted: true,
      result
    }
  })
}
