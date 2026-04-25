# Keys Feature

Use for API key query only. Write operations are not implemented yet.

Commands:

```bash
codesome key list
codesome key list --limit 20
codesome key list --search codex
codesome key list --json
```

Implementation detail: data is fetched by the local `codesome` CLI.\n
Safety:

- Always mask API keys as `sk-****abcd`.
- JSON output must not include full API key values.
- Do not implement delete/update/switch without explicit confirmation design.

