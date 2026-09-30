# Gameplay Foundation

本文前半部分记录公共底座阶段的范围与交付。当前已在同一接口上接入 [Home System](HOME_SYSTEM.md)：`GameplayServices.home`、储物面板、睡觉和门口场景切换；底座阶段的测试记录不代表新增 Home 功能已完成游玩验收。

后续 [Fishing / Cooking](FISHING_COOKING.md) 已注册 6 种鱼与 4 种食物，并扩展 `GameplayServices.fishing/cooking`；`Inventory.canExchange/exchange` 支持整笔扣料与产物放入。新增玩法本轮仅进行编译检查，功能验收由用户完成。

当前进一步接入 [正式背包](INVENTORY_SYSTEM.md)：统一物品元数据、网格 UI、槽位操作、双栏仓库和 `GameplayServices.hotbar`。ItemRegistry 为全部物品数据唯一来源，玩家 Stack 只保存引用与数量，快捷栏不持有库存。以下底座阶段描述保留为历史记录。

## 范围与决定

本阶段只建立后续 Home / Fishing / Cooking / Farm 共用接口，不启用睡觉、储物家具、钓鱼、生产、农机、养殖或经济玩法，不新增背包 UI、装备、Buff 或任务系统。

- `ItemRegistry`：稳定字符串 ID、显示名、堆叠上限；初始仅注册木材和石料，初始背包为空。鱼和料理在对应阶段注册。
- `Inventory`：24 格玩家背包；查询、堆叠、增减、转移和 JSON 快照。容量不足或数量不足整笔失败，转移不丢失或复制物品。后续箱子可使用同一类及独立容量。
- `PlayerProgressState`：体力、体力上限、金币；不自动扣除或恢复体力，不提供经济业务。合法变更触发保存请求。
- `GameplayFoundation`：Game 唯一持有的物品、背包、进度和时间服务；世界装卸不重建。交互上下文和世界 enter 上下文取得同一服务。
- `InteractionSystem`：距离选择、统一 `[ E ]` 提示、可用性检查、行为注册/分发、异步防重入与错误结果；保留四个发现点。Game 只协调反馈及过场。
- 时间：统一推进游戏分钟、推进到次日指定时刻；显式推进不改变动画时间、暂停及倍速；原有旅行使用同一接口。
- 存档 v2：使用新 key，读取旧 v1 时补齐空背包和默认进度，保留旧 key；已有安全小屋门外落点也保留。未知物品、非法数量与非法进度安全归一化。

## 实施顺序

1. 物品与背包纯逻辑及测试。
2. 玩家进度、时间 API 和持久 GameplayFoundation。
3. v1 → v2 迁移，读取、保存及损坏数据测试。
4. 统一交互入口，迁移现有行为、提示和输入保护；向世界传递公共服务。
5. 验证公共服务跨世界、异步交互及存档恢复；全量测试、类型检查和生产构建。

## 验收

- 旧发现、登船、进出小屋仍走同一 E 键入口。
- 自定义交互可调用背包、玩家进度和时间；不依赖 Game 新增行为分支。
- 未知物品、负数、小数数量、溢出、满背包、数量不足均不能产生部分变更。
- 切换 HOME / FARM / COTTAGE 后公共状态持续存在；刷新可恢复。
- 长按 E、异步重复按 E、不可用目标、失败行为不会重复执行或卡死入口。
- 旧存档保留发现、时间、世界、天气和画质；新存档保留背包与玩家进度。
- 无新增依赖、复杂 UI 或未授权的后续玩法。

## 后续玩法接入约定

代码位于 `src/gameplay/`。Game 的 `gameplay` 实例实现 `GameplayServices`，通过 `WorldEnterContext.gameplay` 和 `InteractionContext.gameplay` 传给世界及交互行为。`PlayerState` 继续描述航行位置和发现；`PlayerProgressState` 单独保存可变资源，不持有三维对象。

物品定义由 `ItemRegistry.register({ id, name, maxStack })` 注册。初始背包 24 格，每格为空或 `{ itemId, quantity }`。数量必须为正安全整数，堆叠上限最大 9999；容器最多 200 格。`inventory.add/remove/transferTo` 返回 `{ ok: true }` 或 `{ ok: false, reason }`，失败不变更任何参与容器。`count/has/canAdd` 只查询。`snapshot()` 返回独立 JSON 数据，`restore()` 按当前注册定义与运行时容量归一化；不相信存档中任意扩大的容量。

