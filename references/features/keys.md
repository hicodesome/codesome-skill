# Keys Feature

Use for API key query and guarded API key changes.

Commands:

```bash
codesome key list
codesome key list --limit 20
codesome key list --search codex
codesome key list --json
codesome key show --name "<key_name>"
codesome key use --name "<key_name>"
codesome key update --name "<key_name>" --quota 10
codesome key update --name "<key_name>" --expires-at 2026-05-31T00:00:00+08:00
codesome key update --name "<key_name>" --clear-expires-at
codesome key update --name "<key_name>" --rate-limit-5h 1 --rate-limit-1d 2 --rate-limit-7d 3
codesome key update --name "<key_name>" --ip-whitelist 127.0.0.1 --ip-blacklist 203.0.113.10
codesome key update --name "<key_name>" --clear-ip-whitelist --clear-ip-blacklist
codesome key delete --name "<key_name>"
```

Append `--confirm` to write operations only after the user confirms the dry-run diff.

Use `key use` when the user asks how to configure a client. It reads the public settings endpoint and reports the same stable Base URL source used by the web "使用密钥" modal.

Implementation detail: data is fetched by the local `codesome` CLI.

Safety:

- Always mask API keys as `sk-****abcd`.
- JSON output must not include full API key values.
- Write operations must show the current value and target value before `--confirm`.
