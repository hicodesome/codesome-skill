const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')

function fail(message) {
  console.error(message)
  process.exit(1)
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

const shell = read('scripts/repair-npm-install.sh')
const powershell = read('scripts/repair-npm-install.ps1')

const requiredShellSnippets = [
  'PACKAGE_VERSION="${CODESOME_REPAIR_VERSION:-}"',
  'INSTALL_SPEC="${PACKAGE_NAME}@latest"',
  'USE_SUDO_NPM="${CODESOME_REPAIR_USE_SUDO_NPM:-0}"',
  'npm uninstall -g codesome-cli @codesome/cli @leo_aifirst/codesome-cli',
  'backup_if_exists "$HOME/.codesome/bin/codesome"',
  'backup_if_exists "$HOME/.codesome/bin/codesome-hotskills"',
  'remove_system_entrypoint "/usr/local/bin/codesome"',
  'remove_system_entrypoint "/opt/homebrew/bin/codesome"',
  'npm install -g "$INSTALL_SPEC"',
  'step "[dry-run] codesome version"',
  'codesome version'
]

for (const snippet of requiredShellSnippets) {
  if (!shell.includes(snippet)) fail(`repair-npm-install.sh is missing: ${snippet}`)
}

const requiredPowerShellSnippets = [
  '$PackageVersion = if ($env:CODESOME_REPAIR_VERSION)',
  'else { "" }',
  '"$PackageName@latest"',
  '"uninstall", "-g", "codesome-cli", "@codesome/cli", "@leo_aifirst/codesome-cli"',
  '.codesome\\bin\\codesome.exe',
  '.codesome\\bin\\codesome-hotskills.exe',
  '"install", "-g", $InstallSpec',
  'Write-Step "[dry-run] codesome version"',
  '& $codesome.Source version'
]

for (const snippet of requiredPowerShellSnippets) {
  if (!powershell.includes(snippet)) fail(`repair-npm-install.ps1 is missing: ${snippet}`)
}

for (const [label, source] of [['shell', shell], ['powershell', powershell]]) {
  if (/rm\s+-rf\s+["']?\$HOME\/\.codesome(?!\/bin)/.test(source)) {
    fail(`${label} repair script must not remove the Codesome home directory.`)
  }
  if (/Remove-Item\s+.*\.codesome(?!\\bin)/i.test(source)) {
    fail(`${label} repair script must not remove the Codesome home directory.`)
  }
}

const bashCheck = spawnSync('bash', ['-n', path.join(root, 'scripts/repair-npm-install.sh')], {
  cwd: root,
  encoding: 'utf8'
})
if (bashCheck.status !== 0) {
  fail(`repair-npm-install.sh failed bash -n: ${bashCheck.stderr || bashCheck.stdout}`)
}

console.log('repair script audit passed.')
