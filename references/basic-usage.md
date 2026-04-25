# Codesome Basic Usage Extract

Sources:

- Local Feishu mirror: `C:\Users\joe\projects\codesome-feishu-docs`
- Raw extracts: `C:\Users\joe\projects\codesome-basic-usage-extract`
- Main wiki: `https://zvgmnl1sw58.feishu.cn/wiki/Vaifwy0aAisdP8kDLPoc0jV5nCb`
- Source UI repo: `C:\Users\joe\projects\sub2api`

## Basic User Journey

1. Buy or receive a redemption code.
2. Open the Codesome site: `https://cc.codesome.ai` or `https://v3.codesome.cn`.
3. Register or log in.
4. Redeem the redemption code in the redemption area if applicable.
5. Create an API key in the key management page.
6. Choose the correct group for the key:
   - monthly-card/subscription groups for monthly-card entitlement;
   - pay-as-you-go groups for balance-based usage;
   - model/client-specific groups only when the docs or UI indicate compatibility.
7. Configure the client, such as Claude Code, Codex, OpenClaw, Hermes, Claudian, Cherry Studio, or Trae.
8. If usage fails, check key status, group/model compatibility, balance/subscription, base URL, and local environment variables.

## Site and Purchase Facts

- Purchase/recharge entry is commonly `fk.codesome.cn`.
- Usage/login entries include `cc.codesome.ai` and `v3.codesome.cn`.
- V4 no longer accepts new recharges in the synced docs; new recharge flow should use V3.
- Redemption codes are not API keys. A user must redeem first, then create an API key.
- Multiple redemption codes should be redeemed one by one.

## Key and Group Facts

- An API key is created by the user after login.
- A key can be assigned to a group.
- Monthly-card users should normally use monthly-card groups.
- Pay-as-you-go groups consume balance and may be preferred for stability/heavy usage if the user understands cost.
- Switching a key group generally does not require changing the key in clients; restarting the terminal/client is usually enough.

## Client Configuration Facts

- Claude Code and Claude-compatible clients often use Anthropic-compatible variables/settings.
- Codex/OpenAI-compatible clients use an OpenAI-style base URL and API key configuration.
- Many failures come from stale or conflicting local variables rather than Codesome account state.
- Important variables to inspect: `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`, `CLAUDE_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`, `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, and `CODESOME_API_KEY`.

## Common Support Cases

- 502/503: first distinguish local config/key/group/balance issues from service capacity/upstream instability.
- `Unable to connect to anthropic services` or references to `api.anthropic.com`: client may still point to official Anthropic rather than Codesome.
- Claude Code login loops: user may need API/base URL config rather than official Claude login.
- WSL Codex repeated login or TUI bootstrap failure: inspect WSL/client install and env vars before changing Codesome account settings.
