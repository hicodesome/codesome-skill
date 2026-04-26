$ErrorActionPreference = "Stop"

$DefaultBaseUrl = "https://github.com/hicodesome/codesome-skill/releases/download/latest"
$BaseUrl = if ($env:CODESOME_CLI_BASE_URL) { $env:CODESOME_CLI_BASE_URL.TrimEnd('/') } else { $DefaultBaseUrl }
$InstallDir = Join-Path $HOME ".codesome\bin"
$BinPath = Join-Path $InstallDir "codesome.exe"
$TmpPath = Join-Path $env:TEMP "codesome.exe"

function Write-Step($Message) {
  Write-Host "[codesome] $Message"
}

function Add-ToUserPath($Dir) {
  $current = [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not $current) { $current = "" }
  $parts = $current.Split(';') | Where-Object { $_ }
  if ($parts -notcontains $Dir) {
    $newPath = if ($current) { "$current;$Dir" } else { $Dir }
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    $env:Path = "$env:Path;$Dir"
    Write-Step "已添加到用户 PATH：$Dir"
  }
}

Write-Step "安装 Codesome CLI for Windows amd64"
Write-Step "下载源：$BaseUrl"

New-Item -ItemType Directory -Force $InstallDir | Out-Null
$Url = "$BaseUrl/codesome-windows-amd64.exe"

try {
  Invoke-WebRequest -Uri $Url -OutFile $TmpPath -UseBasicParsing
} catch {
  Write-Error "下载失败：$Url。闭源 CLI 二进制可能尚未发布，或下载源不可用。可设置 CODESOME_CLI_BASE_URL 指向国内镜像。"
}

Move-Item -Force $TmpPath $BinPath
Add-ToUserPath $InstallDir

Write-Step "安装完成：$BinPath"
& $BinPath version
