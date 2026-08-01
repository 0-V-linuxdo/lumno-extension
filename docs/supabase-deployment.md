# Lumno Supabase 部署手册

更新日期：2026-08-02

## 当前云端状态

- 项目：`lumno`（Ref `krpyocaoeqfwpepnsthc`），东京 `ap-northeast-1`，创建时为 Free 计划。
- 数据库：迁移 `202608010001` 与 `202608020002` 已应用；8 张用户/账号业务表和 2 张内部保留期表均启用并强制 RLS。
- Storage：`lumno-user-media` 为私有 Bucket，5 MiB 单文件上限，4 条所有者策略。
- Edge Functions：`telemetry-ingest`、`delete-account` 均为 ACTIVE；无身份请求返回 401。
- 数据保留：账号关联的每日统计与配置属性保留 24 个月，之后只汇总为不含用户、设备或配置标识的“月份 + 指标”长期总数；统计去重批次保留 30 天，同步幂等操作记录保留 90 天。
- 客户端：`src/shared/cloud-config.js` 已填入生产 Project URL 和 Publishable Key。
- Auth：邮箱注册已开启，OTP 已设为 6 位、600 秒；Resend Custom SMTP 已启用，发件人为 `Lumno <noreply@auth.kubai.design>`，数字 OTP 模板已部署。
- OAuth Server：已开启 OAuth 2.1，授权页为 `https://lumno.kubai.design/oauth/authorize/`，动态客户端注册关闭；开发版和 Chrome Web Store 版分别使用独立的 Public Client + PKCE。
- 社交登录：Google 与 GitHub 均已接入，回调固定为 Supabase Auth callback；Google OAuth 已发布为正式版，Lumno 名称、图标、首页和隐私政策已通过品牌验证并发布；邮箱 OTP 作为内测入口折叠显示。
- 远程冒烟：`node scripts/smoke-supabase-remote.js` 已实测配置同步、私有媒体、统计和账号删除，测试数据清理为 0 遗留。
- 生产用户验收：真实邮件达到 `delivered`，6 位 OTP 成功换取会话；普通用户会话下完成双设备同步、版本冲突、私有媒体上传下载和“未同意统计返回 403”验证，临时媒体与设备记录已清理。
- Web/插件 OAuth 验收：Google 真实账号已完成 Web 登录；随后从开发版扩展经 OAuth 2.1 + PKCE 返回插件，插件显示同一邮箱、“已连接”和最近同步时间。GitHub 登录链路此前也已完成。
- Google 品牌验收：真实账号选择页显示 Lumno 图标、应用名 `Lumno` 和 Lumno 隐私政策链接，不再以 Supabase 项目域名作为面向用户的应用名称。

## 已完成的本地验证

- Supabase CLI 2.111.0。
- 首个 schema 已在本地 Supabase/Postgres 17 完整执行；当前机器 Docker 不可用，因此保留期迁移改用远程 dry-run、迁移历史核对、数据库 lint 与远程冒烟验证。
- `supabase db lint --local --level warning` 无 schema 错误。
- 两个 Edge Functions 在 Deno 2.1.4 兼容运行时成功启动。
- 未认证访问 `telemetry-ingest` 和 `delete-account` 均返回 401。
- `node scripts/smoke-supabase-local.js` 已实测 OTP 登录、配置推拉、私有壁纸、同意后的聚合统计和账号删除。

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

## 5. 配置邮箱 OTP

在 Authentication → Email Templates 中，把 **Magic link or OTP** 和 **Confirm sign up** 两个模板都改成显示 OTP，而不是只放登录链接。前者用于已有账号登录，后者用于首次注册；只修改一个会造成新老用户体验不一致。例如：

```html
<h2>Your Lumno sign-in code</h2>
<p>Enter this code in Lumno: <strong>{{ .Token }}</strong></p>
<p>This code expires shortly and can only be used once.</p>
```

