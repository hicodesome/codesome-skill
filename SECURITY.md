# Security Policy

## Sensitive Data

Do not commit or publish:

- API keys
- Cookies
- Tokens
- Browser storage state
- Session files
- Private credentials
- Internal-only implementation details
- UI selectors or unpublished automation notes

## NPM Publishing

The public NPM package is published from this public repository only. Do not publish from the private development repository.

Publishing should use GitHub Actions Trusted Publishing / OIDC and provenance once a GitHub token with `workflow` scope is available. Do not store long-lived NPM tokens in repository secrets, workflow files, `.npmrc`, docs, or chat logs.

Before publishing, run:

```bash
npm run prepublishOnly
```

The NPM tarball audit must pass with no private docs, session files, token scan artifacts, local secrets, build outputs, images, or platform binaries included.

## Reporting

If you find a sensitive leak in this public skill package, contact the Codesome maintainers privately before opening a public issue.
