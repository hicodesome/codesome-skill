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
npm run scan:public-safety
npm run build:release
.\dist\codesome-windows-amd64.exe version
```

## 5. 发布回写

- [ ] 公开仓库已提交并推送。
- [ ] 私有仓库已记录公开提交 hash。
- [ ] 私有仓库已记录公开复测结果。
- [ ] 未完成项已写入计划或测试日志。
