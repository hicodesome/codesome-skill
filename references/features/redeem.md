# Redeem Feature

Use for Codesome redemption code preview, confirmed redeem, and redeem history.

Commands:

```bash
codesome redeem apply --code "<code>"
codesome redeem apply --code "<code>" --confirm
codesome redeem history
codesome redeem history --json
```

Behavior:

- Without `--confirm`, `redeem apply` only previews the operation and does not consume the code.
- With `--confirm`, `redeem apply` is a real write operation.
- `redeem history` shows prior redemption records.

Safety:

- Never print full redemption codes in chat, logs, issues, or pull requests.
- Summarize codes with a mask such as `abcd****wxyz`.
- If a backend error echoes the code, rely on the CLI redaction and do not repeat the raw error.
- Reusing a redeemed code is expected to fail.
