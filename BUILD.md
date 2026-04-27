# Build Codesome CLI

This repository contains the public Codesome Skill plus the tested open-source subset of the `codesome` CLI.

## Requirements

- Node.js 20+
- npm

## Install Dependencies

```bash
npm install
```

## Run Locally

```bash
node ./bin/codesome.js version
node ./bin/codesome.js --help
```

## Build Release Binaries

```bash
npm run build:release
```

Outputs:

```text
dist/codesome-windows-amd64.exe
dist/codesome-linux-amd64
dist/codesome-linux-arm64
dist/codesome-darwin-amd64
dist/codesome-darwin-arm64
dist/checksums.txt
```

## Notes

- macOS binaries built on non-macOS hosts may need `codesign` before real user distribution.
- Do not commit `dist/`, `node_modules/`, local sessions, secrets, or tokens.
- The NPM wrapper package is planned separately.
