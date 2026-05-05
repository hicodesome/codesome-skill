# Codesome Skill

Codesome Skill 是一款 x2agent 解决方案，主要围绕任意 Agent tools 提供自助 token 服务，比如你可以让你的龙虾自动通过 Codesome Skill 使用你的 token。

这将任何 Agent 对 token 的使用消费推向下一个时代：一种“自助餐”模式。

Codesome Skill 安装后，你可以直接让 Agent 帮你完成在 codesome.ai 或者其他基于 Sub2API 的 Token API 站点进行余额查询、订阅查询、用量查询、兑换码充值、API Key 管理和分组切换等操作，不需要自己在网页后台来回找入口。

Codesome Skill 针对 Sub2API 项目的适配兼容已获得作者许可。Sub2API 传送门：https://github.com/Wei-Shaw/sub2api

## 安装 Codesome CLI

如果你已经安装 Node.js 18+，新用户优先使用 npm 安装：

```bash
npm install -g codesome-cli
codesome version
codesome auth status
```

如果你以前安装过旧版，或者安装后 `codesome version` 显示的不是当前版本，可以直接使用修复脚本重新安装。脚本会处理历史安装残留，不会删除 Codesome 登录态、账号凭据、配置或浏览器数据。

macOS / Linux / WSL：

```bash
curl -fsSL https://raw.githubusercontent.com/hicodesome/codesome-skill/main/scripts/repair-npm-install.sh | bash
codesome version
codesome auth status
```

Windows PowerShell：

```powershell
iwr https://raw.githubusercontent.com/hicodesome/codesome-skill/main/scripts/repair-npm-install.ps1 -UseB | iex
codesome version
codesome auth status
```

## 给 Agent 看的

把下面这段提示词发给你的 Agent，它会按你的系统自动安装：

```text
请帮我安装并配置 Codesome Skill：https://github.com/hicodesome/codesome-skill

请按当前系统安装本地 codesome CLI，并把 Codesome Skill 安装到常见 Agent 客户端的用户级技能目录。

如果这是新机器，优先使用：

npm install -g codesome-cli

如果机器上以前装过旧版 Codesome CLI，或安装后 codesome version 不是预期版本，请先运行修复脚本：

macOS / Linux / WSL:
curl -fsSL https://raw.githubusercontent.com/hicodesome/codesome-skill/main/scripts/repair-npm-install.sh | bash

Windows PowerShell:
iwr https://raw.githubusercontent.com/hicodesome/codesome-skill/main/scripts/repair-npm-install.ps1 -UseB | iex

安装后请验证：
1. codesome version
2. codesome auth status
3. 如果未登录，执行 codesome auth login
4. 登录后执行 codesome balance show 验证可用

安全要求：不要输出 Cookie、Token、Session 或完整 API Key。
```

## 手动安装 Skill

如果你只想把 Codesome Skill 安装到 Agent 客户端，可以使用通用 Skills 安装方式：

```bash
npx skills add hicodesome/codesome-skill --skill codesome -g -y
```

更新 Codesome Skill：

```bash
npx skills update codesome -g
```

Claude Code 用户也可以通过插件市场安装：

```bash
claude plugin marketplace add hicodesome/codesome-skill
claude plugin install codesome@codesome-skills
```

Claude Code 插件市场安装的用户更新方式：

```bash
claude plugin marketplace update codesome-skills
claude plugin update codesome@codesome-skills
/reload-plugins
```

说明：Agent Skill / Claude plugin 负责让 Agent 识别 Codesome 工作流；本地 `codesome` CLI 仍需要按上面的方式安装。

## 常用功能

- 查看 Codesome 账户余额和订阅状态。
- 查看近期用量和指定 API Key 的用量。
- 创建、更新、启用、禁用、删除 API Key。
- 兑换 Codesome 充值码。
- 查看 Codesome 推荐的 Agent Skills，并安装白名单推荐项。
- 连接兼容 Sub2API 的自部署站点。

常用命令：

```bash
codesome auth login
codesome auth status
codesome balance show
codesome subscription active
codesome usage stats
codesome key list
codesome redeem apply --code "<code>"
codesome hotskills
```

写操作默认先做预检，展示原值和目标值；追加 `--confirm` 才会写入。兑换码默认也只做预检，确认兑换时再追加 `--confirm`。

## 自部署 Sub2API 实例

除了默认 Codesome 实例，也可以把兼容 Sub2API 的 HTTPS 站点登记为本机实例：

```bash
codesome instance add my-sub2api --base-url https://api.example.com
codesome auth login --instance my-sub2api
codesome balance show --instance my-sub2api
```

`instance add` 是本机信任登记，不是平台审核或官方白名单。登录凭证会按实例隔离保存。

## 登录

```bash
codesome auth login
```

如果遇到验证码、二次验证、风控，或你明确想用网页登录，可以使用浏览器兜底：

```bash
codesome auth login --browser
```

## 使用反馈

欢迎进群交流使用反馈和答疑：

![codesome 使用反馈和答疑群](images/codesome-support-group.png)

## 安全说明

Codesome CLI 不会输出 Cookie、Token、Session 或完整 API Key。涉及账号凭据的请求只会发送到默认官方地址或你已登记的自部署实例。

Codesome Skill 针对 Sub2API 项目的适配兼容已获得作者许可。Sub2API 项目地址：https://github.com/Wei-Shaw/sub2api
