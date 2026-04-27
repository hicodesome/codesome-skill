# Changelog

## v0.2.0 - 2026-04-27

### 新增

- 新增多 Codesome 账号支持，可用 `--account <alias>` 在登录、余额、订阅、用量、分组和 Key 管理命令中选择本机账号。
- 新增 `codesome account` 命令，用于查看、切换、添加、重命名和删除本机账号别名。
- 新增 Codesome 托管 Chrome for Testing 登录运行时，`auth login` 不再使用用户自己的 Chrome 或 Edge。
- 新增 `codesome browser install/status/uninstall`，用于安装和检查 Codesome 专用浏览器。
- 多账号登录使用独立 browser profile 和独立 CDP 端口，避免不同账号复用网页登录态。

### 改进

- `auth status --verify` 在预编译发行版中改为使用已保存登录态做远程校验，不再依赖 Playwright。
- 安装脚本默认下载不可变版本 Release。当前稳定版本为 `v0.2.0`，可通过 `CODESOME_CLI_VERSION` 指定其他版本。
- `latest` 只作为兼容别名保留，不再作为用户理解版本变化的主要入口。

### 验证

- Windows 预编译包已从 GitHub Release 下载并通过 SHA256 校验。
- 下载后的 Windows 预编译包通过 `codesome version` 和 `codesome browser status --account default --json` 冒烟验证。
- `install.ps1` 已用临时安装目录验证可下载并安装 `v0.2.0`。

### 已知边界

- macOS 二进制为交叉构建产物，尚未在 macOS 真机运行验证。
- Linux arm64 二进制为交叉构建产物，尚未在 Linux arm64 真机运行验证。
- Key 配置的部分真实策略拦截验收仍在继续，不在本版本声明为全部完成。

## v0.1.0 - 2026-04-27

### 新增

- 初始公开版本，包含余额、订阅、用量、分组和 API Key 管理的基础 CLI 与 Skill 安装流程。
