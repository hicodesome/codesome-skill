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

## Output Safety Checks

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
