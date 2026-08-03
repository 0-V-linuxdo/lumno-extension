# Lumno Supabase 部署手册

更新日期：2026-08-03

## 当前云端状态

- 项目：`lumno`（Ref `krpyocaoeqfwpepnsthc`），东京 `ap-northeast-1`，创建时为 Free 计划。
- 数据库：迁移 `202608010001` 至 `202608030009` 已应用。媒体迁移移除了未启用的第三方审核计数，并以两个活动壁纸槽位、20 个图标、账号字节预算和全局存储停写线为准；`009` 撤销了 Auth 触发器函数不需要的公开 RPC 权限。用户/账号业务表和内部保留期表均启用并强制 RLS。
- Storage：`lumno-user-media` 为私有 Bucket。迁移 `006` 后认证客户端没有任何直连对象策略，上传、下载和删除全部经过 `media-asset`；壁纸主图 2 MiB、缩略图 160 KiB、图标 96 KiB，账号最多两张活动壁纸、20 个图标和 10 MiB 活跃媒体。
- Edge Functions：生产的 `telemetry-ingest`、`media-asset`、`delete-account` 均为 ACTIVE，且递归账号清理已部署；当前 `media-asset` 只执行结构安全检查和资源配额，不依赖第三方审核 Secret。
- 数据保留：账号关联的每日统计与配置属性保留 24 个月，之后只汇总为不含用户、设备或配置标识的“月份 + 指标”长期总数；统计去重批次保留 30 天，同步幂等操作记录保留 90 天。
- 客户端：`src/shared/cloud-config.js` 已填入生产 Project URL 和 Publishable Key。
- Auth：仅开放 Google 与 GitHub；邮箱登录和新邮箱注册已关闭。Google 与 GitHub 返回同一已验证邮箱时，Supabase 会把两种身份自动关联到同一用户。
- OAuth Server：已开启 OAuth 2.1，授权页为 `https://lumno.kubai.design/oauth/authorize/`，动态客户端注册关闭；开发版和 Chrome Web Store 版分别使用独立的 Public Client + PKCE。
- 社交登录：Google 与 GitHub 均已接入，回调固定为 Supabase Auth callback；Google OAuth 已发布为正式版，Lumno 名称、图标、首页和隐私政策已通过品牌验证并发布。
- 远程冒烟：`node scripts/smoke-supabase-remote.js` 已实测配置同步、私有媒体、统计和账号删除，测试数据清理为 0 遗留。
- 生产用户验收：普通用户会话下已完成双设备同步、版本冲突、私有媒体上传下载和“未同意统计返回 403”验证，临时媒体与设备记录已清理。
- Web/插件 OAuth 验收：Google 真实账号已完成 Web 登录；随后从开发版扩展经 OAuth 2.1 + PKCE 返回插件，插件显示同一邮箱、“已连接”和最近同步时间。GitHub 登录链路此前也已完成。
- Google 品牌验收：真实账号选择页显示 Lumno 图标、应用名 `Lumno` 和 Lumno 隐私政策链接，不再以 Supabase 项目域名作为面向用户的应用名称。

## 已完成的本地验证

- Supabase CLI 2.111.0。
- 首个 schema 已在本地 Supabase/Postgres 17 完整执行；当前机器 Docker 不可用，因此保留期迁移改用远程 dry-run、迁移历史核对、数据库 lint 与远程冒烟验证。
- `supabase db lint --local --level warning` 无 schema 错误。
- 两个 Edge Functions 在 Deno 2.1.4 兼容运行时成功启动。
- 未认证访问 `telemetry-ingest` 和 `delete-account` 均返回 401。
- `node scripts/smoke-supabase-local.js` 使用仅限测试的管理员账号夹具，实测配置推拉、私有壁纸、同意后的聚合统计和账号删除。
- 2026-08-03：远端迁移 `006`–`008` 和当前 `media-asset` 已部署；系统目录核对确认两个壁纸槽位、10 MiB 活跃额度、日/月上传、月度下载和 900 MiB 全局停写闸门生效，第三方审核对象不存在，远端冒烟完成后一次性账号与媒体零残留。

可重复本地验收：

```bash
npx --yes supabase@latest start
npx --yes supabase@latest db lint --local --level warning
node scripts/smoke-supabase-local.js
```

## 1. 创建项目

在 Supabase Dashboard 创建生产项目并选择离主要用户最近的区域。记下：

- Project Ref；
- Project URL，例如 `https://<project-ref>.supabase.co`；
- Publishable Key，格式通常为 `sb_publishable_...`。

