import fs from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { SECRETS_DIR } from '../config/paths.js'
import { maskApiKey } from '../output/redact.js'

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
}

async function writeRestricted(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, { encoding: 'utf8', mode: 0o600 })
  try {
    await fs.chmod(filePath, 0o600)
  } catch {
    // Windows may not honor chmod exactly; file still lives in user profile.
  }
}

export async function deliverSecret(secret, options = {}) {
  const masked = maskApiKey(secret)
  const result = {
    masked,
    file_path: null,
    copied: false
  }

  if (options.copy) {
    copyToClipboard(secret)
    result.copied = true
  }

  const shouldSave = options.saveTo !== false
  if (shouldSave) {
    const filePath = options.saveTo || path.join(SECRETS_DIR, `created-key-${timestamp()}.txt`)
    await writeRestricted(filePath, `${secret}\n`)
    result.file_path = filePath
  }

  return result
}

function copyToClipboard(value) {
  if (process.platform === 'win32') {
    const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Set-Clipboard -Value ([Console]::In.ReadToEnd())'], {
      input: value,
      encoding: 'utf8'
    })
    if (result.status !== 0) throw new Error('复制到剪贴板失败。')
    return
  }

  if (process.platform === 'darwin') {
    const result = spawnSync('pbcopy', [], { input: value, encoding: 'utf8' })
    if (result.status !== 0) throw new Error('复制到剪贴板失败。')
    return
  }

  const result = spawnSync('sh', ['-c', 'command -v wl-copy >/dev/null && wl-copy || xclip -selection clipboard'], {
    input: value,
    encoding: 'utf8'
  })
  if (result.status !== 0) throw new Error('复制到剪贴板失败：未找到 wl-copy 或 xclip。')
}
