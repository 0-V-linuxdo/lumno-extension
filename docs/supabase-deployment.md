# Lumno Supabase 部署手册

更新日期：2026-08-04

## 当前云端状态

- 项目：`lumno`（Ref `krpyocaoeqfwpepnsthc`），东京 `ap-northeast-1`，创建时为 Free 计划。
- 数据库基线：迁移 `202608010001` 至 `202608040018` 已部署并完成迁移历史登记；`010`–`014` 收口设备/统计并发限制、媒体租约、删除二次验证一次性消费、媒体计数器及软删除级联删除的计数校准，`015`–`018` 启用注册/同步频控、reCAPTCHA 单次通行证、聚合监控快照和生产注册强制校验。
- 注册与并发保护：`202608040015` 已于 2026-08-04 部署并登记到远端；注册准入 Hook、注册来源/全局滚动频控、同步 RPC 分钟窗口和设备心跳节流均已启用。Auth 使用 Management API 最小 PATCH，只修改五分钟登录/注册频控和 Before User Created Hook，生产站点 URL、OAuth 回调和提供方配置保持不变。
- Storage：`lumno-user-media` 为私有 Bucket。迁移 `006` 后认证客户端没有任何直连对象策略，上传、下载和删除全部经过 `media-asset`；壁纸主图 2 MiB、缩略图 160 KiB、图标 96 KiB，账号最多两张活动壁纸、20 个图标和 10 MiB 活跃媒体。
- Edge Functions 基线：`telemetry-ingest`、`media-asset`、`delete-account` 已部署为 ACTIVE，分别为当前工作区版本；不依赖第三方审核 Secret。
- 数据保留：账号关联的每日统计与配置属性保留 24 个月，之后只汇总为不含用户、设备或配置标识的“月份 + 指标”长期总数；统计去重批次保留 30 天，同步幂等操作记录保留 90 天。
- 客户端：`src/shared/cloud-config.js` 已填入生产 Project URL 和 Publishable Key。
- Auth：仅开放 Google 与 GitHub；邮箱登录和新邮箱注册已关闭。Google 与 GitHub 返回同一已验证邮箱时，Supabase 会把两种身份自动关联到同一用户。
- OAuth Server：已开启 OAuth 2.1，授权页为 `https://lumno.kubai.design/oauth/authorize/`，动态客户端注册关闭；开发版和 Chrome Web Store 版分别使用独立的 Public Client + PKCE。
- 社交登录：Google 与 GitHub 均已接入，回调固定为 Supabase Auth callback；Google OAuth 已发布为正式版，Lumno 名称、图标、首页和隐私政策已通过品牌验证并发布。
- 远程冒烟：脚本现在验证配置同步、私有媒体、统计和“删除必须提供独立 OAuth 二次验证”的 403 防线，并始终用 Service Role 清理测试用户；真正删除成功需要带真实 OAuth step-up Token 的人工验收。
- 生产用户验收：普通用户会话下已完成双设备同步、版本冲突、私有媒体上传下载和“未同意统计返回 403”验证，临时媒体与设备记录已清理。
- Web/插件 OAuth 验收：Google 真实账号已完成 Web 登录；随后从开发版扩展经 OAuth 2.1 + PKCE 返回插件，插件显示同一邮箱、“已连接”和最近同步时间。GitHub 登录链路此前也已完成。
- Google 品牌验收：真实账号选择页显示 Lumno 图标、应用名 `Lumno` 和 Lumno 隐私政策链接，不再以 Supabase 项目域名作为面向用户的应用名称。

## 已完成的本地验证

