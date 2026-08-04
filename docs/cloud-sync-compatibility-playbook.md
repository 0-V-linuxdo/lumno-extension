# Lumno 账号同步兼容、数据库发布与多机器协作规范

> 状态：生效中<br>
> 生效日期：2026-08-04<br>
> 适用范围：Lumno 浏览器扩展、Supabase 数据库、PostgREST RPC、Edge Functions、账号同步与多机器开发<br>
> 维护方式：每季度复查一次；发生同步事故、协议升级或生产数据库变更后立即复查<br>
> 唯一原则：生产数据库先兼容新旧客户端，再发布新客户端；已经部署的 migration 永不修改

> 2026-08-04 落地状态：生产已部署 `019` 白名单修复和 `020` 同步协议 v2；匿名能力探测为 protocol 2、52/52 键；一次性测试账号已通过逐项拒绝、旧链路、私有媒体、分析和删除保护冒烟。客户端兼容代码已完成并通过 CI，数据库已先行，可进入客户端发布流程。

## 目录

1. [目标和结论](#1-目标和结论)
2. [兼容性总合同](#2-兼容性总合同)
3. [存储与同步范围分类](#3-存储与同步范围分类)
4. [数据库和 RPC 演进规则](#4-数据库和-rpc-演进规则)
5. [标准功能开发流程](#5-标准功能开发流程)
6. [标准数据库发布流程](#6-标准数据库发布流程)
7. [多机器与多人协作模式](#7-多机器与多人协作模式)
8. [自动化门禁](#8-自动化门禁)
9. [本次 22023 事故复盘与修复计划](#9-本次-22023-事故复盘与修复计划)
10. [回滚、降级与故障处理](#10-回滚降级与故障处理)
11. [Definition of Done](#11-definition-of-done)
12. [落地计划](#12-落地计划)
13. [官方依据](#13-官方依据)

## 1. 目标和结论

这份规范解决四类问题：

- 新数据库上线后，旧版客户端仍能读写原有数据；
- 新客户端提前到达旧数据库时，新功能安全留在本机，不拖垮整个账号同步；
- 新同步键、RPC 或字段变化不会因为修改旧 migration 而漏部署；
- 两台机器可以并行开发，但只有经过整合、测试和生产能力验证的版本才能发布。

以后所有数据库和客户端组合都必须满足下面的矩阵：

| 客户端 | 数据库 | 必须达到的结果 |
| --- | --- | --- |
| 旧客户端 | 旧数据库 | 保持原有能力 |
| 旧客户端 | 新数据库 | 原有 RPC、字段和权限继续可用，旧客户端仍能写入 |
| 新客户端 | 旧数据库 | 自动降级；新同步键暂留本机，旧同步能力继续工作 |
| 新客户端 | 新数据库 | 启用完整新能力 |

任何一个格子失败，都不能发布。

## 2. 兼容性总合同

### 2.1 服务端先扩展，客户端后启用

涉及账号同步的功能统一采用以下顺序：

```text
开发与测试
→ 新增 forward-only migration
→ 部署到开发或预览环境
→ 旧客户端 + 新数据库兼容测试
→ 部署生产数据库
→ 生产能力探测通过
→ 发布新客户端
→ 观察采用率和错误率
→ 必要时在未来执行收缩
```

不得先发布会发送新协议或新同步键的客户端，再等待数据库跟进。

### 2.2 旧客户端合同默认永久保留

- 已经被商店版调用的 RPC 名称、参数、返回结构和权限默认不删除、不收窄。
- 需要破坏性变化时，新增协议版本和 RPC 名称，例如 `lumno_push_setting_changes_v2`，不要原地改变旧客户端依赖的请求合同。
- 旧协议只有在有明确采用率数据、风险评审和迁移方案时才允许下线。
- 最短保留窗口为 180 天，并且活跃客户端升级率达到 99.5% 以上；无法获得可靠采用率时，不下线旧协议。
- 数据库回收旧字段、旧约束或旧 RPC 必须是独立发布，不能与新能力首次上线放在同一个 migration 中。

### 2.3 新客户端必须能面对旧数据库

新客户端不能假设生产 migration 已经完成。账号同步初始化时应先读取服务端能力：

```json
{
  "current_protocol": 2,
  "supported_protocols": [1, 2],
  "sync_keys": ["..."],
  "max_push_batch": 100,
  "schema_hash": "..."
}
```

如果能力接口不存在、请求失败或不包含新键：

- 继续使用服务端明确支持的旧协议；
- 新设置在当前设备正常生效；
- 新设置不进入会反复失败的远端批次；
- UI 显示“等待服务端支持”或内部诊断状态，不把整个账号同步标记为不可用；
- 服务端能力升级后，从当前本机快照重新生成待同步操作。

### 2.4 一个未知键不能拖垮整批同步

当前数据库遇到非法同步键会抛出 `22023`，事务会拒绝整批操作。新协议应改成逐项返回：

```json
{
  "accepted": [{ "operation_id": "...", "key": "..." }],
  "conflicts": [],
  "rejected": [
    {
      "operation_id": "...",
      "key": "...",
      "reason": "unsupported_sync_key",
      "retryable": false
    }
  ]
}
```

未知键仍然必须被拒绝，不能为了兼容而放开安全白名单；区别是只隔离不支持的操作，不影响其他合法配置。

### 2.5 错误必须保留诊断信息

传输层应保留 PostgREST 返回的：

- `code`
- `message`
- `details`
- `hint`
- HTTP status
- RPC 名称和同步协议版本

面向用户显示可理解的文案，诊断面板可以显示受控的错误码和失败阶段。不能只展示 `22023` 而丢失 `Invalid sync change` 等服务端信息；日志中不得写入 Token、邮箱、配置值或其他敏感内容。

## 3. 存储与同步范围分类

每个新配置键在编码前先完成分类：

| 类型 | 位置 | 是否需要数据库 migration | 示例 |
| --- | --- | --- | --- |
| 仅本机 | `chrome.storage.local` | 否 | 与设备环境绑定、不适合跨设备复制的视觉状态 |
| 浏览器内置同步 | `chrome.storage.sync` | 否 | 游客模式下适合跨设备同步的小型配置 |
| Lumno 账号同步 | Cloud 模式下的本地缓存 + Outbox + Supabase | 是 | 用户明确期望跨浏览器恢复的设置 |
| 私有媒体 | 本地存储 + Edge Function + 私有 Storage | 通常需要 | 壁纸、快捷方式自定义图标 |

分类规则：

1. 不需要跨设备的设置保持 local-only，不进入导入导出、Chrome Sync、Cloud `SYNC_KEYS`、Outbox 或数据库白名单。
2. 功能可以先本机可用，账号同步能力作为后续独立变更加入。
3. 一旦加入 `SYNC_KEYS`，必须同时声明其最低同步协议版本并提供对应的新 migration。
4. 删除同步键时先停止新客户端写入并保留读取兼容，不能直接从服务端白名单和旧 RPC 中删除。

注意：代码里的 `storageArea: 'local'` 只表示该键在扩展侧落到 `chrome.storage.local`，用于规避 Chrome Sync 的容量或形态限制；只要它仍在 `SYNC_KEY_DEFINITIONS` 中，它就是 Lumno 账号同步键。真正的“仅本机”设置不得进入 `SYNC_KEY_DEFINITIONS`。

建议在 `src/shared/cloud-sync-schema.js` 中把单纯的字符串数组升级为带元数据的合同：

```js
const SYNC_KEY_DEFINITIONS = {
  selectionQuickActionsTriggerStyle: {
    key: '_x_extension_selection_quick_actions_trigger_style_2026_unique_',
    introducedProtocol: 2,
    storageClass: 'account-sync'
  }
};
```

## 4. 数据库和 RPC 演进规则

### 4.1 Migration 只能前进

- 已经合并到 `main` 或登记到任一共享 Supabase 环境的 migration 视为不可变文件。
- 任何修复都创建新的时间戳 migration，不能编辑旧文件期待 `db push` 重跑。
- 生产数据库只由 migration 或受控发布流水线修改，不能直接在 Dashboard SQL Editor/Table Editor 修改后不回写 Git。
- 如因紧急情况通过 Management API 执行 SQL，必须把完全相同的 SQL 保存为新 migration，并核对、修复 migration history。
- 同一时间只有一个数据库发布者执行生产 `db push` 或等价操作。

Supabase 通过 `supabase_migrations.schema_migrations` 记录已执行的时间戳；后续 push 会跳过已登记版本。因此“修改旧 migration 文件”不会升级生产数据库。

### 4.2 使用 Expand → Migrate → Contract

数据库变化拆成三个阶段：

1. **Expand**：先增加可空字段、新表、新索引、新 RPC 或新协议，不删除旧能力。
2. **Migrate**：后台回填数据；新旧客户端并行；服务端同时接受旧、新请求。
3. **Contract**：确认旧客户端退出支持窗口后，单独删除旧字段、约束或 RPC。

禁止在一次发布中执行以下组合：

- 新增必填字段并立刻要求所有写入方提供；
- 重命名或删除旧字段，同时发布使用新字段的客户端；
- 改变旧 RPC 参数名、参数类型或返回结构；
- 收紧 RLS、约束或枚举，使旧客户端合法请求变成拒绝；
- 修改已有 migration 代替新 migration。

### 4.3 版本化同步协议

当前未版本化 RPC 作为 legacy v1 保留：

- `lumno_push_setting_changes`
- `lumno_pull_setting_changes`

当前已新增：

- `lumno_get_sync_capabilities`
- `lumno_push_setting_changes_v2`
- `lumno_pull_setting_changes_v2`

数据库维护独立的协议白名单：

- `lumno_sync_keys_v1()`：冻结旧客户端认识的 49 个键；
- `lumno_sync_keys_v2()`：包含当前 52 个键；
- 新客户端只按 capabilities 返回的协议白名单组装批次；
- v2 RPC 只接受 v2 白名单，并逐项返回 `rejected`。

`019/020` 属于 Expand 阶段。为保护事故期间已经出现、尚未升级到 v2 但会发送三个新键的过渡客户端，legacy RPC 暂时保留当前 52 键服务端白名单，不在同一次发布中收窄。新客户端的 v1 降级合同严格限制为 49 键。只有过渡版本退出支持窗口后，才可用独立 Contract migration 收窄 legacy RPC。

不要依赖同名 PostgreSQL 函数重载实现版本选择。PostgreSQL 支持重载，但默认参数和相近签名可能造成调用歧义；对公开 PostgREST API 使用清晰的新 RPC 名称更容易审计和回滚。

新建或改变 RPC 后，应在 migration 中触发 PostgREST schema cache reload，并在部署后等待 API 健康再执行冒烟验证。

### 4.4 旧客户端拉取新数据

目标状态是 v1 pull 只返回 v1 白名单内的键，v2 pull 只返回 v2 白名单内的键。当前 Expand 过渡期的 legacy pull 可能返回 52 键；已部署旧客户端会忽略不认识的键，新客户端 v1 降级只清理 capabilities 明确支持的 49 键，因此不会误删本机 v2 设置。过渡窗口结束后再单独收窄 legacy pull。

服务端不得把“当前最新全局白名单”直接应用到所有历史协议。

## 5. 标准功能开发流程

### 5.1 开始开发前

你需要在功能说明或 PR 中回答：

1. 这个功能是否产生新配置键？
2. 配置是 local-only、Chrome Sync 还是 Lumno 账号同步？
3. 旧客户端遇到新数据库后是否仍能写入？
4. 新客户端遇到旧数据库时如何降级？
5. 是否需要新 RPC、表、字段、约束、Edge Function 或媒体类型？
6. 哪个协议版本首次支持？

### 5.2 纯本机功能

如果功能不需要账号跨设备同步：

- 正常在功能分支开发；
- 使用 `chrome.storage.local`；
- 不加入 Cloud `SYNC_KEYS`；
- 测试不存在 Sync → local 的一次性导入；
- 不需要等待数据库工作。

### 5.3 需要账号同步的功能

一个完整变更至少包含：

- 客户端配置定义和存储分类；
- 最低同步协议版本；
- 新的 forward-only migration；
- 旧客户端/新数据库测试；
- 新客户端/旧数据库降级测试；
- 当前客户端/当前数据库测试；
- 生产能力探测；
- 发布与回滚说明。

在数据库尚未部署时，开发版可以让功能本机生效，但不得把不受支持的键发送到生产 Outbox。

## 6. 标准数据库发布流程

### 6.1 开发与预览

1. 从最新 `main` 创建功能分支。
2. 使用 `supabase migration new <description>` 创建唯一 migration。
3. 在本地 Supabase 或隔离的开发/预览项目执行完整 migration 链。
4. 运行数据库 lint、schema 测试和新旧协议合同测试。
5. 把 migration、客户端适配、测试和文档一起提交到 PR。

如果条件允许，使用独立 Supabase Preview/Persistent Branch 或独立 staging 项目，不用生产数据做开发验证。

### 6.2 生产前门禁

部署生产数据库前必须确认：

- migration 文件是新增的，没有修改历史 migration；
- `supabase migration list` 中本地与远端历史一致；
- `supabase db push --dry-run` 只包含预期 migration；
- staging 上旧客户端写入成功；
- staging 上新客户端在 migration 前能降级、migration 后能启用；
- RLS、媒体权限和隐私白名单没有回退；
- PostgREST schema cache 已刷新；
- 回滚采用 forward-fix，不依赖删除生产数据或回退 migration history。

### 6.3 生产部署

1. 指定唯一发布者和维护窗口。
2. 记录部署前 migration 列表、RPC 能力和关键健康状态。
3. 只部署 Expand 阶段的向后兼容 migration。
4. 等待数据库、Auth、API、Storage 和 Edge Functions 健康。
5. 运行旧协议和新协议生产冒烟。
6. 运行所有 `SYNC_KEYS` 的生产能力探测。
7. 通过后再允许客户端发布。

### 6.4 客户端发布

- 客户端首次启动先探测能力，再选择协议；
- 能力不足时不发送新键；
- 发布后观察同步成功率、协议版本、扩展版本和非敏感错误码；
- 不因新版发布而立即删除旧 RPC。

## 7. 多机器与多人协作模式

### 7.1 分支约定

- 每台机器使用自己的功能分支，不在两台机器上同时直接修改并推送同一分支。
- 远端 Git 是机器间唯一代码交接点；未提交文件不视为共享状态。
- 拉取其他机器代码前，先把当前工作保存为正式 commit 或明确的 WIP commit。
- 不自动 stash、覆盖或清理另一台机器的工作。
- 账号同步与数据库变更由一个整合分支收口，再进入 `main`。

推荐结构：

```text
feature/selection-butterfly        本机功能实现
feature/account-sync-next          另一台机器账号工作
integration/cloud-sync-release     合并客户端、协议、migration 和测试
main                               只接收通过门禁的完整版本
```

### 7.2 跨机器交接顺序

1. 功能机器提交并推送独立分支。
2. 数据库机器先提交当前未提交账号工作。
3. 数据库机器 fetch 并 cherry-pick/merge 功能分支。
4. 在整合分支创建新的 migration 和协议适配。
5. 运行全部测试并部署 staging。
6. 由唯一发布者部署生产数据库并验证。
7. 推送整合分支并合并。
8. 功能机器在干净或已提交的工作区拉取最终代码。

### 7.3 变更所有权

| 变更 | 负责人 |
| --- | --- |
| 功能 UI、交互、本机状态 | 功能开发者 |
| `SYNC_KEY_DEFINITIONS` 与协议声明 | 功能开发者 + 同步维护者共同评审 |
| migration、RPC、RLS、Edge Function | 同步维护者 |
| 生产数据库部署 | 当次唯一发布者 |
| 生产能力探测和新旧客户端冒烟 | 发布者执行，另一人复核 |

## 8. 自动化门禁

以下检查应逐步加入仓库，并设为 `main` 的 required status checks：

### 8.1 Migration 不可变检查

- 对比 PR base：已有 `supabase/migrations/*.sql` 内容不得改变；
- 只允许增加新的 migration 文件；
- 生产部署后把 migration SHA-256 加入 `supabase/deployed-migration-checksums.json`，CI 对所有已部署文件逐字节校验；
- 若必须恢复历史文件与已部署内容一致，使用一次明确的审计 PR，并同时新增 forward migration，不能把它当作日常例外。

### 8.2 静态合同检查

- 所有账号同步键都有 `introducedProtocol`；
- 每个协议白名单与客户端定义一致；
- 真正的 device-only 键不进入 Cloud、Chrome Sync、导入导出和后台迁移；`storageArea: 'local'` 的账号键仍需进入 Cloud 合同；
- 新 RPC migration 包含权限收口和 schema cache reload；
- migration 时间戳唯一且严格晚于当前最新版本。

### 8.3 兼容矩阵测试

至少保留两套客户端合同夹具：

- legacy v1 请求与响应；
- current 协议请求与响应。

同时归档“当前商店版”和“支持窗口内最旧客户端”的可安装包或精确构建产物信息。数据库变更不能只用最新开发版验收；至少要用归档的旧版请求夹具自动测试，并在生产发布前用当前商店版完成一次真实写入冒烟。

自动验证：

- legacy push 在新数据库仍被接受；
- legacy pull 不返回新协议专属键；
- current 客户端对旧 capabilities 安全降级；
- current push 在新数据库接受新键；
- 未知键只进入 `rejected`，合法键仍可提交；
- unsupported key 不进入重试死循环；
- migration 前后配置值、版本、cursor 和 Outbox 保持一致。

### 8.4 远端能力探测

新增一个不需要 Service Role 的只读脚本，使用 Publishable Key 检查：

- capabilities RPC 可达；
- 支持的协议版本符合发布要求；
- 当前客户端所有同步键均被目标协议接受；
- schema hash 与发布清单一致。

生产用户写入冒烟仍使用受控的一次性测试账号，并在成功或失败路径清理，不把 Service Role 暴露给不受信任的 CI。

### 8.5 分支保护

`main` 应要求以下检查通过：

- JavaScript/TypeScript/build；
- migration immutable；
- schema contract；
- legacy compatibility；
- staging smoke（数据库变更 PR）；
- 人工批准数据库发布清单。

## 9. 本次 22023 事故复盘与修复计划

### 9.1 现象

- 开发版运行时已经是 `selection-butterfly-v6`；
- 内容脚本仍读取 `triggerStyle: "lumno"`；
- 账号页显示已登录，但同步状态为 `同步异常：22023`；
- 内容脚本显示 `storageArea: "sync"`，说明账号登录与同步接管没有形成稳定完成态。

### 9.2 已确认根因

生产 `lumno_is_sync_key` 对本机 52 个同步键的探测结果为 49 个通过、3 个拒绝：

```text
_x_extension_selection_quick_actions_provider_2026_unique_
_x_extension_selection_quick_actions_icon_set_2026_unique_
_x_extension_selection_quick_actions_trigger_style_2026_unique_
```

Git 历史显示：

- `provider`、`icon_set` 后来追加到了已经存在并部署的 `202608020003/005`；
- `trigger_style` 也被继续追加到相同旧 migration；
- Supabase 已经登记这些时间戳，不会因为文件内容后来变化而重新执行；
- 客户端把新键加入 Outbox 后，生产 `lumno_push_setting_changes` 通过全局白名单校验并抛出 `22023 Invalid sync change`；
- 当前传输层只保留错误 code，因此 UI 只显示 `22023`。

### 9.3 本次修复原则

- 不继续修改 `202608020003_selection_quick_actions_sync_key.sql` 或 `202608020005_full_configuration_and_media_assets.sql`；
- 新增唯一的 forward migration；
- 修复必须保证旧客户端继续调用 legacy RPC 并写入旧键；
- 新客户端在生产能力未就绪时不发送三个新键；
- 部署数据库并探测成功后，才允许发布包含账号同步新键的客户端。

### 9.4 本次执行计划

#### 阶段 A：代码整合

1. 本机把动态蝴蝶功能提交到独立分支，不把继续修改旧 migration 作为解决方案。
2. 另一台机器先提交当前账号同步工作，再合并动态蝴蝶分支。
3. 确认另一台机器是否已经创建新的 migration；如有，避免重复时间戳和重复部署。

#### 阶段 B：数据库修复

1. 使用当前最新 migration 之后的新时间戳创建 forward migration。
2. 至少让生产白名单接受全部 52 个当前同步键。
3. 优先同时加入 capabilities 和 v2 RPC；如需先止血，完整 v2 兼容层必须在商店客户端发布前完成。
4. 保留 legacy RPC 和旧键写入能力。
5. 刷新 PostgREST schema cache。

#### 阶段 C：客户端容错

1. 客户端启动账号同步前请求 capabilities。
2. 只把服务端支持的键放入 push batch。
3. 对已存在但不支持的 Outbox 操作进行隔离，不无限重试。
4. 服务端升级后从本机当前值重新排队。
5. 传输层保留完整错误结构，并在 UI 显示可理解文案。

#### 阶段 D：验收与发布

1. 本地和 staging 执行完整 migration 链。
2. 运行旧客户端 + 新数据库、新客户端 + 旧数据库、新客户端 + 新数据库三组测试。
3. 生产先部署数据库。
4. 生产探测 52/52 同步键通过，legacy/current RPC 均通过。
5. 点击“立即同步”，确认 Outbox 清空、同步状态恢复。
6. 刷新测试页并确认动态蝴蝶：

```text
runtimeRevision: selection-butterfly-v6 或更新版本
storageArea: local
triggerStyle: butterfly
selectionMark: butterfly
```

7. 最后再发布客户端或合并到生产发布分支。

### 9.5 本次验收标准

- 生产能力探测返回 52/52；
- legacy RPC 仍能写入主题等旧键；
- current RPC 能写入三个划词配置键；
- 同一批次包含未知键时，合法配置不会一起失败；
- 账号同步状态不再显示 `22023`；
- 另一台设备能够恢复 `Lumno 蝴蝶`；
- 旧版扩展仍能修改并同步其原有设置；
- migration history 与 Git 文件一致。

## 10. 回滚、降级与故障处理

### 10.1 数据库不做破坏性回滚

生产 migration 失败或逻辑有误时创建新的 forward-fix migration。不要删除 migration history、直接改旧 SQL 或回滚生产数据结构，除非有经过演练的灾难恢复流程。

### 10.2 客户端降级

- capabilities 不可用：使用 legacy v1；
- 新键不受支持：本机生效、远端延迟；
- v2 RPC 异常：不自动退回到可能改变语义的 v1 写入，除非该键明确属于 v1；
- 云端完全不可用：保留本机工作状态和 Outbox，采用退避重试；不丢弃用户配置。

### 10.3 紧急关闭

如果必须暂停账号同步：

- 使用服务端能力或远端开关停止新协议，不删除数据库；
- 客户端保持本机可用；
- 保留用户退出登录和删除账号通道；
- 修复后先验证 legacy 协议和 Refresh Token，再恢复新协议。

## 11. Definition of Done

涉及数据库或账号同步的变更，只有同时满足以下条件才算完成：

- [ ] 新 migration，且没有修改已部署 migration；
- [ ] 明确 storage class 和 introduced protocol；
- [ ] 旧客户端 + 新数据库通过；
- [ ] 新客户端 + 旧数据库安全降级；
- [ ] 新客户端 + 新数据库通过；
- [ ] 不支持的键不会拖垮合法同步批次；
- [ ] 完整错误信息可诊断且不泄露敏感数据；
- [ ] staging migration、lint、RLS 和远端冒烟通过；
- [ ] 生产 migration history 已核对；
- [ ] 生产 capabilities 和 key allowlist 探测通过；
- [ ] 数据库先部署，客户端后发布；
- [ ] 发布者、时间、migration、验证结果和回滚方案有记录；
- [ ] 文档和变更日志已更新。

## 12. 落地计划

当前执行结果：P0 已完成生产修复；P1 的数据库、客户端和测试实现已完成，等待客户端正常发布流程；P2 已落地 checksum、静态合同、兼容矩阵和生产只读探测，独立 staging、分支 required checks 与人工批准环境仍待配置；P3 尚未开始。

### P0：修复当前同步故障

- 合并两台机器的工作；
- 创建新的 forward migration；
- 补齐三个被生产拒绝的划词配置键；
- 部署后验证 52/52；
- 恢复同步后确认现有 Outbox 正常重放并自然排空，不直接删除待同步操作；
- 完成动态蝴蝶跨设备验收。

### P1：建立兼容协议

- 增加 `lumno_get_sync_capabilities`；
- 冻结 legacy v1，新增 v2 push/pull；
- 增加协议级白名单；
- 客户端根据 capabilities 选择协议；
- 未支持的新键在本机延迟同步；
- 服务端按 operation 返回 rejected，不整批失败；
- 传输层保留 PostgREST 完整错误结构。

### P2：建立 CI/CD 门禁

- migration immutable 检查；
- sync key/protocol 静态合同检查；
- 四象限兼容矩阵测试；
- staging 数据库和远端冒烟；
- 生产只读 capabilities/key probe；
- `main` required status checks；
- 数据库变更 PR 的人工批准步骤。

### P3：完善环境与长期运维

- 建立独立 staging 或 Supabase persistent branch；
- 记录协议采用率和非敏感错误率；
- 每季度复查旧协议是否仍需保留；
- 每次生产事故更新本规范和对应回归测试。

## 13. 官方依据

- [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)：migration 创建、团队协作、远端历史和 `db push` 行为。
- [Supabase Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments)：本地、staging、production 和 GitHub Actions 发布模式。
- [Supabase Branching](https://supabase.com/docs/guides/deployment/branching)：隔离的预览/持久分支与生产部署流程。
- [Supabase CLI `db push`](https://supabase.com/docs/reference/cli/supabase-db-push)：已登记 migration 会在后续 push 中跳过，`--dry-run` 可预览待部署内容。
- [PostgREST Functions as RPC](https://docs.postgrest.org/en/stable/references/api/functions.html)：RPC 请求参数与函数暴露规则。
- [PostgREST Schema Cache](https://postgrest.org/en/stable/references/schema_cache.html)：函数或结构变化后的 schema cache reload。
- [PostgreSQL `CREATE FUNCTION`](https://www.postgresql.org/docs/current/sql-createfunction.html)：函数替换、签名和重载规则。
- [GitHub Protected Branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)：通过 required status checks 阻止未验证变更进入主分支。
