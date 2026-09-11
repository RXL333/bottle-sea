# Bottle Sea 2.x — World Expansion Foundation 设计规范

## 1. 目标

本阶段只建立《瓶中沧海》的多世界扩展基础，不实现完整农场玩法。

核心目标是把现有单一 `World` 架构升级为可切换的多世界架构，并用一艘玩家交通船把“家园岛”和“农场岛原型”连接起来。

最终玩家体验应是：

`HomeWorld → 登船 → TravelWorld 航行转场 → FarmWorld 原型 → 登船返回 → TravelWorld → HomeWorld`

在整个流程中，时间、天气、玩家进度和家园岛状态持续存在，切换地图不会重建整个 `Game`，也不会破坏现有浏览、探索、昼夜、风暴、水下、交互、声音和性能体系。

本阶段完成后，后续家园、钓鱼、农业、农机、畜牧、深海和遗迹地图都基于这套基础扩展。

---

## 2. 已确认的产品方向

1. 保留现有小岛，正式定义为 **HomeWorld / 家园岛**。
2. 农场位于另一座更大的岛，正式定义为 **FarmWorld / 农场岛**。
3. 家园岛和农场岛属于同一个瓶中世界、同一片海域、同一时间与天气体系。
4. 技术上不同地点使用独立 World，避免所有地图长期同时加载。
5. 玩家通过小型交通船前往其他地点。
6. 旅行不是普通传送按钮，而是可见的短航行动画，用海雾与镜头自然隐藏世界加载和卸载。
7. 继续保持纯前端 Vite + TypeScript + Three.js，可继续部署 GitHub Pages。
8. 存档采用浏览器本地存储方案，第一阶段使用 `localStorage` 即可。
9. 当前阶段只建设多世界和旅行地基，不实现耕种、动物、农机、背包、经济等后续系统。

---

## 3. 总体架构

采用 **单 Three.js Scene + 可替换 ActiveWorldRoot** 的方案，而不是每张地图都重新创建完整 Scene。

```text
Game
├─ Persistent Layer
│  ├─ Renderer
│  ├─ Scene
│  ├─ Camera
│  ├─ GameClock
│  ├─ GlobalWeatherState
│  ├─ PlayerState
│  ├─ SaveSystem
│  ├─ SoundSystem
│  └─ HUD
│
├─ WorldManager
│  ├─ HomeWorld
│  ├─ TravelWorld
│  ├─ FarmWorld
│  └─ FutureWorld...
│
├─ TravelSystem
└─ Camera / Controls
```

关键原则：

- `Game` 常驻。
- `Renderer`、主 `Scene`、主 `Camera`、`GameClock`、全局天气、玩家状态、存档、HUD 常驻。
- 同一时刻只有一个主要可玩世界处于 Active 状态。
- `WorldManager` 负责 World 生命周期。
- `TravelSystem` 负责旅行流程，不负责 World 内部玩法。
- 每个 World 只管理属于自己的视觉对象和局部系统。
- `Game` 不再直接了解某个具体 World 内部是否存在灯塔、鱼群、农作物等对象。

---

## 4. 为什么不采用多 Scene 常驻方案

当前项目的 Renderer、Camera、昼夜、天气、Fog、HUD、探索控制器等已经围绕主 Scene 组织。如果每张地图都创建独立 `Scene`，会引入额外的灯光、Fog、Controller、天气表现和渲染状态同步问题。

因此本阶段采用：

```text
THREE.Scene
├─ PersistentRoot
└─ ActiveWorldRoot
```

切换世界时只替换 `ActiveWorldRoot`。

逻辑层仍然把 Home、Travel、Farm 看作独立 World；渲染层共享 Renderer、Scene 与 Camera。

这样既满足地图隔离，也最大限度复用现有架构。

---

## 5. GameWorld 生命周期接口

所有 World 使用统一契约。具体 TypeScript 形式可按现有代码风格调整，但职责必须保持一致。

建议接口概念：

```ts
interface GameWorld {
  readonly id: WorldId;
  readonly root: THREE.Group;

  load(context: WorldLoadContext): void | Promise<void>;
  enter(context: WorldEnterContext): void;
  update(context: WorldUpdateContext): void;
  leave(context: WorldLeaveContext): void;
  dispose(): void;

  getSpawnPoint(id?: string): SpawnPoint;
}
```

职责定义：

- `load()`：创建或异步准备本 World 所需资源。
- `enter()`：World 加入 Scene 后恢复状态、启用局部系统。
- `update()`：只运行本 World 当前需要的模拟。
- `leave()`：离开前写回 WorldState、解除局部输入或监听。
- `dispose()`：释放本 World 独占的 GPU/事件/音频资源。
- `getSpawnPoint()`：为旅行到达和其他未来入口提供稳定出生点。

