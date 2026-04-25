# Balance Feature

Use for ordinary pay-as-you-go balance and dashboard spending summary.

Commands:

```bash
codesome balance show
codesome balance show --json
```

Implementation detail: data is fetched by the local `codesome` CLI.\n
Safety:

- Mask account email in human output.
- Do not print auth token, cookies, or storage state.

