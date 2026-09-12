# World Expansion Foundation 阶段交付

按用户最新指示停止重复验证，完成本阶段代码交付。功能范围保持为世界架构、双岛航行、农场原型与持久状态；剩余浏览器验收不再作为进入下一阶段的阻塞项。未执行的检查不计为通过。

## 最终 33 项交付说明

1. **总体状态**：HOME↔TRAVEL↔FARM 闭环、存档、导航和错误恢复已实现。用户要求直接收尾，停止扩展验收。
2. **架构**：单 Scene、Renderer、Camera、GameLoop、GameClock；地图通过 WorldRegistry 动态 import、WorldManager 生命周期装卸。
3. **新增文件**：src/state 下 PlayerState/WorldStateRegistry/SaveSystem；src/worlds 下 types/NavigationSurface/WorldRegistry/WorldManager/disposeWorld、home/farm/travel；src/travel 下 DestinationRegistry/TravelSystem/TravelCamera；DestinationPanel、travel.css 及相关测试。
4. **核心修改**：Game 接线与循环、GameClock 动画/日历分离、ExploreController 导航适配、InteractionSystem 旅行交互、共享体素资源标记、声音/渲染诊断。
5. **HomeWorld**：包装原主岛、瓶体、房间、生态和发现，保留原环境帆船。旅行期间切换完整海面，普通探索恢复原瓶内海面。
6. **WorldManager**：IDLE/LOADING/SWITCHING/READY/ERROR，保存 leave 快照、装卸 root、应用质量和出生点、释放旧世界；支持脱离场景预加载。
7. **TravelSystem**：登船→离港→驶离→遮挡切换→旅行海面→遮挡切换→靠岸→下船。约 6.85 秒加加载时间；目标激活前先进入 WORLD_SWITCH，防止旧阶段污染新船坐标。
8. **PlayerTravelBoat**：独立程序化交通船、固定 berth、四点浮力、动态碰撞盒。主岛原出生点测试保持无重叠。
9. **TravelWorld**：简化海面/云鸟/交通船，连续网格水面使用同一 waveHeight，外环延伸到视距之外。
10. **FarmWorld**：约 26×20 岛体，2.5 宽道路、三块 5×7 空田、码头、谷仓、农舍、草地、树和栅栏；没有农业、农机、动物、内饰或 GLB 资产。
11. **DestinationRegistry**：HOME/FARM 可达，DEEP_SEA/RUINS 锁定占位；旅行与发现独立。
12. **SaveSystem**：bottle-sea.save.v1，本地纯 JSON；默认合并、损坏回退、版本入口、250ms 节流、隐藏/关闭 flush；旅行中刷新恢复最后成功抵达世界。
13. **PlayerState**：当前世界、命名出生点、解锁目的地、最后目的地和发现 ID。
14. **WorldStateRegistry**：HOME/FARM 保存 lastSimulatedGameTime 和 discoveries；快照与运行对象隔离。
15. **GameClock**：旅途中只推进动画时间，成功抵达增加 20 游戏分钟；普通刷新和中断航行恢复的实际页面验证通过。
16. **Weather**：共用全局天气，storm/intensity 随存档恢复；跨岛 HIGH + storm 的实际继承验证通过。
17. **Discovery**：主岛快照恢复发现；实际 lighthouse/anchor 两项跨岛、普通刷新保持 2/4。四项全部完成的最终浏览器复核未继续执行。
18. **Camera/Controls**：第三人称旅行镜头抬高，离靠岸平滑插值，抵达恢复第一人称；Esc/返回码头取消面板已实际验证。
19. **Navigation**：Home 保留瓶体导航；Farm 独立地形/建筑/边界；真实控制器道路与建筑测试通过。
20. **Dispose**：只释放世界独占几何、材质、纹理、实例与阴影；共享体素资源保留。最新版本连续往返没有观察到资源线性增长。
21. **Error fallback**：目标失败返回 HOME，双重失败显示中文刷新提示；两种故障入口已实际验证，正常回退后 E 可用。
22. **测试**：新增状态、存档、生命周期、旅行 FSM、导航、资源所有权和连续水面测试，含同步激活/异步状态竞争回归。
23. **typecheck**：最新 npm run build 中 tsc --noEmit 通过。
24. **test**：最新全量 32 文件、107 项通过。
25. **build**：最新生产构建通过，地图动态 chunk 正常生成；未升级依赖。
26. **修改前 FPS**：1080p MEDIUM Home Overview 单点 57 FPS。
27. **修改后 FPS**：连续水面修正前同构图 60 FPS；最终版本往返 Home 58–61、Farm 60 FPS。属于本机采样，非跨设备保证。
28. **Draw Calls**：原 Overview 109，加入交通船后采样 111；最终往返 Explore Home 97–100、Farm 13。不同视角不计算优化比例。
29. **Geometry/Texture**：最终往返 Home 29/3、Farm 6/3；基线纹理未暴露，不推断基线数值。
30. **压力记录**：旧水面版本完成 10 次往返；最终修正版完成 7 次完整往返（14 单程，累计计数 3→17）后按用户要求停止。DOM 恒为 113，声音 5 层/17 常驻节点，Farm 64,570 triangles。不声称最终版完成 10 次。
31. **GitHub Pages**：/bottle-sea/ 路径构建验证通过，纯前端无后端依赖；本阶段交付位于 codex/world-expansion-foundation，未合入 main 或发布线上。
32. **保留限制**：最终版未补完 10 次压力循环、四发现全量和全部昼夜/质量/导航浏览器矩阵；按用户要求不继续。转场穿模根因已修复并实际截图确认船从码头外海面靠岸，出生点为 -4,4.44,14.5。
33. **下一阶段接续**：以本分支为起点，先确认车辆与建筑实际尺寸，再接入正式 GLB 和农机驾驶；农业玩法另行实施，不混入本阶段。