- Supabase CLI 2.111.0。
- 首个 schema 已在本地 Supabase/Postgres 17 完整执行；当前机器 Docker 不可用，因此保留期迁移改用远程 dry-run、迁移历史核对、数据库 lint 与远程冒烟验证。
- 历史基线的 `supabase db lint --local --level warning` 无 schema 错误；本次 `010`–`014` 的本地数据库 lint 尚未执行，因为当前机器没有运行 Docker/Postgres。
- 本次三个 Edge Function 源码已通过 esbuild bundle 校验；部署后的 Deno 启动和 SQL runtime 已在 Supabase 环境执行。
- 未认证访问 `telemetry-ingest` 和 `delete-account` 均返回 401。
- `node scripts/smoke-supabase-local.js` 使用仅限测试的管理员账号夹具，验证配置推拉、私有壁纸、同意后的聚合统计和删除二次验证防线；脚本失败也会在 finally 中清理测试用户。
- 2026-08-03：远端迁移 `010`–`014` 已部署并登记，三个 Edge Function 均为 ACTIVE；系统目录核对确认租约、step-up 一次性消费、媒体计数器和 900 MiB 全局停写闸门生效。远端烟测覆盖配置同步、私有媒体、统计和删除防线，测试账号清理后零残留；计数器最终与活动资产字节数一致。
- 2026-08-04：本地复现并修复并发 Outbox 丢写、首次设备 ID 分叉和重复设备注册；新增测试确认两个并发设置均保留、设备 ID 唯一、在途推送后的新值会基于已接受版本继续排队。`015` 已部署，生产实测同账号一分钟内前 20 次设备注册成功、第 21 次以 `42901` 拒绝；注册 Hook 同源前 5 次放行、第 6 次返回 429，测试账号、测试指纹和本次中断烟测产生的对象均已清理。

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

