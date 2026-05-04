const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const installPath = path.join(root, 'install.ps1')
const source = fs.readFileSync(installPath, 'utf8')

function fail(message) {
  console.error(message)
  process.exit(1)
}

const requiredSnippets = [
  'function Move-ToPathFront',
  '[Environment]::SetEnvironmentVariable("Path", $newPath, "User")',
  '$env:Path = Move-ToPathFront $env:Path $Dir',
  'function Get-CommandCandidatesForPath',
  'function Test-CommandCandidateList',
  'function Test-CommandResolution',
  'Get-Command $CommandName -All',
  '[Environment]::GetEnvironmentVariable("Path", "Machine")',
  'PATH warning (',
  'Test-CommandResolution "codesome" $BinPath',
  'Test-CommandResolution "codesome-hotskills" $HotskillsBinPath'
]

for (const snippet of requiredSnippets) {
  if (!source.includes(snippet)) fail(`install.ps1 is missing expected installer guard: ${snippet}`)
}

if (source.includes('$env:Path = "$env:Path;$Dir"')) {
  fail('install.ps1 must not append the install directory behind existing PATH entries.')
}

console.log('windows installer PATH resolution audit passed.')
