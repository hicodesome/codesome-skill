# Groups Feature

Use for querying groups available to the current user.

Commands:

```bash
codesome group list
codesome group list --platform anthropic
codesome group list --type subscription
codesome group list --json
```

Implementation detail: data is fetched by the local `codesome` CLI.\n
Output:

- group name
- platform
- standard/subscription type
- rate multiplier
- limits and description

Safety:

- Do not expose internal routing, account pool, cookie, or token details.

