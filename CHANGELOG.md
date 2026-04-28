# Changelog

## v0.4.0 - 2026-04-28

### 新增

- `codesome auth login` 默认改为账号密码 HTTP 登录，不再要求用户先下载或打开浏览器。
- 新增加密凭证存储：HTTP 登录后的 token / refresh token 保存为本机加密文件，不保存明文密码。
- 新增统一 token source：业务命令优先使用加密 HTTP 凭证，旧浏览器登录态继续作为兼容兜底。
- `codesome auth login --browser` 保留给验证码、二次验证、风控或用户主动选择网页登录的场景。

### 改进

- 发行版移除默认路径对 Playwright 的依赖，查询余额、订阅、用量、分组、Key 和兑换不再因为登录方式而要求下载浏览器。
- `auth status` 会展示凭证来源，便于判断当前使用的是 HTTP credentials 还是 browser session fallback。
- `logout` 会同时清理 HTTP 凭证和旧浏览器登录态。

### 验证

- Mock 覆盖 HTTP 登录、加密落盘、远程校验、token refresh、旧浏览器 session fallback 和 logout。
- 真实账号验收通过：HTTP 登录成功，`auth status --verify` 返回 HTTP 200，`balance show`、`group list`、`key list`、`subscription active`、`usage stats` 可用。
- 公开安全扫描 blocker 为 0。
- Windows 预编译包通过 `codesome version` 冒烟验证。

### 已知边界

- 如果后台要求验证码、二次验证或风控，CLI 不会绕过，需要改用 `codesome auth login --browser`。
- 本机加密凭证依赖当前用户目录下的 master key；换机器或删除 master key 后需要重新登录。
- macOS 二进制仍为交叉构建产物，尚未在 macOS 真机运行验证。
- Linux arm64 二进制仍未在 Linux arm64 真机运行验证。

## v0.3.0 - 2026-04-28

### 新增

- 新增 `codesome redeem apply --code <code>` 兑换码预检，默认不消耗兑换码。
- 新增 `codesome redeem apply --code <code> --confirm` 确认兑换。
- 新增 `codesome redeem history` 查看兑换记录。
- 新增兑换码输出脱敏，JSON、文本输出和失败路径都不会打印完整兑换码。

### 验证

- 私有源仓库通过 `npm run test:redeem`、Key mock、多账号 mock、smoke、安全扫描和多平台 release build。
- 真实后台验收通过：预检不消耗，确认兑换成功，兑换记录可查询，重复兑换返回已使用错误。
- Windows 预编译包通过 `codesome version` 冒烟验证。

### 已知边界

- 兑换是真实写操作，确认兑换前应先运行不带 `--confirm` 的预检命令。
- macOS 二进制仍为交叉构建产物，尚未在 macOS 真机运行验证。
- Linux arm64 二进制仍未在 Linux arm64 真机运行验证。

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
