# 架构

## FarmWorld 地图基础

FarmMap 统一定义 FARM_MAP version=1、约 72×76 岛体边界、道路、田头、各类分区、泊船落点及基于 Blender manifest 的农机尺寸。三块 12×18 主田拥有固定 id 与 1 单位网格原点 / 列行数；farmFieldCell / farmCellCenter 仅提供纯空间映射。预留地块没有农业运行状态，未修改 SaveSystem。

FarmTopography 统一体素地面与模型基础高度；FarmTerrain 提供道路、空田、边界刻度、草地与岛缘坡地，NavigationSurface 使用同一高度和表面数据。FarmLayout 的建筑、农机、树干、围栏及路牌碰撞独立于主岛。FarmOcean 的矩形细分区域覆盖全岛海岸，继续复用 WaveMath，不修改 TravelOcean。

FarmModels 对环境做材质合批，车辆 / 动物保留独立实例及语义节点，在节点内合并 primitive。所有源资产、合并几何及实体路牌纹理由 FarmWorld 通过 disposeWorld 释放。FarmWayfinding 放置实体路标，Game 仅对 FARM 的远景雾、阴影范围与局部天空 / 雨覆盖作适配。HOME / TRAVEL 的世界架构与原船位、TRAVEL 交互、farm_dock_arrival 保持原接口。详见 [FARM_MAP_FOUNDATION.md](FARM_MAP_FOUNDATION.md)。

## Inventory / Hotbar

ItemRegistry 统一保存 ItemDefinition：id、name、category、description、icon、maxStack，以及可选 sellPrice、energyRestore、cropId、fishing。鱼的权重、颜色和稀有度也位于该注册表；FishingCatalog / CookingCatalog 仅提供视图、钓鱼点或食谱规则。注册定义及嵌套 fishing 属性冻结，玩家 ItemStack 只包含 itemId / quantity。

Inventory 的 slots 数组保持真实槽位索引，每格为 ItemStack 或 null。原 add / remove / transferTo / exchange 保留，并增加 getSlot、occupiedSlots、emptySlots、firstEmptySlot、selectSlot、moveStack、moveSlotTo、splitStack、removeFromSlot、transferSlotTo、transferAllTo。整笔自动入包和跨容器转移失败不提交；槽位拖拽同物品允许填满目标堆叠、剩余留在源槽，整堆不同物品可交换。所有写操作统一提升 revision 和请求保存，UI 不修改快照。

GameplayFoundation 额外持有 Hotbar，8 个 bindings 保存 itemId 引用，selectedIndex 记录当前快捷位。每次显示与使用都从 Inventory 读取真实数量；不持有额外堆叠。物品用完后保留灰色引用，重新获得会自动可用。InventoryPanel 共享背包 / 仓库网格和物品详情，HotbarView 在 HUD 及面板内复用，HomePanel 只负责睡觉确认；Game 的 gameplayPanelOpen 统一阻止面板期间的移动、交互和场景切换。

存档 v2 保留原 key，inventory / home.chest 的快照新增 selectedSlot，GameplaySnapshot 新增 hotbar 字段。旧档默认未选中背包槽、空快捷栏并选第 1 快捷位。容量按运行时限制，未知物品及越界引用归一化，不写入图标或三维对象。详见 [INVENTORY_SYSTEM.md](INVENTORY_SYSTEM.md)。

## Fishing / Cooking

GameplayFoundation 持有跨世界的 FishingSystem、CookingSystem，ItemRegistry 注册 6 种鱼与 4 种食物。FishingCatalog / CookingCatalog 管理权重、食谱、产物、体力成本和恢复值。HomeWorld 的钓鱼台与 CottageWorld 的炉灶均通过统一 InteractionSystem / E 接入；Game 协调玩法更新、鼠标输入、面板和音效反馈。

FishingSystem 的状态为 IDLE → CASTING → WAITING → BITE → FIGHTING → REELING → IDLE。提钩后通过左键按住/松开或点击控制张力，移动最佳区决定进度增加/减少；常见/少见/稀有鱼影响区域宽度与难度，猛烈挣扎加快张力变化，零进度超过宽限后逃脱。只有完成进度及收杆动画才奖励物品。Game 使用不受倍速/暂停影响的 frame delta 更新钓鱼逻辑，离开交互范围、进入水中、Esc 或页面隐藏取消；进行中的钓鱼不写入存档。FishingPresentation 复用几何体绘制鱼竿、鱼线、浮漂、波纹及收杆鱼形。