不引入 ECS，不建立复杂依赖注入框架。

---

## 6. WorldManager

新增 `WorldManager`，作为整个阶段最重要的基础设施。

主要职责：

1. 维护 `currentWorldId` 和 `currentWorld`。
2. 注册可创建的 World Factory。
3. 根据 WorldId 创建目标 World。
4. 调用旧 World 的 `leave()`。
5. 把旧 World 从 Scene 移除。
6. 调用新 World 的 `load()`。
7. 把新 World 的 root 加到 Scene。
8. 恢复新 World 的持久状态。
9. 根据 SpawnPoint 设置玩家位置。
10. 调用新 World 的 `enter()`。
11. 安全释放旧 World 独占资源。
12. 暴露稳定的 `update(context)` 给 Game Loop。

建议状态机：

```text
IDLE
LOADING
SWITCHING
READY
ERROR
```

禁止把世界切换实现为多个无约束 Boolean 的组合。

### 6.1 Game 与 WorldManager 的边界

未来 `Game.ts` 不应继续直接执行：

```text
world.ocean.update(...)
world.island.house.setNight(...)
world.island.lighthouse.update(...)
world.fish.setCount(...)
```

而是通过稳定接口：

```text
worldManager.update(context)
worldManager.applyQuality(quality)
worldManager.getInteractionContext()
```

具体 World 自己决定内部如何处理 Ocean、Fish、House、Lighthouse、Crop、Animal 等对象。

这是本阶段允许的定向架构重构，因为它直接服务于多世界扩展；禁止借机重构无关模块。

---

## 7. HomeWorld

现有 `src/world/World.ts` 的功能整体保留，逐步迁移或包装成 `HomeWorld`。

HomeWorld 继续包含当前已经工作的：

- 家园岛
- 海洋
- 灯塔
- 小屋
- 码头
- 环境帆船
- 水下区域
- 鱼群
- 气泡
- 船迹
- 宝箱、船锚、遗迹等探索对象

本阶段禁止为了“HomeWorld”名称而重写这些内容。

目标是让原有世界实现新的 `GameWorld` 生命周期，同时保持当前功能表现和性能。

### 7.1 HomeWorld 新增交通码头功能

在现有码头附近增加一艘 **玩家交通船**。

注意：

- 当前海面上的帆船继续保留，作为环境船只。
- 玩家交通船是新的小型木船/小艇。
- 两者职责不可混淆。

靠近交通船后显示：

`[E] 登船`

触发后进入目的地选择与旅行流程。

---

## 8. TravelWorld

新增一个极轻量的旅行世界。

建议目录：

```text
src/worlds/travel/
├─ TravelWorld.ts
├─ TravelOcean.ts
├─ PlayerBoat.ts
└─ TravelSky.ts
```

可按当前工程结构调整文件数量，避免机械拆分类。

### 8.1 TravelWorld 内容

只包含：

- 海面
- 玩家交通船
- 天空/背景
- 海雾
- 少量云
- 少量海鸟或远景点缀
- 必要的环境音

明确不包含：

- 复杂海底
- 大量鱼群
- 建筑群
- 可探索岛屿内部
- 农作物和动物
- 大量粒子或复杂后处理

TravelWorld 的本质是：

**把等待加载变成一次有氛围的短航行。**

---

## 9. FarmWorld 原型

本阶段只创建 **FarmWorld Prototype**，不实现农业系统。

需要存在：

- 农场码头
- 基础草地和体素地形
- 一条土路
- 几块明确可识别的空农田
- 一个简单谷仓/农机棚占位建筑
- 几棵树
- 适当的山坡或地形边界
- 返回家园岛的交通船

地图应该比当前 HomeWorld 的核心岛屿更开阔，为以后第三人称驾驶农机留空间。

但本阶段不得加入：

- 播种
- 作物生长
- 收割
- 拖拉机驾驶
- 鸡牛羊
- 经济
- 农场升级

FarmWorld 原型只用于证明多世界架构成立。

---

## 10. TravelSystem

TravelSystem 负责“从一个 World 去另一个 World”的完整用户体验。

建议使用明确状态机：

```text
IDLE
→ BOARDING
→ DEPARTING
→ SAILING_OUT
→ WORLD_SWITCH
→ SAILING_IN
→ ARRIVING
→ DISEMBARKING
→ IDLE
```

禁止使用大量 `isTraveling / isLoading / isArriving / isLeaving` Boolean 组合代替状态机。

