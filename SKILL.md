---
name: codesome
description: Manage and troubleshoot Codesome user workflows via the local `codesome` CLI. Use when users ask to view balance, manage local Codesome accounts, manage API keys, switch key groups, inspect usage, or diagnose Codesome-related errors.
metadata:
  short-description: Codesome CLI, key, balance, config, and doctor workflow
---

# Codesome

Use this skill to help users operate Codesome through the local `codesome` CLI. The skill is a command-routing and safety layer only; implementation details live in the local CLI.

## 安全边界

- 不绕过登录、验证码、二次验证、风控或权限系统。
- 只操作当前登录用户自己有权限访问的内容。
- 不向用户索要或保存 Codesome 密码。
- 不在对话中输出 Cookie、Token、Authorization header、浏览器 session 或完整 API Key。
- 不把底层实现细节、页面选择器、非公开路径或逆向细节写入公开回答。

对外表述：这是基于用户授权登录态的 Codesome 客户端自动化工具，不是管理员或破解工具。

## 使用前

1. 如果任务需要账户数据或 Key 操作，先运行 `codesome auth status`。
2. 如果未登录，先确保 `codesome browser install` 已安装 Codesome 专用浏览器，再让用户运行 `codesome auth login` 并在该浏览器完成登录。
3. 删除、禁用、切换分组、写本地配置等操作必须先确认。
4. 查询类命令优先使用 `--json` 供 Agent 解析，然后向用户输出脱敏摘要。

## 浏览器运行时

- `codesome auth login` 使用 Codesome 管理的 Chrome for Testing。
- 不把用户自己的 Chrome/Edge 或 `CODESOME_BROWSER_PATH` 当作常规登录运行时。
- 缺少运行时时，先执行 `codesome browser install`。
- 多账号登录使用独立浏览器 profile，避免不同账号复用网页登录态。

## 命令映射

| 用户意图 | 命令 |
| --- | --- |
| 登录 Codesome | `codesome auth login` |
| 查看登录状态 | `codesome auth status` |
| 安装/查看登录浏览器 | `codesome browser install` / `codesome browser status` |
| 查看本机账号 | `codesome account list` 或 `codesome account current` |
| 新增/切换本机账号 | `codesome account add --name "<alias>"` 或 `codesome account switch <alias>` |
| 查看余额 | `codesome balance show` |
| 查看月卡/订阅 | `codesome subscription active` 或 `codesome subscription list` |
| 查看用量 | `codesome usage stats` 或 `codesome usage recent` |
| 查看某个 Key 用量 | `codesome usage key --name "<key_name>" --days 30` |
| 查看 API Key | `codesome key list` |
| 兑换码预检 | `codesome redeem apply --code "<code>"` |
| 确认兑换码兑换 | `codesome redeem apply --code "<code>" --confirm` |
| 查看兑换记录 | `codesome redeem history` |
| 查看 API Key 配置 | `codesome key show --name "<key_name>"` |
| 创建 API Key | `codesome key create --name "<name>" --group "<group>"` |
| 编辑 API Key 名称 | `codesome key update --name "<name>" --new-name "<new-name>"` |
| 修改 Key 限额 | `codesome key update --name "<name>" --quota <usd>`，确认后追加 `--confirm` |
| 修改 Key 过期时间 | `codesome key update --name "<name>" --expires-at <iso|none>`，确认后追加 `--confirm` |
| 修改 Key 速率限制 | `codesome key update --name "<name>" --rate-limit-5h <usd> --rate-limit-1d <usd> --rate-limit-7d <usd>`，确认后追加 `--confirm` |
| 修改 Key IP 名单 | `codesome key update --name "<name>" --ip-whitelist <a,b> --ip-blacklist <a,b>`，确认后追加 `--confirm` |
| 删除 API Key | `codesome key delete --name "<name>" --confirm` |
| 切换 Key 分组 | `codesome key switch-group --name "<name>" --group "<target>" --confirm` |
| 查看可用分组 | `codesome group list` |

## 确认规则

执行以下操作前必须要求用户明确确认：

- 删除 Key
- 禁用 Key
- 切换分组，尤其是月卡分组与按量分组之间切换
- 修改 Key 限额、过期时间、速率限制、IP 白名单或 IP 黑名单
- 清空 Key 过期时间、IP 白名单或 IP 黑名单
- 重置 Key 用量计数
- 确认兑换码兑换

确认摘要模板：

```text
即将操作：<operation>
Key：<name> / <masked-key-if-available>
当前值：<current>
目标值：<target>
影响：<cost/config/client impact>

请明确回复“确认”后我再执行。
```

## 输出安全

- API Key 默认显示为 `sk-****abcd`。
- 兑换码默认只显示前后少量字符，例如 `abcd****wxyz`。
- 新建 Key 后，完整 Key 应由 CLI 保存到本地文件或复制到剪贴板；对话中只说明路径和脱敏值。
- 邮箱按需部分脱敏。
- 如果命令意外输出敏感内容，不要复述，改为说明“已脱敏”。

## 功能参考

按需读取：

- `references/features/balance.md`
- `references/features/subscriptions.md`
- `references/features/usage.md`
- `references/features/keys.md`
- `references/features/redeem.md`
- `references/features/groups.md`
- `references/basic-usage.md`
- `references/troubleshooting.md`

## 常见事实

- 兑换码和 API Key 不是一回事：兑换码用于充值/权益，API Key 需要用户在后台创建。
- 月卡 Key 通常应使用月卡/订阅分组。
- 按量分组会消耗账户余额，切换前要提示费用影响。
- Key 切换分组后，客户端通常不需要换 Key，但可能需要重启终端或客户端。
- Claude Code/Claude 类客户端常使用 Anthropic 兼容配置；Codex/OpenAI 类客户端常使用 OpenAI 兼容配置。

## 排查提示

遇到 502/503、连接失败、登录循环、模型不可用时，优先使用 `codesome doctor <target>`；如果 doctor 尚未支持，则按以下顺序排查：

1. 登录态是否有效。
2. Key 是否存在、启用、分组正确。
3. 余额或月卡额度是否可用。
4. 目标模型是否匹配该分组。
5. 本地 base URL、model ID、API Key 来源是否正确。
6. 是否存在冲突环境变量。
