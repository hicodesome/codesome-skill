# Codesome Skill

这是 Codesome 的公开 Skill 仓库。

### 使用反馈和答疑欢迎进群交流

![codesome 小白和技术答疑群](images/codesome-support-group.png)

## 快速安装技能

> 这个仓库首先是 Codesome Skill 仓库。安装脚本会安装/更新本地 `codesome` CLI，并把 `codesome` Skill 安装到常见 Agent 客户端的用户级技能目录，因为这个技能实际执行操作时需要调用本地 CLI。

### 安装位置

安装脚本会明确打印安装位置。

CLI 默认安装到：

```text
Windows: %USERPROFILE%\.codesome\bin\codesome.exe
Linux / macOS: ~/.codesome/bin/codesome
```

Skill 默认安装/更新到这些用户级目录：

```text
Codex 官方用户级 Skill: ~/.agents/skills/codesome/SKILL.md
Claude Code / OpenCode 兼容: ~/.claude/skills/codesome/SKILL.md
Hermes Agent: ~/.hermes/skills/codesome/SKILL.md
OpenClaw 用户级: ~/.openclaw/skills/codesome/SKILL.md
OpenCode 原生: ~/.config/opencode/skill/codesome/SKILL.md
```

注意：`~/.codex` 主要用于 Codex 的全局规则，例如 `AGENTS.md`，不是当前 Codex 官方 Skill 搜索目录。Codex 用户级 Skill 应安装到 `~/.agents/skills/<skill-name>/SKILL.md`。

项目级目录不会默认写入，避免污染用户当前仓库。如需项目级安装，可以复制到：

```text
<repo>/.agents/skills/codesome/SKILL.md
<repo>/.claude/skills/codesome/SKILL.md
<repo>/.opencode/skill/codesome/SKILL.md
```

### 给人类看的

复制并粘贴以下提示词到你的 LLM Agent（Claude Code、AmpCode、Cursor、Codex 等）：

```text
请帮我安装并配置 Codesome Skill。

公开仓库地址：
https://github.com/hicodesome/codesome-skill

请按我的系统安装本地 codesome CLI，并把 Codesome Skill 安装到常见 Agent 客户端的用户级技能目录，因为这个 Skill 需要调用本地 CLI 才能执行余额查询、API Key 管理、用量查询等操作。

安装方式：
- Windows：运行 https://raw.githubusercontent.com/hicodesome/codesome-skill/main/install.ps1，安装脚本会下载 `codesome-windows-amd64.exe`
- Linux / WSL amd64：运行 https://raw.githubusercontent.com/hicodesome/codesome-skill/main/install.sh，安装脚本会下载 `codesome-linux-amd64`
- Linux ARM64 / aarch64：运行 https://raw.githubusercontent.com/hicodesome/codesome-skill/main/install.sh，安装脚本会下载 `codesome-linux-arm64`
- macOS Intel：运行 https://raw.githubusercontent.com/hicodesome/codesome-skill/main/install.sh，安装脚本会下载 `codesome-darwin-amd64`
- macOS Apple Silicon / M 系列：运行 https://raw.githubusercontent.com/hicodesome/codesome-skill/main/install.sh，安装脚本会下载 `codesome-darwin-arm64`

安装后请验证：
1. codesome version
2. codesome auth status
3. 如果未登录，执行 codesome auth login，并让我在浏览器里完成登录
4. 登录后执行 codesome balance show 验证可用
5. 告诉我 CLI 安装目录和 Skill 安装目录

安全要求：不要输出 Cookie、Token、Session 或完整 API Key。
```

也可以自己手动执行下面的安装命令。但建议让 Agent 来做，减少复制命令和环境配置出错。

### 给 LLM Agent 看的

获取仓库 README 并照做：

```bash
curl -fsSL https://raw.githubusercontent.com/hicodesome/codesome-skill/main/README.md
```

Windows 环境优先使用：

```powershell
iwr https://raw.githubusercontent.com/hicodesome/codesome-skill/main/install.ps1 -UseB | iex
```

Linux / WSL / macOS 环境优先使用同一个 `install.sh`，脚本会按系统和 CPU 架构自动选择二进制：

- Linux / WSL amd64：`codesome-linux-amd64`
- Linux ARM64 / aarch64：`codesome-linux-arm64`
- macOS Intel：`codesome-darwin-amd64`
- macOS Apple Silicon / M 系列：`codesome-darwin-arm64`

