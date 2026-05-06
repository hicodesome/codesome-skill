# Changelog

## v0.5.5 - 2026-05-06

### 修复

- `codesome hotskills` 改为运行时读取 `dontbesilent2025/dbskill` 的 GitHub README，并只展示 README 中可解析到的信息。
- 移除 Hot Skills 中手写的推荐话术、旧版本号和旧 skill 数量，避免 README 已更新但 CLI 仍显示过期内容。
- `hotskills --json` 现在包含 README 来源、README 标注版本、README 简介、更新说明、安装命令和工具箱表格解析结果。
- GitHub Release 安装脚本默认版本更新为 `v0.5.5`。

### 验证

- 已验证 npm registry 的 `codesome-cli` latest 为 `0.5.5`。
- 已验证 `test:hotskills-upstream` 能从 dbskill README 解析到 `v2.8.0` 和 17 个 skills。
- 已验证源码入口 `codesome version` 显示 `0.5.5`，`codesome hotskills --json` 使用 `github-readme` 来源。

### 已知边界

- 本次没有做 Windows / macOS / Linux 的手工安装回归。
- 本次 GitHub Release 二进制只做自动构建和命令冒烟，不代表所有平台真机已手工测试。

## v0.5.4 - 2026-05-06

### 修复

- 修复 `codesome hotskills` 默认文案：删除“窄屏友好”和“默认不自动安装”的说明句，推荐项标题不再展示“商业诊断工具箱”。
- `codesome hotskills` 末尾改为询问是否安装，并给出一次确认安装命令：`codesome hotskills install dbskill --confirm`。
- 修复 npm 安装修复脚本默认版本策略：`repair-npm-install.ps1` 和 `repair-npm-install.sh` 默认安装 `codesome-cli@latest`，避免后续发新版后 raw 修复脚本继续把用户装回旧版本。只有显式设置 `CODESOME_REPAIR_VERSION` 时才安装固定版本。

### 验证

- 已验证 npm registry 的 `codesome-cli` latest 为 `0.5.4`。
- 已同步修复脚本审计用例，防止默认安装版本再次落后。让修复脚本装旧版这种事，就像请保洁把灰尘扫回屋里，已经加门槛拦住。

## v0.5.3 - 2026-05-05

### 修复

- 正式发布分页修复：`codesome key list`、`codesome usage recent` 会正确传递分页参数，`codesome usage key` 会扫描 `/usage` 分页后按 `api_key_id` 本地聚合，避免大用量 Key 被截断。
- 新增老用户 npm 安装修复脚本：处理旧 npm 包名和旧 GitHub Release 安装脚本留下的命令入口，避免安装新版 npm 包后仍执行旧版 `codesome`。

### 安装

- 新用户推荐直接使用 `npm install -g codesome-cli`。
- 老用户如果遇到旧版本抢占 PATH，推荐运行 `scripts/repair-npm-install.sh` 或 `scripts/repair-npm-install.ps1`。修复脚本只备份/移除旧命令入口，不删除 Codesome 登录态、账号凭据、配置或浏览器数据。
- GitHub Release 安装脚本默认版本更新为 `v0.5.3`。

### 验证

- 新增 `npm run test:repair-scripts`，静态验证修复脚本会卸载历史包名、备份旧入口、安装 `codesome-cli@0.5.3`，且不会删除整个 Codesome home。
- `npm run prepublishOnly` 已纳入修复脚本审计。
- 继承 `v0.5.3-rc.3` 的 Windows npm 安装测试和远程 `Test` Linux amd64 真实账号分页验证结果。

## v0.5.3-rc.3 - 2026-05-05

### 变更

- README 前置测试版安装命令调整为 `npm install -g codesome-cli@0.5.3-rc.3`；官方 registry 参数只作为镜像/私服排查时的可选兜底。
- GitHub Release、源码包版本号和 CLI `version` 输出统一到 `0.5.3-rc.3`。

### 验证

- `codesome-cli@0.5.3-rc.3` 已发布到 npm registry，并完成 registry 全局安装验证。
- 继承 `v0.5.3-rc.1` 分页修复验证结果：Windows npm 安装测试通过，远程 `Test` Linux amd64 真实账号验证通过。

### 已知边界

- 这是 prerelease，不更新 GitHub 当前稳定版 `v0.5.2`。
- 无前缀 npm 包名当前用于 rc 测试，README 推荐显式安装 `codesome-cli@0.5.3-rc.3`。

