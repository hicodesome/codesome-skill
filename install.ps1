$ErrorActionPreference = "Stop"

$DefaultCliVersion = "v0.5.1"
$CliVersion = if ($env:CODESOME_CLI_VERSION) { $env:CODESOME_CLI_VERSION.Trim() } else { $DefaultCliVersion }
$DefaultBaseUrl = "https://github.com/hicodesome/codesome-skill/releases/download/$CliVersion"
$DefaultRawBaseUrl = "https://raw.githubusercontent.com/hicodesome/codesome-skill/$CliVersion"
$BaseUrl = if ($env:CODESOME_CLI_BASE_URL) { $env:CODESOME_CLI_BASE_URL.TrimEnd('/') } else { $DefaultBaseUrl }
$RawBaseUrl = if ($env:CODESOME_SKILL_RAW_BASE_URL) { $env:CODESOME_SKILL_RAW_BASE_URL.TrimEnd('/') } else { $DefaultRawBaseUrl }
$UserHome = if ($env:CODESOME_INSTALL_HOME) { $env:CODESOME_INSTALL_HOME } else { $HOME }
$DryRun = $env:CODESOME_INSTALL_DRY_RUN -eq "1"
$InstallDir = Join-Path $UserHome ".codesome\bin"
$BinPath = Join-Path $InstallDir "codesome.exe"
$TmpPath = Join-Path $env:TEMP "codesome.exe"
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

function Add-ToUserPath($Dir) {
  if ($DryRun) {
    Write-Step "[dry-run] would add to user PATH: $Dir"
    return
  }
  $current = [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not $current) { $current = "" }
  $parts = $current.Split(';') | Where-Object { $_ }
  if ($parts -notcontains $Dir) {
    $newPath = if ($current) { "$current;$Dir" } else { $Dir }
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    $env:Path = "$env:Path;$Dir"
    Write-Step "Added to user PATH: $Dir"
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
Write-Step "Skill raw source: $RawBaseUrl"
if ($DryRun) {
  Write-Step "Dry-run mode: no files will be written."
}

Ensure-Directory $InstallDir
$Url = "$BaseUrl/codesome-windows-amd64.exe"

try {
  Download-File $Url $TmpPath
} catch {
  Write-Error "Download failed: $Url. Confirm GitHub Release $CliVersion contains codesome-windows-amd64.exe, or set CODESOME_CLI_VERSION / CODESOME_CLI_BASE_URL to another verified release."
}

if (-not $DryRun) {
  Move-Item -Force $TmpPath $BinPath
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
}
