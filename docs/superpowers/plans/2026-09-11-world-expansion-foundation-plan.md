# Bottle Sea 2.x — World Expansion Foundation 实施计划

## 0. 目标与约束

本计划基于已批准设计：`docs/superpowers/specs/2026-09-11-world-expansion-foundation-design.md`。

本阶段只完成：

- 单 Scene + ActiveWorldRoot 多世界架构
- HomeWorld 适配
- WorldManager
- PlayerState / WorldStateRegistry / SaveSystem v1
- DestinationRegistry
- TravelWorld
- TravelSystem 状态机
- FarmWorld Prototype
- Home ↔ Farm 往返闭环
- 状态连续性、异常恢复、性能与资源释放验证

明确不做：家园室内、睡觉、体力、背包、钓鱼、烹饪、正式农业、农机、畜牧、经济、NPC、后端。

必须保持纯前端 Vite + TypeScript + Three.js，可继续部署 GitHub Pages。

---

## 1. 基线验证

执行：

```bash
npm install
npm run typecheck
npm run test
npm run build
```

然后运行开发或预览环境，记录当前：

- 默认 Home 场景是否正常
- Overview / Explore
- Day/Night
- Storm
- Underwater
- 原有四个 discovery
- 当前 MEDIUM 1080p FPS
- draw calls / triangles / memory（能稳定读取时记录）

把基线记录追加到本阶段实施记录文档，后续用于对比。

---

## 2. Phase A — 定义世界基础类型

### 2.1 新增 World 类型层

建议新增：

```text
src/worlds/types.ts
```

至少定义：

- `WorldId = 'HOME' | 'TRAVEL' | 'FARM'`
- `SpawnPoint`
- `WorldLoadContext`
- `WorldEnterContext`
- `WorldUpdateContext`
- `WorldLeaveContext`
- `GameWorld`

保持类型小而明确，不提前添加未来农业字段。

### 2.2 新增 World Factory 注册机制

建议：

```text
src/worlds/WorldRegistry.ts
```

职责：

- WorldId → factory
- 延迟创建 World
- 不持有当前世界状态
- 不包含旅行逻辑

验收：

- `typecheck` 通过
- 不影响现有运行

---

## 3. Phase B — 把现有 World 适配为 HomeWorld

### 3.1 目标

当前 `src/world/World.ts` 已经聚合 Island、Ocean、Ship、UnderwaterWorld、FishSystem、BubbleSystem、Details、ShipWake。

不要重写这些模块。

可以选择：

A. 将当前 `World` 改名/迁移为 `HomeWorld`；或
B. 保留 `World`，新建 `HomeWorld` 包装它。

优先选择对现有 import 影响更小、回归风险更低的方案。

### 3.2 HomeWorld 需要吸收 Game 中的 Home 专属更新

逐步把当前 `Game.ts` 中对 Home 内部对象的直接访问下沉，例如：

- `world.update(...)`
- `world.island.house.setNight(...)`
- `world.island.lighthouse.update(...)`
- `world.fish.setCount(...)`
- `world.ocean.create(...)`
- `world.wake.setDensity(...)`

HomeWorld 对外提供稳定能力，例如：

- `update(context)`
- `applyQuality(quality)`
- `getInteractionTargets()` 或相同职责接口
- `getFocusContext()`（如果当前 Overview Focus 仍需要）

不要把 Lighthouse、House、Fish 等具体类型继续暴露给 Game。

### 3.3 回归要求

在 WorldManager 尚未正式接管前，保证现有 HomeWorld 行为不变。

执行：

```bash
npm run typecheck
npm run test
npm run build
```

浏览器检查原有功能。

---

## 4. Phase C — WorldManager

建议新增：

```text
src/worlds/WorldManager.ts
src/worlds/WorldManager.test.ts
```

### 4.1 职责

WorldManager 维护：

- `currentWorldId`
- `currentWorld`
- `state: IDLE | LOADING | SWITCHING | READY | ERROR`

核心 API 建议：

```text
initialize(worldId, spawnId?)
switchTo(worldId, options)
update(context)
applyQuality(quality)
getCurrentWorld()
```

具体命名可按代码习惯调整。

### 4.2 切换生命周期顺序

必须固定：

```text
oldWorld.leave()
→ 保存 oldWorld state
→ scene.remove(oldWorld.root)
→ targetWorld.load()
→ scene.add(targetWorld.root)
→ 恢复 target state
→ targetWorld.enter()
→ 设定 spawn point
→ 释放旧 world 独占资源
→ READY
```

