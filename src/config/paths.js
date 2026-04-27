import os from 'node:os'
import path from 'node:path'

export const CODESOME_HOME = process.env.CODESOME_HOME || path.join(os.homedir(), '.codesome')
export const SESSION_DIR = path.join(CODESOME_HOME, 'session')
export const SECRETS_DIR = path.join(CODESOME_HOME, 'secrets')
export const STORAGE_STATE_PATH = path.join(SESSION_DIR, 'storage-state.json')
export const CONFIG_PATH = path.join(CODESOME_HOME, 'config.json')
export const DEFAULT_BASE_URL = 'https://cc.codesome.ai'

export function resolveBaseUrl(value) {
  const raw = value || process.env.CODESOME_BASE_URL || DEFAULT_BASE_URL
  return raw.replace(/\/+$/, '')
}
