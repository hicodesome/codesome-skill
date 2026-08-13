# Balance Feature

Use for ordinary pay-as-you-go balance and dashboard spending summary.

Commands:

```bash
codesome balance show
codesome balance show --refresh
codesome balance show --json
```

Use `--refresh` after recharge or confirmed redeem if the latest balance is not visible yet. Normal sync delay is usually 10-60 seconds; in edge cases wait 1-3 minutes and refresh again.

Implementation detail: data is fetched by the local `codesome` CLI.

Safety:

- Mask account email in human output.
- Do not print auth token, cookies, or storage state.
