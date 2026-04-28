import fs from 'node:fs/promises'

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

export function findAuthToken(storageState, baseUrl) {
  const origin = new URL(baseUrl).origin
  const originState = (storageState.origins || []).find((item) => item.origin === origin)
  return originState?.localStorage?.find((item) => item.name === 'auth_token')?.value || null
}

export async function loadBrowserSessionToken(accountContext, baseUrl) {
  try {
    const storageState = await readJson(accountContext.storageStatePath)
    const authToken = findAuthToken(storageState, baseUrl)
    if (!authToken) return null
    return {
      token: authToken,
      source: 'browser-session',
      session_path: accountContext.storageStatePath,
      storageState
    }
  } catch {
    return null
  }
}
