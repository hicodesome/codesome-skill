import { ApiError } from '../api/client.js'

export async function runCommand(handler) {
  try {
    await handler()
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(error.message)
      if (error.details?.code === 'NO_SESSION') {
        const suffix = error.details.account_alias ? ` --account ${error.details.account_alias}` : ''
        console.error(`下一步：codesome auth login${suffix}`)
      }
      process.exitCode = 1
      return
    }
    throw error
  }
}
