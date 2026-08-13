# Testing Codesome CLI

This file documents the minimum checks required before code is published in this repository.

## Smoke Tests

Run:

```bash
npm run test:unix-entry
npm run test:json-safety
npm run test:smoke
node ./bin/codesome.js version
node ./bin/codesome.js --help
node ./bin/codesome-hotskills.js --help
```

`test:unix-entry` verifies that Unix entrypoints stay LF-only. This protects Linux/macOS users from bash CRLF parse errors and shebang failures such as `/usr/bin/env: node\r`.

`test:json-safety` verifies recursive JSON redaction so nested fields such as `api_key.key` cannot print a full API key.

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
- `auth logout --help` prints help without logging out or deleting credentials

## Sub2API Instance Mock Test

Run:

```bash
npm run test:instance
```

This uses a local mock API through the real CLI entry point. It covers:

- `instance add/list/current/switch/status/remove`
- offline HTTPS instance registration without platform review
- blocking unregistered credential-bearing base URLs
- custom instance login and `auth status --verify`
- business commands honoring `--instance`
- instance-scoped credentials, session paths, and browser profile paths
- logout using the saved instance base URL instead of caller-supplied URLs

## Build Test

Run:

```bash
npm run build:release
```

Then verify at least the host binary:

```bash
dist/codesome-windows-amd64.exe version
dist/codesome-hotskills-windows-amd64.exe --help
```

On Linux:

```bash
chmod +x dist/codesome-linux-amd64
chmod +x dist/codesome-hotskills-linux-amd64
dist/codesome-linux-amd64 version
dist/codesome-hotskills-linux-amd64 --help
```

`npm run build:release` also runs `scripts/verify-release-assets.cjs`, which requires both `codesome-*` and `codesome-hotskills-*` binaries for Windows amd64, Linux amd64, Linux arm64, macOS Intel, and macOS Apple Silicon, plus matching checksum entries.

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
bash -n ./install.sh
CODESOME_INSTALL_DRY_RUN=1 CODESOME_INSTALL_HOME=/tmp/codesome-install-dryrun bash ./install.sh
```

On macOS, also verify that `install.sh` attempts the post-download `xattr` cleanup and ad-hoc `codesign --force --sign -` before running `codesome version`.

Expected output must include:

```text
CLI install directory
Hotskills executable
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
- `key use` reading base URL from `GET /api/v1/settings/public`
- JSON output redaction

## Auto Sync Mock Test

Run:

```bash
npm run test:auto-sync
```

This uses a local mock API through the real CLI entry point. It covers:

- `sync refresh` writing an account snapshot
- public settings snapshot and derived OpenAI-compatible base URL
- `balance show --refresh` returning sync status in JSON
- text output documenting the 10-60 second normal recharge sync delay
- manual refresh fallback text

## Pagination And Usage Mock Test

Run:

```bash
npm run test:pagination-usage
```

This uses a local mock API through the real CLI entry point. It covers:

- `key list --page` and `--page-size`
- `usage recent --page` and `--page-size`
- `usage key` scanning full `/usage` pages before local `api_key_id` aggregation
- `key show --name ... --group-id ...` disambiguating duplicate key names

## Redeem Mock Test

Run:

```bash
npm run test:redeem
```

This uses a local mock API through the real CLI entry point. It covers:

- `redeem apply` dry-run preview without calling the write endpoint
- `redeem apply --confirm` write path
- backend payload normalization
- confirmed redeem triggering a refresh status payload
- `redeem history`
- used-code failure redaction
- JSON and text output redaction

## HotSkills And Prompt Tests

Run:

```bash
npm run test:hotskills-install
npm run test:password-prompt
```

`test:hotskills-install` verifies the install command uses the explicit `npx --package skills` form expected by the public HotSkills workflow.

`test:password-prompt` verifies password prompts do not echo the password value.

The upstream README parser is intentionally a separate network-dependent check:

```bash
npm run test:hotskills-upstream
```

## Account-Dependent Tests

These tests require a local Codesome login session:

