# Codesome Skill

Codesome Skill 是给 Agent 使用的 Codesome 助手。安装后，你可以直接让 Agent 帮你完成余额查询、订阅查询、用量查询、兑换码充值、API Key 管理和分组切换等操作，不需要自己在网页后台来回找入口。

当前稳定版本：`v0.5.0`

每个公开版本都有独立 Release 和更新说明。升级前可以查看 [CHANGELOG.md](CHANGELOG.md)，了解本次增加了什么、修复了什么，以及还有哪些已知边界。

它适合这些场景：

- 想快速查看 Codesome 账户余额和订阅状态。
- 想安全预检并确认兑换 Codesome 兑换码。
- 想管理自己的 API Key，例如创建、改名、启用、禁用、切换分组或删除。
- 想查看某个 API Key 的近期用量。
- 想把任意 Sub2API 兼容自部署站点登记为本机实例，并用 `--instance` 操作它。
- 想查看 Codesome 推荐的优秀 Agent Skills，并安全安装白名单推荐项。
- 想让 Codex、Claude Code、OpenClaw、Hermes、OpenCode 等 Agent 客户端识别 Codesome Skill。

### 使用反馈和答疑欢迎进群交流

![codesome 使用反馈和答疑群](images/codesome-support-group.png)

## 给 Agent 看的

把下面这段提示词发给你的 Agent，它会按你的系统自动安装：

```text
请帮我安装并配置 Codesome Skill：https://github.com/hicodesome/codesome-skill

请按当前系统安装本地 codesome CLI，并把 Codesome Skill 安装到常见 Agent 客户端的用户级技能目录。

安装后请验证：
1. codesome version
2. codesome auth status
3. codesome instance list
4. codesome hotskills
5. 如果未登录，执行 codesome auth login，用 CLI 的安全提示完成账号密码登录
6. 登录后执行 codesome balance show 验证可用
7. 如果我要使用自部署 Sub2API 站点，先执行 codesome instance add <name> --base-url <url>，后续命令都带 --instance <name>
8. 如果遇到验证码、二次验证或风控，再使用 codesome auth login --browser 走浏览器兜底
9. 告诉我 CLI 安装目录和 Skill 安装目录

安全要求：不要输出 Cookie、Token、Session 或完整 API Key。
```

## 给人类看的

推荐直接使用安装脚本。脚本会下载对应系统的预编译 `codesome` CLI 二进制，并安装 Codesome Skill。

Windows：

```powershell
iwr https://raw.githubusercontent.com/hicodesome/codesome-skill/main/install.ps1 -UseB | iex
```

Linux / WSL / macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/hicodesome/codesome-skill/main/install.sh | bash
```

安装后验证：

```bash
codesome version
codesome auth status
```

如果未登录：

```bash
codesome auth login
```

登录后可继续验证：

```bash
codesome balance show
```

## 推荐安装方式

推荐方式：

```text
安装脚本 + GitHub Release 预编译二进制
```

安装脚本会自动选择对应平台的二进制：

```text
Windows amd64: codesome-windows-amd64.exe
Linux / WSL amd64: codesome-linux-amd64
Linux arm64 / aarch64: codesome-linux-arm64
macOS Intel: codesome-darwin-amd64
macOS Apple Silicon / M 系列: codesome-darwin-arm64
```

默认下载源是本仓库 GitHub Release 当前稳定版本 `v0.5.0`：

- `https://github.com/hicodesome/codesome-skill/releases/download/v0.5.0/codesome-windows-amd64.exe`
- `https://github.com/hicodesome/codesome-skill/releases/download/v0.5.0/codesome-linux-amd64`
- `https://github.com/hicodesome/codesome-skill/releases/download/v0.5.0/codesome-linux-arm64`
- `https://github.com/hicodesome/codesome-skill/releases/download/v0.5.0/codesome-darwin-amd64`
- `https://github.com/hicodesome/codesome-skill/releases/download/v0.5.0/codesome-darwin-arm64`

可通过环境变量指定版本或经过验证的镜像：

```text
CODESOME_CLI_VERSION
CODESOME_CLI_BASE_URL
CODESOME_SKILL_RAW_BASE_URL
```

示例：

```powershell
$env:CODESOME_CLI_VERSION="v0.5.0"
iwr https://raw.githubusercontent.com/hicodesome/codesome-skill/main/install.ps1 -UseB | iex
```

```bash
curl -fsSL https://raw.githubusercontent.com/hicodesome/codesome-skill/main/install.sh | CODESOME_CLI_VERSION=v0.5.0 bash
```

`latest` 只作为兼容别名保留；面向用户的发布说明和安装验证以明确版本号为准。

## 更新日志

每次功能发布都会对应一个不可变版本，例如 `v0.3.0`。版本说明记录在两个地方：

- GitHub Release 页面，方便下载预编译包时查看。
- [CHANGELOG.md](CHANGELOG.md)，方便在仓库中追踪连续变化。

## 支持的功能

