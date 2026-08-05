# Lumno Chrome Web Store 数据披露清单

更新日期：2026-08-03

这份清单用于填写 Chrome Web Store Dashboard。发布者需要按 Dashboard 当时显示的字段逐项核对；若实现、权限或政策文案变化，先更新披露，再上传新版。

## 单一用途

建议填写：

> Lumno 是一个本地优先的浏览器效率工具，提供命令栏、新标签页、搜索与标签页操作；普通配置使用 Chrome 浏览器内置同步，自定义壁纸和快捷方式图标保存在本机。

## 数据类型选择

| Dashboard 数据类型 | 选择 | 说明 |
| --- | --- | --- |
| Personally identifiable information / 个人身份信息 | 否 | Lumno 不提供独立账号，也不接收邮箱或用户 ID。 |
| Authentication information / 身份验证信息 | 否 | Lumno 不处理登录凭据、OAuth 授权码或会话 Token。 |
| Personal communications / 个人通信 | 否 | 不采集邮件、聊天或其他通信内容。 |
| Location / 位置信息 | 否 | 不采集精确或粗略位置。粗粒度平台类型不是位置。 |
| Web history / 浏览历史 | 否（不传输） | 核心功能可在本机读取浏览历史和当前上下文，但不会把它们发送到 Lumno 或开发者服务器。 |
| User activity / 用户活动 | 否 | 不上传功能使用次数或行为统计。 |
| Website content / 网站内容 | 否（不传输） | 不向 Lumno 或开发者服务器上传网页正文、标题、URL、搜索词、书签内容或 Cookie。 |
| Financial and payment information / 财务与支付 | 否 | 不采集。 |
| Health information / 健康信息 | 否 | 不采集。 |

## 数据使用认证

应确认：

- 不出售或转让用户数据，不用于个性化广告、信用评估或画像；
- 不向 Lumno、开发者服务器或第三方上传浏览数据、网站内容和使用统计；
- 遵守 Chrome Web Store User Data Policy 的 Limited Use 要求。

## 数据保留与公开链接

- 普通配置由 Chrome 浏览器内置同步保存，保留和删除遵循用户的 Chrome 账号及浏览器设置；
- 自定义壁纸、快捷方式图标及其他本机数据保存在浏览器扩展存储或 IndexedDB，可通过删除对应内容或卸载扩展移除；
- Lumno 不维护账号数据库、云端媒体库或产品使用统计；
- 隐私政策：`https://lumno.kubai.design/privacy/`；
- 开发者/数据控制者：中文为“枯白啃设计”，其他语言为“Kubai087”；
- 隐私与安全联系邮箱：`i@kubai.design`。

## 权限理由核对

Dashboard 中的每项权限理由应只描述实际需要：

- `storage`：保存本地设置，并通过 Chrome 浏览器内置同步同步普通配置；
- 标签页、书签、历史等现有权限：仅支持用户主动触发的本地搜索或标签页操作，不把内容发送到 Lumno 或开发者服务器；
- `<all_urls>`：用于用户主动启用的页面快捷操作、画中画和站点图标能力，不用于向开发者服务器收集浏览数据。

上传前必须再次执行源码和产物检查，确认不存在账号、遥测或远程同步运行时。
