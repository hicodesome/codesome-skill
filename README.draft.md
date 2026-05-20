# Codesome Skill

> 让 Agent 自助使用你的 Token：在任意 Agent 客户端里直接查余额、查订阅、管 Key、兑换码、切换分组——不用再回网页后台。

[![npm](https://img.shields.io/npm/v/codesome-cli.svg?label=codesome-cli)](https://www.npmjs.com/package/codesome-cli)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen.svg)](https://nodejs.org)
[![Platforms](https://img.shields.io/badge/platforms-macOS%20%7C%20Linux%20%7C%20Windows%20%7C%20WSL-lightgrey.svg)](#安装-codesome-cli)

Codesome Skill 是一款 **x2agent** 解决方案，围绕任意 Agent tools 提供自助 Token 服务。装好之后，让你的龙虾、Claude Code、Codex 这类 Agent 直接通过 Codesome Skill 调用你的 Token，把 Agent 对 Token 的消费推向"自助餐"模式。

支持默认的 [codesome.ai](https://codesome.ai) 实例，以及任意基于 [Sub2API](https://github.com/Wei-Shaw/sub2api) 的自部署站点（已获 Sub2API 作者许可适配）。

---

## 工作方式

```
        你 / Agent                Codesome Skill                 codesome CLI
   ┌──────────────────┐     ┌────────────────────────┐     ┌────────────────────┐
   │ "查我余额"        │ ──▶ │ 识别意图 → 选 CLI 命令  │ ──▶ │ codesome balance   │
   │ "新建一个 Key"    │     │ 写操作前先做预检确认    │     │ codesome key …     │
   │ "兑换这个码"      │ ◀── │ 输出脱敏摘要给 Agent    │ ◀── │ HTTPS → Sub2API    │
   └──────────────────┘     └────────────────────────┘     └────────────────────┘
                                                            ↑                ↑
                                                    codesome.ai       你的自部署站点
```

Skill 只负责命令路由和安全边界；账号凭据、加密存储、HTTPS 请求都由本机 `codesome` CLI 处理，凭据不进对话。

---

## 功能特性

| 场景 | 命令 | 说明 |
| --- | --- | --- |
| 余额 / 订阅 | `codesome balance show` · `codesome subscription active` | 查看账户余额、订阅有效期 |
| 用量 | `codesome usage stats` · `codesome usage key …` | 近期用量、指定 Key 的用量 |
| API Key | `codesome key list` · `codesome key create / update / delete` | 创建、改名、启停、删除 |
| 兑换 | `codesome redeem apply --code <code>` | 充值码兑换，默认预检 |
| 分组 | `codesome group switch …` | 切换 Key 分组 |
| 推荐 Skills | `codesome hotskills` | 查看 Codesome 推荐的 Agent Skill 白名单 |
| 自部署 | `codesome instance add …` | 登记任意 Sub2API 兼容站点 |

写操作默认先做预检，展示 *原值 → 目标值*；追加 `--confirm` 才会真正写入。兑换码同样默认预检。

---

## 快速开始

需要 Node.js 18+。

```bash
npm install -g codesome-cli
codesome version
codesome auth login
codesome balance show
```

跑通这四行就能用了。下面是完整安装、修复和 Skill 安装流程。

---

## 安装 Codesome CLI

如果你已经装了 Node.js 18+，新用户优先 npm：

```bash
npm install -g codesome-cli
codesome version
codesome auth status
```

如果以前装过旧版，或者安装后 `codesome version` 显示的不是当前版本，直接跑修复脚本。脚本会处理历史安装残留，默认安装 npm registry 上的 `codesome-cli@latest`，**不会**删除你的登录态、账号凭据、配置或浏览器数据。

**macOS / Linux / WSL**：

```bash
curl -fsSL https://raw.githubusercontent.com/hicodesome/codesome-skill/main/scripts/repair-npm-install.sh | bash
codesome version
codesome auth status
```

**Windows PowerShell**：

```powershell
iwr https://raw.githubusercontent.com/hicodesome/codesome-skill/main/scripts/repair-npm-install.ps1 -UseB | iex
codesome version
codesome auth status
```

如需回滚或验证固定版本，先设置 `CODESOME_REPAIR_VERSION`；不设置时永远跟随 npm latest。

---

## 让 Agent 自动安装

把这段直接发给你的 Agent，它会按当前系统自助完成安装：

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

---

## 安装为 Agent Skill

把 Codesome Skill 装进 Agent 客户端的用户级技能目录：

```bash
npx skills add hicodesome/codesome-skill --skill codesome -g -y
```

更新：

```bash
npx skills update codesome -g
```

**Claude Code 用户**也可以通过插件市场安装：

```bash
claude plugin marketplace add hicodesome/codesome-skill
claude plugin install codesome@codesome-skills
```

更新：

```bash
claude plugin marketplace update codesome-skills
claude plugin update codesome@codesome-skills
/reload-plugins
```

> Skill / plugin 让 Agent 识别 Codesome 工作流；本地 `codesome` CLI 仍需要按上面的方式单独安装。

---

## 常用命令

```bash
codesome auth login                       # 账号密码登录（HTTP，凭据本机加密保存）
codesome auth status                      # 查看当前登录状态
codesome balance show                     # 查余额
codesome subscription active              # 查订阅
codesome usage stats                      # 查近期用量
codesome key list                         # 查 API Key
codesome redeem apply --code "<code>"     # 兑换充值码（默认预检）
codesome hotskills                        # 看 Codesome 推荐的 Agent Skills
```

写操作默认预检，加 `--confirm` 才生效。所有查询命令支持 `--json` 给 Agent 解析。

---

## 自部署 Sub2API 实例

除了默认 Codesome 实例，也可以把任意兼容 [Sub2API](https://github.com/Wei-Shaw/sub2api) 的 HTTPS 站点登记为本机实例：

```bash
codesome instance add my-sub2api --base-url https://api.example.com
codesome auth login --instance my-sub2api
codesome balance show --instance my-sub2api
```

`instance add` 是**本机信任登记**，不是平台审核或官方白名单。每个实例的登录凭证按实例隔离保存。

---

## 登录

默认走账号密码 HTTP 登录：

```bash
codesome auth login
```

如果遇到验证码、二次验证、风控，或你明确想用网页登录，使用浏览器兜底：

```bash
codesome auth login --browser
```

浏览器兜底使用 Codesome 管理的 Chrome for Testing；缺运行时时先跑 `codesome browser install`。

---

## 常见问题

**Q：装完之后 `codesome version` 还是旧版本？**
跑修复脚本即可。脚本会清理 npm 全局目录之外的残留旧入口，默认安装 `codesome-cli@latest`。

**Q：HTTP 登录和浏览器登录怎么选？**
默认 HTTP 登录（账号密码 → 本机加密凭据）。只有在遇到风控、验证码、二次验证，或你明确要用网页登录时才用 `--browser`。

**Q：自部署站点会被发到 Codesome 服务器吗？**
不会。`codesome instance add` 登记的实例只在本机记录 base URL；登录凭据按实例隔离存放，请求只发到你登记的 origin。

**Q：CLI 会输出我的 Token 或 Cookie 吗？**
不会。所有命令输出对 Cookie、Token、Session、完整 API Key 做脱敏。`--json` 输出同样脱敏。

**Q：多账号怎么办？**
每个账号使用独立加密凭据；浏览器兜底使用独立 browser profile，不会复用网页登录态。

---

## 反馈交流

欢迎进群交流使用反馈和答疑：

![Codesome 使用反馈和答疑群](images/codesome-support-group.png)

---

## 安全说明

- Codesome CLI 不会输出 Cookie、Token、Session 或完整 API Key。
- 涉及账号凭据的请求只会发送到默认官方地址（`cc.codesome.ai` / `v3.codesome.cn`）或你已登记的自部署实例，全部走 HTTPS。
- Skill 不会绕过登录、验证码、二次验证、风控或权限系统；只操作当前登录用户自己有权访问的内容。
- Codesome Skill 针对 Sub2API 项目的适配兼容已获得作者许可，Sub2API 项目地址：https://github.com/Wei-Shaw/sub2api

---

## 协议

[Apache License 2.0](LICENSE)
