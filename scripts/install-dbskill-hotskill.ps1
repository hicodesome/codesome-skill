param(
  [string]$TargetDir = "$env:USERPROFILE\Downloads",
  [string[]]$Agent = @(),
  [switch]$Project,
  [switch]$NoCopy,
  [switch]$Preview
)

$ErrorActionPreference = 'Stop'

$npx = Get-Command npx.cmd -ErrorAction SilentlyContinue
if (-not $npx) {
  $npx = Get-Command npx -ErrorAction Stop
}

$argsList = @('--yes', 'skills', 'add', 'dontbesilent2025/dbskill')
$projectInstall = $Project -or $PSBoundParameters.ContainsKey('TargetDir')
if (-not $projectInstall) {
  $argsList += '--global'
} else {
  New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

foreach ($item in $Agent) {
  $argsList += @('--agent', $item)
}

if (-not $NoCopy) {
  $argsList += '--copy'
}

$argsList += '--yes'

Write-Host "Recommended skill: dbskill"
Write-Host "Source: dontbesilent2025/dbskill"
Write-Host "Run: $($npx.Source) $($argsList -join ' ')"
if ($projectInstall) {
  Write-Host "Target directory: $TargetDir"
} else {
  Write-Host "Target scope: global user skills"
}

if ($Preview) {
  exit 0
}

if ($projectInstall) {
  Push-Location $TargetDir
}

try {
  & $npx.Source @argsList
  exit $LASTEXITCODE
} finally {
  if ($projectInstall) {
    Pop-Location
  }
}