- `codesome auth login`
- `codesome auth status`
- `codesome auth logout`
- `codesome instance list`
- `codesome instance current`
- `codesome instance add <name> --base-url <url>`
- `codesome instance switch <name>`
- `codesome instance status <name>`
- `codesome instance remove <name> --confirm`
- `codesome browser install`
- `codesome browser status`
- `codesome browser uninstall`
- `codesome account list`
- `codesome account current`
- `codesome account add --name "<alias>"`
- `codesome account switch <alias>`
- `codesome account rename <old> <new>`
- `codesome account remove <alias> --confirm`
- `codesome balance show`
- `codesome subscription active`
- `codesome subscription list`
- `codesome usage stats`
- `codesome usage recent`
- `codesome usage key --name "<key_name>" --days 30`
- `codesome group list`
- `codesome redeem apply --code "<code>"`
- `codesome redeem apply --code "<code>" --confirm`
- `codesome redeem history`
- `codesome key list`
- `codesome key show --name "<key_name>"`
- `codesome key create`
- `codesome key update --name "<key_name>" --quota <usd>`
- `codesome key update --name "<key_name>" --expires-at <iso|none>`
- `codesome key update --name "<key_name>" --rate-limit-5h <usd> --rate-limit-1d <usd> --rate-limit-7d <usd>`
- `codesome key update --name "<key_name>" --ip-whitelist <a,b> --ip-blacklist <a,b>`
- `codesome key update --name "<key_name>" --clear-expires-at --clear-ip-whitelist --clear-ip-blacklist`
- `codesome key switch-group`
- `codesome key delete`
- `codesome hotskills`
- `codesome hotskills info dbskill`
- `codesome hotskills install dbskill`

写操作默认先做 dry-run 预检，展示原值和目标值；追加 `--confirm` 才会写入。兑换码默认也只做预检，确认兑换时才追加 `--confirm`。

## 自部署 Sub2API 实例

除了默认 Codesome 实例，也可以把任意 Sub2API 兼容 HTTPS 站点登记为本机实例：

```bash
codesome instance add my-sub2api --base-url https://api.example.com
codesome auth login --instance my-sub2api
codesome balance show --instance my-sub2api
codesome key list --instance my-sub2api
```

`instance add` 是本机信任登记，不是平台审核或官方白名单。登录凭证、浏览器登录态和 browser profile 会按实例隔离保存。带账号密码、token 或 refresh token 的请求只允许发往默认官方地址或已登记实例，避免临时恶意 URL 接管凭据。

## Hot Skills 推荐

`codesome hotskills` 会展示 Codesome 当前推荐的优秀 Agent Skills。默认输出为窄屏友好的文本卡片，也支持 `--json` 给 Agent 客户端二次渲染。

当前首个推荐项是 `dbskill`，来源为 `dontbesilent2025/dbskill`，包含 13 个商业诊断、对标分析、内容创作和 Agent 工作台迁移相关 skills。

```bash
codesome hotskills
codesome hotskills info dbskill
codesome hotskills install dbskill
```

安装命令默认只做预检；确认安装时使用：

```bash
codesome hotskills install dbskill --confirm
```

## 登录

`codesome auth login` 默认使用账号密码 HTTP 登录，并把 token / refresh token 加密保存在本机账号目录中。正常情况下不需要先下载或打开浏览器。

如果遇到验证码、二次验证、风控或你明确想用网页登录，可以使用浏览器兜底：

```bash
codesome auth login --browser
```

浏览器兜底使用 Codesome 管理的 Chrome for Testing。如缺少浏览器运行时，再执行：

```bash
codesome browser install
```

多账号登录会为每个账号隔离 HTTP 凭证；浏览器兜底也会使用独立 browser profile，避免不同账号共用网页登录态。自部署实例还会额外按实例隔离，目录位于 `~/.codesome/instances/<instance-id>/accounts/<alias>/`。

## 安装位置

脚本运行时会打印实际安装路径。

CLI 默认安装到：

```text
Windows: %USERPROFILE%\.codesome\bin\codesome.exe
Linux / macOS: ~/.codesome/bin/codesome
```

浏览器运行时默认安装到：

```text
Windows: %USERPROFILE%\.codesome\browser
Linux / macOS: ~/.codesome/browser
```

Skill 默认安装或更新到这些用户级目录：

```text
Codex 官方用户级 Skill: ~/.agents/skills/codesome/SKILL.md
Claude Code / OpenCode 兼容: ~/.claude/skills/codesome/SKILL.md
Hermes Agent: ~/.hermes/skills/codesome/SKILL.md
OpenClaw 用户级: ~/.openclaw/skills/codesome/SKILL.md
OpenCode 原生: ~/.config/opencode/skill/codesome/SKILL.md
```

说明：`~/.codex` 主要用于 Codex 全局规则，例如 `AGENTS.md`。Codex 官方用户级 Skill 搜索目录是 `~/.agents/skills/<skill-name>/SKILL.md`。

安装脚本默认不写入项目级目录。如需项目级安装，可以手动复制到：

```text
<repo>/.agents/skills/codesome/SKILL.md
<repo>/.claude/skills/codesome/SKILL.md
<repo>/.opencode/skill/codesome/SKILL.md
```

## macOS 未签名提示

macOS 二进制可能需要本机临时签名或移除下载隔离标记。若首次运行被拦截，可执行：

```bash
chmod +x ~/.codesome/bin/codesome
codesign --sign - ~/.codesome/bin/codesome 2>/dev/null || true
xattr -dr com.apple.quarantine ~/.codesome/bin/codesome 2>/dev/null || true
codesome version
```

## 仓库结构

```text
SKILL.md                 Skill 主说明
CHANGELOG.md             版本更新日志
references/              Skill 参考文档
install.ps1              Windows 安装脚本
install.sh               Linux / WSL / macOS 安装脚本
bin/codesome.js          CLI 入口
src/                     CLI 源码
scripts/                 构建、验证和安全扫描脚本
BUILD.md                 构建说明
TESTING.md               测试说明
SECURITY.md              安全说明
```