## v0.5.3-rc.2 - 2026-05-05

### 变更

- NPM 源码包名从临时 scoped package 切换为公开无前缀包名 `codesome-cli`。
- README 前置测试版安装命令调整为 `npm install -g codesome-cli@0.5.3-rc.2 --registry=https://registry.npmjs.org`。

### 验证

- `npm view codesome-cli` 在发布前返回 404，未发现公开 registry 中已有同名包记录。
- `codesome-cli@0.5.3-rc.2` 已发布到 npm registry，并完成 registry 全局安装验证。
- 继承 `v0.5.3-rc.1` 分页修复验证结果：Windows npm 安装测试通过，远程 `Test` Linux amd64 真实账号验证通过。

### 已知边界

- 这是 prerelease，不更新 GitHub 当前稳定版 `v0.5.2`。
- 这是无前缀包名的首个 npm 版本，npm registry 同时保留了 `latest` 和 `rc` dist-tag 指向 `0.5.3-rc.2`；README 仍推荐显式安装 `codesome-cli@0.5.3-rc.2`。

## v0.5.3-rc.1 - 2026-05-05

### 修复

- 修复 `codesome key list` 未传递 `--page` 和 `--page-size` 的问题；`--limit` 仍作为 `--page-size` 的兼容别名。
- 修复 `codesome usage recent` 未传递 `--page` 的问题。
- 修复 `codesome usage key` 依赖后端单 Key 过滤导致大用量 Key 可能被截断的问题；现在会扫描 `/usage` 全量分页后按 `api_key_id` 本地聚合。
- `codesome key show --name` 增加 `--group-id`，用于同名 Key 分属不同分组时消歧。

### 文档

- README 前置 npm 测试版安装说明，明确 rc 版本可以通过 GitHub Release 附带的 `.tgz` 源码包用 npm 安装。

### 验证

- 新增 `npm run test:pagination-usage`，覆盖 Key 分页、recent 分页、Key 用量全量扫描聚合和同名 Key 消歧。
- Windows npm 安装测试已通过。
- 远程 `Test` Linux amd64 真实账号验证通过：登录校验、Key 分页、recent 分页、`usage key --scan-page-size` 和同名 Key `--group-id` 查询。

### 已知边界

- 这是 prerelease，不更新当前稳定版 `v0.5.2` 或 `latest`。
- `usage key` 为避免截断会扫描范围内全量用量记录；大时间范围下耗时会比旧实现更长。

## v0.5.2 - 2026-05-04

### 新增

- 新增 Claude Code plugin marketplace 结构，支持通过 `claude plugin marketplace add hicodesome/codesome-skill` 后安装 `codesome@codesome-skills`。
- README 增加通用 `npx skills add`、`npx skills update`、Claude Code plugin marketplace 和 NPM 源码包安装说明。

### 修复

- GitHub Release 预编译二进制现在同时产出并安装独立 `codesome-hotskills` 入口，覆盖 Windows amd64、Linux amd64、Linux arm64、macOS Intel 和 macOS Apple Silicon。
- 安装脚本现在会下载 `codesome` 和 `codesome-hotskills` 两个二进制，并在独立 hotskills 二进制可用时验证 `codesome version` 与 `codesome-hotskills --help`。
- Windows `install.ps1` 会把 `~\.codesome\bin` 移到用户 PATH 前面，并检测 `codesome` / `codesome-hotskills` 是否被旧 npm、pnpm 或其他 shim 抢先解析。
- `@codesome/cli` NPM 源码包 runtime engine 从 Node.js `>=20` 调整为 `>=18`，与当前 esbuild/pkg 构建目标和 Linux Node 18 实测结果一致。

### 验证

- 发布前已按 SOP 覆盖 Windows PowerShell、本机 release build、NPM `.tgz` 包审计、公开安全扫描和 Windows amd64 二进制冒烟；`v0.5.2-rc.2` 已在 `debian-1` Linux amd64 完成远程回归。
- macOS 真机和 Linux arm64 真机仍未覆盖；本版本只声明这些平台的交叉构建资产已产出并通过资产清单校验。

## v0.5.2-rc.2 - 2026-05-03

### 新增

- 新增 Claude Code plugin marketplace 结构：`.claude-plugin/marketplace.json`、`plugins/codesome/.claude-plugin/plugin.json` 和 `plugins/codesome/skills/codesome/SKILL.md`，支持 `claude plugin marketplace add hicodesome/codesome-skill` 后安装 `codesome@codesome-skills`。
- README 增加通用 `npx skills add hicodesome/codesome-skill --skill codesome -g -y` 安装方式、`npx skills update codesome -g` 更新方式，以及 Claude Code plugin marketplace 安装/更新命令。

