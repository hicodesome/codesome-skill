#!/usr/bin/env bash
set -euo pipefail

DEFAULT_BASE_URL="https://github.com/hicodesome/codesome-skill/releases/download/latest"
DEFAULT_RAW_BASE_URL="https://raw.githubusercontent.com/hicodesome/codesome-skill/main"
BASE_URL="${CODESOME_CLI_BASE_URL:-$DEFAULT_BASE_URL}"
BASE_URL="${BASE_URL%/}"
RAW_BASE_URL="${CODESOME_SKILL_RAW_BASE_URL:-$DEFAULT_RAW_BASE_URL}"
RAW_BASE_URL="${RAW_BASE_URL%/}"
HOME_DIR="${CODESOME_INSTALL_HOME:-$HOME}"
DRY_RUN="${CODESOME_INSTALL_DRY_RUN:-0}"
INSTALL_DIR="$HOME_DIR/.codesome/bin"
SKILL_NAME="codesome"
SKILL_FILES=(
  "SKILL.md"
  "references/basic-usage.md"
  "references/troubleshooting.md"
  "references/features/balance.md"
  "references/features/groups.md"
  "references/features/keys.md"
  "references/features/subscriptions.md"
  "references/features/usage.md"
)
SKILL_TARGETS=(
  "$HOME_DIR/.agents/skills/$SKILL_NAME"
  "$HOME_DIR/.claude/skills/$SKILL_NAME"
  "$HOME_DIR/.hermes/skills/$SKILL_NAME"
  "$HOME_DIR/.openclaw/skills/$SKILL_NAME"
  "$HOME_DIR/.config/opencode/skill/$SKILL_NAME"
)

step() { printf '[codesome] %s\n' "$*"; }
mkdir_safe() {
  if [ "$DRY_RUN" = "1" ]; then
    step "[dry-run] would create directory: $1"
  else
    mkdir -p "$1"
  fi
}
download_to() {
  local source_url="$1"
  local target_file="$2"
  if [ "$DRY_RUN" = "1" ]; then
    step "[dry-run] would download: $source_url -> $target_file"
    return 0
  fi
  if command -v curl >/dev/null 2>&1; then
    curl -fL "$source_url" -o "$target_file"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$target_file" "$source_url"
  else
    echo "Missing curl or wget." >&2
    exit 1
  fi
}
fail_download() {
  cat >&2 <<EOF
[codesome] Download failed: $url
[codesome] Please confirm GitHub Release latest contains $bin_name.
[codesome] For macOS, the release must contain codesome-darwin-amd64 or codesome-darwin-arm64.
[codesome] You can also set CODESOME_CLI_BASE_URL to another verified mirror and retry.
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

step "Installing Codesome CLI for ${os_name}/${arch_name}"
step "CLI download base: $BASE_URL"
step "CLI install directory: $INSTALL_DIR"
step "CLI executable: $target"
step "Skill raw source: $RAW_BASE_URL"
if [ "$DRY_RUN" = "1" ]; then
  step "Dry-run mode: no files will be written."
fi
mkdir_safe "$INSTALL_DIR"

download_to "$url" "$tmp" || fail_download

if [ "$DRY_RUN" != "1" ]; then
  chmod +x "$tmp"
  mv "$tmp" "$target"
fi

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *)
    step "PATH does not include: $INSTALL_DIR"
    step "You can run: echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.zshrc"
    ;;
esac

install_skill_target() {
  local skill_dir="$1"
  step "Installing/updating Skill directory: $skill_dir"
  mkdir_safe "$skill_dir"
  local file
  for file in "${SKILL_FILES[@]}"; do
    mkdir_safe "$(dirname "$skill_dir/$file")"
    download_to "$RAW_BASE_URL/$file" "$skill_dir/$file"
  done
}

for skill_dir in "${SKILL_TARGETS[@]}"; do
  install_skill_target "$skill_dir"
done

step "CLI install completed: $target"
step "Skill installed/updated in these user-level directories:"
for skill_dir in "${SKILL_TARGETS[@]}"; do
  step " - $skill_dir"
done
step "Project-level directories are not modified by default. If needed, copy this skill into .agents/skills/$SKILL_NAME, .claude/skills/$SKILL_NAME, or .opencode/skill/$SKILL_NAME inside your project."

if [ "$DRY_RUN" != "1" ]; then
  "$target" version
fi
