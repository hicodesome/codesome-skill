$ErrorActionPreference = "Stop"

$DefaultCliVersion = "v0.5.3"
$CliVersion = if ($env:CODESOME_CLI_VERSION) { $env:CODESOME_CLI_VERSION.Trim() } else { $DefaultCliVersion }
$DefaultBaseUrl = "https://github.com/hicodesome/codesome-skill/releases/download/$CliVersion"
$DefaultRawBaseUrl = "https://raw.githubusercontent.com/hicodesome/codesome-skill/$CliVersion"
$BaseUrl = if ($env:CODESOME_CLI_BASE_URL) { $env:CODESOME_CLI_BASE_URL.TrimEnd('/') } else { $DefaultBaseUrl }
$RawBaseUrl = if ($env:CODESOME_SKILL_RAW_BASE_URL) { $env:CODESOME_SKILL_RAW_BASE_URL.TrimEnd('/') } else { $DefaultRawBaseUrl }
$UserHome = if ($env:CODESOME_INSTALL_HOME) { $env:CODESOME_INSTALL_HOME } else { $HOME }
$DryRun = $env:CODESOME_INSTALL_DRY_RUN -eq "1"
$InstallDir = Join-Path $UserHome ".codesome\bin"
$BinPath = Join-Path $InstallDir "codesome.exe"
$HotskillsBinPath = Join-Path $InstallDir "codesome-hotskills.exe"
$TmpPath = Join-Path $env:TEMP "codesome.exe"
$HotskillsTmpPath = Join-Path $env:TEMP "codesome-hotskills.exe"
$SkillName = "codesome"
$SkillFiles = @(
  "SKILL.md",
  "CHANGELOG.md",
  "references/basic-usage.md",
  "references/troubleshooting.md",
  "references/features/balance.md",
  "references/features/groups.md",
  "references/features/keys.md",
  "references/features/redeem.md",
  "references/features/subscriptions.md",
  "references/features/usage.md"
)
$SkillTargets = @(
  [pscustomobject]@{ Name = "Codex official user skills / OpenClaw common"; Path = Join-Path $UserHome ".agents\skills\$SkillName" },
  [pscustomobject]@{ Name = "Claude Code / OpenCode compatible"; Path = Join-Path $UserHome ".claude\skills\$SkillName" },
  [pscustomobject]@{ Name = "Hermes Agent"; Path = Join-Path $UserHome ".hermes\skills\$SkillName" },
  [pscustomobject]@{ Name = "OpenClaw user"; Path = Join-Path $UserHome ".openclaw\skills\$SkillName" },
  [pscustomobject]@{ Name = "OpenCode native"; Path = Join-Path $UserHome ".config\opencode\skill\$SkillName" }
)

function Write-Step($Message) {
  Write-Host "[codesome] $Message"
}

