# Usage Feature

Use for selected-range usage statistics and recent request records.

Commands:

```bash
codesome usage stats
codesome usage stats --days 7
codesome usage recent --limit 10
codesome usage recent --json
```

Data source:

- `/api/v1/usage/stats`
- `/api/v1/usage`
- `/api/v1/usage/dashboard/stats`

Output:

- total requests
- total tokens when available
- actual/standard cost
- recent key name, model, billing mode, and cost
