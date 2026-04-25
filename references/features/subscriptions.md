# Subscription Feature

Use for monthly-card/subscription package, expiry, and quota usage.

Commands:

```bash
codesome subscription active
codesome subscription list
codesome subscription active --json
```

Implementation detail: data is fetched by the local `codesome` CLI.\n
Output:

- package/group name
- status
- expiry and days remaining
- daily/weekly/monthly usage, limit, and remaining quota
- rate multiplier

