import fs from 'node:fs'
import path from 'node:path'
import { CODESOME_HOME } from '../config/paths.js'

const WINDOWS_BROWSER_CANDIDATES = [
  process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
  process.env['PROGRAMFILES(X86)'] && `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
  process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
  process.env['PROGRAMFILES(X86)'] && `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`
].filter(Boolean)

const LINUX_BROWSER_CANDIDATES = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/snap/bin/chromium',
  '/usr/bin/microsoft-edge',
  '/usr/bin/microsoft-edge-stable'
].filter(Boolean)

const MACOS_BROWSER_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  `${process.env.HOME || ''}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
  `${process.env.HOME || ''}/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`,
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  `${process.env.HOME || ''}/Applications/Chromium.app/Contents/MacOS/Chromium`
].filter(Boolean)

export const MANAGED_BROWSER_ROOT = path.join(CODESOME_HOME, 'browser')

export function findBrowser() {
  return findManagedBrowser()
}

export function findEnvBrowser() {
  const value = process.env.CODESOME_BROWSER_PATH
  return value && fs.existsSync(value) ? value : null
}

export function findManagedBrowser() {
  return managedBrowserCandidates().find((candidate) => candidate && fs.existsSync(candidate)) || null
}

export function findSystemBrowser() {
  const candidates = process.platform === 'win32'
    ? WINDOWS_BROWSER_CANDIDATES
    : process.platform === 'darwin'
      ? MACOS_BROWSER_CANDIDATES
      : LINUX_BROWSER_CANDIDATES
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null
}

function managedBrowserCandidates() {
  return managedBrowserCandidatesForRoot(MANAGED_BROWSER_ROOT)
}

function managedBrowserCandidatesForRoot(root) {
  const direct = directManagedBrowserCandidates(root)
  const versioned = listVersionedBrowserDirs(path.join(root, 'chrome-for-testing')).flatMap(directManagedBrowserCandidates)
  return [...direct, ...versioned]
}

function directManagedBrowserCandidates(root) {
  if (process.platform === 'win32') {
    return [
      path.join(root, 'chrome-win64', 'chrome.exe'),
      path.join(root, 'chrome-win32', 'chrome.exe'),
      path.join(root, 'chrome.exe')
    ]
  }
  if (process.platform === 'darwin') {
    return [
      path.join(root, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      path.join(root, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
      path.join(root, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing')
    ]
  }
  return [
    path.join(root, 'chrome-linux64', 'chrome'),
    path.join(root, 'chrome')
  ]
}

function listVersionedBrowserDirs(root) {
  try {
    return fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(root, entry.name))
      .sort()
      .reverse()
  } catch {
    return []
  }
}
