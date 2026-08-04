# Lumno Supabase 故障与恢复手册

更新日期：2026-08-04

## 客户端在故障时做什么

- 配置先写当前设备的本机工作副本，网络请求最多等待 15 秒。
- 自动同步失败后按 30 秒、1 分钟、2 分钟递增，最长冷却 15 分钟；用户点击“立即同步”可以主动重试。
- 待上传操作保留在 Outbox，按配置键合并，网络恢复后继续发送。
- 不自动切换到 Chrome Sync。自动回退会让 Chrome 与 Lumno 同时形成可写历史，恢复后无法判断哪套才是权威数据。
- Access Token 到期时才尝试刷新；只有服务端明确返回 400/401 才清除失效会话，普通超时不会把用户误退出。

## 自动告警

GitHub Actions 每五分钟从 Supabase 外部执行四类检查，并只在“首次出现、级别变化、恢复”时通知，事件状态保存在 Actions cache，避免故障期间重复刷屏：

- Auth、REST、`signup-captcha` Edge Function 和 Lumno 登录页可用性；
- 最近十分钟 API 的 5xx、429、删除账号失败、验证码拒绝、请求突增，以及 Postgres ERROR/FATAL/PANIC；
- 最近一小时新账号量、验证码量和当前分钟接近同步限额的账号数；
- 项目活跃媒体容量和每日数据保留任务心跳。

主通道是“Lumno 生产告警”飞书群自定义机器人；备用通道通过飞书邮箱 SMTP 发到 `i@kubai.design`。通知只包含项目、服务、状态、时间窗口和聚合计数，不包含原始日志、IP、用户 ID、邮箱、设置内容或媒体路径。工作流使用专用监控密钥和一年轮换的 Supabase PAT；PAT 当前仍具有账号级权限，必须仅存 GitHub Actions Secret，到期前轮换，禁止写入仓库、日志或飞书消息。

## 服务端告警分级

| 级别 | 条件 | 动作 |
| --- | --- | --- |
| P0 | Auth、REST、关键 Edge Function 不可用；5xx 同时达到 5 次和 5%；删除账号出现 5xx；媒体超过 85%；保留任务超过 26 小时 | 暂停新发布；保留日志；确认 Supabase 状态与审计记录；必要时关闭云端入口，但不改动本机数据。 |
| P1 | 请求量、验证码拒绝、429、注册量、同步并发或媒体使用量达到预警；日志或内部快照不可读 | 检查项目配额、Auth Hook/Database 日志、Google/GitHub 状态和聚合安全计数；不要导出 IP HMAC 密钥或原始日志。 |
| P3 | 单用户冲突、单个媒体失败或配额超限 | 保留冲突双方和错误码；让用户重试、选择版本或导出本机配置。 |

## 备份事实与建议

- Supabase 数据库备份不包含 Storage 对象本体，只包含对象 metadata。数据库恢复后，已经删除的壁纸文件不会因数据库备份自动回来。
- Free 项目应定期使用 Supabase CLI `db dump` 保存异地逻辑备份，并单独导出私有 Storage 对象清单与文件。
- Pro 项目提供每日备份，当前文档给出的可访问保留期为 7 天；PITR 是额外付费能力。购买 Pro/PITR 属于计费决策，代码部署不会自动开通。
- 推荐上线初期：每周一次异地逻辑备份；每月做一次“恢复到临时项目”的演练。用户量或付费收入出现后，升级 Pro；只有业务不能接受最多 24 小时数据库丢失窗口时再评估 PITR。

## 恢复顺序

1. 冻结数据库迁移和账号相关发布，记录故障开始时间。
2. 判断是 Supabase 全局状态、项目暂停/配额、数据库、Auth、Edge Function 还是 Storage 单点问题。
3. 恢复数据库后先验证 RLS、RPC 与最近迁移，再开放客户端写入。
4. 验证私有 Bucket 策略与随机抽取的媒体对象；数据库恢复不等于媒体恢复。
5. 让客户端自然重放 Outbox；不要批量提高版本号或手工复制 Chrome Sync 数据。
6. 观察冲突量、重复操作和失败率；确认稳定后解除发布冻结并记录复盘。

## 账号删除故障

账号删除只从 Lumno Web 发起。Edge Function 必须先删除用户两个媒体目录，再删除 Auth 用户；后者触发数据库外键级联。如果媒体删除失败，整个请求返回失败并保留账号，避免出现“账号已消失但媒体孤儿仍在”的不可重试状态。

## 上线检查

- `npx supabase migration list` 本地与远端一致。
- Authentication → Hooks 中 Before User Created 已启用并指向 `public.lumno_before_user_created`；Rate Limits 中 Sign in / sign ups 为每 IP 每五分钟 20 次。
- 使用不同测试来源验证第 6 个一小时内新账号返回 429；验证 Google/GitHub 正常创建首个账号，Email/其他提供方被拒绝，且事件表只含 32 字节 HMAC 指纹。
- 连续调用设备注册/推送/拉取 RPC，确认每分钟分别在 20/30/60 次后返回 `42901`，下一分钟恢复；普通 15 分钟同步不应接近阈值。
- `npm run smoke:supabase:remote` 通过测试账号的 RLS、同步、媒体上传下载与统计白名单检查。
- Dashboard 中 Auth、Database、Storage、Edge Function 日志无持续错误。
- 手工运行 `Monitor Supabase Production` 工作流并勾选 `test_notification`，确认飞书群和 `i@kubai.design` 都收到不含敏感数据的合成测试消息；下一轮定时检查会发送绿色恢复消息，同一真实事件在状态未变化时不会重复通知。
- GitHub Secrets 存在 `SUPABASE_MONITOR_TOKEN`、`LUMNO_MONITOR_KEY`、`FEISHU_ALERT_WEBHOOK_URL`、`FEISHU_SMTP_PASSWORD`；Supabase Edge Secrets 存在 `LUMNO_MONITOR_KEY`、`RECAPTCHA_SECRET_KEY`。
- 最近一次数据库异地备份和 Storage 清单可读取。
- 隐私政策中的区域、接收方、保留期和实际项目配置一致。

参考：

- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Chrome storage.sync 配额](https://developer.chrome.com/docs/extensions/reference/api/storage#property-sync)
