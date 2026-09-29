# World Expansion Foundation 正式交接

## 1. 项目概览

《瓶中沧海 / Bottle Sea》是一个纯前端、程序化体素风格的 Three.js 互动场景。技术栈为 Vite 7、TypeScript 5.9 strict、Three.js 0.186 和 Vitest；没有前端框架与服务端依赖。当前产品从单一主岛扩展为 `HOME → TRAVEL → FARM` 的双岛往返闭环，并为后续农业、农机、畜牧、深海和遗迹地图提供可装卸世界、持久状态与旅行状态机基础。

## 2. Git 状态

- 检查时间：2026-09-12（Asia/Shanghai）。
- 当前分支：`main`。
- HEAD：`35a85531ba1091a8775ac64c84072c4b07e8888e`（`feat: complete island travel and farm prototype foundation`）。
- 检查开始时工作区：clean，无 staged/unstaged/untracked 文件。
- `origin/main...HEAD`：`0 0`，本地与远端同步。
- 本文生成后，唯一预期未提交改动是 `docs/handoffs/WORLD_EXPANSION_FOUNDATION_HANDOFF.md`；按交接要求未自动提交。
- 相关提交：`ce95537` 状态/生命周期基础，`7a47118` HomeWorld 与资源所有权，`35a8553` 航行及农场原型收口。

## 3. 本阶段目标

本阶段只建立多世界扩展地基：将旧主岛包装为 HomeWorld；引入 GameWorld、WorldRegistry、WorldManager；建立版本化本地存档和每世界状态；完成目的地面板、交通船、TravelWorld、旅行镜头与 TravelSystem；交付可步行、可返航的 FarmWorld Prototype。耕种、动物、农机、背包、经济和正式资产均不属于本阶段。

## 4. 实际架构

`Game` 持有页面生命周期内常驻的 Renderer、Scene、Camera、GameLoop、GameClock、Weather、Sound、HUD、PlayerState、SaveSystem、WorldManager 和 TravelSystem。地图由 WorldRegistry 动态 import；同一时刻只把活动世界 root 挂入单一 Scene。GameWorld 负责自身 load/enter/update/leave/dispose、出生点、质量档及可选导航/交互/交通船能力。

```text
main.ts
  └─ Game ── Renderer / Scene / Camera / Clock / Weather / Sound / HUD
       ├─ SaveSystem ── PlayerState + WorldStateRegistry
       ├─ WorldManager ── WorldRegistry ── dynamic import
       │                    ├─ HomeWorld ── legacy World + HomeNavigation
       │                    ├─ TravelWorld ── TravelOcean + PlayerTravelBoat
       │                    └─ FarmWorld ── terrain/buildings/navigation/boat
       └─ TravelSystem ── DestinationRegistry + TravelCamera + UI hooks
```

资源边界已经明确：全局共享体素资源带 shared 标记并跨世界保留；世界独占 geometry、material、texture、instanced mesh、light/shadow 在离开后释放。

## 5. 实际完成工作

- HOME/FARM 延迟创建、切换、恢复和失败回滚已经接入真实 Game 循环。
- HomeWorld 包装旧主岛、房间、玻璃瓶、海洋、发现点与交通码头，没有重写旧世界。
- 双向航行包含登船、离港、旅行海面、雾幕切换、靠岸和下船，成功抵达只推进一次 20 游戏分钟。
- FarmWorld 原型含约 26×20 地形、2.5 宽道路、三块 5×7 空田、码头、农舍、谷仓、树、栅栏和独立碰撞/边界。
- `bottle-sea.save.v1` 保存世界、出生点、目的地解锁、发现、时间、天气和质量；旅行中刷新回到最后成功抵达的世界。
- 修复了目标世界同步挂载后仍被 `SAILING_IN` 写入船坐标导致的农田穿模；最终交通海面改为连续网格并延展到视距外。
- HOME/FARM 可达，DEEP_SEA/RUINS 作为禁用占位显示；发现交互与旅行交互已分离。
- 主分支已由 GitHub Actions 成功构建并部署到 GitHub Pages。

## 6. 需求状态表

状态口径：DONE 表示代码与必要证据齐备；PARTIAL 表示功能存在但规定的最终浏览器矩阵或压力证据未补全；TODO 表示未实现；BLOCKED 表示存在外部阻塞。