### 10.1 Home → Farm 流程

1. 玩家在 HomeWorld 码头靠近交通船。
2. 显示 `[E] 登船`。
3. 打开轻量目的地面板。
4. 当前可选：农场岛；未来地点显示锁定状态。
5. 玩家选择农场岛。
6. Explore 输入冻结，HUD 与无关界面渐隐。
7. Camera 切换到交通船第三人称追尾镜头。
8. 船离开家园码头，持续约 2–3 秒。
9. 海雾逐渐加浓并遮住家园岛。
10. 切入轻量 TravelWorld。
11. HomeWorld 写回状态并卸载。
12. 后台加载 FarmWorld Prototype。
13. TravelWorld 中船继续航行约 2–4 秒。
14. FarmWorld 准备完成后，远方出现农场岛轮廓。
15. 海雾逐渐降低。
16. 船靠近农场码头。
17. 切换为 FarmWorld。
18. 玩家在 `farm_dock_arrival` SpawnPoint 出现。
19. 恢复 ExploreController。
20. HUD 淡入。

整个现实时间建议控制在约 5–10 秒，具体值以实际视觉体验为准。

### 10.2 Farm → Home

完整反向流程必须同时实现。

返回 HomeWorld 后原有发现记录、时间和状态不能重置。

---

## 11. DestinationRegistry

新增一个轻量目的地注册表，避免 UI 和 TravelSystem 写死世界关系。

概念字段：

```ts
type DestinationDefinition = {
  id: WorldId;
  name: string;
  description: string;
  travelGameMinutes: number;
  departureSpawnId: string;
  arrivalSpawnId: string;
  unlockKey?: string;
};
```

初始注册：

- `HOME`：已解锁
- `FARM`：已解锁
- `DEEP_SEA`：未解锁，占位
- `RUINS`：未解锁，占位

未解锁地点可以出现在目的地面板中，但不允许进入。

这只是预留扩展入口，不实现深海和遗迹世界。

---

## 12. 时间模型

`GameClock` 继续属于 `Game` 层，不属于任何 World。

所有地图共享同一天、同一时间轴。

旅行需要消耗游戏内时间，但不要求和现实旅行秒数一致。

示例：

- Home → Farm：现实动画 5–10 秒；游戏时间推进 20 分钟。
- 返回同理。

TravelSystem 应通过明确 API 推进游戏时间，而不是直接篡改各 World 内部状态。

后续不同目的地可配置不同 `travelGameMinutes`。

---

## 13. 天气模型

天气的“逻辑状态”属于全局，具体视觉表现属于当前 World。

例如全局天气为 `STORM`：

- HomeWorld：大浪、雨、闪电、风暴云。
- TravelWorld：海上风暴、雨、船体摇摆。
- FarmWorld：暗云、雨、植被/环境的风暴表现。

本阶段不实现天气对农田的农业逻辑，只保证世界切换时天气连续，不重新随机或重置。

---

## 14. PlayerState

本阶段建立最小可用 `PlayerState`，不要提前设计完整 RPG 数据模型。

第一版至少记录：

- `currentWorldId`
- `currentSpawnId`
- `unlockedDestinations`
- `lastTravelDestination`
- HomeWorld 探索发现进度的稳定引用或全局进度映射

以后再扩展：

- Energy
- Money
- Inventory
- RecipeBook
- Upgrades

这些后续字段本阶段不得实现完整业务。

---

## 15. WorldStateRegistry

地图状态和玩家状态分开。

概念结构：

```text
WorldStateRegistry
├─ HOME → HomeWorldState
├─ FARM → FarmWorldState
└─ future...
```

`HomeWorldState` 第一阶段至少能恢复：

- 已发现探索点
- 必要的局部状态

`FarmWorldState` 第一阶段可非常简单，只为后续扩展预留稳定结构。

禁止把 HomeWorld 的具体对象引用存入持久数据；只保存可序列化数据。

---

## 16. SaveSystem

本阶段建立轻量版本化本地存档。

使用 `localStorage`。

第一版数据概念：

```json
{
  "version": 1,
  "gameTime": {},
  "player": {},
  "worlds": {
    "HOME": {},
    "FARM": {}
  }
}
```

必须包含 `version`。

本阶段至少支持：

- 读取存档
- 写入存档
- 存档不存在时使用默认状态
- JSON 损坏时安全回退默认状态
- 未来 migration 的入口结构

不需要做存档槽、云存档、账号或复杂 UI。

建议在以下时机自动保存：