CookingSystem 预检鱼、材料、体力及产物空间，3 秒完成时再次检查并使用 Inventory.exchange 一次提交扣料与产物。食用仅接受已制作食物，满体力不扣食物，恢复按上限截断。CookingPanel 提供炉灶食谱和 F 随身食物两种模式；取消烹饪不扣材料。面板沿用 Home 的鼠标释放/恢复和日历暂停方式。

存档保持 v2 key，新增 `fishing: { pendingCatch, inputMode }`，旧存档默认无暂存、长按模式。鱼、料理均走原 Inventory / Home 箱子快照；收杆结算若空间变化则持久化暂存一条鱼，在钓鱼台领取后清空。奖励、烹饪、食用成功后立即保存完整快照，中间状态不独立保存。功能规则与用户验收项见 [FISHING_COOKING.md](FISHING_COOKING.md)。

## Home System

GameplayFoundation 同时持有 HomeSystem，其快照为 `home: { chest }`；24 格小屋箱子复用 Inventory 的整笔容器转移。没有 Home 字段的旧存档首次补木材 8、石头 4，已有空箱子不补发；旧 doorOpen 字段忽略，门保持关闭。

CottageWorld 从实际家具布局建立门、床、箱子、炉灶的交互目标。门 E 直接执行场景切换，航海桌及配套物件靠右墙，模型与碰撞使用同一布局。床和箱子由 Game 注册行为打开 HomePanel，家具面板冻结日历并暂停探索，关闭后保留当前位置；睡觉采用独立 SleepTransition 和 SleepOverlay，按实际 6 秒播放月光到日出的 SVG 动画，接近结束时调用次日时间 API 和体力恢复。

HUD 右侧中央的按键卡片显示 InteractionSystem 的提示。ExploreController 的过场暂停保留 Pointer Lock，面板暂停记录之前锁定状态，点击关闭 / 选择时恢复；动画过程中阻止鼠标旋转和移动，场景交接后恢复输入，不要求重新双击。

航行身份仍为 HOME / FARM；`PlayerState.currentSpawnId = cottage_entry` 记录人在屋内，刷新加载 COTTAGE 并恢复安全入口。真实模型、handler、UI 与相机坐标均不写入存档。功能说明与待验收项见 [HOME_SYSTEM.md](HOME_SYSTEM.md)。

## Gameplay Foundation

Game 唯一持有 GameplayFoundation，包含 ItemRegistry、Inventory、PlayerProgress 和 GameplayTime；世界切换或销毁不重建这些服务。WorldManager 通过 enter 上下文传递服务，统一 E 键交互也收到相同实例。InteractionSystem 负责目标距离、可用性、提示、行为分发及异步防重入；Game 注册旅行与小屋过场行为，并处理统一结果和发现反馈。世界新增玩法可在目标上注册 onInteract，无需继续扩展 Game 的 action 判断。

SaveSystem 当前采用 v2 新 key，并从 v1 迁移；保存公共背包、玩家进度以及原有世界、时间和设置。GameplayTime 提供分钟推进和次日时刻推进，不改变动画时钟、倍速和暂停。公共状态变更请求节流保存；旅行到达和页面关闭仍立即 flush。容器转移整笔提交，失败无部分扣除。详细接口与边界见 [GAMEPLAY_FOUNDATION.md](GAMEPLAY_FOUNDATION.md)。下方为世界扩展及视觉系统说明，其中 v1 内容为历史基础。

## 生命周期

### World Expansion Foundation 分支

Game 保留唯一的 Scene、Renderer、Camera、GameLoop、GameClock、天气、声音、HUD 和玩家控制器。WorldRegistry 用动态 import 延迟创建 HOME / TRAVEL / FARM；WorldManager 负责 load → enter → update → leave → dispose，地图根节点整体装卸。HomeWorld 包装原 World、Bottle、Room、发现交互和主岛细节，原主岛系统继续使用原有算法。

NavigationSurface 将地面高度、静态障碍、水位和动态碰撞交给当前世界。HomeNavigation 保存瓶体约束；FarmWorld 使用独立地形、建筑障碍和地图边界。ExploreController 切换适配器时清空输入，不重建控制器。

TravelSystem 控制登船、离港、旅行海面、接近目的地、靠岸和下船；TravelCamera 在这段时间独占相机。目标世界先脱离场景预加载，再在遮挡下激活。单程动画时长约 6.85 秒加实际加载时间，成功到达一次性推进 20 游戏分钟；途中只更新动画时钟，避免重复计算日历时间。

PlayerState 和 WorldStateRegistry 存放纯 JSON 数据。SaveSystem 管理 v1 本地存档，默认合并、格式错误回退和节流写入；lastSuccessfulWorld 确保中途刷新不会恢复到 TRAVEL。世界切换与发现后保存，页面隐藏和关闭时同步 flush。资源释放跳过共享体素几何和缓存材质，只销毁地图拥有的资源。

