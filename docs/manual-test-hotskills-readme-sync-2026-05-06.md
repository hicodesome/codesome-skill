# Hot Skills README Sync 人工测试 SOP

目标版本：`codesome-cli@0.5.6-beta.3`

## npm 测试版状态

```bash
npm view codesome-cli version dist-tags --json
```

预期结果：`latest` 仍是 `0.5.5`，`beta` 是 `0.5.6-beta.3`。

```bash
npx --yes --package codesome-cli@beta codesome version
```

预期结果：输出 `codesome 0.5.6-beta.3`。

```bash
npx --yes --package codesome-cli@0.5.6-beta.3 codesome version
```

预期结果：输出 `codesome 0.5.6-beta.3`。

## npx 功能验证

```bash
npx --yes --package codesome-cli@beta codesome hotskills
```

预期结果：默认页只展示 dbskill README 顶部介绍块；能看到 `最新更新：v2.8.0`、`v2.8.0 新增`、`v2.7.0 新增`、`作者：X · 小红书 · 抖音`；不应出现 `Codesome Hot Skills`、`README 工具箱`、`README 解析到`、`来源`、`了解更多`、`安装命令` 或 `/dbs-diagnosis` 工具列表。

```bash
npx --yes --package codesome-cli@beta codesome hotskills --no-install
```

预期结果：默认页只展示 dbskill README 顶部介绍块，并且不询问是否安装。

```bash
npx --yes --package codesome-cli@beta codesome hotskills --install --yes
```

预期结果：先展示 dbskill README 顶部介绍块，然后执行安装；能看到 `准备安装：dbskill` 和底层 `npx --yes skills add dontbesilent2025/dbskill`。

```bash
npx --yes --package codesome-cli@beta codesome hotskills --json
```

预期结果：JSON 中 `latest_readme_version` 是 `v2.8.0`，`skill_count` 是 `17`，`readme_lead` 包含 README 顶部介绍，`upstream.source` 是 `github-readme`。

```bash
npx --yes --package codesome-cli@beta codesome hotskills info dbskill
```

预期结果：详情页包含 `README 顶部介绍` 和 `README 工具箱`；工具箱里能看到 `/dbs`、`/dbs-goal`、`/dbs-save` 等 README 表格解析结果。

```bash
npx --yes --package codesome-cli@beta codesome hotskills install dbskill
```

预期结果：只展示安装信息和将执行的命令，不应真正安装；能看到确认命令 `codesome hotskills install dbskill --confirm`。

```bash
npx --yes --package codesome-cli@beta codesome-hotskills --json
```

预期结果：输出与 `codesome hotskills --json` 同结构的 JSON，版本为 `v2.8.0`，skill 数为 `17`。

## npm 全局安装验证

```bash
npm uninstall -g codesome-cli @leo_aifirst/codesome-cli @codesome/cli
```

预期结果：历史包名和当前包名被卸载；如果某些包本来不存在，npm 可能提示未找到或 up to date，不算失败。

```bash
npm install -g codesome-cli@beta
```

预期结果：全局安装 `codesome-cli@0.5.6-beta.3` 成功。

```bash
codesome version
```

预期结果：输出 `codesome 0.5.6-beta.3`。

```bash
codesome hotskills
```

预期结果：默认页只展示 dbskill README 顶部介绍块；不应出现 `Codesome Hot Skills`、`README 工具箱`、`README 解析到`、`来源`、`了解更多`、`安装命令` 或工具列表。

```bash
codesome hotskills --json
```

预期结果：JSON 中 `latest_readme_version` 是 `v2.8.0`，`skill_count` 是 `17`，`readme_lead` 存在。

```bash
codesome hotskills info dbskill
```

预期结果：详情页包含 README 顶部介绍和完整 README 工具箱解析结果。

```bash
codesome hotskills install dbskill
```

预期结果：只展示安装信息，不真正写入；提示确认安装命令。

```bash
codesome-hotskills --json
```

预期结果：独立入口可运行，JSON 中版本为 `v2.8.0`，skill 数为 `17`。

```bash
command -v codesome
```

预期结果：显示 npm 全局安装后的 `codesome` 路径；不应优先指向旧的 `~/.codesome/bin/codesome`。

```bash
which -a codesome
```

预期结果：第一条路径应是本次 npm 安装入口；如果旧 Release 二进制排在前面，需要清理 PATH 或旧文件。

```bash
command -v codesome-hotskills
```

