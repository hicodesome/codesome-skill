---
name: codesome
description: Manage and troubleshoot Codesome user workflows via the local `codesome` CLI. Use when users ask to view balance, manage API keys, switch key groups, configure Codex or Claude Code with Codesome, clean conflicting Anthropic/Claude/Codex environment variables, or diagnose Codesome-related errors such as 502/503, login loops, model/group mismatch, balance, key, base_url, or client configuration problems.
metadata:
  short-description: Codesome CLI, key, balance, config, and doctor workflow
---

# Codesome

Use this skill to help users operate Codesome through the local closed-source `codesome` CLI. The skill is a command-routing and safety layer only; do not expose or infer backend implementation details.

## Core Boundary

Codesome automation is limited to actions an ordinary logged-in user can perform in their own Codesome web console.

- Do not bypass login, CAPTCHA, 2FA, risk controls, or permission checks.
- Do not enumerate other users' `key_id`, `user_id`, groups, balances, or data.
- Do not call suspected admin/internal APIs.
- Do not ask for or store Codesome passwords.
- Do not print Cookie, Token, Authorization headers, browser session storage, or full API keys.
- Do not put UI selectors, endpoint paths, cookie handling, group ID mappings, or reverse-engineering notes in chat output.

Recommended external wording: this is a Codesome client automation tool based on the user's authorized login session, not an admin or cracking tool.

## Before Running Commands

1. If the task needs account data or key operations, check login with `codesome auth status` unless the user just logged in.
2. If unauthenticated, ask the user to run or authorize `codesome auth login` and complete login in the browser.
3. For destructive or cost-affecting operations, restate the planned change and require explicit confirmation before running the final command.
4. Prefer JSON output if the CLI supports it and you need to parse results; summarize safely for the user.

## Intent Routing

| User intent | Command |
| --- | --- |
| 鐧诲綍 Codesome | `codesome auth login` |
| 鏌ョ湅鐧诲綍鐘舵€?| `codesome auth status` |
| 鏌ョ湅 API Key 鍒楄〃 | `codesome key list` |
| 鍒涘缓 API Key | `codesome key create --name "<name>" --group "<group>" --note "<note>"` |
| 缂栬緫 API Key | `codesome key update --name "<name>" --new-name "<new-name>"` or `--note "<note>"` |
| 鍚敤/绂佺敤 API Key | `codesome key update --name "<name>" --status "<enabled|disabled>"` |
| 鍒囨崲 Key 鍒嗙粍 | `codesome key switch-group --name "<name>" --group "<target_group>"` |
| 鍒犻櫎 API Key 棰勬 | `codesome key delete --name "<name>"` |
| 纭鍒犻櫎 API Key | `codesome key delete --name "<name>" --confirm` |
| 鏌ョ湅浣欓/濂楅 | `codesome balance show` |
| 鏌ョ湅鍙敤鍒嗙粍 | `codesome group list` |
| 閰嶇疆 Codex | `codesome config codex --key-name "<name>" --model "<model>"` |
| 閰嶇疆 Claude Code | `codesome config claude-code --key-name "<name>"` |
| 娓呯悊鍐茬獊鐜鍙橀噺 | `codesome config clean` |
| 璇婃柇 Codex | `codesome doctor codex` |
| 璇婃柇 Claude Code | `codesome doctor claude-code` |

## Confirmation Rules

Require explicit user confirmation before these operations:

- `key delete --confirm`
- disabling a key
- switching groups, especially from a monthly-card group to a pay-as-you-go group
- writing Codex or Claude Code config files
- cleaning environment variables

Safe confirmation summary template:

```text
鍗冲皢鎿嶄綔锛?operation>
Key锛?name> / <masked-key-if-available>
褰撳墠鍊硷細<current>
鐩爣鍊硷細<target>
褰卞搷锛?cost/config/client impact>

璇锋槑纭洖澶嶁€滅‘璁も€濆悗鎴戝啀鎵ц銆?
```

## Output Safety

- API keys: mask as `sk-****abcd` except a freshly created key that the CLI intentionally shows once.
- Emails: partially mask if not necessary for troubleshooting.
- Logs and errors: filter complete keys, tokens, cookies, authorization headers, and session data before sharing.
- If command output includes sensitive material unexpectedly, do not repeat it; summarize and say it was redacted.

## Common Codesome Facts

Use these facts when explaining results or deciding what to check:

- Purchase/recharge and usage are separate flows: redemption codes add balance/entitlement; API keys must still be created in the console.
- New recharges are normally on V3; usage entry points include `cc.codesome.ai` and `v3.codesome.cn`.
- Monthly-card keys should use monthly-card groups. Pay-as-you-go groups consume balance and may be more stable for heavy users.
- If a client already uses a key, switching that key's group usually does not require rewriting the local key; restart the client or terminal if needed.
- Codesome commonly uses Anthropic-compatible configuration for Claude clients and OpenAI-compatible configuration for Codex/OpenAI-style clients.

## Troubleshooting Playbooks

For 502/503, connection, login-loop, or client setup issues, prefer `codesome doctor <target>` when available. If the CLI lacks doctor support, use the Feishu-derived references only as guidance:

- `references/basic-usage.md`: Codesome ???????? Feishu raw ?????
- `references/web-to-cli-spec.md`: sub2api ???????? Web ??? CLI ?????
- `references/support-doc-index.md`: local Feishu wiki mirror index and source links.
- `references/troubleshooting.md`: common diagnosis checklist distilled from the wiki.

High-level checks:

1. Confirm Codesome login and key existence.
2. Confirm key is enabled and in a group that supports the target model.
3. Confirm balance/monthly entitlement and expiration.
4. Confirm client `base_url`, model ID, and API key source.
5. Check conflicting environment variables such as `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`, `CLAUDE_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`, `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, and `CODESOME_API_KEY`.
6. For WSL/Codex login loops or TUI bootstrap failures, verify WSL environment, stale env vars, and client install path before changing Codesome settings.

## Implementation Guidance

For maintainers building the closed-source CLI, first read `references/web-to-cli-spec.md` and use `C:\Users\joe\projects\sub2api` as the local source reference. Then follow these rules:


- Keep `SKILL.md` stable and implementation-agnostic.
- Use an adapter interface with operations such as `AuthStatus`, `ListKeys`, `CreateKey`, `UpdateKey`, `DeleteKey`, `SwitchKeyGroup`, `ShowBalance`, and `ListGroups`.
- MVP should prefer a UI adapter based on user-authorized browser login; migrate low-risk read-only flows to HTTP or official APIs only when stable and authorized.
- Keep selectors, HTTP endpoints, session handling, group IDs, and diagnosis heuristics inside the private CLI, not the public skill.