### 修复

- GitHub Release 预编译二进制现在同时产出并安装独立 `codesome-hotskills` 入口：Windows amd64、Linux amd64、Linux arm64、macOS Intel、macOS Apple Silicon 均包含对应资产。
- 安装脚本现在会下载 `codesome` 和 `codesome-hotskills` 两个二进制，并在独立 hotskills 二进制可用时验证 `codesome version` 与 `codesome-hotskills --help`；旧 release 缺少独立 hotskills 资产时会提示并继续安装主 CLI。
- Windows `install.ps1` 会把 `~\.codesome\bin` 移到用户 PATH 前面，并检测 `codesome` / `codesome-hotskills` 是否被旧 npm/pnpm shim 抢先解析；如仍有冲突，会打印可直接运行的安装路径和所有候选命令来源。
- `@codesome/cli` NPM 源码包 runtime engine 从 Node.js `>=20` 调整为 `>=18`，与当前 esbuild/pkg 构建目标和 Linux Node 18 实测结果一致，避免 Node 18 用户安装 `.tgz` 时出现误导性 `EBADENGINE` 警告。

### 验证重点

- 补测 Windows amd64 二进制和安装脚本。
- 补测 Windows 本机旧 npm wrapper 抢先解析时，安装脚本可修正新终端 PATH 顺序，并在当前安装会话中验证命令解析。
- 补测真实 Sub2API 自托管实例登录和只读业务命令。
- 明确记录 macOS 真机和 Linux arm64 真机仍未覆盖，不把交叉构建成功误写成真实平台验证通过。

## v0.5.2-rc.1 - 2026-05-03

### 新增

- 新增 GitHub 预发布候选包，用于验证 `@codesome/cli` NPM 源码分发和 GitHub Release 二进制安装链路。
- NPM 源码包继续使用 public scoped package、`Apache-2.0`、`files` 白名单和 tarball 审计。本次 GitHub prerelease 会附带 `.tgz` 包供测试，不更新 npm registry。

### 验证重点

- 验证 GitHub Release 指定版本安装，以及从 release `.tgz` 资产本地安装 `@codesome/cli`。
- 验证 `codesome version` 输出 `codesome 0.5.2-rc.1`。
- 验证 `auth logout --help` 无副作用、`usage recent --json` 递归脱敏、Unix 入口 LF 换行检查和公开安全扫描。

### 已知边界

- 这是 prerelease，不会更新稳定版 `latest`。
- NPM Trusted Publishing workflow 需要带 `workflow` scope 的 GitHub 凭据，未包含在本次预发布提交中。
- macOS 二进制仍为交叉构建产物，尚未在 macOS 真机运行验证。
- Linux arm64 二进制仍未在 Linux arm64 真机运行验证。

## v0.5.1 - 2026-05-03

### 新增

- 新增 NPM 源码包发布准备：`@codesome/cli` 移除 private 限制，声明 `Apache-2.0`，补齐 package metadata、`files` 白名单和 public provenance 发布配置。
- 新增 NPM tarball 审计脚本 `npm run test:npm-pack`，发布前检查必需文件和禁止发布的私有 docs、session、token 扫描产物、构建产物、图片和平台二进制。
- NPM Trusted Publishing workflow 需要带 `workflow` scope 的 GitHub 凭据另行提交；本轮先完成 package metadata、tarball 审计和 GitHub prerelease 测试包。

### 修复

- 修复 Linux/macOS 安装链路中的 CRLF 换行风险：`install.sh` 现在必须保持 LF，避免 bash 报 `pipefail\r` 或函数定义语法错误。
- 修复 Unix 直接执行 `bin/codesome.js` / `bin/codesome-hotskills.js` 时的 shebang 换行风险，避免 `/usr/bin/env: node\r`。
- macOS 安装脚本会在下载 CLI 后自动尝试移除 quarantine 并执行 ad-hoc codesign，降低首次运行被未签名二进制拦截的概率。
- 修复 `codesome usage recent --json` 可能原样输出嵌套 `api_key.key` 的问题，现在 JSON 输出层会递归脱敏完整 API Key。
- 修复 `codesome auth logout --help` 会实际执行登出并删除本地凭证的问题，现在 `--help` 只显示帮助。

### 验证