注意：若 TravelWorld 需要承担视觉遮挡，可由 TravelSystem 控制何时调用实际 `switchTo`，不要让 WorldManager 自己决定动画时机。

### 4.3 测试

覆盖：

- 生命周期调用顺序
- `READY → LOADING/SWITCHING → READY`
- load 失败进入 ERROR/回退路径
- 同一 World 重复切换行为明确

---

## 5. Phase D — 持久状态基础

建议目录：

```text
src/state/PlayerState.ts
src/state/WorldStateRegistry.ts
src/state/SaveSystem.ts
src/state/SaveSystem.test.ts
```

### 5.1 PlayerState v1

只包含：

- currentWorldId
- currentSpawnId
- unlockedDestinations
- lastTravelDestination
- 与 Home discovery 的稳定进度字段或引用结构

不要提前加 Money/Energy/Inventory 等未实现系统。

### 5.2 WorldStateRegistry

至少支持：

```text
HOME
FARM
```

World State 只存 JSON 可序列化数据，不存 Three.js Object3D 引用。

预留：

- `lastSimulatedGameTime`

但当前不实现 Crop/Animal catch-up。

### 5.3 SaveSystem v1

使用 localStorage。

最低能力：

- load
- save
- default state
- schema version = 1
- malformed JSON fallback
- 缺字段时合并默认值
- 不每帧写入

建议保存时机：

- 成功完成 World 切换
- discovery 更新后的节流保存
- `visibilitychange`
- `beforeunload`（只做轻量同步写入）

### 5.4 GameClock 序列化

不要重建 GameClock。

为现有 GameClock 增加最小必要的 snapshot/restore 或等价 API，使游戏时间可保存恢复。

不要让 SaveSystem 直接修改 GameClock 私有字段。

---

## 6. Phase E — DestinationRegistry

建议新增：

```text
src/travel/DestinationRegistry.ts
src/travel/DestinationRegistry.test.ts
```

定义至少：

- HOME
- FARM
- DEEP_SEA（locked placeholder）
- RUINS（locked placeholder）

字段至少：

- id
- name
- description
- travelGameMinutes
- departureSpawnId
- arrivalSpawnId
- unlockKey / locked state

当前：

- HOME unlocked
- FARM unlocked
- DEEP_SEA locked
- RUINS locked

UI 不得自己硬编码目的地内容。

---

## 7. Phase F — 玩家交通船

当前环境帆船保留，不能改造成唯一交通工具。

新增独立的玩家交通船，例如：

```text
src/worlds/shared/PlayerTravelBoat.ts
```

或放入 travel 目录，取决于复用方式。

要求：

- Voxel / Low Poly
- 尺寸允许玩家明显识别为可乘坐小船
- Home Dock 和 Farm Dock 可以各自放置停泊版本
- TravelWorld 中使用航行版本
- 与现有环境 Ship 不混用状态

HomeWorld 增加 travel interaction point。

交互系统需要支持 action 类型，例如：

```text
DISCOVER
TRAVEL
```

不得破坏现有四个 discovery。

---

## 8. Phase G — Destination UI

建议新增：

```text
src/ui/DestinationPanel.ts
```

或者合理扩展 HUD，但避免让 HUD.ts 继续无限膨胀。

功能：

- 打开/关闭
- 从 DestinationRegistry 渲染目的地
- 显示 locked
- 只允许选择 unlocked destination
- Escape/返回可关闭
- 保持现有 Pixel/Nautical 风格
- 面板出现时冻结 Explore 行走，避免玩家边走边选

HomeWorld 中靠近船：

`[E] 登船`

按 E 后打开面板，而不是直接旅行。

---

## 9. Phase H — TravelWorld

建议：

```text
src/worlds/travel/TravelWorld.ts
src/worlds/travel/TravelOcean.ts
src/worlds/travel/TravelSky.ts
```

### 9.1 TravelOcean

复用现有 `waveHeight` 或同一数学逻辑，避免重新做第二套完全不同海浪。

但 TravelOcean 应比 Home Ocean 更轻：

- 更低实例密度
- 无岛岸复杂判断
- 无海底
- 无鱼群
- 无复杂交互

### 9.2 TravelWorld 内容

只保留：

- Ocean
- PlayerTravelBoat
- Sky/background
- Fog
- 少量 clouds/birds

根据全局天气调整：

