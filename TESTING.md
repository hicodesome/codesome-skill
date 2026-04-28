# Testing Codesome CLI

This file documents the minimum checks required before code is published in this repository.

## Smoke Tests

Run:

```bash
node ./bin/codesome.js version
node ./bin/codesome.js --help
```

## HTTP Login Mock Test

Run:

```bash
npm run test:auth-http
```

This uses a local mock API through the real CLI entry point. It covers:

- default HTTP login
- encrypted credentials at rest
- `auth status --verify`
- API client using encrypted credentials
- browser session fallback
- token refresh
- logout cleanup

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

## Key Configuration Mock Test

Run:

```bash
npm run test:key-config
```

This uses a local mock API through the real CLI entry point. It covers:

- custom key creation
- `key show`
- dry-run update preview
- confirmed updates for quota, expiry, rate limits, IP whitelist, and IP blacklist
- clearing expiry and IP lists
- resetting usage counters
- deleting the temporary key
- JSON output redaction

## Redeem Mock Test

Run:

```bash
npm run test:redeem
```

This uses a local mock API through the real CLI entry point. It covers:

- `redeem apply` dry-run preview without calling the write endpoint
- `redeem apply --confirm` write path
- backend payload normalization
- `redeem history`
- used-code failure redaction
- JSON and text output redaction

## Account-Dependent Tests

These tests require a local Codesome login session:

```bash
node ./bin/codesome.js auth status
node ./bin/codesome.js balance show
node ./bin/codesome.js key list
```

For key configuration changes, use a disposable test key and verify both dry-run and confirmed writes:

```bash
node ./bin/codesome.js key show --name "<test-key>"
node ./bin/codesome.js key update --name "<test-key>" --quota 10
node ./bin/codesome.js key update --name "<test-key>" --quota 10 --confirm
node ./bin/codesome.js key list --search "<test-key>"
node ./bin/codesome.js key update --name "<test-key>" --quota 0 --confirm
```

Current real-backend coverage: quota, expiry, rate limits, IP whitelist/blacklist, clear operations, reset commands with non-zero usage counters, JSON redaction, redeem preview, redeem confirm, redeem history, repeated redeem failure, and final cleanup passed by 2026-04-28. macOS binaries still need signing plus real-machine execution.

Do not paste Cookie, Token, session storage, or full API keys into issues, pull requests, logs, or chat.
