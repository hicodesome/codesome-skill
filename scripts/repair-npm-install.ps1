$ErrorActionPreference = "Stop"

$PackageName = "codesome-cli"
$PackageVersion = if ($env:CODESOME_REPAIR_VERSION) { $env:CODESOME_REPAIR_VERSION.Trim() } else { "0.5.4" }
$InstallSpec = "$PackageName@$PackageVersion"
$DryRun = $env:CODESOME_REPAIR_DRY_RUN -eq "1"
$BackupDir = if ($env:CODESOME_REPAIR_BACKUP_DIR) {
  $env:CODESOME_REPAIR_BACKUP_DIR
} else {
  Join-Path $HOME ".codesome\backup-old-bin-$(Get-Date -Format yyyyMMdd-HHmmss)"
}

function Write-Step($Message) {
  Write-Host "[codesome-repair] $Message"
}

function Invoke-RepairCommand($FilePath, $Arguments) {
  if ($DryRun) {
    Write-Step "[dry-run] $FilePath $($Arguments -join ' ')"
    return
  }
  & $FilePath @Arguments
}

function Show-CommandPaths($CommandName) {
  Write-Step "Visible $CommandName candidates:"
  $commands = @(Get-Command $CommandName -All -ErrorAction SilentlyContinue)
  if (-not $commands.Count) {
    Write-Step " - none"
    return
  }
  foreach ($command in $commands) {
    if ($command.Source) {
      Write-Step " - $($command.Source)"
    } elseif ($command.Path) {
      Write-Step " - $($command.Path)"
    } else {
      Write-Step " - $($command.Definition)"
    }
  }
}

function Backup-IfExists($PathValue) {
  if (-not (Test-Path $PathValue)) {
    return
  }
  Write-Step "Backing up old entrypoint: $PathValue -> $BackupDir"
  if (-not $DryRun) {
    New-Item -ItemType Directory -Force $BackupDir | Out-Null
    Move-Item -Force $PathValue $BackupDir
  }
}

function Remove-IfExists($PathValue) {
  if (-not (Test-Path $PathValue)) {
    return
  }
  Write-Step "Removing old entrypoint: $PathValue"
  if (-not $DryRun) {
    Remove-Item -Force $PathValue -ErrorAction SilentlyContinue
  }
}

Write-Step "Repairing Codesome CLI npm install"
Write-Step "Target npm package: $InstallSpec"
Write-Step "User data is preserved. This script does not remove Codesome credentials, sessions, config, or browser data."

$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $node) {
  throw "Node.js is required before installing $PackageName."
}
if (-not $npm) {
  throw "npm is required before installing $PackageName."
}

Write-Step "Node: $(& $node.Source -v)"
Write-Step "npm: $(& $npm.Source -v)"
Write-Step "npm global prefix: $(& $npm.Source prefix -g)"
Write-Step "npm global root: $(& $npm.Source root -g)"

Show-CommandPaths "codesome"
Show-CommandPaths "codesome-hotskills"

Write-Step "Uninstalling old global npm package names"
Invoke-RepairCommand $npm.Source @("uninstall", "-g", "codesome-cli", "@codesome/cli", "@leo_aifirst/codesome-cli")

Write-Step "Backing up old shell-installer entrypoints"
Backup-IfExists (Join-Path $HOME ".codesome\bin\codesome.exe")
Backup-IfExists (Join-Path $HOME ".codesome\bin\codesome.cmd")
Backup-IfExists (Join-Path $HOME ".codesome\bin\codesome")
Backup-IfExists (Join-Path $HOME ".codesome\bin\codesome-hotskills.exe")
Backup-IfExists (Join-Path $HOME ".codesome\bin\codesome-hotskills.cmd")
Backup-IfExists (Join-Path $HOME ".codesome\bin\codesome-hotskills")

$npmPrefix = (& $npm.Source prefix -g).Trim()
Write-Step "Removing stale npm shims from current npm prefix before reinstall"
Remove-IfExists (Join-Path $npmPrefix "codesome")
Remove-IfExists (Join-Path $npmPrefix "codesome.cmd")
Remove-IfExists (Join-Path $npmPrefix "codesome.ps1")
Remove-IfExists (Join-Path $npmPrefix "codesome-hotskills")
Remove-IfExists (Join-Path $npmPrefix "codesome-hotskills.cmd")
Remove-IfExists (Join-Path $npmPrefix "codesome-hotskills.ps1")

Write-Step "Installing latest stable npm package"
Invoke-RepairCommand $npm.Source @("install", "-g", $InstallSpec)

Write-Step "Final verification"
Show-CommandPaths "codesome"
Show-CommandPaths "codesome-hotskills"
Invoke-RepairCommand $npm.Source @("list", "-g", "--depth=0", $PackageName)

$codesome = Get-Command codesome -ErrorAction SilentlyContinue
if ($DryRun) {
  Write-Step "[dry-run] codesome version"
} elseif (-not $codesome) {
  throw "codesome is not visible in PATH after installation. Check npm global prefix and PATH."
} else {
  & $codesome.Source version
}

$hotskills = Get-Command codesome-hotskills -ErrorAction SilentlyContinue
if ($DryRun) {
  Write-Step "[dry-run] codesome-hotskills --help"
} elseif ($hotskills) {
  & $hotskills.Source --help | Out-Null
}

Write-Step "Repair completed."
Write-Step "If a shell still runs an old path, open a new terminal and inspect: Get-Command codesome -All"
