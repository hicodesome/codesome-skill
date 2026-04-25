# Codesome Skill

这是 Codesome 的公开 Skill 仓库。

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
