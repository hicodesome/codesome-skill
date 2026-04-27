import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const WINDOWS_BROWSER_CANDIDATES = [
  process.env.CODESOME_BROWSER_PATH,
  process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
  process.env['PROGRAMFILES(X86)'] && `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
  process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
  process.env['PROGRAMFILES(X86)'] && `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`
].filter(Boolean)

const LINUX_BROWSER_CANDIDATES = [
  process.env.CODESOME_BROWSER_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/snap/bin/chromium',
  '/usr/bin/microsoft-edge',
  '/usr/bin/microsoft-edge-stable'
].filter(Boolean)

const MACOS_BROWSER_CANDIDATES = [
  process.env.CODESOME_BROWSER_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  `${process.env.HOME || ''}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
  `${process.env.HOME || ''}/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`,
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  `${process.env.HOME || ''}/Applications/Chromium.app/Contents/MacOS/Chromium`
].filter(Boolean)

export async function loadChromium() {
  try {
    const playwright = await import('playwright')
    return playwright.chromium
  } catch {
    if (process.pkg) {
      throw new Error('???????? Playwright???? CODESOME_BROWSER_PATH ?? Chrome/Edge?????????????')
    }
    throw new Error('?? Playwright ??????????? npm install ????')
  }
}

export async function launchChromium(chromium, options) {
  const launchOptions = { ...options }
  if (process.pkg && !launchOptions.executablePath) {
    const executablePath = findSystemBrowser()
    if (executablePath) {
      launchOptions.executablePath = executablePath
      launchOptions.channel = undefined
    }
  }

  try {
    return await chromium.launch(launchOptions)
  } catch (error) {
    if (!isMissingBrowserError(error) || process.pkg) throw error
    console.error('Playwright ???????????? Chromium??????...')
    const result = spawnSync(process.execPath, ['node_modules/playwright/cli.js', 'install', 'chromium'], {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: false
    })
    if (result.status !== 0) {
      throw new Error('???? Playwright Chromium ????????????')
    }
    return chromium.launch(options)
  }
}

export function findSystemBrowser() {
  const candidates = process.platform === 'win32'
    ? WINDOWS_BROWSER_CANDIDATES
    : process.platform === 'darwin'
      ? MACOS_BROWSER_CANDIDATES
      : LINUX_BROWSER_CANDIDATES
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null
}

function isMissingBrowserError(error) {
  const message = error && typeof error.message === 'string' ? error.message : String(error)
  return message.includes("Executable doesn't exist") || message.includes('playwright install')
}
