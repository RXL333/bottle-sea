# 架构

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