以下为过程中按时间追加的原始记录，早期“待完成”状态与旧指标以本节最终说明为准。

---
# World Expansion Foundation 实施记录

状态：进行中，往返闭环已实现并完成 10 次浏览器往返；存档恢复、异常恢复与最终视觉矩阵尚未全部完成浏览器验收，不能作为阶段完成报告。

## 保护基线

- 起点 main：37d78efd3791070d7817ddf7e82422cd8abac2c0。
- 开发分支：codex/world-expansion-foundation；不向 main 发布未验收的扩展。
- 已读取用户阶段附件、农场图、已批准 design/plan、README 和架构说明。
- 基线 npm install / typecheck / test / build 通过：25 个测试文件，72 项测试。依赖未升级。
- 2026-09-12，内嵌浏览器，本地 Vite，1920×1080 MEDIUM：57 FPS，109 calls，91,260 triangles，29 geometries，CPU 1.0–1.3 ms，max frame 19.1 ms；heap 21.6–24.2 MB。单点采样不是长时间性能结论。textures：unavailable（原统计未暴露）。
- 默认白天 Home 渲染可运行；Explore 切换可触发。全部昼夜/天气/质量/发现/水下浏览器回归仍待本阶段验收，不以单元测试代替浏览器验收。

## 已实现基础模块

- GameWorld 类型契约、WorldRegistry 延迟工厂、WorldManager 生命周期与失败恢复入口。
- PlayerState、WorldStateRegistry 纯 JSON 状态；SaveSystem v1 默认合并、损坏回退、版本入口、节流写入。
- GameClock snapshot/restore/advanceGameMinutes。旅行只推进日历，不跳变海浪的 elapsed 动画相位。
- DestinationRegistry：HOME/FARM 可用，DEEP_SEA/RUINS 占位且不可进入。
- 上述模块已接入 Game，存档已成为实际游戏行为；早期模块阶段的验证记录保留如下。
- 阶段验证：typecheck / 90 tests / build 通过。

## 后续阶段与验收

1. HomeWorld 包装与资源所有权；Navigation 适配；完整保护原碰撞与移动算法。
2. 交通船、DestinationPanel、TRAVEL action。
3. TravelWorld、FSM、第三人称镜头、海雾、失败返回。
4. Farm 原型：宽道路、三块空田、谷仓、码头、草地、树、栅栏、边界；无农业玩法。
5. Game 接入、持久时间天气质量发现、刷新和旅行中恢复。
6. 26 项浏览器检查，1080p 与窄屏，10 次往返资源/DOM/音频回调压力测试。
7. Pages base 构建，完整 33 项最终报告。未满足以上所有项目前不宣称完成。