- 完成世界切换后
- 页面 `visibilitychange` / `beforeunload` 的安全时机
- 重要状态变化后可按节流策略保存

不得每帧写 localStorage。

---

## 17. 离线世界模拟扩展点

本阶段不实现作物和动物，但架构必须为未来 FarmWorld 的离线推进保留能力。

WorldState 建议保留：

`lastSimulatedGameTime`

未来加载 FarmWorld 时：

```text
elapsed = currentGameTime - lastSimulatedGameTime
FarmSimulation.catchUp(elapsed)
```

用一次性结算替代 FarmWorld 长期后台运行。

因此未激活 World 不需要持续执行 `update()`。

---

## 18. Camera 与控制器

旅行期间不允许 OverviewController 和 ExploreController 同时影响 Camera。

TravelSystem 进入 `BOARDING` 后：

- 暂停 ExploreController。
- 退出 Pointer Lock 或安全释放输入。
- 使用 Travel Camera Controller 或 TravelSystem 内部的专用相机轨迹。

旅行镜头采用第三人称船尾略高位置，玩家应该看到船、海面和目的地方向。

到达后：

- 把 Camera 移至目标 SpawnPoint。
- 恢复 ExploreController。
- Pointer Lock 必须遵守浏览器用户手势限制，不得自动强制请求失败。
- 当前 drag fallback 不得被破坏。

---

## 19. 互动系统

交通船属于可交互对象，但不要把 TravelSystem 硬编码进现有 landmark discovery 逻辑。

建议让交互目标支持类型或 action：

```text
DISCOVER
TRAVEL
FUTURE_ACTION
```

本阶段只需要在不破坏现有四个发现点的前提下，让交通船触发 `TRAVEL`。

成功返回 HomeWorld 后原有 discovery Set / 状态必须保持。

---

## 20. HUD 与目的地面板

继续保持现有 Pixel / Nautical 极简 UI。

目的地面板只展示：

- 地点名称
- 一句描述
- 是否解锁
- 选择 / 返回

不做大型世界地图。

示例：

```text
今天要去哪里？

● 农场岛
  一片尚未开垦的土地

○ 深海
  尚未解锁

○ 失落遗迹
  ？？？
```

旅行开始后收起无关 HUD；到达后恢复当前 World 对应 HUD。

---

## 21. 资源所有权与 dispose 规则

多世界架构必须明确资源所有权。

### Global Shared Resource

例如：

- 通用 cube geometry
- 全局复用材质（若项目已有明确共享机制）
- Renderer
- Camera
- Persistent UI

不得由单个 World 在 `dispose()` 时销毁。

### World Owned Resource

例如：

- FarmWorld 独占 geometry/material
- TravelWorld 独占 Points/LineSegments
- World 独占事件监听
- World 独占 Audio Node

离开并销毁 World 时必须释放。

WorldManager 切换多次后不得持续增长 GPU 资源、监听器或重复 DOM。

---

## 22. 错误处理

World 加载失败时不能卡死在黑屏或旅行状态。

最低要求：

1. 捕获 `load()` 异常。
2. HUD 显示简短提示：`航线暂时无法抵达，正在返回家园岛……`
3. TravelSystem 进入恢复路径。
4. 尝试加载 HomeWorld。
5. 如果 HomeWorld 也无法恢复，则进入明确 ERROR 状态并允许刷新。

本阶段不需要复杂错误页。

---

## 23. 性能要求

仍然以 GitHub Pages 上的浏览器运行体验为目标。

MEDIUM / 1920×1080 尽量继续保持约 55–60 FPS。

TravelWorld 必须比 HomeWorld 更轻量。

世界切换后需检查：

- draw calls 是否回落到当前世界合理水平
- 旧世界 geometry/material 是否仍被引用
- event listener 是否重复注册
- 多次往返后 FPS 是否逐渐下降
- 内存是否持续增长

至少测试 10 次：

`HOME ↔ FARM`

往返切换，确认没有明显泄漏趋势。

---

## 24. 质量档位

现有 LOW / MEDIUM / HIGH 继续保留。

WorldManager 应向当前 World 提供质量等级或 `applyQuality()` 能力。

切换到新的 World 后必须应用当前已经选择的质量档，而不是重置为 MEDIUM。

TravelWorld 可根据质量调整：

- 海面实例密度
- 海雾/云装饰密度
- 海鸟数量

但三个档位不能改变玩法。

---

## 25. 本阶段明确不做

为控制范围，本设计明确排除：

