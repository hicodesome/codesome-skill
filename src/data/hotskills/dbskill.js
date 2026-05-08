const dbskill = {
  "name": "dbskill",
  "display_name": "dbskill",
  "title": "dbskill",
  "summary": "dontbesilent 商业诊断工具箱。从 12,307 条推文中提炼方法论，做成 17 个 Agent skill。",
  "repo": "https://github.com/dontbesilent2025/dbskill",
  "readme_url": "https://raw.githubusercontent.com/dontbesilent2025/dbskill/main/README.md",
  "installer_source": "dontbesilent2025/dbskill",
  "latest_readme_version": "v2.8.0",
  "skill_count": 17,
  "readme_lead": [
    "dontbesilent 商业诊断工具箱。从 12,307 条推文中提炼方法论，做成 17 个 Agent skill。",
    "可在 Claude Code、Codex、Cursor、Trae、Manus 等任意支持 skill / system prompt 的 Agent 上使用。",
    "最新更新：v2.8.0",
    "v2.8.0 新增：目标清晰化（/dbs-goal）。帮你把「我想做个人 IP」「我想变得更好」「我想做真正有影响力的内容」这类愿望语法，用维特根斯坦的语言哲学审计成可检查的交付物——三个用法测试 + 空转词识别 + 重写为可指物目标。在 diagnosis 之后、action 之前的一道关。",
    "v2.7.0 新增：诊断状态管理三件套（/dbs-save、/dbs-restore、/dbs-report）。诊断不再是单次问诊——这次诊断结束之前 /dbs-save 存一份，下次重开对话 /dbs-restore 接着走，攒够几次再用 /dbs-report 合并成一份可交付的报告。",
    "作者：X · 小红书 · 抖音",
    "所有内容开放，可以整套装，也可以只拿一部分。知识包、原子库、单个公理，都能单独用。"
  ],
  "readme_intro": [
    "dontbesilent 商业诊断工具箱。从 12,307 条推文中提炼方法论，做成 17 个 Agent skill。",
    "可在 Claude Code、Codex、Cursor、Trae、Manus 等任意支持 skill / system prompt 的 Agent 上使用。",
    "所有内容开放，可以整套装，也可以只拿一部分。知识包、原子库、单个公理，都能单独用。"
  ],
  "readme_updates": [
    "v2.8.0 新增：目标清晰化（/dbs-goal）。帮你把「我想做个人 IP」「我想变得更好」「我想做真正有影响力的内容」这类愿望语法，用维特根斯坦的语言哲学审计成可检查的交付物——三个用法测试 + 空转词识别 + 重写为可指物目标。在 diagnosis 之后、action 之前的一道关。",
    "v2.7.0 新增：诊断状态管理三件套（/dbs-save、/dbs-restore、/dbs-report）。诊断不再是单次问诊——这次诊断结束之前 /dbs-save 存一份，下次重开对话 /dbs-restore 接着走，攒够几次再用 /dbs-report 合并成一份可交付的报告。"
  ],
  "install_commands": [
    "claude plugin marketplace add dontbesilent2025/dbskill",
    "claude plugin install dbs@dontbesilent-skills",
    "npx skills add dontbesilent2025/dbskill"
  ],
  "core_skills": [
    {
      "name": "dbs",
      "trigger": "/dbs",
      "description": "主入口，自动路由到对的工具"
    },
    {
      "name": "dbs-diagnosis",
      "trigger": "/dbs-diagnosis",
      "description": "商业模式诊断。消解问题，不回答问题"
    },
    {
      "name": "dbs-benchmark",
      "trigger": "/dbs-benchmark",
      "description": "对标分析。五重过滤，排除噪音"
    },
    {
      "name": "dbs-content",
      "trigger": "/dbs-content",
      "description": "内容创作诊断。五维检测"
    },
    {
      "name": "dbs-hook",
      "trigger": "/dbs-hook",
      "description": "短视频开头优化。诊断 + 生成方案"
    },
    {
      "name": "dbs-xhs-title",
      "trigger": "/dbs-xhs-title",
      "description": "小红书标题公式。75 个爆款公式匹配"
    },
    {
      "name": "dbs-ai-check",
      "trigger": "/dbs-ai-check",
      "description": "AI 写作特征识别。22 条特征扫描，只诊断不改"
    },
    {
      "name": "dbs-slowisfast",
      "trigger": "/dbs-slowisfast",
      "description": "慢就是快。摩擦建造资产，找到值得慢做的环节"
    },
    {
      "name": "dbs-action",
      "trigger": "/dbs-action",
      "description": "执行力诊断。阿德勒框架（原 dbs-unblock）"
    },
    {
      "name": "dbs-deconstruct",
      "trigger": "/dbs-deconstruct",
      "description": "概念拆解。维特根斯坦式审查"
    },
    {
      "name": "dbs-goal",
      "trigger": "/dbs-goal",
      "description": "目标清晰化。把模糊目标审计成可检查的交付物"
    },
    {
      "name": "dbs-save",
      "trigger": "/dbs-save",
      "description": "把当前诊断的关键结论、否决方向、推荐下一步存到本地。每次新增不覆盖"
    },
    {
      "name": "dbs-restore",
      "trigger": "/dbs-restore",
      "description": "拉出上次的存档，下次开新对话也能接着诊断"
    },
    {
      "name": "dbs-report",
      "trigger": "/dbs-report",
      "description": "把多次存档合并成一份带时间索引的 markdown 报告。可分享、可归档"
    },
    {
      "name": "dbs-agent-migration",
      "trigger": "/dbs-agent-migration",
      "description": "Agent 工作台迁移。把任意项目整理成 Claude Code / Codex 双端一致的 Agent 工作台：审计规则文件、识别真源、统一命名与 bridge"
    },
    {
      "name": "dbs-chatroom-austrian",
      "trigger": "/dbs-chatroom-austrian",
      "description": "奥派经济聊天室。哈耶克 × 米塞斯 × Claude 三人对话"
    },
    {
      "name": "dbs-chatroom",
      "trigger": "/dbs-chatroom",
      "description": "定向聊天室。推荐专家或指定人物，多角色对话 + 判官总结"
    }
  ],
  "snapshot": {
    "source": "github-readme",
    "generated_at": "2026-05-06T00:00:00.000Z"
  }
}

export default dbskill