| # | 核对项 | 状态 | 实际结论 |
|---:|---|---|---|
| 1 | 总体闭环 | DONE | HOME↔TRAVEL↔FARM 可往返 |
| 2 | 世界架构 | DONE | 单 Scene + 延迟工厂 + 生命周期装卸 |
| 3 | 新增模块 | DONE | state/worlds/travel/UI/样式及测试齐备 |
| 4 | Game 接线 | DONE | 全局系统与世界系统边界已落地 |
| 5 | HomeWorld | DONE | 旧主岛完整包装并保留行为 |
| 6 | WorldManager | DONE | 状态机、预加载、回滚、释放有测试 |
| 7 | TravelSystem | DONE | 双向 6.85 秒动画链路及竞争回归修复 |
| 8 | PlayerTravelBoat | DONE | 独立交通船、四点浮力、动态碰撞盒 |
| 9 | TravelWorld | DONE | 连续海面、云鸟、船和镜头场景 |
| 10 | FarmWorld Prototype | DONE | 地形、道路、田、建筑、码头和边界 |
| 11 | DestinationRegistry/UI | DONE | 两处可达、两处锁定、面板可取消 |
| 12 | SaveSystem | DONE | v1、迁移入口、损坏回退、节流与 flush |
| 13 | PlayerState | DONE | 最小纯 JSON 玩家状态已使用 |
| 14 | WorldStateRegistry | DONE | HOME/FARM 隔离快照及离线时间扩展点 |
| 15 | GameClock 连续性 | DONE | 抵达一次增加 20 分钟，中断不收费 |
| 16 | Weather/质量连续性 | DONE | HIGH + storm 跨岛和刷新实测保持 |
| 17 | 四发现持久化 | PARTIAL | lighthouse/anchor 2/4 实测；最终四项全量未补 |
| 18 | Camera/Controls | PARTIAL | 拖拽及往返已实测；桌面原生 Pointer Lock 待设备复核 |
| 19 | Navigation | PARTIAL | 单测与主要浏览器路线通过；完整边界矩阵未补 |
| 20 | Dispose/泄漏 | PARTIAL | 资源策略有测试，最终水面版完成 7/10 次压力往返 |
| 21 | 错误恢复 | DONE | 单失败回 HOME；双失败显示中文提示 |
| 22 | 自动测试覆盖 | DONE | 32 个文件、107 项通过 |
| 23 | typecheck | DONE | 当前 HEAD 独立执行通过 |
| 24 | test | DONE | 当前 HEAD 全量执行通过 |
| 25 | build | DONE | 当前 HEAD 生产构建通过，动态 chunk 正常 |
| 26 | 修改前性能基线 | DONE | 1080p MEDIUM Home Overview 57 FPS 单点样本 |
| 27 | 修改后性能样本 | DONE | 最终版 Home 58–61、Farm 60 FPS |
| 28 | Draw calls | DONE | 基线 109；最终 Explore Home 97–100、Farm 13 |
| 29 | Geometry/Texture | DONE | 最终 Home 29/3、Farm 6/3；未虚构基线纹理 |
| 30 | 10 次最终版往返 | PARTIAL | 旧水面版 10 次；最终版按用户要求停在 7 次 |
| 31 | GitHub Pages | DONE | main 同 SHA 的 build/deploy 均成功 |
| 32 | 全视觉矩阵 | PARTIAL | 已有关键场景证据；全昼夜/天气/质量/窄屏组合未补 |
| 33 | 下一阶段建议 | DONE | 可带验证债进入下一阶段 |

汇总：27 DONE、6 PARTIAL、0 TODO、0 BLOCKED。业务实现完成度按阶段范围计 100%；完整验收完成度约 85%，差额全部是已披露的浏览器验证债，不是已确认的阻断缺陷。

## 7. 核心修改文件（按模块）