`progress.spendEnergy`、`earnMoney`、`spendMoney` 返回是否成功；`restoreEnergy` 返回实际恢复量。货币必须为非负安全整数，体力在 `[0, maxEnergy]` 范围内。所有成功且实际发生的变更调用保存回调，失败或无变化不写存档。

`time.advanceMinutes(minutes)` 和 `time.advanceToNextDay(hour = 6, minute = 0)` 返回 `{ fromGameTime, toGameTime, gameMinutes, daysPassed }`。`gameTime` 沿用原项目模拟秒单位（480 秒 = 游戏一天），`gameMinutes` 是游戏分钟。次日接口始终前往当前日的下一天，即使今天尚未到指定时刻。显式推进在暂停时也生效，保持 `elapsed`、`paused`、`timeScale` 不变。未来作物结算可使用 `gameTime` 和世界 `lastSimulatedGameTime`，本阶段不运行离线模拟。

全局行为通过 `InteractionActions.register(action, handler)` 注册一次；世界特有行为可以直接设置目标 `onInteract`。目标包含稳定 `id`、`name`、位置、`action`，可选 `range`、`prompt` 和 `unavailable(context)`。不可用检查返回玩家可读的原因，或 `undefined` 表示可执行。检查函数必须无副作用。保持附近不可用物件的提示可见，避免自动跳到较远物件。

```ts
// 示例仅说明接口；不会给当前地图添加领取物品玩法。
const target: InteractionTarget = {
  id: 'example_resource', name: '资源', action: 'COLLECT',
  x: 0, y: 0, z: 0, prompt: '收取资源',
  unavailable: ({ gameplay }) => gameplay.inventory.canAdd('wood', 1)
    ? undefined : '背包已满',
  onInteract: ({ gameplay }) => {
    const result = gameplay.inventory.add('wood', 1);
    return result.ok
      ? { status: 'success', message: '获得木材 × 1' }
      : { status: 'unavailable', message: '背包已满' };
  },
};
```

所有 E 键执行调用 `InteractionSystem.interact(context, actions)`；提示调用 `getPrompt`，不在 Game 添加新 action 分支。结果包含 `status`、可选 `message/changed`；内置发现另有 `discovery`。`changed` 用于要求保存世界局部状态；背包、体力和时间已自行请求保存。异步 handler 执行期间同一系统保持 busy，失败返回 error 并释放入口。行为负责自身的多步业务一致性；公共容器只保证各次增减及整笔容器转移原子性。

## 存档布局与迁移

- 新 key：`bottle-sea.save.v2`，`version: 2`；新增根字段 `inventory`、`progress`，Home 阶段另补兼容的可选 `home` 字段。
- 优先读取 v2，缺失或损坏时尝试 `bottle-sea.save.v1`；迁移只补默认字段，保留原发现、航行、时间、天气和画质。
- 读取不立即写盘；下一次有效状态变化或页面隐藏/关闭按现有节流或 flush 机制保存 v2。原 v1 key 不删除、不改写。
- HOME 恢复码头或 `home_cottage_exit` 安全门外落点；Home 阶段通过 `cottage_entry` 标记恢复室内安全入口。FARM 恢复码头，TRAVEL 不作为持久世界恢复；旅行身份仍只区分 HOME / FARM。
- 未知版本不会猜测字段；未知物品丢弃，非法数量丢弃，超上限堆叠截到注册上限，非法进度回退或限幅。保存时使用与运行时相同的物品注册表。
- 世界装卸不影响公共状态；存档只保存快照，不含 handler、Mesh、材质或类实例。

## 交付验证（2026-09-30）

- 42 个测试文件、162 项测试通过，TypeScript strict 检查及生产构建通过。
- 新增验证覆盖物品定义、堆叠与数量边界、满背包整笔失败、容器转移、体力与金币边界、次日推进、异步交互防重入、不可用/失败恢复、v1 迁移与 v2 恢复。
- 集成测试验证公共状态经过 HOME / COTTAGE / HOME / TRAVEL / FARM / HOME 及加载失败恢复仍为同一实例；多次有效变更节流到一次保存，恢复后背包、玩家进度、时间一致。
- 本地浏览器实测：E 登船，家园→农场→家园往返完成；目的地面板关闭后可重新打开；E 进屋、出屋后恢复主岛；E 发现宝箱后手记为 1 / 4，再次发现仍为 1 / 4。控制台未出现 warn/error。
- 浏览器使用已有隔离预览入口，未覆盖用户普通游戏存档。新增物品与玩家进度的完整持久化由上述集成测试验证；没有新增玩法 UI 或重做性能验收。
