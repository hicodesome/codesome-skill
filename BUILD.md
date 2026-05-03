# Build Codesome CLI

This repository contains the public Codesome Skill plus the tested open-source subset of the `codesome` CLI.

## Requirements

- Node.js 18+
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

## NPM Source Package

The public NPM package is `@codesome/cli`. It ships the tested source CLI and requires Node.js 18+ at runtime.

Before publishing, verify the package metadata and tarball allowlist:

```bash
npm run test:npm-pack
```

The package exposes these commands through `bin`:

```text
codesome
codesome-hotskills
```

Local package install check:

```bash
npm pack
npm install -g ./codesome-cli-*.tgz
codesome version
codesome --help
codesome-hotskills --help
```

## Build Release Binaries

```bash
npm run build:release
```

Outputs:

```text
dist/codesome-windows-amd64.exe
dist/codesome-hotskills-windows-amd64.exe
dist/codesome-linux-amd64
dist/codesome-hotskills-linux-amd64
dist/codesome-linux-arm64
dist/codesome-hotskills-linux-arm64
dist/codesome-darwin-amd64
dist/codesome-hotskills-darwin-amd64
dist/codesome-darwin-arm64
dist/codesome-hotskills-darwin-arm64
checksums.txt
dist/checksums.txt
```

## Notes

- macOS binaries built on non-macOS hosts may need `codesign` before real user distribution.
- `v0.5.2-rc.2` and later release builds include both `codesome-*` and `codesome-hotskills-*` platform binaries. `scripts/verify-release-assets.cjs` fails the build if either entrypoint is missing from `dist/` or `checksums.txt`.
- `scripts/build-release.mjs` writes the same checksum manifest to `dist/checksums.txt` and root `checksums.txt`; the root file is included in the NPM source package as the release checksum reference.
- Do not commit `dist/`, `node_modules/`, local sessions, secrets, or tokens.
- NPM source publishing uses `@codesome/cli`; binary wrapper/platform packages are not part of the first NPM release.