- 入口与编排：`src/core/Game.ts`、`src/core/GameClock.ts`、`src/core/Preview.ts`、`src/main.ts`。
- 世界基础：`src/worlds/types.ts`、`WorldRegistry.ts`、`WorldManager.ts`、`NavigationSurface.ts`、`disposeWorld.ts`。
- 主岛适配：`src/worlds/home/HomeWorld.ts`、`HomeNavigation.ts`，以及原 `src/world/**` 内容。
- 旅行：`src/travel/DestinationRegistry.ts`、`TravelSystem.ts`、`TravelCamera.ts`；`src/worlds/travel/TravelWorld.ts`、`TravelOcean.ts`、`PlayerTravelBoat.ts`。
- 农场：`src/worlds/farm/FarmWorld.ts`、`FarmTerrain.ts`、`FarmBuildings.ts`。
- 状态：`src/state/PlayerState.ts`、`WorldStateRegistry.ts`、`SaveSystem.ts`。
- 交互与显示：`src/systems/InteractionSystem.ts`、`src/ui/DestinationPanel.ts`、`src/ui/HUD.ts`、`src/styles/travel.css`。
- 资源/诊断：`src/utils/voxel.ts`、`src/utils/PerformanceMonitor.ts`、`src/systems/SoundSystem.ts`。
- 部署：`.github/workflows/deploy-pages.yml`、`vite.config.ts`。

## 8. 数据与状态

`PlayerState` 保存 `currentWorldId`、`currentSpawnId`、`unlockedDestinations`、`lastTravelDestination` 和 discoveries。`WorldStateRegistry` 为 HOME/FARM 保存 discoveries 与 `lastSimulatedGameTime`，读写采用副本并规范化数据。`SaveSystem` 使用 localStorage 键 `bottle-sea.save.v1`，250ms 防抖，visibilitychange/beforeunload 强制 flush；损坏或未来版本回退默认值并给出提示。预览查询参数默认使用隔离状态，只有 `persist=1` 才读写正式存档。

## 9. 切换流程

TravelSystem 顺序为 `IDLE → BOARDING → DEPARTING → SAILING_OUT → WORLD_SWITCH → SAILING_IN → WORLD_SWITCH → ARRIVING → DISEMBARKING → IDLE`。WorldManager 在切换时调用旧世界 leave 并保存快照，移除旧 root，使用准备好的或新建的目标世界，load/enter/applyQuality/放置玩家，再释放旧世界。目标加载失败时恢复旧 root；调用方优先恢复 HOME，连 HOME 也失败才进入 fatal ERROR。旅行中只更新动画 elapsed；成功 arrive 后才推进 20 游戏分钟并写入最后成功世界。

## 10. HomeWorld

HomeWorld 是对原 World、Room、Bottle、MicroAnimation、DiscoveryPulse、InteractionSystem 和原环境帆船的包装层。HomeNavigation 复用旧陆地高度、碰撞、游泳与瓶体边界算法。交通船是额外对象，位于码头外沿；旅行期间隐藏瓶内裁切海面与瓶外展示组件，使用连续远海表现，结束后恢复。Game 不再直接读取房屋、灯塔等 Home 私有对象。

## 11. TravelWorld

TravelWorld 保持轻量：连接的 PlaneGeometry 海面、程序化云鸟、玩家交通船和质量档网格密度。近海顶点与四点浮力共用 `waveHeight`，外环拉伸到约 ±180，避免航行时水面覆盖不全。TravelCamera 使用船后上方追随和指数平滑，登/离船使用插值。海雾由 Game 的全局 `seaFog` 管理，而非 TravelWorld 私有雾。

## 12. FarmWorld Prototype

农场岛约 26×20，包含宽路、三块空田、码头、农舍、封闭谷仓、树、栅栏和北侧起伏。玩家到达点为 `[-4, 4.44, 14.5]`，交通船停泊基准不可变；独立 NavigationSurface 管理地形高度、建筑障碍和 `x±20 / z[-17,22]` 边界。当前是可行走和返航的灰盒原型，没有室内、农业逻辑或正式模型。

## 13. 已知问题与风险

- P0：无已知项。
- P1：无已知项；截图所示农田转场穿模已修复并有状态机回归测试及真实靠岸证据。
- P2：最终连续水面版本只完成 7 次完整往返，未达到原计划 10 次；需要后续长时资源/DOM/音频稳定性复核。
- P2：桌面浏览器原生 Pointer Lock 手感没有在当前内嵌浏览器中验证；拖拽回退可用。
- P2：TravelOcean 每帧更新连接网格顶点，低端设备可能出现 CPU 压力，需在目标设备采样。
- P3：WorldManager 对“同世界 + 外部 prepared world”会直接返回当前实例，若未来调用可能需显式释放 prepared；当前 Game 不走此路径。
- P3：WorldManager 没有取消尚未完成的 staged load；当前工厂同步且 TravelSystem 防重入，暂未触发。
- P3：`Game.ts` 编排密集且页面生命周期监听没有独立 dispose；当前单 Game 页面模型可用，未来热重载/嵌入式生命周期应拆分。
- P3：农场北侧起伏的连续高度函数与体素中心可能存在轻微半格观感差异，尚无确认穿模复现。
- P3：移动端只有响应式 UI，没有虚拟摇杆。