Lumno 客户端使用 `type: email` 验证该代码。Supabase 官方说明：要发送 OTP，Magic Link 模板中必须包含 `{{ .Token }}`；见 [Passwordless email login](https://supabase.com/docs/guides/auth/auth-email-passwordless) 和 [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates)。

生产模板使用 HTML **片段**，不包含 `<!doctype>`、`<html>` 或 `<body>` 外壳。本项目实测完整 HTML 文档会让 Auth 回退到默认确认链接模板；判断是否真正生效必须查看 Resend 中最新邮件的主题和正文，不能只看 Dashboard 的保存状态。邮件标题也不要放 `{{ .Token }}`，避免验证码出现在锁屏通知中。

建议设置：

- OTP 长度：6；
- OTP 有效期：600 秒；
- 再次发送间隔：至少 60 秒；
- 开启邮箱安全通知；
- 公测前考虑邀请制，或通过受控网页承载 CAPTCHA 后再允许开放注册。

## 6. 配置生产 SMTP

Supabase 默认邮件服务只适合测试，通常只向项目团队邮箱发送且额度很低。生产必须在 Authentication → SMTP Settings 配置自有 SMTP，并给发件域名配置 SPF、DKIM、DMARC。参考 [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)。

当前生产使用 Resend：Supabase 通过 `smtp.resend.com:587` 发送，API Key 仅授予 Sending access 并限制到 `auth.kubai.design`。密钥只保存在 Resend 与 Supabase 的加密配置中，不进入仓库、插件包或终端环境。Free 计划适合内测；发送量增长后再评估其付费计划或 AWS SES。

上线前至少实测 Gmail、Outlook、QQ 邮箱和 163 邮箱的送达、垃圾箱和延迟。

## 7. 填入插件公开配置

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

生产后端可重复冒烟：

```bash
node scripts/smoke-supabase-remote.js
```

该脚本要求本机已登录 Supabase CLI，会在内存中使用服务端凭证创建一次性测试用户，并在成功或失败路径清理；不得放入不受信任的 CI 环境。

## 8. 上线验收

用两个不同浏览器配置文件测试：

1. A 设备登录并修改主题、快捷方式和壁纸。
2. B 设备登录同一邮箱，确认设置、壁纸列表和当前选择恢复。
3. A/B 同时修改同一设置，确认不会静默覆盖且显示冲突计数。
4. 断网修改后重启浏览器，恢复网络并确认 Outbox 清空。
5. 未开启统计时确认本地不存在 `_lumno_cloud_usage_v1_`。
6. 开启统计后确认只出现白名单计数和枚举，不出现 URL、标题或查询。
7. 关闭统计后确认本地待上传计数立即清除。
8. 删除一张壁纸，确认 Storage 原图、缩略图和 metadata 都消失。
9. 永久删除账号，确认 Auth 用户、数据库行和媒体对象全部删除，本机设置仍在。
10. 退出登录后确认插件继续以游客模式工作。
11. 分别用 Google 与 GitHub 从插件发起网页登录，确认出现正确授权范围并返回插件。
12. 篡改回调 `state` 或使用另一个扩展 ID 的回调，确认登录失败且不保存会话。

当前已完成开发版扩展的 Google 真实账号链路；Chrome Web Store 版仍需在商店 ID 对应的 Public Client 上做一次发布包验收。

## 9. 发布前隐私工作

- 审核并发布 `docs/privacy-policy-draft.md` 的当前定稿内容。
- 将隐私政策发布到 HTTPS 公共页面，并填入 Chrome Web Store Dashboard。
- 商店页面明确描述账号同步、壁纸上传和可选聚合统计。
- 按 `docs/chrome-web-store-data-disclosure.md` 填写单一用途、权限理由与数据使用声明，并在每次发布前重新对照实际代码。
- Dashboard 的数据使用声明与实际代码、产品内披露和隐私政策保持一致。
- 不要把“同意统计”解释为可以收集浏览数据；Chrome Web Store 的 Limited Use 仍要求数据与单一用途必要相关。参考 [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies)。

## 10. 回滚

如果云服务异常但插件已发布：

1. 将下一版 `PROJECT_URL` 和 `PUBLISHABLE_KEY` 置空；
2. 插件会自动回到游客模式，不再发起云请求；
3. 不要直接删除生产数据库，先导出并保留用户删除通道；
4. 修复后重新启用，并验证旧 Refresh Token 和 schema 兼容性。
