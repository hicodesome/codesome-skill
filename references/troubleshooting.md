# Codesome Troubleshooting Reference

Distilled from the Codesome support docs. Treat this as support guidance, not as a replacement for `codesome doctor`.\n
## Fast Triage

1. Ask what client is failing: Claude Code, Codex CLI, Codex desktop, OpenClaw, Hermes, Trae, Cherry Studio, Claudian, or another Anthropic/OpenAI-compatible client.
2. Check whether the user is using a redemption code or an API key. Redemption codes are not API keys.
3. Check whether the API key is enabled and assigned to the intended monthly-card or pay-as-you-go group.
4. Check balance, monthly entitlement, expiration, and whether the selected group supports the target model.
5. Check local config and environment variables for conflicts.
6. If the service reports 502/503, distinguish user-local config issues from Codesome service capacity or upstream instability.

## Common Error Routes

- `502`: inspect local client config, base URL, key/group/model compatibility, then service status if many users report it.
- `503`: often capacity/upstream/service availability; verify balance and key first, then suggest retrying or switching to a stable/pay-as-you-go group if appropriate.
- `Unable to connect to anthropic services` or `api.anthropic.com`: usually client still points at official Anthropic instead of Codesome; check `ANTHROPIC_BASE_URL` or client provider settings.
- `ECONNRESET`: check network/proxy, stale environment variables, and whether the client is mixing official and Codesome config.
- Repeated login prompts in Claude Code: check whether the setup should skip official Claude login and use API/base URL config instead.
- WSL Codex login loops or `thread/start failed during TUI bootstrap`: check WSL install state, shell environment, and stale variables before changing Codesome account settings.

## Config Variables To Inspect

Claude/Anthropic side:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_AUTH_TOKEN`
- `ANTHROPIC_BASE_URL`
- `ANTHROPIC_MODEL`
- `CLAUDE_API_KEY`
- `CLAUDE_CODE_OAUTH_TOKEN`
- `CLAUDE_CODE_USE_BEDROCK`
- `CLAUDE_CODE_USE_VERTEX`

Codesome/Codex side:

- `CODESOME_API_KEY`
- Codex config files such as `%USERPROFILE%\.codex\config.toml`, `~/.codex/config.toml`, or WSL equivalents.

## Safe User Advice

- For monthly-card users, use monthly-card groups unless explicitly choosing pay-as-you-go.
- For heavy/stability-sensitive users, pay-as-you-go may be preferable if they understand cost implications.
- After switching a key group, restart the terminal or client.
- Before deleting a key, confirm the user understands every client using that key will fail.

