# 公开发布检查清单

## 1. 功能准入

- [ ] 功能已在私有仓库实现。
- [ ] 功能已在私有仓库测试。
- [ ] 测试结果已写入 `docs/test-log.md`。
- [ ] 审计记录已写入 `docs/audit-log.md`。
- [ ] 涉及写操作时已实现 `--confirm` 或等价确认。
- [ ] 输出已脱敏。

## 2. 敏感信息扫描

- [ ] 已运行 `npm run scan:public-safety`。
- [ ] GitHub token 阻塞项为 0。
- [ ] 完整 API Key 阻塞项为 0。
- [ ] Cookie / Token / Session 阻塞项为 0。
- [ ] 私人账号阻塞项为 0。
- [ ] 未提交 `.gh-token.tmp`、`dist/`、`node_modules/`、临时 JSON、抓包文件。

## 3. 公开仓库同步

- [ ] 只复制已测试文件。
- [ ] 不复制私有 docs 中未脱敏内容。
- [ ] 不复制实验性代码。
- [ ] 不复制登录态或用户数据。

## 4. 公开仓库复测

```powershell
npm install
node .\bin\codesome.js version
node .\bin\codesome.js --help
node .\bin\codesome-hotskills.js --help
npm run test:npm-pack
npm run scan:public-safety
npm run build:release
.\dist\codesome-windows-amd64.exe version
.\dist\codesome-hotskills-windows-amd64.exe --help
```

跨平台候选发布还需要记录：

- [ ] Windows amd64 预编译二进制已在 Windows 真机运行。
- [ ] Linux amd64 预编译二进制已在 `debian-1` 测试环境运行。
- [ ] Linux amd64 NPM `.tgz` 已在 Node.js 18 环境安装，且无 `EBADENGINE`。
- [ ] 真实 Sub2API 自托管实例已完成登记、登录、远程校验和至少一个只读业务命令。
- [ ] macOS 真机状态已记录为通过或未覆盖。
- [ ] Linux arm64 真机状态已记录为通过或未覆盖。

## 5. 发布回写

- [ ] 公开仓库已提交并推送。
- [ ] 私有仓库已记录公开提交 hash。
- [ ] 私有仓库已记录公开复测结果。
- [ ] 未完成项已写入计划或测试日志。
