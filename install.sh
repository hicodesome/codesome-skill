#!/usr/bin/env bash
set -euo pipefail

DEFAULT_BASE_URL="https://gitee.com/bashi01/codesome-skill/releases/download/latest"
BASE_URL="${CODESOME_CLI_BASE_URL:-$DEFAULT_BASE_URL}"
BASE_URL="${BASE_URL%/}"
INSTALL_DIR="$HOME/.codesome/bin"

step() { printf '[codesome] %s\n' "$*"; }
fail_download() {
  cat >&2 <<EOF
[codesome] 下载失败：$url
[codesome] 请确认 Gitee Release latest 已发布 $bin_name。
[codesome] 如果你在 macOS 上安装，当前需要 Release 中存在 codesome-darwin-amd64 或 codesome-darwin-arm64。
[codesome] 也可以设置 CODESOME_CLI_BASE_URL 指向你的国内镜像地址后重试。
EOF
  exit 1
}

os="$(uname -s | tr '[:upper:]' '[:lower:]')"
arch="$(uname -m)"

case "$os" in
  darwin) os_name="darwin" ;;
  linux) os_name="linux" ;;
  *) echo "Unsupported OS: $os" >&2; exit 1 ;;
esac

case "$arch" in
  x86_64|amd64) arch_name="amd64" ;;
  arm64|aarch64) arch_name="arm64" ;;
  *) echo "Unsupported arch: $arch" >&2; exit 1 ;;
esac

bin_name="codesome-${os_name}-${arch_name}"
url="$BASE_URL/$bin_name"
tmp="${TMPDIR:-/tmp}/$bin_name.$$"
target="$INSTALL_DIR/codesome"

step "安装 Codesome CLI for ${os_name}/${arch_name}"
step "下载源：$BASE_URL"
mkdir -p "$INSTALL_DIR"

if command -v curl >/dev/null 2>&1; then
  curl -fL "$url" -o "$tmp" || fail_download
elif command -v wget >/dev/null 2>&1; then
  wget -O "$tmp" "$url" || fail_download
else
  echo "缺少 curl 或 wget。" >&2
  exit 1
fi

chmod +x "$tmp"
mv "$tmp" "$target"

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    step "未检测到 PATH：$INSTALL_DIR"
    step "可执行：echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.zshrc"
    ;;
esac

step "安装完成：$target"
"$target" version
