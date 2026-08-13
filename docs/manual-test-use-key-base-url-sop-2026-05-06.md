# 使用密钥 Base URL 读取专项人工测试 SOP

日期：2026-05-06

目标：专项验证 `codesome key use` 能稳定读取 `https://v3.codesome.cn/keys` 页面“使用密钥”弹窗里的 Base URL，并且兼容 sub2api 的公开配置读取方式。

本 SOP 只测试这个功能，不覆盖余额、兑换、Hot Skills、自动同步、跨平台通用安装等普通功能。

## 测试范围

必须确认：

- CLI 输出的 `Base URL` 与网页“使用密钥”弹窗展示的 Base URL 完全一致。
- CLI 不再依赖页面结构或模型猜测中转站地址。
- CLI 能读取 API Key、Base URL、分组、平台、状态等关键字段。
- `--json` 输出能说明 Base URL 来自 `GET /api/v1/settings/public` 的 `api_base_url`。
- 输出中不能出现完整 API Key、Cookie、Token、Authorization 或完整 session 内容。

不测试：

- 余额查询、充值、兑换码、订阅同步。
- Hot Skills 展示和安装。
- npm 自动更新长期行为。
- macOS / Linux 多平台完整回归。

## 当前开发自测状态

开发侧已完成：

- npm 公开 beta 已发布，当前 `beta` tag 为 `codesome-cli@0.5.6-beta.4`。
- 已在远程 Windows 机器安装 `codesome-cli@beta`。
- 远程 Windows 验证命令：

```powershell
npm install -g codesome-cli@beta
codesome version
codesome key --help
```

开发侧观察结果：

- `codesome version` 输出 `codesome 0.5.6-beta.4`。
- `codesome key --help` 中包含 `codesome key use [--account <alias>] --name <name> [--json]`。

未由开发侧完成：

- 未在真实账号上读取真实 Key。
- 未人工打开网页弹窗核对真实 Base URL。
- 未验证你的账号下分组、平台、状态是否与网页完全一致。

这些内容必须由人工专项测试完成。

## 测试前准备

测试环境：

- Windows PowerShell。
- Node.js 和 npm 可用。
- 已安装公开 beta 包。
- 已登录 Codesome CLI 账号。
- 账号下至少有一个 API Key。
- 能打开网页 `https://v3.codesome.cn/keys`。

安装或更新 beta：

```powershell
npm install -g codesome-cli@beta
codesome version
codesome key --help
```

期望：

- `codesome version` 显示 `codesome 0.5.6-beta.4` 或更新的 beta 版本。
- `codesome key --help` 显示 `codesome key use`。

如果没有登录：

```powershell
codesome auth status
codesome auth login
```

登录只作为前置条件，不作为本次专项验收内容。

## 专项测试步骤

### 1. 选择待测 Key

在 PowerShell 运行：

```powershell
codesome key list
```

记录一个待测 Key 的名称，只记录名称，不记录完整 API Key。

如果有多个同名 Key，优先选一个名称唯一的 Key。若必须测同名 Key，需要在结果备注中写明。

### 2. 获取网页基准值

打开：

```text
https://v3.codesome.cn/keys
```

在页面中找到同一个 Key，点击“使用密钥”。

在弹窗中人工记录：

- Base URL。
- 分组。
- 平台。
- 状态。

不要记录或粘贴完整 API Key。

### 3. 运行普通输出测试

在 PowerShell 运行：

```powershell
codesome key use --name "<key-name>"
```

将 `<key-name>` 替换为第 1 步记录的 Key 名称。

核对：

- CLI 的 `Base URL` 必须与网页弹窗 Base URL 完全一致。
- CLI 的分组、平台、状态应与网页一致。
- API Key 必须脱敏显示。
- 不应出现 Cookie、Token、Authorization 或完整 session 内容。

### 4. 运行 JSON 输出测试

在 PowerShell 运行：

```powershell
codesome key use --name "<key-name>" --json
```

核对：

- `use_key.base_url` 或 `use_key.api_base_url` 必须与网页弹窗 Base URL 完全一致。
- `use_key.source.public_settings` 应显示 `GET /api/v1/settings/public`。
- 分组、平台、状态字段应与网页一致。
- JSON 中不能出现完整 API Key、Cookie、Token、Authorization 或完整 session 内容。

## 通过标准

本专项测试全部通过需要同时满足：

- 网页弹窗 Base URL 与 CLI 普通输出 Base URL 完全一致。
- 网页弹窗 Base URL 与 CLI JSON 输出 Base URL 完全一致。
- Base URL 不是后台接口地址，也不是模型猜测出来的地址。
- JSON 明确体现公开配置来源为 `GET /api/v1/settings/public`。
- Key、分组、平台、状态读取正确。
- 敏感信息全部脱敏。

## 失败处理

如果 Base URL 不一致，记录：

- 网页弹窗 Base URL。
- CLI 普通输出 Base URL。
- CLI JSON 输出中的 Base URL。
- `codesome version` 输出。
- Key 名称。

不要粘贴完整 API Key、Cookie、Token、Authorization 或完整 session 内容。

如果 CLI 报未登录，先运行：

```powershell
codesome auth status
```

确认是否需要重新登录。登录流程本身不计入本专项通过或失败。

## 结果记录模板

| 日期 | Windows 版本 | codesome 版本 | Key 名称 | 网页 Base URL | CLI Base URL | JSON public_settings 来源 | 分组/平台/状态一致 | 敏感信息脱敏 | 结论 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-05-06 |  |  |  |  |  |  |  |  | 待测 |  |

结论填写：

- `通过`：满足全部通过标准。
- `失败`：Base URL、分组、平台、状态或脱敏任一项不符合。
- `阻塞`：无法登录、无法打开网页、账号无 Key、网络不可用等环境原因导致无法完成。