## 14. 测试与结果

- `npm run typecheck`：PASS。
- `npm run test`：PASS，32 个测试文件、107 项测试全部通过。
- `npm run build`：PASS，80 modules transformed；主 chunk 659.68 kB，gzip 173.85 kB；HOME/FARM/TRAVEL 动态 chunk 正常生成。
- 自动测试覆盖 GameClock、SaveSystem、WorldManager 预加载/失败回滚/资源所有权、TravelSystem 双向和异常路径、同步激活竞争回归、Home/Farm 导航、TravelOcean 连续面与波浪、旧主岛移动/碰撞/海洋/昼夜/天气等。
- 本轮浏览器：本地 `?world=farm&hour=14` 实际打开，canvas 存在、Farm 画面和登船提示正常、采样 60 FPS、console warning/error 为空。
- 既有最终 HEAD 浏览器证据：HOME→FARM 与 FARM→HOME 成功；农场靠岸不再进入农田；失败回退、旅行中刷新、2/4 发现、HIGH+storm 连续性、390×844 面板均通过。
- 未执行/未完成：最终版第 8–10 次压力往返、四发现全量、完整昼夜×天气×质量×导航矩阵、桌面原生 Pointer Lock。按用户要求停止继续验证，未把这些项目写成通过。

## 15. 性能

基线为本机 1920×1080、MEDIUM、Home Overview 单点：57 FPS、109 calls、91,260 triangles、29 geometries、CPU 1.0–1.3ms、heap 21.6–24.2MB；基线纹理数未暴露。最终连续水面版本往返样本：Home 58–61 FPS、97–100 calls、约 90,208–90,508 triangles、29 geometries、3 textures；Farm 60 FPS、13 calls、64,570 triangles、6 geometries、3 textures；DOM 113，声音 5 层/17 常驻节点。视角不同，不据此计算优化比例；这些是单机样本，不代表跨设备保证。

## 16. GitHub Pages

工作流 `.github/workflows/deploy-pages.yml` 在 main push 时执行 Node 22、`npm ci`、测试、构建、Pages artifact 上传和部署。run `34697338351` 对 HEAD `35a85531ba1091a8775ac64c84072c4b07e8888e` 的 build/deploy 均为 `success`。线上地址：`https://rxl333.github.io/bottle-sea/`。Vite 在 GitHub Actions 中使用 `/bottle-sea/` base，项目纯前端。线上 URL 本轮浏览器读取超时，因此本文只确认 Actions 部署成功，不额外声称本轮完成线上交互验收。

## 17. 不要重复做

- 不要重写原 `src/world/World.ts`、旧海洋、岛屿、房屋、灯塔或四发现系统；HomeWorld 已完成包装。
- 不要把多 Scene 常驻、iframe 或页面跳转重新引入世界切换；当前单 Scene + root 装卸是已确认方案。
- 不要再建立第二套时钟、天气、声音、HUD 或渲染循环；这些是全局常驻服务。
- 不要把环境帆船改造成交通船；PlayerTravelBoat 已独立实现。
- 不要重新排查已修复的 `SAILING_IN` 污染目标船坐标问题，除非出现新的可复现证据；现有回归测试必须保留。
- 不要把旧水面版本 10 次往返写成最终水面版本 10 次；最终版本真实记录是 7 次。
- 不要把预览查询参数状态当成正式存档，除非显式 `persist=1`。

## 18. 明确不在本阶段范围

耕种循环、作物成长、浇水与天气农业效果、动物与畜牧、农机驾驶、车辆物理、背包、物品、经济、商店、任务系统、NPC、正式农场 GLB、谷仓/农舍室内、深海与遗迹可玩地图、云存档、多人模式、复杂离线模拟均未实现，也不应作为本阶段缺陷统计。

## 19. 下一步与阶段关闭判断