Publishable Key 会打包进插件，属于公开客户端标识；Secret Key 具有高权限，绝不能写入仓库或插件。Supabase 的当前说明见 [Understanding API keys](https://supabase.com/docs/guides/getting-started/api-keys)。

## 2. 登录并连接 CLI

这一步需要项目所有者操作：

```bash
npx supabase@latest login
npx supabase@latest link --project-ref <project-ref>
```

CLI 会要求 Supabase 登录或 Personal Access Token，并可能要求数据库密码。官方流程见 [Supabase CLI Reference](https://supabase.com/docs/reference/cli/getting-started)。

## 3. 部署数据库

先预览，再推送：

```bash
npx supabase@latest db push --dry-run
npx supabase@latest db push
```

迁移会创建表、索引、RLS、同步 RPC、私有媒体 Bucket、Storage 策略和保留期维护函数。维护函数在统计写入后至多每日运行一次：先生成匿名月度总数，再删除超过 24 个月的账号关联明细，并清理 30/90 天幂等记录。推送后在 Dashboard 的 Security Advisor 中复查告警。`db push` 的迁移历史和行为见 [CLI db push](https://supabase.com/docs/reference/cli/supabase-projects-create)。

不要并行执行同一项目的多个 CLI 数据库命令；它们可能同时轮换临时登录角色，造成凭证竞态。本次东京项目从当前网络到 Postgres 的长连接不稳定，最终通过官方 Management API 将完整 SQL 包在单个 `BEGIN/COMMIT` 中执行，验证系统目录后使用 `migration repair` 登记版本；随后 `db push --dry-run` 已确认远程最新。

## 4. 部署 Edge Functions

```bash
npx supabase@latest functions deploy telemetry-ingest
npx supabase@latest functions deploy media-asset
npx supabase@latest functions deploy delete-account
```

`supabase/config.toml` 已把两者设为 `verify_jwt = false`，因为函数内部会使用当前 Publishable/Secret Key 环境变量重新验证用户 JWT；这也兼容 Supabase 新式 API Key。默认环境变量说明见 [Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)，部署步骤见 [Deploy Edge Functions](https://supabase.com/docs/guides/functions/deploy)。

部署后手工验证：

```bash
curl -i -X POST "https://<project-ref>.supabase.co/functions/v1/telemetry-ingest" \
  -H "Content-Type: application/json" \
  --data '{}'
```

没有用户 Token 时必须返回 401。

### 私有媒体资源闸门

`media-asset` 不做图片内容审核，也不需要第三方审核 Secret。它会对客户端已压缩图片的真实二进制执行 PNG/WebP 签名、结构、尺寸、元数据、尾随数据和字节检查，并由数据库原子执行以下闸门：

- 云端只保留当前生效的浅色/深色壁纸，最多两张；快捷方式自定义图标最多 20 个；
- 每账号活跃媒体最多 10 MiB；
- 每账号每小时最多 40 次上传、UTC 日最多 32 MiB、每月最多 256 MiB 上传；
- 每账号每月最多 128 MiB 下载；
- 项目活跃媒体达到 900 MiB 后停止新上传，为存储和运维留余量。

导入壁纸不会触发上传。客户端会在最后一次选择后等待约 30 秒，或在用户关闭壁纸面板时立即同步最终生效槽位；手动同步、登录和 15 分钟周期任务负责失败恢复。即使用户在本地快速试选很多张，通常也只上传最终选择。

## 5. 配置登录提供商

在 Authentication → Providers 中保持 Google 与 GitHub 开启，并关闭 Email。Supabase 默认会对相同已验证邮箱执行自动身份关联，因此用户可以用任一已关联提供商进入同一个 Lumno 账号，账号级同步数据不会复制成两份。不同邮箱仍会创建不同账号；Lumno 不提供手工合并两个既有账号的数据迁移。

旧邮箱 OTP 实现仅保存在 `archive/email-otp-auth/`，不参与构建或部署。恢复它必须重新进行产品、滥用防护和隐私评审。

## 6. 填入插件公开配置

编辑 `src/shared/cloud-config.js`：

```js
const PROJECT_URL = 'https://<project-ref>.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_...';
const OAUTH_CLIENT_IDS = {
  '<development-extension-id>': '<development-public-client-id>',
  '<store-extension-id>': '<store-public-client-id>'
};
```

只填这两个公开值。不要填 Secret Key、数据库密码、SMTP 密码或 CLI Token。

重新加载开发扩展后，设置页的“账号与隐私”应从“未配置”变为“未登录”。

当前生产公开配置已经填入。任何时候都只能提交 Publishable Key；Secret Key、legacy service-role JWT、数据库密码、SMTP 密码和 CLI Token 都禁止进入插件包。

开源仓库和发布包采用三层隔离：仓库可包含迁移与 Edge Function 源码，但不包含运行时 Secret；商店 ZIP 只包含 `src`、`_locales`、`assets`，并移除开发版 manifest key 和 debug 连接；开发版与商店版使用不同 OAuth Public Client。外部贡献者、Fork 和 CI 不得获得生产 Service Role，需要云端集成测试时使用独立 Supabase 开发项目与独立 OAuth Client。

生产后端可重复冒烟：

```bash
node scripts/smoke-supabase-remote.js
```

该脚本要求本机已登录 Supabase CLI，会在内存中使用服务端凭证创建一次性测试用户和不投递的管理员测试令牌，并在成功或失败路径清理；它不依赖已关闭的公开邮箱登录，也不得放入不受信任的 CI 环境。

## 7. 上线验收

用两个不同浏览器配置文件测试：

1. A 设备登录并修改主题、快捷方式、快捷方式自定义图标和壁纸。
2. B 设备登录同一邮箱，确认设置、当前生效的浅色/深色壁纸和全部快捷方式自定义图标恢复；A 设备未生效的本地壁纸库不应出现。
3. A/B 同时修改同一设置，确认不会静默覆盖且显示冲突计数。
4. 断网修改后重启浏览器，恢复网络并确认 Outbox 清空。
5. 在插件确认弹窗中取消，确认不会启动网页登录，且本地不存在 `_lumno_cloud_usage_v1_`。
6. 确认同步与统计范围并完成登录，确认只出现白名单计数和枚举，不出现 URL、标题或查询。
7. 退出登录后确认本地待上传计数立即清除，之后不再产生新计数。
8. 连续快速切换多张本地壁纸，确认过程中不逐张上传；等待 30 秒或关闭面板后仅最终生效的浅色/深色壁纸存在于 Storage。
9. 删除一个快捷方式自定义图标，确认 Storage 对象和 metadata 都进入删除状态，并且其他设备不再恢复它。
10. 永久删除账号，确认 Auth 用户、数据库行和壁纸/快捷方式图标对象全部删除，本机设置仍在。
11. 退出登录后确认插件继续以游客模式工作。
12. 分别用 Google 与 GitHub 从插件发起网页登录，确认出现正确授权范围并返回插件。
13. 篡改回调 `state` 或使用另一个扩展 ID 的回调，确认登录失败且不保存会话。
14. 上传 SVG、伪 MIME、带元数据或尾随数据的 PNG/WebP、超尺寸图片，确认都不会产生 Storage 对象或活跃 metadata；构造超频和超字节请求，确认返回资源限制错误。
15. 直接用用户 JWT 调 Storage 上传/下载/删除及 `lumno_assets`/`lumno_devices` 写入，确认均为 401/403；仅 Edge 网关可执行媒体操作。
16. 创建任意 `user_id/legacy/nested/...` 测试对象后删除账号，确认整个用户前缀为零对象。

当前已完成开发版扩展的 Google 真实账号链路；Chrome Web Store 版仍需在商店 ID 对应的 Public Client 上做一次发布包验收。

## 8. 发布前隐私工作

- 审核并发布 `docs/privacy-policy-draft.md` 的当前定稿内容。
- 将隐私政策发布到 HTTPS 公共页面，并填入 Chrome Web Store Dashboard。
- 商店页面明确描述账号同步、壁纸/快捷方式自定义图标上传和随账号同步确认启用的聚合统计。
- 按 `docs/chrome-web-store-data-disclosure.md` 填写单一用途、权限理由与数据使用声明，并在每次发布前重新对照实际代码。
- Dashboard 的数据使用声明与实际代码、产品内披露和隐私政策保持一致。
- 不要把“同意统计”解释为可以收集浏览数据；Chrome Web Store 的 Limited Use 仍要求数据与单一用途必要相关。参考 [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)。

## 9. 回滚

如果云服务异常但插件已发布：

1. 将下一版 `PROJECT_URL` 和 `PUBLISHABLE_KEY` 置空；
2. 插件会自动回到游客模式，不再发起云请求；
3. 不要直接删除生产数据库，先导出并保留用户删除通道；
4. 修复后重新启用，并验证旧 Refresh Token 和 schema 兼容性。