- HomeWorld 包装、HomeNavigation 适配、共享/独占资源释放已实现；现有 ExploreController 已经使用导航接口。包装阶段 93 项测试通过，包含真实 Home 销毁重建、共享资源保护与瓶体范围外导航。Game 的 WorldManager 已在后续闭环阶段接入。


## 已接入游戏的往返闭环（2026-09-12）

- 交通船、目的地面板、DISCOVER/TRAVEL 分离、TravelWorld/FarmWorld 已实际接入 Game。
- Game 使用单 Scene 和 WorldManager；地图模块动态 import，旧地图离开后释放独占资源。全局声音/天气/时钟/HUD 不重建。
- 航行状态约 6.85 秒加加载时间，包含离港、旅行海面、浓雾遮挡、目标靠岸和下船。Home 离港时额外远海底色填充原瓶内海面裁切外区域；瓶外 Room/Bottle 隐藏，到达恢复。
- 新船已经移到码头外沿，并验证风暴期间与原出生点不重叠。原环境帆船未替换。
- 当前 101 项测试通过；普通存档刷新和失败路径浏览器验收继续进行。

## 浏览器 10 次往返压力验证

本地 Vite，1920×1080，MEDIUM，声音启用，真实 E 登船 + 目的地按钮，完整航行动画，没有跳过状态机。

实际完成 20 次单程 / 10 次 HOME↔FARM 往返。最终 data-completed-trips=20、data-interaction-count=20，未出现重复交互回调；最终 HOME 位置恢复，控制可用，无 console error。

| 指标 | HOME 多次返回 | FARM 多次抵达 |
|---|---:|---:|
| 有效连续采样 FPS | 56–58 | 57 |
| draw calls | 98–100 | 13 |
| triangles | 90,180–90,528 | 84,872 |
| geometries | 29 | 5 |
| textures | 3 | 3 |
| DOM 元素 | 113 | 113 |
| 常驻音频层 | 5 | 5 |
| 音频节点（无瞬态音效时） | 17 | 17 |

采样环境限制：预览失活时出现 1–2 FPS 限帧读数，不能视为 GPU 性能；保持浏览器验收调用活跃后的连续有效采样如表。第一条 FARM 采样 1 FPS 保留为失活异常，不混入稳定 FPS 区间。没有资源或 DOM 数量按往返次数线性增长。上表是 Explore/到达视角，不能直接用 calls 和最初 Overview 的 109 calls 做同视角性能结论；最终 Overview 对比仍需补采样。

## 补充验证（2026-09-12 16:28）

- 全量 Vitest：31 个文件、105 项通过；生产构建含 strict TypeScript 检查通过。
- 新增 3 项 WorldManager 测试：预加载保持原场景且不重复 load、预加载失败释放资源不改变当前世界、预加载完成但 enter 失败后恢复可见的旧世界。
- GITHUB_ACTIONS=true 生产构建通过，dist/index.html 的 JS/CSS 均使用 /bottle-sea/assets/；HOME/FARM/TRAVEL 独立动态 chunk 正常产出。这证明 Pages 路径构建兼容，不等于线上已发布或线上运行验收。
- 本轮浏览器 inventory 连续两次返回 nodeRepl.fetch request failed，未获得可操作标签；不把连接失败算作游戏失败，也不把尚未执行的存档、异常、窄屏检查算作通过。
- 上一轮实际 E 交互已完成 lighthouse、anchor 两个发现，HUD 为 2/4；跨岛和普通刷新保持这些进度的端到端检查仍待执行。

## 33 项交付核对表（验收草稿，非完成声明）

