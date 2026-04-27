# Codesome Skill

Codesome Skill 是给 Agent 使用的 Codesome 助手。安装后，你可以直接让 Agent 帮你完成余额查询、订阅查询、用量查询、API Key 管理和分组切换等操作，不需要自己在网页后台来回找入口。

它适合这些场景：

- 想快速查看 Codesome 账户余额和订阅状态。
- 想管理自己的 API Key，例如创建、改名、启用、禁用、切换分组或删除。
- 想查看某个 API Key 的近期用量。
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
3. 如果未登录，执行 codesome auth login，并让我在浏览器里完成登录
4. 登录后执行 codesome balance show 验证可用
5. 告诉我 CLI 安装目录和 Skill 安装目录

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

默认下载源是本仓库 GitHub Release `latest`：

- `https://github.com/hicodesome/codesome-skill/releases/download/latest/codesome-windows-amd64.exe`
- `https://github.com/hicodesome/codesome-skill/releases/download/latest/codesome-linux-amd64`
- `https://github.com/hicodesome/codesome-skill/releases/download/latest/codesome-linux-arm64`
- `https://github.com/hicodesome/codesome-skill/releases/download/latest/codesome-darwin-amd64`
- `https://github.com/hicodesome/codesome-skill/releases/download/latest/codesome-darwin-arm64`

可通过环境变量指定经过验证的镜像：

```text
CODESOME_CLI_BASE_URL
CODESOME_SKILL_RAW_BASE_URL
```

## 支持的功能

- `codesome auth login`
- `codesome auth status`
- `codesome auth logout`
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

写操作默认先做 dry-run 预检，展示原值和目标值；追加 `--confirm` 才会写入。

## 安装位置

脚本运行时会打印实际安装路径。

CLI 默认安装到：

```text
Windows: %USERPROFILE%\.codesome\bin\codesome.exe
Linux / macOS: ~/.codesome/bin/codesome
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
