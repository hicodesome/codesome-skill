#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME="codesome-cli"
PACKAGE_VERSION="${CODESOME_REPAIR_VERSION:-0.5.3}"
INSTALL_SPEC="${PACKAGE_NAME}@${PACKAGE_VERSION}"
DRY_RUN="${CODESOME_REPAIR_DRY_RUN:-0}"
BACKUP_DIR="${CODESOME_REPAIR_BACKUP_DIR:-$HOME/.codesome/backup-old-bin-$(date +%Y%m%d-%H%M%S)}"
USE_SUDO_NPM="${CODESOME_REPAIR_USE_SUDO_NPM:-0}"

step() { printf '[codesome-repair] %s\n' "$*"; }

run() {
  if [ "$DRY_RUN" = "1" ]; then
    step "[dry-run] $*"
  else
    "$@"
  fi
}

show_command_paths() {
  local command_name="$1"
  step "Visible $command_name candidates:"
  type -a "$command_name" 2>/dev/null || true
  which -a "$command_name" 2>/dev/null || true
}

backup_if_exists() {
  local file_path="$1"
  if [ ! -e "$file_path" ]; then
    return 0
  fi
  step "Backing up old entrypoint: $file_path -> $BACKUP_DIR/"
  run mkdir -p "$BACKUP_DIR"
  run mv "$file_path" "$BACKUP_DIR/"
}

remove_system_entrypoint() {
  local file_path="$1"
  if [ ! -e "$file_path" ] && [ ! -L "$file_path" ]; then
    return 0
  fi
  step "Removing old system entrypoint: $file_path"
  if [ -w "$(dirname "$file_path")" ]; then
    run rm -f "$file_path"
  elif command -v sudo >/dev/null 2>&1; then
    run sudo rm -f "$file_path"
  else
    step "Cannot remove $file_path without sudo. Remove it manually if it still appears before npm."
  fi
}

step "Repairing Codesome CLI npm install"
step "Target npm package: $INSTALL_SPEC"
step "User data is preserved. This script does not remove Codesome credentials, sessions, config, or browser data."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required before installing $PACKAGE_NAME." >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required before installing $PACKAGE_NAME." >&2
  exit 1
fi

step "Node: $(node -v)"
step "npm: $(npm -v)"
step "npm global prefix: $(npm prefix -g 2>/dev/null || npm config get prefix)"
step "npm global root: $(npm root -g 2>/dev/null || true)"

show_command_paths codesome
show_command_paths codesome-hotskills

step "Uninstalling old global npm package names"
run npm uninstall -g codesome-cli @codesome/cli @leo_aifirst/codesome-cli >/dev/null 2>&1 || true
if [ "$USE_SUDO_NPM" = "1" ] && command -v sudo >/dev/null 2>&1; then
  run sudo npm uninstall -g codesome-cli @codesome/cli @leo_aifirst/codesome-cli >/dev/null 2>&1 || true
fi

step "Backing up old shell-installer entrypoints"
backup_if_exists "$HOME/.codesome/bin/codesome"
backup_if_exists "$HOME/.codesome/bin/codesome-hotskills"

step "Removing common old system entrypoints"
remove_system_entrypoint "/usr/local/bin/codesome"
remove_system_entrypoint "/usr/local/bin/codesome-hotskills"
remove_system_entrypoint "/opt/homebrew/bin/codesome"
remove_system_entrypoint "/opt/homebrew/bin/codesome-hotskills"

step "Refreshing shell command cache"
hash -r 2>/dev/null || true
rehash 2>/dev/null || true

step "Installing latest stable npm package"
run npm install -g "$INSTALL_SPEC"

step "Final verification"
hash -r 2>/dev/null || true
rehash 2>/dev/null || true
if [ "$DRY_RUN" = "1" ]; then
  step "[dry-run] npm list -g --depth=0 $PACKAGE_NAME"
else
  npm list -g --depth=0 "$PACKAGE_NAME" || true
fi
show_command_paths codesome
show_command_paths codesome-hotskills

if [ "$DRY_RUN" = "1" ]; then
  step "[dry-run] codesome version"
elif command -v codesome >/dev/null 2>&1; then
  codesome version
else
  echo "codesome is not visible in PATH after installation. Check npm global prefix and PATH." >&2
  exit 1
fi

if [ "$DRY_RUN" = "1" ]; then
  step "[dry-run] codesome-hotskills --help"
elif command -v codesome-hotskills >/dev/null 2>&1; then
  codesome-hotskills --help >/dev/null
fi

step "Repair completed."
step "If a shell still runs an old path, open a new terminal and inspect: which -a codesome"