| 编号 / 要求 | 当前实现与证据 | 尚需验证 |
|---|---|---|
| 1 总体完成状态 | HOME↔TRAVEL↔FARM 闭环已实现，10 次往返有浏览器记录 | 最终浏览器矩阵未完成 |
| 2 实际 World 架构 | 单 Scene/Renderer/Camera/Clock；WorldRegistry 延迟工厂、WorldManager 生命周期 | 无新增架构范围 |
| 3 新增文件 | src/state、src/worlds、src/travel；DestinationPanel、travel.css；相关单元测试 | 最终提交文件清单待冻结 |
| 4 修改的核心文件 | Game、GameClock、Preview、ExploreController、InteractionSystem、SoundSystem、PerformanceMonitor、voxel | 最终差异复核 |
| 5 HomeWorld 适配 | 包装原 World/Room/Bottle/发现系统，新增独立交通船；原环境帆船保留 | 完整主岛视觉回归矩阵 |
| 6 WorldManager | leave 保存快照，装卸 root，load/enter/quality/spawn，释放旧世界；8 项生命周期测试通过 | 浏览器失败提示和控制恢复 |
| 7 TravelSystem | BOARDING→DEPARTING→SAILING_OUT→WORLD_SWITCH→SAILING_IN→ARRIVING→DISEMBARKING；6.85 秒加加载 | 最终不同画质镜头复核 |
| 8 PlayerTravelBoat | 程序化体素交通船，独立于环境帆船，四点波浪浮力与动态碰撞盒 | 无额外资产范围 |
| 9 TravelWorld | 独立旅行海面、交通船和简化云鸟；雾遮挡场景切换 | 最终夜间/风暴视觉 |
| 10 FarmWorld Prototype | 约 26×20 岛体、码头、2.5 宽道路、三块 5×7 空田、谷仓/农舍、树/栅栏；独立导航 | 近景、边界、夜间和窄屏浏览器复核 |
| 11 DestinationRegistry | HOME/FARM 可达，DEEP_SEA/RUINS 锁定占位；实际面板已操作 | Esc/返回按钮最终回归 |
| 12 SaveSystem | v1 本地存储、默认合并、损坏回退、250ms 节流、关闭/隐藏 flush；纯数据测试通过 | 普通刷新与旅行中刷新端到端 |
| 13 PlayerState | 当前世界/命名出生点/解锁目的地/最后目的地/发现 ID；纯 JSON | 跨岛后实际存档恢复 |
| 14 WorldStateRegistry | 每世界 discoveries 和 lastSimulatedGameTime；快照隔离、数据规范化 | 后续玩法不在本阶段 |
| 15 GameClock 连续性 | 途中只推进动画 elapsed，成功抵达增加 20 游戏分钟；往返 40 分钟测试通过 | 暂停存档下实际往返时钟核对 |
| 16 Weather 连续性 | 共用 WeatherSystem，storm/intensity 保存在全局存档；跨世界调整覆盖范围 | 风暴跨岛截图与刷新验证 |
| 17 Discovery 持久化 | DISCOVER/TRAVEL 分离；Home leave/enter 恢复；实际 lighthouse/anchor 已得 2/4 | 4 项发现、跨岛和刷新保持 |
| 18 Camera / Controls | 旅行独占第三人称镜头，登离船插值，抵达恢复 Explore；10 次往返可用 | 面板取消、不同视角与窄屏复核 |
| 19 Navigation 解耦 | HomeNavigation 保留瓶体逻辑；Farm 独立地形/建筑/边界；真实控制器道路和建筑测试通过 | 浏览器边界探索 |
| 20 Dispose 策略 | 共享体素资源保留，独占几何/材质/纹理/实例/灯光阴影释放；压力记录稳定 | 无增长已验证，最终资源变更后需重测 |
| 21 Error fallback | 目标加载失败返回 HOME，HOME 失败显式 ERROR 中文提示；DEV 故障入口和测试已实现 | 真实页面提示、遮挡清除和控制恢复 |
| 22 新增测试 | 状态/存档/时钟/世界生命周期/旅行 FSM/导航/资源释放；合计 105 项 | 不以纯测试替代页面验收 |
| 23 typecheck | npm run build 内 tsc --noEmit 成功 | 最终代码变更后再运行 |
| 24 test | 31 文件、105 项通过（2026-09-12） | 最终代码变更后再运行 |
| 25 build | 普通生产构建与 GITHUB_ACTIONS=true 构建成功 | 最终提交前复核 |
| 26 修改前 FPS | 1080p MEDIUM Home Overview 57 FPS；单点采样 | 不是长期性能结论 |
| 27 修改后 FPS | 连续有效采样 Home 56–58、Farm 57 FPS | Overview 同构图补采样 |
| 28 Draw Calls | 基线 Overview 109；往返 Explore Home 98–100、Farm 13 | 视角不同，不能宣称优化百分比 |
| 29 Geometry / Texture | 基线 29 geometry，texture 未暴露；往返 Home 29/3、Farm 5/3 | 不推断基线纹理数 |
| 30 10 次往返压力测试 | 20 单程、20 次交互；DOM 113、音频 5 层/17 常驻节点、资源数稳定；无 console error | 本轮仅新增测试/文档，不重新声称完成视觉矩阵 |
| 31 GitHub Pages 兼容性 | /bottle-sea/assets/ 生产链接、动态世界 chunk 构建通过；纯前端 | 此扩展尚未发布到 main/线上 |
| 32 当前遗留问题 | 浏览器控制连续报 nodeRepl.fetch request failed；刷新、失败、窄屏和完整视觉矩阵缺证据 | 连接恢复后继续，不能标记完成 |
| 33 下一阶段建议 | 本阶段验收和世界尺寸确认后接入正式 GLB；再另行设计农业/农机玩法 | 不在当前分支提前实现 |

