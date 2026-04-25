#!/usr/bin/env bash
set -euo pipefail

DEFAULT_BASE_URL="https://gitee.com/bashi01/codesome-skill/releases/download/latest"
BASE_URL="${CODESOME_CLI_BASE_URL:-$DEFAULT_BASE_URL}"
BASE_URL="${BASE_URL%/}"
INSTALL_DIR="$HOME/.codesome/bin"

step() { printf '[codesome] %s\n' "$*"; }

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

step "?? Codesome CLI for ${os_name}/${arch_name}"
step "????$BASE_URL"
mkdir -p "$INSTALL_DIR"

if command -v curl >/dev/null 2>&1; then
  curl -fL "$url" -o "$tmp" || { echo "?????$url??? CLI ????????????????????? CODESOME_CLI_BASE_URL ???????" >&2; exit 1; }
elif command -v wget >/dev/null 2>&1; then
  wget -O "$tmp" "$url" || { echo "?????$url??? CLI ????????????????????? CODESOME_CLI_BASE_URL ???????" >&2; exit 1; }
else
  echo "?? curl ? wget?" >&2
  exit 1
fi

chmod +x "$tmp"
mv "$tmp" "$target"

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    step "???????? PATH?$INSTALL_DIR"
    step "???echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.zshrc"
    ;;
esac

step "?????$target"
"$target" version
