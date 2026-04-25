# Codesome CLI / Skill 阶段验收报告

验收日期：2026-04-25

## 一句话结论

当前版本已经可以作为第一阶段验收版本：用户安装本地 `codesome` CLI 后，可以通过普通用户自己的 Codesome 登录态完成登录、余额查询、订阅/用量查询、API Key 查询/创建/改名/切换分组，以及按 Key 名称查询用量。

## 已发布内容

公开仓库：

- Gitee：`https://gitee.com/bashi01/codesome-skill`

公开仓库包含：

- `SKILL.md`：Agent 调用规则和安全边界。
- `install.ps1`：Windows 一键安装脚本。
- `install.sh`：Linux / WSL / macOS 类 Unix 一键安装脚本。
- `references/`：公开参考文档。

闭源 CLI 通过 Gitee Release `latest` 分发：

- `codesome-windows-amd64.exe`
- `codesome-linux-amd64`
- `checksums.txt`

## 已验收环境

| 环境 | 状态 | 说明 |
| --- | --- | --- |
| Windows 原生 PowerShell | 已通过 | 已安装到 `~/.codesome/bin/codesome.exe` 并完成真实查询 |
| WSL / Linux amd64 | 已通过 | Linux 二进制可执行；复制登录态后可查询 |
| macOS | 暂未实机测试 | 当前按 Linux 类 Unix 处理，后续有机器再补测 |

## 已验收功能

### 1. 安装与版本

已验收命令：

```bash
codesome version
```

验收结果：

- Windows 安装脚本可从 Gitee Release 下载并安装 CLI。
- Linux / WSL 安装脚本可从 Gitee Release 下载并安装 CLI。
- Windows / Linux 二进制均可启动。

### 2. 登录态管理

已验收命令：

```bash
codesome auth login
codesome auth status
```

验收结果：

- Windows 发行版支持系统 Chrome / Edge 登录。
- 用户在浏览器完成登录后，CLI 自动保存登录态，不需要按 Enter。
- 已修复旧逻辑误把 Stripe Cookie 当成登录成功的问题。
- 当前逻辑必须检测到 Codesome `auth_token` 才保存登录态。

安全结果：

- 不读取用户密码。
- 不打印 Cookie、Token、Session。

### 3. 余额查询

已验收命令：

```bash
codesome balance show
```

验收结果：

- 可查询账户余额。
- 可查询累计充值。
- 可展示今日/累计请求和消耗概览。
- 账号信息已脱敏。

### 4. 订阅 / 月卡查询

已验收命令：

```bash
codesome subscription active
codesome subscription list
```

验收结果：

- 可查询当前订阅 / 月卡相关信息。
- 可作为后续月卡额度和分组诊断基础。

### 5. 全局用量查询

已验收命令：

```bash
codesome usage stats --days 30
codesome usage recent --days 30 --limit 10
```

验收结果：

- 可查询指定时间范围内的总请求数、Token、实际消费、标准消费。
- 可查询最近用量记录。

### 6. API Key 列表查询

已验收命令：

```bash
codesome key list
codesome key list --search claw
```

验收结果：

- 可查询 API Key 列表。
- 支持按名称搜索。
- 输出默认脱敏，例如 `sk-****7cb2`。
- 不输出完整 API Key。

### 7. API Key 创建

已验收命令：

```bash
codesome key create --name <name> --group codex --save-to <local-file>
```

验收结果：

- 可创建新 API Key。
- 可指定分组。
- 完整 Key 保存到本地文件。
- 终端只输出脱敏 Key。

已真实创建并验证过的测试 Key 示例：

- `codesome-cli-test-20260425-191433`
- `codex-cli-20260425-212142`

### 8. API Key 改名

已验收命令：

```bash
codesome key update --name <old-name> --new-name <new-name>
```

验收结果：

- 可修改 Key 名称。
- 修改后可通过 `key list` 验证。

### 9. API Key 切换分组

已验收命令：

```bash
codesome key switch-group --name <key-name> --group <target-group> --confirm
```

验收结果：

- 可将 Key 从 `codex` 切到其他分组。
- 可将 Key 切换到月卡/订阅分组。
- 已验证示例：`codex-cli-20260425-212142` 切换到 `60 美金｜559`。
- 切换后可通过 `key list` 验证当前分组。

安全规则：

- 切换分组属于可能影响费用和模型可用性的操作，Agent 层需要先向用户确认。

### 10. 按 API Key 名称查询用量

已验收命令：

```bash
codesome usage key --name "codesome-claw" --days 30
codesome usage key --name "codesome-claw" --start-date 2026-04-01 --end-date 2026-04-25
```

验收结果：

- 可按 Key 名称定位唯一 Key。
- 可按 `api_key_id` 聚合该 Key 的用量。
- 默认展示本月和近 N 天两段统计。
- 输出请求数、Token、实际消费、标准消费、模型分布、分组分布、最近记录。
- JSON 输出和文本输出都不泄露完整 Key。

真实验收样例：`codesome-claw`

| 指标 | 本月 / 近 30 天 |
| --- | --- |
| 请求数 | 176 |
| 总 Token | 20,791,610 |
| 输入 Token | 4,504,724 |
| 输出 Token | 81,116 |
| 缓存 Token | 16,205,770 |
| 实际消费 | $73.5800 |
| 标准消费 | $49.0533 |
| 模型 | claude-sonnet-4-6 x176 |
| 分组 | pro-cc x176 |

## 安全验收

已验证：

- API Key 默认脱敏。
- 创建 Key 后完整 Key 保存本地文件，不在聊天中展示。
- `usage key --json` 已做完整 Key 泄漏检查，泄漏数为 0。
- 登录态保存必须包含 `auth_token`。
- 不打印 Cookie、Token、Authorization header、Session storage。

## 已知限制

当前还未验收或未完成：

- `key delete` 删除 Key。
- `key update --status active|inactive` 启用/禁用 Key。
- Key 备注、过期时间、额度、速率限制、IP 白名单/黑名单的完整创建/编辑回归。
- 按天聚合 Key 用量。
- Codex / Claude Code 自动配置。
- Doctor 诊断命令。
- Linux 原生 GUI 登录流程。
- macOS 真实机器测试。

## 下一阶段建议

1. 完成 `key delete` 的保守删除流程。
2. 完成 Key 启用/禁用测试。
3. 完成 Key 高级参数测试：额度、过期、速率限制、IP 黑白名单。
4. 增加 `usage key --daily`，支持按天看某个 Key 的异常消耗。
5. 开始实现 `config codex` / `config claude-code`。
6. 开始实现 `doctor codex` / `doctor claude-code`。