连接恢复后的优先次序：2/4 发现 + HIGH + storm 存档往返 → 普通刷新恢复 Farm → 航行中刷新仍恢复最后成功世界 → 完整返回 Home → 两种故障入口 → 昼夜/风暴/质量与窄屏矩阵 → 同构图性能采样 → 最终报告与提交审计。

## 浏览器连接恢复后的存档与异常验收

直接创建 IAB 标签成功后，确认旧 Vite session 已失效并重新启动本地服务。本轮完成以下真实页面操作：

- 带 persist=1 的码头入口读回 lighthouse、anchor 两项发现、HIGH 画质和 storm=true。
- 成功去 FARM：position=-4,4.44,14.5，travel=IDLE，发现保持两项，HUD 19:03。
- 普通无参数入口刷新恢复 FARM。再次刷新确认码头出生点 -4,4.44,14.5，E 可以打开返航面板。
- FARM 返 HOME 在 DEPARTING 阶段刷新：恢复 FARM / IDLE / HIGH / lighthouse,anchor，仍为 19:03，没有收取未完成航程的 20 分钟。
- 随后完整返 HOME：原出生点 .65,4.12,1.87；HUD 2/4，19:23，恰好增加 20 游戏分钟。
- fail=farm：真实航行触发失败，显示中文返航通知，恢复 HOME / IDLE，E 可重新打开目的地面板；Esc 关闭面板恢复画面。
- fail=fallback：真实航行后显示“加载失败，请刷新页面重试。”，没有被永久遮挡掩盖。此为显式注入的预期失败。

上述结果补齐表中对应存档/异常证据。完整四发现、昼夜风暴视觉矩阵、窄屏和 Overview 同构图性能仍待完成。浏览器 locator.evaluate 在部分刷新后出现 3 秒读取超时，getAttribute 与实际 AX 操作可用；未据此推断游戏故障。

## 转场穿模修正（用户截图回归，2026-09-12）

用户截图中的船出现在农田内，根因是准备好的目标世界在 switchToDestination 调用期间同步挂入 Scene，而 TravelSystem 仍处于 SAILING_IN。同一 RAF 剩余代码将新船 z 写为 p*3；异步 continuation 再把受污染坐标记录成靠岸 dock，导致整段靠岸进入陆地。

修复：目标激活前先进入 WORLD_SWITCH；SAILING_IN 坐标仅作用于 TRAVEL；目标靠岸基准读取不可变 berth 并显式重置船位。新增测试模拟同步挂入但 Promise 尚未结束的帧，确认此时状态已为 WORLD_SWITCH。

同步改进：TravelOcean 改为连接的三角网格，近处波浪使用与浮力相同的 waveHeight，外环延伸到视距外；主岛旅行期间隐藏瓶内裁切海面并显示连续海面，结束后恢复原海面。旅行镜头抬高，离靠岸进度使用平滑插值。

验证：107 项测试、strict typecheck 与生产构建通过；实际 HOME→FARM / FARM→HOME 播放成功，5.5 秒靠岸截图显示船仍在码头外海面，无农田穿模；最终玩家 -4,4.44,14.5，E 登船提示正常，无 console error。新水面替换使此前 10 次往返资源统计不再代表最终渲染版本，阶段压力验收需要重跑。
