# 架构

## 生命周期

main.ts 仅加载样式并创建 Game。Game 构建 Renderer、Scene、World、Bottle、Room、两类控制器、系统及 HUD。GameLoop 是唯一 requestAnimationFrame 所有者，使用 RAF 时间戳并将 delta 限制到 50 ms，避免切换标签后大幅跳变。所有动画时间来自 GameClock.elapsed；玩家控制使用真实 delta，不受时间倍速影响。

顺序：时钟 → 天气强度 → 当前控制器 → 水下雾 → 波浪/船/鱼/气泡/浮标/海鸟 → 声音/交互 → 昼夜和灯塔 → 低频 HUD → render → 性能采样。暂停冻结模拟，玩家仍能观察和移动。

## 坐标与世界

瓶轴为 X，中心高度 3.72；默认相机朝 -Z。静态水位 3.3。岛屿中心略偏左。瓶体用 LatheGeometry，瓶口在 +X，木架留在桌面上。Bottle.shell 与 World 是独立对象，风暴只轻摇外壳，内部海平面不旋转。

瓶体半径随 X 分段变化，Bounds 模块供水面和玩家边界共用。静态地形避开瓶肩，海底随瓶底弧面升高。探索碰撞采用地面高度、建筑范围与径向约束，不使用物理引擎。

## 渲染策略

静态方块经 VoxelBatch 合为 InstancedMesh，每个实例带颜色。BoxGeometry 与基础材质共享。少量独立动态组用于帆船、灯塔和浮标；所有水方块统一实例化更新，复用 Object3D 矩阵。雨用 LineSegments，气泡和星星用 Points，鱼用四部件实例化。

水面由薄 BoxGeometry 网格组成。波高由三个连续 sin 波叠加，天气增加幅度与速度。帆船四点采样调用同一波函数，求平均高度和两个方向坡度，不生成独立随机摇摆。

玻璃使用轻量 Fresnel ShaderMaterial，高亮边缘、低透明度，不使用昂贵的物理透射。水体、水面、玻璃依次 renderOrder=2/3/5；透明对象 depthWrite=false，保留 depthTest。没有后处理链。

## 交互与 UI

HUD 是 DOM/CSS，控制按钮有 aria-pressed、键盘焦点和可读标签，发现通知使用 aria-live。交互距离阈值 0.85，Set 保证发现幂等。时间/UI 每 250 ms 刷新，性能每约 1 s 刷新。

PointerLockControls 只在 requestPointerLock 成功后连接，避免嵌入浏览器拒绝时产生 Three.js 控制器错误；备用拖动使用 Euler YXZ。键盘在失焦/解锁时清除，防止卡键。

## 测试

Vitest 覆盖 WaveMath、Buoyancy、GameClock、DayTimeMath、天气过渡和闪电；探索测试使用轻量 EventTarget 夹具驱动真实控制器，检查上岛、跳跃、碰撞、下潜、上浮、边界和四个发现。没有为渲染层引入测试框架或重型 DOM 环境。