```bash
curl -fsSL https://raw.githubusercontent.com/hicodesome/codesome-skill/main/install.sh | bash
```

安装完成后至少验证：

```bash
codesome version
codesome auth status
codesome balance show
```

安装脚本还会打印 Skill 安装目录。正常情况下，至少应看到：

```text
~/.agents/skills/codesome
~/.claude/skills/codesome
~/.hermes/skills/codesome
~/.openclaw/skills/codesome
~/.config/opencode/skill/codesome
```

### macOS 未签名提示

当前 macOS 版 CLI 已提供下载资产：

- `codesome-darwin-amd64`：Intel Mac
- `codesome-darwin-arm64`：Apple Silicon / M 系列 Mac

因为当前发布是在 Windows 环境交叉构建，macOS 二进制尚未在 Mac 真机上完成 `codesign` 签名和实机测试。部分 macOS 机器首次运行时，可能提示“无法验证开发者”或阻止启动。

如果安装后 macOS 拦截运行，可以让 Agent 或用户在终端执行：

```bash
chmod +x ~/.codesome/bin/codesome
codesign --sign - ~/.codesome/bin/codesome 2>/dev/null || true
xattr -dr com.apple.quarantine ~/.codesome/bin/codesome 2>/dev/null || true
codesome version
```

说明：`codesign --sign -` 是本机临时签名；`xattr -dr com.apple.quarantine` 是移除浏览器/下载器附加的隔离标记。后续拿到 Mac 真机后，会补正式的 macOS 实机验收记录。

### 当前真实下载源

安装脚本默认从本仓库的 GitHub Release `latest` 下载闭源 CLI 二进制：

- `https://github.com/hicodesome/codesome-skill/releases/download/latest/codesome-windows-amd64.exe`
- `https://github.com/hicodesome/codesome-skill/releases/download/latest/codesome-linux-amd64`
- `https://github.com/hicodesome/codesome-skill/releases/download/latest/codesome-linux-arm64`
- `https://github.com/hicodesome/codesome-skill/releases/download/latest/codesome-darwin-amd64`
- `https://github.com/hicodesome/codesome-skill/releases/download/latest/codesome-darwin-arm64`

不要使用未验证的自定义域名。未来如果有新的官方镜像或 CDN，必须先真实发布并验证后再写入文档。
## 阶段验收报告

给老板/技术同事验收当前进度，可以直接查看：

- [ACCEPTANCE.md](./ACCEPTANCE.md)

该报告列出了已发布内容、已验收环境、已验收功能、安全边界、已知限制和下一阶段建议。

## 作用

这个 Skill 让 Agent 通过本地闭源 `codesome` CLI 帮用户完成 Codesome 相关操作，例如：

- 查询余额
- 查询月卡/订阅额度
- 查询用量
- 查询/创建/编辑 API Key
- 切换 Key 分组
- 兑换码和后续客户端配置（规划中）

## 重要说明

本仓库只包含公开 Skill 文档和调用规则，不包含闭源 CLI 实现。

用户需要先安装本地 `codesome` CLI。CLI 的发布和安装方式后续由 Codesome 提供。

## 安全边界

- 不绕过登录、验证码、二次验证和权限系统。
- 只操作当前登录用户自己有权限访问的数据。
- 不在对话中输出 Cookie、Token、Session 或完整 API Key。
- 创建 API Key 后，完整 Key 应通过本地文件或剪贴板交付，不应直接打印在终端或聊天中。

## 目录

- `SKILL.md`：Skill 主说明。
- `install.ps1`：Windows 一键安装脚本。
- `install.sh`：macOS/Linux/WSL 一键安装脚本。
- `checksums.txt`：二进制校验文件，正式发布时填写。
- `references/basic-usage.md`：Codesome 基础使用说明。
- `references/troubleshooting.md`：常见问题排查。
- `references/features/`：各功能子参考。

## 闭源 CLI

公开 Skill 只负责“什么时候调用什么命令”。

真正执行操作的是本地闭源 CLI：

```bash
codesome <command>
```

这样可以保证：

- Skill 可以公开审查。
- 核心自动化实现不暴露。
- 登录态、API Key、Cookie、Token 等敏感处理留在本地 CLI 中。