```bash
node ./bin/codesome.js auth status
node ./bin/codesome.js balance show
node ./bin/codesome.js balance show --refresh
node ./bin/codesome.js sync status
node ./bin/codesome.js key list
node ./bin/codesome.js key use --name "<test-key>"
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

## Real Sub2API Instance Checks

Use a temporary `CODESOME_HOME` when testing third-party or self-hosted Sub2API instances:

```bash
export CODESOME_HOME=/tmp/codesome-test-home
codesome instance add <name> --base-url <url>
printf '%s' "$CODESOME_TEST_PASSWORD" | codesome auth login --instance <name> --username <email> --password-stdin
codesome auth status --instance <name> --verify
codesome balance show --instance <name> --json
codesome subscription active --instance <name> --json
codesome group list --instance <name> --json
codesome key list --instance <name> --limit 3 --json
rm -rf "$CODESOME_HOME"
```

2026-05-03 `v0.5.2-rc.2` real-instance coverage: `debian-1` (`Linux debian-1 6.5.0-0.deb12.4-amd64`, Node.js `v18.20.4`) tested a user-provided self-hosted Sub2API instance with a user-provided account. Instance add, HTTP login, `auth status --verify`, balance, subscription, group list, and key list all returned successfully. `key list --json` emitted `0` full API keys. The account used for this check had no active subscription data in the CLI output.

Do not store real Sub2API passwords in this repository, reports, shell history, or committed docs. Use one-shot environment variables or stdin only.

## Platform Coverage Notes

2026-05-03 `v0.5.2-rc.2` coverage:

- Windows amd64: `codesome-windows-amd64.exe version`, `codesome-hotskills-windows-amd64.exe --help`, and `install.ps1` installation into a temporary home passed.
- Windows PowerShell: `install.ps1` now moves `~\.codesome\bin` to the front of user PATH and verifies command resolution for `codesome` and `codesome-hotskills`; a simulated fresh environment resolves bare `codesome version` to `codesome 0.5.2-rc.2` even when older npm shims are still present later in PATH.
- Linux amd64: `debian-1` ran `codesome-linux-amd64 version`, `codesome-hotskills-linux-amd64 --help`, and NPM `.tgz` install on Node.js 18 without `EBADENGINE`.

2026-05-05 `v0.5.3` coverage:

- Windows npm install test passed for the release-candidate package; `v0.5.3` promotes the same pagination fix to stable.
- NPM package metadata was switched to the public unscoped package name `codesome-cli`; `npm view codesome-cli` returned 404 before release, indicating no existing package record in the public registry.
- Remote `Test` Linux amd64 real account test passed for `auth status --verify`, `key list --page/--page-size`, `usage recent --page/--page-size`, `usage key --scan-page-size`, and duplicate key lookup with `--group-id`.
- `npm run test:repair-scripts` verifies the old-install repair scripts uninstall historical npm package names, back up old shell-installer entrypoints, install `codesome-cli@0.5.3`, and do not remove Codesome credentials, sessions, config, or browser data.
- macOS Intel / Apple Silicon: cross-build assets are produced, but real macOS execution is not covered.
- Linux arm64: cross-build asset is produced, but real Linux arm64 execution is not covered.

## NPM Package Checks

Run before every NPM publish:

```bash
npm run test:npm-pack
```

This runs `npm pack --dry-run --json` and verifies:

- package is not private
- license is `Apache-2.0`
- `publishConfig.access` is `public`
- `publishConfig.provenance` is enabled
- required CLI, source, docs, and audit scripts are present
- private docs, sessions, token scan artifacts, images, binaries, build outputs, and temporary planning files are absent

The full publish gate is:

```bash
npm run prepublishOnly
```

After `npm pack`, verify the local tarball in a clean shell:

```bash
npm install -g ./codesome-cli-*.tgz
codesome version
codesome --help
codesome auth status
codesome hotskills
codesome-hotskills --help
```

For one-off execution, prefer the explicit package form when testing locally or in CI:

```bash
npx --package codesome-cli codesome version
```