- 可进入小屋
- 睡觉
- 体力
- 背包
- 厨房
- 烹饪
- 钓鱼
- 鱼类收获
- 正式农作物系统
- 作物生长
- 耕地
- 播种
- 收割
- 拖拉机
- 播种机
- 收割机
- 鸡牛羊
- 动物 AI
- 金币
- 商船经济
- 农场升级
- 深海正式地图
- 遗迹正式地图
- NPC
- 后端
- 云存档
- 多人

上述内容都建立在本阶段完成后的世界架构之上。

---

## 26. 推荐实施分段

### Phase A — 架构解耦

- 引入 WorldId、GameWorld、WorldManager。
- 把当前 World 包装/迁移为 HomeWorld。
- 把 Game 对 `world.island / ocean / fish / house / lighthouse` 的直接依赖下沉到 HomeWorld。
- 保持现有所有功能可用。

### Phase B — 状态基础

- PlayerState
- WorldStateRegistry
- SaveSystem v1
- 保证 HomeWorld discovery 可保存与恢复。

### Phase C — TravelWorld

- PlayerBoat
- TravelOcean
- Travel camera
- TravelSystem 状态机
- 海雾遮挡世界切换。

### Phase D — FarmWorld Prototype

- 创建农场岛原型。
- 加入码头、土路、空农田、谷仓、草地和树。
- 不实现农业业务。

### Phase E — 往返闭环

- HOME → TRAVEL → FARM
- FARM → TRAVEL → HOME
- 时间、天气、质量档、发现状态连续。

### Phase F — 稳定性与性能

- 异常加载 fallback
- 10 次往返压力测试
- dispose 检查
- FPS / draw call / memory 基线比较

---

## 27. 测试要求

对纯逻辑增加单元测试，避免为视觉动画写大量脆弱测试。

建议至少覆盖：

- WorldManager 状态转换
- World 生命周期调用顺序
- TravelSystem 状态机
- DestinationRegistry 锁定/解锁
- PlayerState 序列化
- SaveSystem 默认值和损坏 JSON 回退
- HomeWorld discovery 保存/恢复
- 旅行游戏时间推进
- 世界加载失败 fallback

原有 WaveMath、Weather、ExploreController 等测试不得破坏。

---

## 28. 浏览器验收

至少人工检查：

1. 默认 HomeWorld 与当前正式版本视觉基本一致。
2. Overview 正常。
3. Explore 正常。
4. 昼夜、x1/x4/x12 正常。
5. Storm 正常。
6. 水下正常。
7. 原有四个发现点正常。
8. 家园码头出现交通船。
9. `[E] 登船` 正常。
10. 目的地菜单正常。
11. Home → Farm 航行动画完整。
12. 切图过程中没有明显白屏/黑屏/模型闪现。
13. FarmWorld Prototype 可行走。
14. Farm → Home 返回正常。
15. Home discovery 未丢失。
16. 时间连续。
17. 天气连续。
18. 当前质量档连续。
19. PointerLock fallback 未破坏。
20. 10 次往返后无明显 FPS 或内存恶化。

至少检查 1920×1080，并确保移动端浏览模式没有因为新增 UI 完全失效。

---

## 29. 完成定义

本阶段完成的标志不是“已经做出农场”，而是：

> Bottle Sea 已经从单地图程序变成一个可以持续扩展的群岛世界框架。

必须满足：

```text
HomeWorld
   ↓
玩家交通船
   ↓
TravelWorld
   ↓
FarmWorld Prototype
   ↓
玩家交通船
   ↓
TravelWorld
   ↓
HomeWorld
```

整个闭环稳定工作，同时：

- Game 不重建
- GameClock 不重置
- Weather 不重置
- PlayerState 不重置
- HomeWorld 状态可恢复
- 质量档不重置
- 现有探索玩法不回归
- World 可正确 load/leave/dispose
- GitHub Pages 静态部署能力保持不变

---

## 30. 后续阶段顺序

本阶段完成后，按以下顺序继续扩展：

1. Home System：小屋可进入、床、厨房、储物、书桌。
2. Player Progression：体力、背包、正式存档数据。
3. Fishing：钓鱼台、钓鱼玩法、鱼类收获与图鉴。
4. Cooking：食谱、料理、体力恢复与轻量 Buff。
5. Farm Foundation：正式规划 FarmWorld 生产区。
6. Crop System：耕地、播种、生长、成熟、收获。
7. Vehicle System：第三人称、拖拉机、播种机、收割机。
8. Livestock：鸡、牛、羊与牧场。
9. Economy：商船、销售、金币、农场升级。
10. World Expansion：深海、遗迹等新的旅行目的地。

这套顺序不允许因为后续功能诱惑而跳过多世界基础设施。