function Normalize-PathForCompare($PathValue) {
  if (-not $PathValue) { return "" }
  $value = $PathValue.Trim().Trim('"')
  if (-not $value) { return "" }
  try {
    return ([System.IO.Path]::GetFullPath($value)).TrimEnd('\', '/').ToLowerInvariant()
  } catch {
    return $value.TrimEnd('\', '/').ToLowerInvariant()
  }
}

function Split-PathList($PathValue) {
  if (-not $PathValue) { return @() }
  return @($PathValue.Split(';') | Where-Object { $_ -and $_.Trim() })
}

function Move-ToPathFront($PathValue, $Dir) {
  $normalizedDir = Normalize-PathForCompare $Dir
  $parts = Split-PathList $PathValue
  $filtered = @()
  foreach ($part in $parts) {
    if ((Normalize-PathForCompare $part) -ne $normalizedDir) {
      $filtered += $part
    }
  }
  return (@($Dir) + $filtered) -join ';'
}

function Add-ToUserPath($Dir) {
  if ($DryRun) {
    Write-Step "[dry-run] would move to the front of user PATH: $Dir"
    return
  }
  $current = [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not $current) { $current = "" }
  $newPath = Move-ToPathFront $current $Dir
  [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
  $env:Path = Move-ToPathFront $env:Path $Dir
  Write-Step "Moved to the front of user PATH: $Dir"
}

function Get-CommandSource($Command) {
  if (-not $Command) { return "" }
  if ($Command.Source) { return $Command.Source }
  if ($Command.Path) { return $Command.Path }
  if ($Command.Definition) { return $Command.Definition }
  return ""
}

function Get-CommandCandidatesForPath($CommandName, $PathValue) {
  $oldPath = $env:Path
  try {
    $env:Path = $PathValue
    return @(Get-Command $CommandName -All -ErrorAction SilentlyContinue)
  } finally {
    $env:Path = $oldPath
  }
}

function Test-CommandCandidateList($Label, $CommandName, $ExpectedPath, $Commands) {
  $expected = Normalize-PathForCompare $ExpectedPath
  if (-not $Commands.Count) {
    Write-Step "PATH note ($Label): '$CommandName' is not visible. Open a new PowerShell window, or run directly: $ExpectedPath"
    return $false
  }
  $first = $Commands[0]
  $firstSource = Get-CommandSource $first
  if ((Normalize-PathForCompare $firstSource) -eq $expected) {
    Write-Step "Command resolution verified ($Label): $CommandName -> $ExpectedPath"
    return $true
  }

  Write-Step "PATH warning ($Label): '$CommandName' currently resolves to '$firstSource' before '$ExpectedPath'."
  Write-Step "This usually means an older npm/pnpm shim or another wrapper appears earlier in PATH."
  Write-Step "This installer moved '$InstallDir' to the front of your user PATH; open a new PowerShell window and run: $CommandName version"
  Write-Step "You can always run the installed binary directly: $ExpectedPath"
  Write-Step "All visible '$CommandName' candidates for ${Label}:"
  foreach ($command in $Commands) {
    Write-Step " - $(Get-CommandSource $command)"
  }
  return $false
}

function Test-CommandResolution($CommandName, $ExpectedPath) {
  if ($DryRun) {
    Write-Step "[dry-run] would verify command resolution: $CommandName -> $ExpectedPath"
    return
  }
  $currentCommands = @(Get-Command $CommandName -All -ErrorAction SilentlyContinue)
  [void](Test-CommandCandidateList "current shell" $CommandName $ExpectedPath $currentCommands)

  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $freshPath = (@($machinePath, $userPath) | Where-Object { $_ }) -join ';'
  if ($freshPath) {
    $freshCommands = Get-CommandCandidatesForPath $CommandName $freshPath
    [void](Test-CommandCandidateList "new shell" $CommandName $ExpectedPath $freshCommands)
  }
}

function Ensure-Directory($Dir) {
  if ($DryRun) {
    Write-Step "[dry-run] would create directory: $Dir"
    return
  }
  New-Item -ItemType Directory -Force $Dir | Out-Null
}

function Download-File($Url, $OutFile) {
  if ($DryRun) {
    Write-Step "[dry-run] would download: $Url -> $OutFile"
    return
  }
  Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
}

function Install-SkillFile($TargetDir, $RelativePath) {
  $relativeUrl = $RelativePath.Replace('\', '/')
  $url = "$RawBaseUrl/$relativeUrl"
  $dest = Join-Path $TargetDir $RelativePath
  $destDir = Split-Path $dest -Parent
  Ensure-Directory $destDir
  Download-File $url $dest
}

function Install-SkillTarget($Target) {
  Write-Step "Installing/updating Skill for: $($Target.Name)"
  Write-Step "Skill directory: $($Target.Path)"
  Ensure-Directory $Target.Path
  foreach ($file in $SkillFiles) {
    Install-SkillFile $Target.Path $file
  }
}

Write-Step "Installing Codesome CLI for Windows amd64"
Write-Step "CLI version: $CliVersion"
Write-Step "CLI download base: $BaseUrl"
Write-Step "CLI install directory: $InstallDir"
Write-Step "CLI executable: $BinPath"
Write-Step "Hotskills executable: $HotskillsBinPath"
Write-Step "Skill raw source: $RawBaseUrl"
if ($DryRun) {
  Write-Step "Dry-run mode: no files will be written."
}

Ensure-Directory $InstallDir
$Url = "$BaseUrl/codesome-windows-amd64.exe"
$HotskillsUrl = "$BaseUrl/codesome-hotskills-windows-amd64.exe"

try {
  Download-File $Url $TmpPath
} catch {
  Write-Error "Download failed: $Url. Confirm GitHub Release $CliVersion contains codesome-windows-amd64.exe, or set CODESOME_CLI_VERSION / CODESOME_CLI_BASE_URL to another verified release."
}

$HotskillsAvailable = $true
try {
  Download-File $HotskillsUrl $HotskillsTmpPath
} catch {
  $HotskillsAvailable = $false
  if (Test-Path $HotskillsTmpPath) {
    Remove-Item -Force $HotskillsTmpPath -ErrorAction SilentlyContinue
  }
  Write-Step "Optional hotskills binary is not available in this release: $HotskillsUrl"
  Write-Step "The main CLI still supports the same feature as: codesome hotskills"
}

if (-not $DryRun) {
  Move-Item -Force $TmpPath $BinPath
  if ($HotskillsAvailable) {
    Move-Item -Force $HotskillsTmpPath $HotskillsBinPath
  }
}
Add-ToUserPath $InstallDir

foreach ($target in $SkillTargets) {
  Install-SkillTarget $target
}

Write-Step "CLI install completed: $BinPath"
Write-Step "Skill installed/updated in these user-level directories:"
foreach ($target in $SkillTargets) {
  Write-Step " - $($target.Path)"
}
Write-Step "Project-level directories are not modified by default. If needed, copy this skill into .agents/skills/$SkillName, .claude/skills/$SkillName, or .opencode/skill/$SkillName inside your project."

if (-not $DryRun) {
  & $BinPath version
  if ($HotskillsAvailable) {
    & $HotskillsBinPath --help | Out-Null
  }
  Test-CommandResolution "codesome" $BinPath
  if ($HotskillsAvailable) {
    Test-CommandResolution "codesome-hotskills" $HotskillsBinPath
  }
}
