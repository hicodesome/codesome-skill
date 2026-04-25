# Codesome Skill

这是 Codesome 的公开 Skill 仓库。

## 快速安装 CLI

> 当前仓库先提供安装脚本和 Skill 文档。闭源 CLI 二进制发布后，安装脚本会从国内下载源安装，不依赖 GitHub、npm、Homebrew、pip 等国外包管理器。

### Windows PowerShell

```powershell
iwr https://gitee.com/bashi01/codesome-skill/raw/main/install.ps1 -UseB | iex
```

### macOS / Linux / WSL

```bash
curl -fsSL https://gitee.com/bashi01/codesome-skill/raw/main/install.sh | bash
```

### 国内下载源

安装脚本默认使用国内下载源。后续可以通过环境变量切换下载地址：

Windows：

```powershell
$env:CODESOME_CLI_BASE_URL="https://download.codesome.cn/cli"
iwr https://gitee.com/bashi01/codesome-skill/raw/main/install.ps1 -UseB | iex
```

macOS / Linux：

```bash
CODESOME_CLI_BASE_URL="https://download.codesome.cn/cli" bash -c "$(curl -fsSL https://gitee.com/bashi01/codesome-skill/raw/main/install.sh)"
```


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

