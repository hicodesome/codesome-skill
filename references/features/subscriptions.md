# Subscription Feature

Use for monthly-card/subscription package, expiry, and quota usage.

Commands:

```bash
codesome subscription active
codesome subscription list
codesome subscription active --json
```

Data source:

- `/api/v1/subscriptions/active`
- `/api/v1/subscriptions`

Output:

- package/group name
- status
- expiry and days remaining
- daily/weekly/monthly usage, limit, and remaining quota
- rate multiplier
