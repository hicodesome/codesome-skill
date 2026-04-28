import { ApiError } from '../api/errors.js'

export async function runCommand(handler) {
  try {
    await handler()
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(error.message)
      if (['NO_SESSION', 'TOKEN_EXPIRED', 'CREDENTIALS_UNREADABLE', 'NO_ACCESS_TOKEN', 'REFRESH_NO_ACCESS_TOKEN'].includes(error.details?.code)) {
        const suffix = error.details.account_alias ? ` --account ${error.details.account_alias}` : ''
        console.error(`下一步：codesome auth login${suffix}`)
      }
      process.exitCode = 1
      return
    }
    throw error
  }
}
