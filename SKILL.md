---
name: codesome
description: Manage and troubleshoot Codesome user workflows via the local `codesome` CLI. Use when users ask to view balance, manage local Codesome accounts, manage Sub2API-compatible self-hosted instances, manage API keys, switch key groups, inspect usage, find recommended Agent Skills, or diagnose Codesome-related errors.
metadata:
  short-description: Codesome CLI, key, balance, config, and doctor workflow
---

# Codesome

Use this skill to help users operate Codesome through the local `codesome` CLI. The skill is a command-routing and safety layer only; implementation details live in the local CLI.

## 安全边界

- 不绕过登录、验证码、二次验证、风控或权限系统。
- 只操作当前登录用户自己有权限访问的内容。
- 不在对话中索要或保存 Codesome 密码。需要登录时，使用 CLI 安全提示或用户授权的 `--password-stdin`。
- 不在对话中输出 Cookie、Token、Authorization header、浏览器 session 或完整 API Key。
- 不把底层实现细节、页面选择器、非公开路径或逆向细节写入公开回答。

对外表述：这是基于用户授权登录态的 Codesome 客户端自动化工具，不是管理员或破解工具。

## 使用前

1. 如果用户提供 Codesome/Sub2API 站点链接，先规范成站点根地址，例如 `https://api.example.com/dashboard` -> `https://api.example.com`。非默认 Codesome 地址要先本机登记：`codesome instance add <instance-id> --base-url <origin>`。实例名可用 hostname，例如 `api.example.com`；如果实例已存在，继续使用该实例名。
2. 如果任务需要账户数据或 Key 操作，自定义实例先运行 `codesome auth status --instance <instance-id>`；默认 Codesome 实例运行 `codesome auth status`。
3. 如果未登录，自定义实例使用 `codesome auth login --instance <instance-id>`；默认 Codesome 实例使用 `codesome auth login`。默认路径是 HTTP 登录和本机加密凭证，不要求先下载浏览器。
4. 只有遇到验证码、二次验证、风控或用户明确要求网页登录时，才使用浏览器兜底。自定义实例必须带 `--instance <instance-id>`，例如 `codesome auth login --instance <instance-id> --browser`，否则会打开默认 Codesome 站点；缺少浏览器运行时时再执行 `codesome browser install`。
5. 删除、禁用、切换分组、写本地配置等操作必须先确认。
6. 查询类命令优先使用 `--json` 供 Agent 解析，然后向用户输出脱敏摘要。
7. 充值、兑换成功或用户说余额/订阅没更新时，先用 `codesome balance show --refresh --json` 或 `codesome sync refresh --json` 手动刷新；正常同步通常 10-60 秒内完成，极端情况下等待 1-3 分钟。

## 登录运行时

- `codesome auth login` 默认使用账号密码 HTTP 登录，并把凭证加密保存在本机账号目录。
- 任意 Sub2API 兼容 HTTPS 站点都可以通过 `codesome instance add` 做本机信任登记；这不是平台审核，也不是官方白名单。
- 自定义实例的 `auth`、余额、Key、分组、用量、订阅和兑换命令都要带 `--instance <instance-id>`。
- `codesome auth login --browser` 是兜底路径，使用 Codesome 管理的 Chrome for Testing。
- 不把用户自己的 Chrome/Edge 或 `CODESOME_BROWSER_PATH` 当作常规登录运行时。
- 浏览器兜底缺少运行时时，先执行 `codesome browser install`。
- 多账号使用独立加密凭证；浏览器兜底使用独立 browser profile，避免不同账号复用网页登录态。自定义实例使用 `~/.codesome/instances/<instance-id>/accounts/<alias>/` 做实例级隔离。

## 命令映射