- calm/storm
- day/night
- lightning/rain（可复用已有能力，避免重复大系统）

### 9.3 Travel Camera

第三人称船尾略高位置。

相机移动要平滑，不要和 OverviewController / ExploreController 同时写 camera transform。

---

## 10. Phase I — TravelSystem 状态机

建议新增：

```text
src/travel/TravelSystem.ts
src/travel/TravelSystem.test.ts
```

状态固定为：

```text
IDLE
BOARDING
DEPARTING
SAILING_OUT
WORLD_SWITCH
SAILING_IN
ARRIVING
DISEMBARKING
```

### 10.1 开始旅行

`beginTravel(destinationId)` 前检查：

- 当前不在旅行
- destination unlocked
- 目标不是当前世界
- 当前 World 存在合法 departure point

### 10.2 动画节奏

建议默认总现实时间约 6–8 秒：

- BOARDING：0.3–0.6s
- DEPARTING：1.5–2.0s
- SAILING_OUT：1.0–1.5s，Fog 增强
- WORLD_SWITCH：在高 Fog 状态执行
- SAILING_IN：1.5–2.0s，目标轮廓出现
- ARRIVING：1.0–1.5s
- DISEMBARKING：0.3–0.6s

具体值允许视觉调优。

### 10.3 游戏时间推进

Home ↔ Farm 默认每次旅行推进 20 个游戏分钟。

不要用真实 6–8 秒直接等价游戏 6–8 秒。

为 GameClock 增加公开、安全的时间推进 API，例如概念：

`advanceGameMinutes(20)`

可以在旅行过程中平滑推进或在成功到达时结算，但行为必须稳定且测试覆盖。

### 10.4 控制器

开始旅行：

- suspend Explore
- release Pointer Lock
- 禁止 Overview
- Travel camera 接管

结束旅行：

- 设定目标 SpawnPoint
- 恢复 Explore
- 不自动违反浏览器策略强制 Pointer Lock
- 保留 drag fallback

---

## 11. Phase J — FarmWorld Prototype

建议目录：

```text
src/worlds/farm/FarmWorld.ts
src/worlds/farm/FarmTerrain.ts
src/worlds/farm/FarmBuildings.ts
```

按实际复杂度合并/拆分。

### 11.1 地图设计

农场岛原型要明显比 Home 小岛开阔。

至少具有：

- Farm Dock
- 到达 SpawnPoint
- 返回交通船
- 土路
- 3 块空农田轮廓
- 1 个谷仓/农机棚
- 草地
- 栅栏占位
- 树
- 小山坡/地形边界

要为未来第三人称拖拉机转弯留出足够宽度。

### 11.2 暂不实现

- 土地状态
- Crop entity
- growth
- seeding
- harvesting
- tractor
- livestock

FarmWorld 当前只是视觉和导航原型。

### 11.3 Explore Bounds

不要复用 HomeWorld 瓶体半径逻辑强行限制 FarmWorld。

FarmWorld 应拥有自己的可行走 bounds / terrain height 查询接口。

如果 ExploreController 当前强耦合 Home 的 `Bounds.ts` / islandHeight，则在本阶段做最小必要抽象，例如：

```text
NavigationSurface / WorldNavigationAdapter
```

让控制器从当前 World 获取：

- groundHeight
- movementBounds
- waterLevel（若有）

不要因此引入完整物理引擎。

---

## 12. Phase K — Game.ts 接入 WorldManager

这是风险最高的一步，放到各模块准备好之后完成。

### 12.1 Game 保留职责

Game 继续拥有：

- Renderer
- Scene
- Camera
- GameClock
- global Weather state
- HUD
- Sound
- controls orchestration
- main GameLoop

### 12.2 Game 移除职责

Game 不再直接知道：

- `world.island.house`
- `world.island.lighthouse`
- `world.ocean`
- `world.fish`
- `world.wake`

改成：

- `worldManager.update(context)`
- `worldManager.applyQuality(quality)`
- 由当前 World 提供交互/Focus/导航能力

### 12.3 Overview 行为

HomeWorld 保留原有桌面玻璃瓶 Overview。

FarmWorld 默认作为第一人称可玩地图即可，本阶段不要求 FarmWorld 也拥有“桌面瓶外 Overview”。

进入旅行和 FarmWorld 时要隐藏 Home 专属 Overview Focus UI。

返回 HomeWorld 后恢复。

---

## 13. Phase L — Home ↔ Farm 闭环

必须完整验证两条路径：

