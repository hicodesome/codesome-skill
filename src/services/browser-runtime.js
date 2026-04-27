import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import http from 'node:http'
import https from 'node:https'
import { MANAGED_BROWSER_ROOT, findManagedBrowser } from '../auth/browser.js'
import { CODESOME_HOME } from '../config/paths.js'

const CFT_MANIFEST_URL = 'https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json'
const METADATA_PATH = path.join(MANAGED_BROWSER_ROOT, 'chrome-for-testing', 'metadata.json')

function platformName() {
  if (process.platform === 'win32') {
    if (process.arch === 'ia32') return 'win32'
    return 'win64'
  }
  if (process.platform === 'darwin') return process.arch === 'arm64' ? 'mac-arm64' : 'mac-x64'
  if (process.platform === 'linux' && process.arch === 'x64') return 'linux64'
  throw new Error(`当前平台暂不支持自动安装 Chrome for Testing：${process.platform}/${process.arch}`)
}

function archiveNameFromUrl(url) {
  return path.basename(new URL(url).pathname)
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const transport = url.startsWith('http:') ? http : https
    const req = transport.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(requestJson(new URL(res.headers.location, url).toString()))
        return
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`下载索引失败：HTTP ${res.statusCode}`))
        return
      }
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
        } catch (error) {
          reject(error)
        }
      })
    })
    req.on('error', reject)
  })
}

function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const transport = url.startsWith('http:') ? http : https
    const req = transport.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(downloadFile(new URL(res.headers.location, url).toString(), filePath))
        return
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`下载浏览器失败：HTTP ${res.statusCode}`))
        return
      }
      const out = fsSync.createWriteStream(filePath)
      res.pipe(out)
      out.on('finish', () => out.close(resolve))
      out.on('error', reject)
    })
    req.on('error', reject)
  })
}

async function latestStableDownload() {
  const manifest = await requestJson(CFT_MANIFEST_URL)
  const channel = manifest.channels?.Stable
  const platform = platformName()
  const download = channel?.downloads?.chrome?.find((item) => item.platform === platform)
  if (!channel?.version || !download?.url) {
    throw new Error(`Chrome for Testing Stable 未提供当前平台下载：${platform}`)
  }
  return { version: channel.version, platform, url: download.url }
}

function extractArchive(zipPath, destination) {
  const command = process.platform === 'win32'
    ? {
        bin: 'powershell.exe',
        args: [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          "$ErrorActionPreference='Stop'; Expand-Archive -LiteralPath $env:CODESOME_BROWSER_ZIP -DestinationPath $env:CODESOME_BROWSER_DEST -Force"
        ],
        env: {
          ...process.env,
          CODESOME_BROWSER_ZIP: zipPath,
          CODESOME_BROWSER_DEST: destination
        }
      }
    : {
        bin: 'unzip',
        args: ['-q', '-o', zipPath, '-d', destination],
        env: process.env
      }
  const result = spawnSync(command.bin, command.args, { stdio: 'inherit', env: command.env })
  if (result.status !== 0) {
    throw new Error(`解压 Chrome for Testing 失败。请确认系统可用 ${command.bin}。`)
  }
}

export async function browserStatus() {
  const metadata = await readMetadata()
  const browserPath = findManagedBrowser()
  return {
    installed: Boolean(browserPath),
    browser_source: browserPath ? 'codesome' : 'missing',
    browser_path: browserPath,
    browser_root: MANAGED_BROWSER_ROOT,
    version: metadata?.version || null,
    platform: metadata?.platform || platformName(),
    install_hint: browserPath ? null : '请运行 codesome browser install 安装 Codesome 专用 Chrome for Testing。'
  }
}

export async function installBrowser(options = {}) {
  const latest = await latestStableDownload()
  const installDir = path.join(MANAGED_BROWSER_ROOT, 'chrome-for-testing', latest.version)
  const existing = findManagedBrowser()
  const metadata = await readMetadata()
  if (!options.force && existing && metadata?.version === latest.version) {
    return { installed: false, reused: true, ...await browserStatus() }
  }

  await fs.mkdir(installDir, { recursive: true })
  const downloadDir = path.join(MANAGED_BROWSER_ROOT, 'downloads')
  await fs.mkdir(downloadDir, { recursive: true })
  const zipPath = path.join(downloadDir, archiveNameFromUrl(latest.url))

  await downloadFile(latest.url, zipPath)
  await fs.rm(installDir, { recursive: true, force: true })
  await fs.mkdir(installDir, { recursive: true })
  extractArchive(zipPath, installDir)
  await fs.rm(zipPath, { force: true })
  await writeMetadata({ ...latest, installed_at: new Date().toISOString(), source: CFT_MANIFEST_URL })

  return { installed: true, reused: false, ...await browserStatus() }
}

export async function uninstallBrowser(options = {}) {
  if (!options.confirm) {
    return {
      dry_run: true,
      requires_confirm: true,
      browser_root: MANAGED_BROWSER_ROOT
    }
  }
  await assertManagedBrowserRoot()
  await fs.rm(MANAGED_BROWSER_ROOT, { recursive: true, force: true })
  return { deleted: true, browser_root: MANAGED_BROWSER_ROOT }
}

async function readMetadata() {
  try {
    return JSON.parse(await fs.readFile(METADATA_PATH, 'utf8'))
  } catch {
    return null
  }
}

async function writeMetadata(value) {
  await fs.mkdir(path.dirname(METADATA_PATH), { recursive: true })
  await fs.writeFile(METADATA_PATH, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function assertManagedBrowserRoot() {
  const resolved = path.resolve(MANAGED_BROWSER_ROOT)
  const expected = path.resolve(CODESOME_HOME, 'browser')
  if (resolved !== expected) {
    throw new Error(`拒绝删除异常浏览器目录：${resolved}`)
  }
}
