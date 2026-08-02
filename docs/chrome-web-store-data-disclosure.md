# Lumno Chrome Web Store 数据披露清单

更新日期：2026-08-02

这份清单用于填写 Chrome Web Store Dashboard。发布者需要按 Dashboard 当时显示的字段逐项核对；若实现、权限或政策文案变化，先更新披露，再上传新版。

## 单一用途

建议填写：

> Lumno 是一个本地优先的浏览器效率工具，提供命令栏、新标签页、搜索与标签页操作，并在用户主动登录后提供 Lumno 配置和自定义壁纸的跨设备同步。

可选产品使用统计只用于理解 Lumno 功能采用情况和改进产品，不用于广告、用户画像、信用评估或出售数据。

## 数据类型选择

| Dashboard 数据类型 | 选择 | 说明 |
| --- | --- | --- |
| Personally identifiable information / 个人身份信息 | 是 | 登录时处理邮箱、Supabase 用户 ID 和设备 ID。 |
| Authentication information / 身份验证信息 | 是 | 处理 OAuth 授权码及 Supabase 会话 Token；Token 仅存扩展私有 IndexedDB，不进入 Chrome Sync。 |
| Personal communications / 个人通信 | 否 | 不采集邮件、聊天或其他通信内容。 |
| Location / 位置信息 | 否 | 不采集精确或粗略位置。粗粒度平台类型不是位置。 |
| Web history / 浏览历史 | 否（不传输） | 核心功能可在本机读取当前上下文，但不会把浏览历史、当前网页、标题、标签内容或搜索词上传到 Lumno 云端。 |
| User activity / 用户活动 | 是 | 仅在登录且主动开启统计后，上传白名单功能次数以及配置的布尔值、枚举和数量。 |
| Website content / 网站内容 | 否（不传输） | 不向 Lumno 云端上传网页正文、标题、URL、搜索词、书签内容或 Cookie。用户主动配置的快捷方式 URL 和黑名单规则只进入其私有同步空间。若 Dashboard 将这些用户主动配置也归为网站内容，应改选“是”并沿用本说明。 |
| Financial and payment information / 财务与支付 | 否 | 不采集。 |
| Health information / 健康信息 | 否 | 不采集。 |

## 数据使用认证

应确认：

- 数据仅用于向用户提供或改进已明确披露的 Lumno 单一用途；
- 不出售或转让用户数据，不用于个性化广告、信用评估或与单一用途无关的画像；
- 除提供服务所需的 Supabase、Google 和 GitHub 外，不向第三方披露；
- 遵守 Chrome Web Store User Data Policy 的 Limited Use 要求；
- 传输使用 HTTPS，账号业务表与内部保留期表强制 RLS，壁纸 Bucket 为私有；
- 用户可关闭统计、退出登录或永久删除账号和云端数据。

## 数据保留与公开链接

- 账号和同步数据：保留到用户删除相应数据或永久删除账号；
- 账号关联的每日统计与配置属性：最长 24 个月；
- 长期趋势：只保留不含用户、设备、邮箱或配置属性的月份 + 指标总次数；
- 统计去重批次：30 天；同步幂等操作记录：90 天；
- 隐私政策：`https://lumno.kubai.design/privacy/`；
- 开发者/数据控制者：中文为“枯白啃设计”，其他语言为“Kubai087”；
- 隐私与安全联系邮箱：`i@kubai.design`。

## 权限理由核对

Dashboard 中的每项权限理由应只描述实际需要：

- `storage`：保存本地设置、同步状态与待发送队列；
- `identity`：以 OAuth 2.1 + PKCE 完成 Lumno 网页登录并安全返回扩展；
- `alarms`：在 MV3 后台休眠后恢复同步与统计上传；
- 标签页、书签、历史等现有权限：仅支持用户主动触发的本地搜索或标签页操作，不把内容发送到 Lumno 云端；
- Supabase 与 Lumno Web 的 host permissions：登录、同步私有配置和媒体、可选统计以及账号删除。

上传前必须再次执行源码和产物检查，确认没有 Secret Key、数据库密码、SMTP 密钥或服务角色凭证。