- 新增 `npm run test:unix-entry`，并将其串入 `npm run test:smoke`。
- 新增 `npm run test:json-safety`，覆盖递归 JSON API Key 脱敏。
- `npm run test:auth-http` 新增 `auth logout --help` 无副作用回归。
- 新增 `.gitattributes`，固定 `*.sh` 和 `bin/*.js` 为 LF。
- `v0.5.1-rc.2` 已在 2026-05-03 Linux/WSL 联网回归通过：`auth logout --help` 无副作用、`usage recent --json` 未输出完整 `sk-...` API Key，核心读操作和安全预检正常。

### 已知边界

- macOS 二进制仍为交叉构建产物，尚未在 macOS 真机运行验证。
- Linux arm64 二进制仍未在 Linux arm64 真机运行验证。
- 浏览器兜底运行时需要按需执行 `codesome browser install`；默认 HTTP 登录路径不依赖浏览器运行时。

## v0.5.0 - 2026-04-29

### 新增

- 新增 `codesome instance` 命令，可在本机登记、查看、切换和删除 Sub2API 兼容自部署实例。
- `auth login/status/logout` 新增 `--instance <name>`，可以在自定义实例上完成登录、远程校验和登出。
- 余额、Key、分组、用量、订阅和兑换相关命令支持 `--instance <name>`，可直接操作已登记实例。
- 浏览器兜底登录会打开对应实例的 `/login`，并使用实例级隔离的 browser profile。

### 改进

- `instance add` 可以直接接收控制台页面链接，例如 `/dashboard`，CLI 会保存为站点根地址。
- 自定义实例采用本机信任登记，不需要平台审核或官方白名单。
- 默认 Codesome 实例继续兼容旧账号目录；自定义实例使用 `~/.codesome/instances/<instance-id>/accounts/<alias>/` 独立保存凭据和登录态。
- 带密码、token 或 refresh token 的请求会被限制在默认官方地址或已登记实例，降低凭据被临时 URL 劫持的风险。

### 验证

- Mock 覆盖实例登记、离线 HTTPS 地址登记、未登记 URL 阻断、自定义实例登录、远程校验、业务命令 `--instance`、实例级凭据隔离和登出保护。
- 真实自部署实例只读验证通过：登录状态远程校验、浏览器入口、余额、分组、Key、用量和订阅命令均命中自定义实例。
- 公开安全扫描 blocker 为 0。
- Windows 预编译包通过 `codesome version` 冒烟验证。

### 已知边界

- 自定义实例仅声明支持 Sub2API 兼容部署；严重魔改的站点可能需要额外适配。
- `config` 和 `doctor` 命令仍未实现。
- macOS 二进制仍为交叉构建产物，尚未在 macOS 真机运行验证。
- Linux arm64 二进制仍未在 Linux arm64 真机运行验证。

## v0.4.1 - 2026-04-29

### 新增

- 新增 `codesome hotskills`，用窄屏友好的文本卡片展示 Codesome 推荐的优秀 Agent Skills。
- 新增 `codesome hotskills info dbskill`，展示 `dbskill` 的适合场景、核心子 skill、来源和许可证。
- 新增 `codesome hotskills install dbskill` 安装预检；追加 `--confirm` 后才会调用底层 `skills` CLI 安装。
- 新增独立入口 `codesome-hotskills`，方便只需要推荐导航的 Agent 或脚本调用。

### 改进

- `dbskill` 安装默认使用全局用户目录，方便 Codex、Claude Code、OpenCode 等不同 Agent 客户端复用。
- 安装入口只允许内置白名单推荐项，不接受任意仓库代装。
- Windows 下安装调用改为兼容 `npx.cmd`，避免 PowerShell `.ps1` 执行策略拦截。

### 验证

- 私有源仓库通过 `test:auth-http`、`test:redeem`、`test:key-config`、`test:multi-account`、`test:smoke` 和 `scan:public-safety`。
- `codesome hotskills`、`info dbskill`、`--json`、独立 `codesome-hotskills` 入口和安装预检均已验证。
- 本机已实测 `dbskill` 全局安装，安装后包含 13 个 `dbs*` skills。

### 已知边界

- 真实安装会让底层 `skills` CLI 写入多个已识别 Agent 客户端的用户级目录，执行前应先看预检输出。
- macOS 二进制仍为交叉构建产物，尚未在 macOS 真机运行验证。
- Linux arm64 二进制仍未在 Linux arm64 真机运行验证。

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