| 用户意图 | 命令 |
| --- | --- |
| 登录 Codesome | `codesome auth login` |
| 浏览器兜底登录 | `codesome auth login --browser` |
| 登记自部署 Sub2API 实例 | `codesome instance add <instance-id> --base-url <origin>` |
| 登录自部署实例 | `codesome auth login --instance <instance-id>` |
| 浏览器兜底登录自部署实例 | `codesome auth login --instance <instance-id> --browser` |
| 查看登录状态 | `codesome auth status` |
| 查看自部署实例登录状态 | `codesome auth status --instance <instance-id> --verify` |
| 安装/查看登录浏览器 | `codesome browser install` / `codesome browser status` |
| 查看本机账号 | `codesome account list` 或 `codesome account current` |
| 新增/切换本机账号 | `codesome account add --name "<alias>"` 或 `codesome account switch <alias>` |
| 查看余额 | `codesome balance show` |
| 充值后刷新余额 | `codesome balance show --refresh` |
| 查看自部署实例余额 | `codesome balance show --instance <instance-id>` |
| 查看月卡/订阅 | `codesome subscription active` 或 `codesome subscription list` |
| 充值后刷新订阅 | `codesome subscription active --refresh` |
| 查看自动同步状态 | `codesome sync status` |
| 手动刷新自动同步 | `codesome sync refresh` |
| 查看用量 | `codesome usage stats` 或 `codesome usage recent` |
| 查看某个 Key 用量 | `codesome usage key --name "<key_name>" --days 30` |
| 查看 API Key | `codesome key list` |
| 兑换码预检 | `codesome redeem apply --code "<code>"` |
| 确认兑换码兑换 | `codesome redeem apply --code "<code>" --confirm` |
| 查看兑换记录 | `codesome redeem history` |
| 查看 API Key 配置 | `codesome key show --name "<key_name>"` |
| 查看 API Key 使用配置/Base URL | `codesome key use --name "<key_name>"` |
| 创建 API Key | `codesome key create --name "<name>" --group "<group>"` |
| 编辑 API Key 名称 | `codesome key update --name "<name>" --new-name "<new-name>"` |
| 修改 Key 限额 | `codesome key update --name "<name>" --quota <usd>`，确认后追加 `--confirm` |
| 修改 Key 过期时间 | `codesome key update --name "<name>" --expires-at <iso|none>`，确认后追加 `--confirm` |
| 修改 Key 速率限制 | `codesome key update --name "<name>" --rate-limit-5h <usd> --rate-limit-1d <usd> --rate-limit-7d <usd>`，确认后追加 `--confirm` |
| 修改 Key IP 名单 | `codesome key update --name "<name>" --ip-whitelist <a,b> --ip-blacklist <a,b>`，确认后追加 `--confirm` |
| 删除 API Key | `codesome key delete --name "<name>" --confirm` |
| 切换 Key 分组 | `codesome key switch-group --name "<name>" --group "<target>" --confirm` |
| 查看可用分组 | `codesome group list` |
| 查看推荐 Skills | `codesome hotskills` |
| 查看 dbskill 详情 | `codesome hotskills info dbskill` |
| 安装 dbskill 预检 | `codesome hotskills install dbskill` |
| 确认安装 dbskill | `codesome hotskills install dbskill --confirm` |

## 确认规则

执行以下操作前必须要求用户明确确认：

- 删除 Key
- 禁用 Key
- 切换分组，尤其是月卡分组与按量分组之间切换
- 修改 Key 限额、过期时间、速率限制、IP 白名单或 IP 黑名单
- 清空 Key 过期时间、IP 白名单或 IP 黑名单
- 重置 Key 用量计数
- 确认兑换码兑换
- 确认安装推荐 Skill

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
- 充值或确认兑换后余额/订阅可能有同步延迟：一般 10-60 秒，极端情况下等待 1-3 分钟；可用 `--refresh` 或 `sync refresh` 兜底。
- 月卡 Key 通常应使用月卡/订阅分组。
- 按量分组会消耗账户余额，切换前要提示费用影响。
- Key 切换分组后，客户端通常不需要换 Key，但可能需要重启终端或客户端。
- Claude Code/Claude 类客户端常使用 Anthropic 兼容配置；Codex/OpenAI 类客户端常使用 OpenAI 兼容配置。
- `codesome key use` 读取公开设置里的 `api_base_url`，比手写后台地址更适合拿来配置客户端 Base URL。
- `codesome hotskills install dbskill` 默认只做安装预检；追加 `--confirm` 才会调用 `skills` CLI。默认安装范围是全局用户目录。

## 排查提示

遇到 502/503、连接失败、登录循环、模型不可用时，优先使用 `codesome doctor <target>`；如果 doctor 尚未支持，则按以下顺序排查：

1. 登录态是否有效。
2. Key 是否存在、启用、分组正确。
3. 余额或月卡额度是否可用。
4. 目标模型是否匹配该分组。
5. 本地 base URL、model ID、API Key 来源是否正确。
6. 是否存在冲突环境变量。