迁移会创建表、索引、RLS、同步 RPC、私有媒体 Bucket、Storage 策略、媒体计数器、租约提交、注册准入函数和保留期维护函数。维护函数在统计写入后至多每日运行一次：先生成匿名月度总数，再删除超过 24 个月的账号关联明细，并清理 30/90 天幂等记录；注册来源的带密钥 IP 指纹最多保留 26 小时。推送后在 Dashboard 的 Security Advisor 中复查告警。`db push` 的迁移历史和行为见 [CLI db push](https://supabase.com/docs/reference/cli/supabase-projects-create)。

`015` 首次部署必须先推数据库迁移，再更新 Auth，避免数据库函数尚不存在时启用 Hook：

```bash
npx supabase@latest db push
```

当前 `supabase/config.toml` 同时服务于本地开发，包含 `127.0.0.1` 的 Auth Site URL；不得直接对生产执行整份 `config push`，否则可能覆盖生产站点和 OAuth 回调。应先读取远端 Auth 配置，再通过 Dashboard 或 Management API 仅更新以下字段：

```json
{
  "rate_limit_otp": 20,
  "hook_before_user_created_enabled": true,
  "hook_before_user_created_uri": "pg-functions://postgres/public/lumno_before_user_created"
}
```

Hook 只允许 Google/GitHub 新账号；每个来源最多每小时 5 个、24 小时 12 个，项目最多每小时 60 个、24 小时 200 个。IP 先使用数据库内随机密钥做 HMAC-SHA256，事件表不保存原始 IP。Service Role 管理接口创建的远程烟测夹具不消耗公开注册预算；脚本仍写入不可由公开客户端设置的 `app_metadata.lumno_system_fixture`，方便直接调用 Hook 的数据库烟测识别系统夹具。

不要并行执行同一项目的多个 CLI 数据库命令；它们可能同时轮换临时登录角色，造成凭证竞态。本次东京项目从当前网络到 Postgres 的长连接不稳定，最终通过官方 Management API 将 `010`–`014` 完整 SQL 执行，验证系统目录和迁移历史后使用 `migration repair` 登记版本；最后通过 Management API 查询确认五条迁移已登记。当前机器没有远端数据库密码，因此 CLI 的直连 `db push --dry-run` 仅作为未执行的本地运维检查，不影响已完成的远端部署核验。

## 4. 部署 Edge Functions

```bash
npx supabase@latest functions deploy telemetry-ingest
npx supabase@latest functions deploy media-asset
npx supabase@latest functions deploy delete-account
```

`supabase/config.toml` 已把两者设为 `verify_jwt = false`，因为函数内部会使用当前 Publishable/Secret Key 环境变量重新验证用户 JWT；这也兼容 Supabase 新式 API Key。默认环境变量说明见 [Edge Function secrets](https://supabase.com/docs/guides/functions/secrets)，部署步骤见 [Deploy Edge Functions](https://supabase.com/docs/guides/functions/deploy)。

`delete-account` 的删除契约要求两个独立验证的 Supabase Access Token：请求头 `Authorization` 携带当前主会话，JSON Body 同时包含精确的 `confirmation: "DELETE"` 和 `step_up_access_token`。后者必须来自同一用户、不同 `session_id`，并携带五分钟内带时间戳的 `oauth` AMR 证据；仅通过 Refresh 新签发的 Token 或未重新完成上游 OAuth 身份验证的 Authorization Code Exchange 都不能作为二次认证。函数先通过 service-role 数据库 RPC 原子消费 `(user_id, step_up_session_id)`，再尽力以 `local` Scope 注销二次会话；一次性保证来自数据库主键消费，不依赖 Auth sign-out 的时序。缺少或无效的二次认证返回 `403 step_up_required`；客户端必须从危险操作确认页强制重新完成 Google 或 GitHub OAuth 身份验证，不得复用或刷新主会话充当证明。

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

上传路径先取得五分钟逻辑资产租约，再记录上传额度；最终 metadata 通过同一租约令牌的原子 RPC 提交。活跃数量和字节使用量由数据库计数器维护，提交事务只锁计数器行，不再对 `lumno_assets` 做全表聚合扫描。

导入壁纸不会触发上传。客户端会在最后一次选择后等待约 30 秒，或在用户关闭壁纸面板时立即同步最终生效槽位；手动同步、登录和 15 分钟周期任务负责失败恢复。即使用户在本地快速试选很多张，通常也只上传最终选择。

## 5. 配置登录提供商

在 Authentication → Providers 中保持 Google 与 GitHub 开启，并关闭 Email。Supabase 默认会对相同已验证邮箱执行自动身份关联，因此用户可以用任一已关联提供商进入同一个 Lumno 账号，账号级同步数据不会复制成两份。不同邮箱仍会创建不同账号；Lumno 不提供手工合并两个既有账号的数据迁移。

迁移 `015`–`018` 和 Auth 最小 PATCH 完成后，在 Authentication → Hooks 确认 Before User Created 指向 `public.lumno_before_user_created`，在 Authentication → Rate Limits 确认 Sign in / sign ups 为每 IP 每五分钟 20 次。不要先手工启用 Hook；数据库函数必须先存在。

生产登录页使用 reCAPTCHA v3，`action=lumno_oauth`，初始最低分 0.5。网页只在用户点击 Google/GitHub 时加载脚本并把 token 立即交给 `signup-captcha`；Edge Function 向 Google 验证 success、error codes、action、hostname、score 和时间，再让数据库生成十分钟有效、单次消费、绑定来源 HMAC 指纹和提供方的通行证。Before User Created Hook 只对真正的新用户消费通行证，已有账号登录不会创建用户。上线顺序必须是：

1. 部署 `016`、`017` 和两个 Edge Function，保持 `captcha_enforced=false`；
2. 将 `RECAPTCHA_SECRET_KEY` 和 `LUMNO_MONITOR_KEY` 写入 Supabase Edge Secrets；
3. 将 `PUBLIC_RECAPTCHA_SITE_KEY` 写入网站 GitHub Secret，部署并验证登录页；
4. 通过独立迁移把 `captcha_enforced` 改为 `true`；
5. 用新账号验证正常注册，并确认绕过网页登录直接发起 OAuth 会被 Hook 拒绝。

不要在网站、插件、仓库或日志中出现 reCAPTCHA Secret。Google token 有效期很短且只能验签一次；Lumno 不保存 token 或原始 IP。

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
7. 退出当前设备后确认本机设置继续生效、其他设备仍登录；在退出状态修改配置，再登录同一账号，确认服务器未变化的键上传、服务器已变化的键产生冲突，并复用原设备 ID。
8. 连续快速切换多张本地壁纸，确认过程中不逐张上传；等待 30 秒或关闭面板后仅最终生效的浅色/深色壁纸存在于 Storage。
9. 删除一个快捷方式自定义图标，确认 Storage 对象和 metadata 都进入删除状态，并且其他设备不再恢复它。
10. 在危险操作确认页重新完成 Google/GitHub OAuth，使用独立 step-up Token 永久删除账号；确认 Auth 用户、数据库行和壁纸/快捷方式图标对象全部删除，本机设置仍在，并重复提交同一个 step-up Token 确认返回 403。
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
