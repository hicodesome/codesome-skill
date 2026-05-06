# Subscription Feature

Use for monthly-card/subscription package, expiry, and quota usage.

Commands:

```bash
codesome subscription active
codesome subscription active --refresh
codesome subscription list
codesome subscription list --refresh
codesome subscription active --json
```

Use `--refresh` after recharge or confirmed redeem if the latest subscription state is not visible yet. Normal sync delay is usually 10-60 seconds; in edge cases wait 1-3 minutes and refresh again.

Implementation detail: data is fetched by the local `codesome` CLI.

Output:

- package/group name
- status
- expiry and days remaining
- daily/weekly/monthly usage, limit, and remaining quota
- rate multiplier