基础设施与双岛业务闭环已经完成，未发现 P0/P1 阻断问题，可以关闭开发阶段并开始下一阶段；但不能宣称全部验收无条件通过。建议下一窗口先保留 6 项 PARTIAL 为验证债，不要阻塞原型开发：在目标桌面设备补 Pointer Lock；最终水面版补满 10 次往返；补四发现和边界矩阵。之后先确定农机、玩家、道路、谷仓门和田块的统一尺寸，再接正式 GLB 与驾驶原型；农业循环另开设计阶段。

阶段标记：**NEXT STAGE READY（带验证债）**。

## 20. NEW CODEX SESSION CONTEXT

项目位于 `D:\Projects\D_vibe_coding\瓶中沧海`，技术栈为 Vite 7、TypeScript 5.9、Three.js 0.186，无服务端。当前分支 `main`，HEAD `35a85531ba1091a8775ac64c84072c4b07e8888e`，与 `origin/main` 同步。Pages run `34697338351` 已在同一 SHA 上 build/deploy success，地址 `https://rxl333.github.io/bottle-sea/`。本文生成前工作区 clean，之后仅本文件未提交；不要自动提交，先看 `git status`。

World Expansion Foundation 的业务范围已实现。`Game` 常驻 Renderer/Scene/Camera/GameClock/Weather/Sound/HUD/SaveSystem；地图由 `WorldRegistry` 动态 import，`WorldManager` 在单 Scene 内执行 load/enter/update/leave/dispose。`GameWorld` 契约在 `src/worlds/types.ts`，状态为 IDLE/LOADING/SWITCHING/READY/ERROR。HomeWorld 包装旧 `src/world/World.ts`、Room、Bottle 和四发现系统，HomeNavigation 保留陆地、游泳、碰撞与瓶体边界。不要重写旧主岛或让 Game 重新依赖 Home 私有对象。

旅行核心 `src/travel/TravelSystem.ts` 顺序是 BOARDING→DEPARTING→SAILING_OUT→WORLD_SWITCH→SAILING_IN→WORLD_SWITCH→ARRIVING→DISEMBARKING，约 6.85 秒加加载。HOME/FARM 可达，DEEP_SEA/RUINS 锁定。TravelWorld 使用连接海面，近海与交通船四点浮力共用 `waveHeight`，外环延展到视距外。旧穿模根因是目标世界同步挂入后仍处 SAILING_IN，新船坐标被同帧污染；现已在目标激活前切 WORLD_SWITCH，靠岸使用不可变 berth，并有回归测试。不要破坏此状态顺序。

FarmWorld 是约 26×20 的灰盒：2.5 宽道路、三块 5×7 空田、码头、农舍、封闭谷仓、树和栅栏；到达点 `[-4,4.44,14.5]`，有独立 NavigationSurface。没有农业、动物、农机、背包、经济、室内或正式 GLB。下一阶段先统一玩家、车辆、道路、门洞和田块尺寸，再做正式资产/驾驶原型；农业循环单独设计。

存档键 `bottle-sea.save.v1`。PlayerState 保存世界、出生点、解锁、最后目的地和发现；WorldStateRegistry 保存 HOME/FARM discoveries 与 lastSimulatedGameTime。SaveSystem 有版本入口、损坏回退、250ms 防抖和关闭 flush。旅行中刷新恢复最后成功世界；途中只更新动画，成功抵达才推进一次 20 分钟。天气、质量和发现跨岛保持。`?view=dock&fail=farm` 测回 HOME，`fail=fallback` 测 fatal；预览参数默认隔离，`persist=1` 才用正式存档。

当前 typecheck、test、build 全过，Vitest 为 32 文件 107 项。浏览器已验证双向往返、穿模修复、错误恢复、旅行中刷新、HIGH+storm、2/4 发现和窄屏面板；本轮 Farm 直达页为 60 FPS，无 console warning/error。没有已知 P0/P1。验证债必须保留：最终连续水面版只跑 7/10 次完整往返；四发现全量、完整昼夜/天气/质量/导航矩阵、桌面原生 Pointer Lock 未补。性能样本：Home 58–61 FPS、97–100 calls、29 geometry/3 textures；Farm 60 FPS、13 calls、6 geometry/3 textures；DOM 113、声音 5 层/17 节点。TravelOcean 每帧更新顶点是低端设备 P2 风险。

新窗口先读本文件、设计 spec、实施 plan 与 `docs/WORLD_EXPANSION_IMPLEMENTATION.md`，再检查 git。阶段可带验证债进入下一步。不要把旧水面版 10 次往返误写成最终版结果。