以下保留主岛内部系统说明；其中旧版直接由 Game 创建 World 的组织方式已由上述世界生命周期替代。

main.ts 仅加载样式并创建 Game。Game 构建 Renderer、Scene、World、Bottle、Room、两类控制器、系统及 HUD。GameLoop 是唯一 requestAnimationFrame 所有者，使用 RAF 时间戳并将 delta 限制到 50 ms，避免切换标签后大幅跳变。所有动画时间来自 GameClock.elapsed；玩家控制使用真实 delta，不受时间倍速影响。

顺序：时钟 → 天气强度 → 当前控制器 → 水下雾 → 波浪/船/鱼/气泡/浮标/海鸟 → 声音/交互 → 昼夜和灯塔 → 低频 HUD → render → 性能采样。暂停冻结模拟，玩家仍能观察和移动。

Stage 1 增量：CameraTransitionSystem以OVERVIEW/ENTERING/EXPLORE/EXITING独占模式切换期间的镜头，SceneFocusSystem在浏览模式插值position/target。Orbit交接先清空阻尼；Explore暂停输入并释放锁鼠标。PlayerFeedback使用真实移动距离计算脚步、bob和冲刺FOV，bob仅在render前叠加、render后移除，绝不反馈到碰撞。WaterEntrySystem在实际控制器位置上做带迟滞的入水边缘检测，粒子使用固定实例池。调试模式低频DOM属性记录camera mode和water entries/leaves，生产构建移除。

## 坐标与世界

瓶轴为 X，中心高度 3.72；默认相机朝 -Z。静态水位 3.3。岛屿中心略偏左。瓶体用 LatheGeometry，瓶口在 +X，木架留在桌面上。Bottle.shell 与 World 是独立对象，风暴只轻摇外壳，内部海平面不旋转。

瓶体半径随 X 分段变化，Bounds 模块供水面和玩家边界共用。静态地形避开瓶肩，海底随瓶底弧面升高。探索碰撞采用地面高度、建筑范围与径向约束，不使用物理引擎。

## 渲染策略

静态方块经 VoxelBatch 合为 InstancedMesh，每个实例带颜色。BoxGeometry 与基础材质共享。少量独立动态组用于帆船、灯塔和浮标；所有水方块统一实例化更新，复用 Object3D 矩阵。雨用 LineSegments，气泡和星星用 Points，鱼用四部件实例化。

水面由薄 BoxGeometry 网格组成。波高由三个连续 sin 波叠加，天气增加幅度与速度。帆船四点采样调用同一波函数，求平均高度和两个方向坡度，不生成独立随机摇摆。

海色由OceanAppearance按岸距/深度/波高/浪峰/时段/天气输出复用Color，约15Hz刷新实例颜色。浪峰使用四邻域局部曲率，泡沫分浪峰、岸浪和码头扰动；ShipWake复用固定环形缓冲生成短暂船首浪和尾迹。天气通过波能和额外高频波混合，避免累计时间乘动态天气值造成相位突变。

玻璃使用轻量 Fresnel ShaderMaterial，高亮边缘、低透明度，不使用昂贵的物理透射。水体、水面、玻璃依次 renderOrder=2/3/5；透明对象 depthWrite=false，保留 depthTest。没有后处理链。

## 交互与 UI

HUD 是 DOM/CSS，控制按钮有 aria-pressed、键盘焦点和可读标签，发现通知使用 aria-live。交互距离阈值 0.85，Set 保证发现幂等。时间/UI 每 250 ms 刷新，性能每约 1 s 刷新。

PointerLockControls 只在 requestPointerLock 成功后连接，避免嵌入浏览器拒绝时产生 Three.js 控制器错误；备用拖动使用 Euler YXZ。键盘在失焦/解锁时清除，防止卡键。

DiscoveryPulse为四目标隔离材质，350ms内轻亮后精确恢复；HUD显示可关闭7秒卡片，Set继续保证发现幂等。SoundSystem保留用户点击解锁AudioContext；AudioAssets只加载真实存在的可选文件，缺失/解码失败使用合成fallback。AudioMixer以浏览、岛屿、水下状态控制五层音量和全局低通，雷声由闪电边缘触发。

## 测试

Vitest 覆盖 WaveMath、Buoyancy、GameClock、DayTimeMath、天气过渡和闪电；探索测试使用轻量 EventTarget 夹具驱动真实控制器，检查上岛、跳跃、碰撞、下潜、上浮、边界和四个发现。没有为渲染层引入测试框架或重型 DOM 环境。