```text
HOME → TRAVEL → FARM
FARM → TRAVEL → HOME
```

验证：

- 交通船交互
- destination panel
- controller suspend/resume
- camera takeover/release
- fog hiding switch
- Farm load
- spawn
- return
- Home state restore

严禁只完成单向 Home → Farm。

---

## 14. Phase M — 状态连续性

至少验证：

1. Home 发现 1 个 landmark。
2. 记录当前时间和 Storm 状态。
3. 去 Farm。
4. 在 Farm 停留一段时间。
5. 返回 Home。
6. Discovery 仍存在。
7. 时间连续并包含旅行时间。
8. Storm/Weather 状态没有被世界切换重置。
9. 当前 Quality 没有重置。
10. 刷新页面后 SaveSystem 能恢复合理状态。

如果刷新时保存在 FARM，可允许直接从 Farm Dock 或安全 Spawn 恢复；不要依赖一次未完成的 Travel 动画继续执行。

对于“旅行中刷新”的情况，本阶段采用确定性恢复：读取存档中的最后成功 World，而不是试图恢复 TravelSystem 中间帧。

---

## 15. Phase N — 错误恢复

模拟 FarmWorld load 抛错。

预期：

- 不白屏
- TravelSystem 不永久卡住
- HUD 提示航线失败
- 自动尝试回 HomeWorld
- 控制器最终恢复

对异常路径写逻辑测试。

---

## 16. Phase O — Dispose 与泄漏检查

区分：

- global shared resources
- world-owned resources

World dispose 不得销毁全局共享 `cubeGeometry` 等仍会被其他 World 复用的资源。

浏览器中至少连续执行 10 次：

`HOME ↔ FARM`

观察：

- FPS
- draw calls
- geometries/materials/textures（可从 renderer.info 获取时记录）
- DOM 节点数量
- listener 重复行为

不要求内存字节完全恒定，但不应出现明显线性增长。

---

## 17. Phase P — 性能和质量档

切换 World 后继续使用用户当前 LOW/MEDIUM/HIGH。

WorldManager 或 Game 在 World enter 时调用对应质量应用接口。

TravelWorld LOW/MEDIUM/HIGH 只调整视觉密度，不改变旅行时间或玩法。

MEDIUM / 1920×1080 目标继续尽量保持约 55–60 FPS。

---

## 18. Phase Q — 测试与浏览器最终验收

每个主要 Phase 后运行：

```bash
npm run typecheck
npm run test
npm run build
```

最终必须再次运行全部命令。

浏览器至少检查：

- Home default overview
- Explore
- Night
- Storm
- Underwater
- discovery
- travel interaction
- destination panel
- Home → Farm
- Farm movement
- Farm → Home
- state restoration
- refresh save restoration
- 10x round trip
- 1920×1080
- narrow viewport 基础布局

不要删除已有 dev preview query 参数；可额外增加仅 DEV 使用的 `?world=farm`、`?world=travel` 等入口，前提是不影响生产默认流程。

---

## 19. 推荐 Commit 粒度

若当前工作流允许提交，建议按以下粒度提交，而不是一次巨型 commit：

1. `refactor: introduce game world lifecycle`
2. `refactor: adapt existing world as home world`
3. `feat: add world state and local save foundation`
4. `feat: add destination registry and travel interaction`
5. `feat: add travel world and boat transition`
6. `feat: add farm world prototype`
7. `feat: complete home farm round trip`
8. `test: cover world switching and persistence`
9. `perf: validate world disposal and travel performance`
10. `docs: document world expansion foundation`

只在每个提交点代码处于可构建状态时提交。

---

## 20. 最终完成报告

Codex 最终必须报告：

- 实际采用的世界架构
- 新增/修改文件
- HomeWorld 如何从旧 World 演进
- WorldManager 生命周期
- TravelSystem 状态机
- TravelWorld 视觉流程
- FarmWorld Prototype 内容
- PlayerState / WorldStateRegistry / SaveSystem
- GameClock/Weather 如何保持连续
- discovery 如何持久化
- Controller/Camera 如何交接
- dispose 策略
- 加载失败 fallback
- 单元测试数量和结果
- typecheck/test/build 结果
- 1080p FPS 与 draw-call 对比
- 10 次往返测试结果
- 当前遗留问题
- 是否仍满足 GitHub Pages 静态部署条件

如果某项无法完成，必须明确标记为未完成，不得把“已设计/已创建占位”描述成“功能已完成”。