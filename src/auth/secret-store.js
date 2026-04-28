import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { SECRETS_DIR } from '../config/paths.js'

const MASTER_KEY_PATH = path.join(SECRETS_DIR, 'credentials-master.key')
const MASTER_KEY_BYTES = 32
const ALGORITHM = 'aes-256-gcm'
const INFO = Buffer.from('codesome-cli-credentials-v1')

async function exists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function ensurePrivateDir(dir) {
  await fs.mkdir(dir, { recursive: true, mode: 0o700 })
  await fs.chmod(dir, 0o700).catch(() => null)
}

async function readOrCreateMasterKey() {
  await ensurePrivateDir(SECRETS_DIR)
  try {
    const raw = (await fs.readFile(MASTER_KEY_PATH, 'utf8')).trim()
    const key = Buffer.from(raw, 'base64')
    if (key.length === MASTER_KEY_BYTES) return key
  } catch {
    // Create below.
  }
  const key = crypto.randomBytes(MASTER_KEY_BYTES)
  await fs.writeFile(MASTER_KEY_PATH, `${key.toString('base64')}\n`, { encoding: 'utf8', mode: 0o600 })
  await fs.chmod(MASTER_KEY_PATH, 0o600).catch(() => null)
  return key
}

function deriveKey(masterKey, salt) {
  return Buffer.from(crypto.hkdfSync('sha256', masterKey, salt, INFO, MASTER_KEY_BYTES))
}

export async function credentialsExist(accountContext) {
  return exists(accountContext.credentialsPath)
}

export async function saveCredentials(accountContext, value) {
  const masterKey = await readOrCreateMasterKey()
  const salt = crypto.randomBytes(16)
  const iv = crypto.randomBytes(12)
  const key = deriveKey(masterKey, salt)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8')
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const payload = {
    version: 1,
    algorithm: ALGORITHM,
    kdf: 'hkdf-sha256',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: encrypted.toString('base64')
  }
  await fs.mkdir(path.dirname(accountContext.credentialsPath), { recursive: true })
  await fs.writeFile(accountContext.credentialsPath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  await fs.chmod(accountContext.credentialsPath, 0o600).catch(() => null)
}

export async function loadCredentials(accountContext) {
  if (!(await exists(accountContext.credentialsPath))) return null
  const payload = JSON.parse(await fs.readFile(accountContext.credentialsPath, 'utf8'))
  if (payload?.version !== 1 || payload.algorithm !== ALGORITHM) {
    throw new Error('Unsupported credentials file format.')
  }
  const masterKey = await readOrCreateMasterKey()
  const key = deriveKey(masterKey, Buffer.from(payload.salt, 'base64'))
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, 'base64')),
    decipher.final()
  ])
  return JSON.parse(decrypted.toString('utf8'))
}

export async function removeCredentials(accountContext) {
  if (!(await exists(accountContext.credentialsPath))) return false
  await fs.rm(accountContext.credentialsPath, { force: true })
  return true
}

export async function safeCredentialSummary(accountContext) {
  try {
    const credentials = await loadCredentials(accountContext)
    if (!credentials) return null
    return {
      source: credentials.source || 'http',
      saved_at: credentials.saved_at,
      expires_at: credentials.expires_at,
      base_url: credentials.base_url,
      user: credentials.user ? {
        id: credentials.user.id,
        email: credentials.user.email,
        username: credentials.user.username,
        role: credentials.user.role,
        status: credentials.user.status
      } : null
    }
  } catch {
    return { unreadable: true }
  }
}
