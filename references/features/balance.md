# Balance Feature

Use for ordinary pay-as-you-go balance and dashboard spending summary.

Commands:

```bash
codesome balance show
codesome balance show --json
```

Data source:

- `/api/v1/auth/me` for `balance` and `total_recharged`
- `/api/v1/usage/dashboard/stats` for dashboard consumption

Safety:

- Mask account email in human output.
- Do not print auth token, cookies, or storage state.
