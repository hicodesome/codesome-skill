# Testing Codesome CLI

This file documents the minimum checks required before code is published in this repository.

## Smoke Tests

Run:

```bash
node ./bin/codesome.js version
node ./bin/codesome.js --help
```

## Build Test

Run:

```bash
npm run build:release
```

Then verify at least the host binary:

```bash
dist/codesome-windows-amd64.exe version
```

On Linux:

```bash
chmod +x dist/codesome-linux-amd64
dist/codesome-linux-amd64 version
```

## Installer Dry-Run Tests

Windows PowerShell:

```powershell
$env:CODESOME_INSTALL_DRY_RUN="1"
$env:CODESOME_INSTALL_HOME="$env:TEMP\codesome-install-dryrun"
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
Remove-Item Env:\CODESOME_INSTALL_DRY_RUN
Remove-Item Env:\CODESOME_INSTALL_HOME
```

Linux / macOS / WSL:

```bash
CODESOME_INSTALL_DRY_RUN=1 CODESOME_INSTALL_HOME=/tmp/codesome-install-dryrun bash ./install.sh
```

Expected output must include:

```text
CLI install directory
~/.agents/skills/codesome
~/.claude/skills/codesome
~/.hermes/skills/codesome
~/.openclaw/skills/codesome
~/.config/opencode/skill/codesome
```

## Output Safety Checks

Run the public safety scanner before every public release:

```bash
npm run scan:public-safety
```

Expected result:

```text
blocker_count=0
```

Command output must not include:

- full API keys
- Cookie values
- Token values
- Authorization header values
- browser session storage
- private test accounts

Helper scripts:

```bash
node ./scripts/verify-browser-candidates.cjs
node ./scripts/verify-key-delete-output.cjs <json-file> preview
node ./scripts/verify-key-delete-output.cjs <json-file> deleted
node ./scripts/verify-key-update-output.cjs <json-file> active
node ./scripts/verify-key-usage-output.cjs <json-file> <expected-requests>
```

## Account-Dependent Tests

These tests require a local Codesome login session:

```bash
node ./bin/codesome.js auth status
node ./bin/codesome.js balance show
node ./bin/codesome.js key list
```

Do not paste Cookie, Token, session storage, or full API keys into issues, pull requests, logs, or chat.