预期结果：显示 npm 全局安装后的 `codesome-hotskills` 路径。

```bash
which -a codesome-hotskills
```

预期结果：第一条路径应是本次 npm 安装入口；不应被旧 Release 二进制抢占。

## 正式版对照

```bash
npm uninstall -g codesome-cli
```

预期结果：卸载 beta 版。

```bash
npm install -g codesome-cli@0.5.5
```

预期结果：安装当前正式版 `0.5.5`。

```bash
codesome version
```

预期结果：输出 `codesome 0.5.5`。

```bash
codesome hotskills
```

预期结果：正式版仍可能显示旧的 `README 最新更新` / `README 工具箱` 分区；这是对照结果，不是 beta 修复结果。

```bash
npx --yes --package codesome-cli@0.5.5 codesome hotskills
```

预期结果：输出正式版 `0.5.5` 的 hotskills 页面，用于和 beta 的顶部介绍块展示做对照。

## Windows PowerShell 测试

```powershell
npm view codesome-cli version dist-tags --json
```

预期结果：`latest` 仍是 `0.5.5`，`beta` 是 `0.5.6-beta.3`。

```powershell
npx --yes --package codesome-cli@beta codesome version
```

预期结果：输出 `codesome 0.5.6-beta.3`。

```powershell
npx --yes --package codesome-cli@beta codesome hotskills
```

预期结果：默认页只展示 dbskill README 顶部介绍块；不应出现 `Codesome Hot Skills`、`README 工具箱`、`README 解析到`、`来源`、`了解更多`、`安装命令` 或工具列表。

```powershell
npx --yes --package codesome-cli@beta codesome hotskills --json
```

预期结果：JSON 中 `latest_readme_version` 是 `v2.8.0`，`skill_count` 是 `17`，`readme_lead` 存在。

```powershell
npx --yes --package codesome-cli@beta codesome hotskills info dbskill
```

预期结果：详情页包含 README 顶部介绍和完整 README 工具箱解析结果。

```powershell
npx --yes --package codesome-cli@beta codesome hotskills install dbskill
```

预期结果：只展示安装信息，不真正写入；提示确认安装命令。

```powershell
npx --yes --package codesome-cli@beta codesome-hotskills --json
```

预期结果：独立入口可运行，JSON 中版本为 `v2.8.0`，skill 数为 `17`。

```powershell
npm uninstall -g codesome-cli @leo_aifirst/codesome-cli @codesome/cli
```

预期结果：历史包名和当前包名被卸载；不存在的包可以忽略。

```powershell
npm install -g codesome-cli@beta
```

预期结果：全局安装 `codesome-cli@0.5.6-beta.3` 成功。

```powershell
codesome version
```

预期结果：输出 `codesome 0.5.6-beta.3`。

```powershell
codesome hotskills
```

预期结果：默认页只展示 dbskill README 顶部介绍块；不应出现 `Codesome Hot Skills`、`README 工具箱`、`README 解析到`、`来源`、`了解更多`、`安装命令` 或工具列表。

```powershell
codesome hotskills --json
```

预期结果：JSON 中 `latest_readme_version` 是 `v2.8.0`，`skill_count` 是 `17`，`readme_lead` 存在。

```powershell
codesome hotskills info dbskill
```

预期结果：详情页包含 README 顶部介绍和完整 README 工具箱解析结果。

```powershell
codesome hotskills install dbskill
```

预期结果：只展示安装信息，不真正写入；提示确认安装命令。

```powershell
codesome-hotskills --json
```

预期结果：独立入口可运行，JSON 中版本为 `v2.8.0`，skill 数为 `17`。

```powershell
Get-Command codesome -All
```

预期结果：第一条应是 npm 全局安装入口；如果旧 `.codesome\bin` 或其它 shim 排在前面，需要清理。

```powershell
Get-Command codesome-hotskills -All
```

预期结果：第一条应是 npm 全局安装入口；不应被旧 Release 二进制抢占。

```powershell
npm uninstall -g codesome-cli
```

预期结果：卸载 beta 版。

```powershell
npm install -g codesome-cli@0.5.5
```

预期结果：安装当前正式版 `0.5.5`。

```powershell
codesome version
```

预期结果：输出 `codesome 0.5.5`。

```powershell
codesome hotskills
```

预期结果：正式版仍可能显示旧的 `README 最新更新` / `README 工具箱` 分区；这是对照结果，不是 beta 修复结果。
