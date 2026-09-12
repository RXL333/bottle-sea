# 瓶中沧海 · Bottle Sea

一个能走进去的桌面微缩海洋。Vite + TypeScript strict + Three.js 0.186.0 / WebGL 2，纯前端、无框架、无后端。所有场景模型程序生成；默认无外部模型、贴图或音频下载。

在线游玩：https://rxl333.github.io/bottle-sea/

## 运行

建议 Node.js 22.12+（本次使用 24.11.1）。

```sh
npm install
npm run dev
```

开发地址： http://127.0.0.1:5173/

```sh
npm run typecheck
npm run test
npm run build
npm run preview
```

构建产物在 `dist/`，可以部署到静态 Web 服务。不要直接通过 file:// 打开 index.html。

## 玩法

- 浏览：拖动旋转、滚轮缩放。视角及缩放有边界。
- 观察点：右侧小菜单平滑切换全景、灯塔、帆船、岛屿和海底特写。
- 时间：暂停/继续、x1 / x4 / x12；一个游戏日约 8 分钟（x1）。
- 风暴：点击进入或退出，渐变云层、连续强浪、雨、闪电和船体摇摆。
- 声音：点击启用五层 Web Audio 环境音、三类脚步、入水、雷声和发现提示音；水下自动低通并减弱外部环境。再次点击关闭，默认静音。可选音频文件说明见 `src/assets/audio/README.md`。
- 探索模式：镜头约1.7秒进入码头；WASD 移动，鼠标观察，Space 跳跃/上升，C 下潜，Shift 加速，E 发现。行走有微幅镜头起伏，冲刺平滑扩大视野。Esc 释放鼠标，点击“返回瓶外”平滑回到外部视角。
- 锁定鼠标被嵌入浏览器拒绝时：拖动画面观察，键盘移动照常可用；双击重试锁定。
- 靠近灯塔、宝箱、船锚、沉船旁的石柱遗迹，按 E 填写航海手记。四处全部发现即完成这一航次。发现进度自动存入本地，普通刷新后恢复。
- 可观察时准星变为◇；发现后目标轻亮，出现可关闭的短暂航海手记卡片。跳海会产生有限水花，游泳会留下少量气泡。
- 右下 PIXEL 可切换 LOW / MEDIUM / HIGH。FPS 是实测值，悬停可查看绘制统计。

桌面键鼠是主要游玩方式。小屏幕可浏览和切换世界控制；未实现移动端虚拟摇杆。

## 内容与目录

```text
src/
  main.ts                  启动入口
  core/                    游戏、主循环、时钟、渲染器、开发预览
  controls/                Orbit / 第一人称，重力与游泳
  world/
    bottle/                玻璃瓶、Fresnel 材质、边界
    ocean/                 实例化方块水面、连续波高
    island/                分层地形、房屋、灯塔、树、码头
    ship/                  航线、程序化帆船、四点浮力
    underwater/            海底、珊瑚、海草、四个地标
    Room.ts, Details.ts    木桌与摆件、浮标与海鸟
  systems/                 昼夜、天气、雨电、鱼、气泡、音频、发现
  ui/                      HTML HUD、SVG 图标
  utils/                   共享几何材质、体素合批、性能计数
  styles/                  全屏像素渲染、响应式 HUD

docs/                      架构、计划、美术、性能与验证记录
```

## 验证与限制

- `codex/world-expansion-foundation` 分支已接入 HOME → TRAVEL → FARM 往返、目的地面板和本地存档。当前 107 项测试与生产构建通过；按用户要求结束重复验收并交付，详细验证范围以 [实施记录](docs/WORLD_EXPANSION_IMPLEMENTATION.md) 为准。
- 在码头交通船附近按 E，选择农场岛或家园岛；Esc / 返回码头关闭面板。深海和遗迹仅为锁定占位目的地。农场提供道路、三块空田和建筑占位，没有农业或农机玩法。
- 普通入口自动读取 `bottle-sea.save.v1` 本地存档。成功抵达后保存目的地，旅行中刷新恢复上一次成功抵达的世界；时间、天气、画质和发现进度随存档恢复。

- 当前 Stage 1 工作区 TypeScript strict 检查通过；生产构建通过；70 项测试通过。完整缺陷修复状态和验收边界见 [STAGE1_BUGFIX_REPORT.md](docs/STAGE1_BUGFIX_REPORT.md)。
- 实际浏览器检查了默认构图、拖动、风暴、夜景、水下深度、E 发现、声音、倍速和 390×844 / 1920×1080 布局。
- 当前内嵌浏览器中 Pointer Lock 被拒绝，拖动备用方案已验证；普通桌面 Chrome 的原生锁鼠标路径需在用户实际浏览器中确认。
- 未提供原始参考视频。本实现依据提示词和四张概念图；是程序化体素解释，并非逐像素复刻。
- 性能统计和当前环境的帧率限制见 [PERFORMANCE.md](docs/PERFORMANCE.md)。正式预览的 1080p 采样约 57–60 FPS，详见性能记录。
- Vite 对包含 Three.js 的主包给出 500 kB 阈值提醒；这是体积提示，构建成功。Gzip 约 164 kB，无大型美术资源。

## 开发视觉检查点

仅 `npm run dev` 支持，不进入生产包：

- `/?hour=14` 白天；`/?hour=22` 夜晚
- `/?weather=storm&hour=17` 风暴
- `/?view=dock&hour=14` 码头第一人称
- `/?view=underwater&hour=14` 船锚附近的水下第一人称
- `/?view=water-entry&hour=14` 从海面上方自由落入水中，经过真实控制器和入水事件
- `/?view=under-island&hour=14` 从岛外朝岛底通道游动，检查水下通行与岛底碰撞
- `/?view=chest&hour=14` 宝箱观察距离，按 E 检查发现反馈

这些入口设置初始状态后仍使用同一游戏循环、控制器、地图与任务系统。

世界扩展分支还提供 `/?world=farm`、`/?world=travel` 和 `/?view=lighthouse`。带预览参数的入口默认使用隔离的初始状态，不覆盖普通游戏存档；只有显式加 `&persist=1` 才读写实际存档，用于跨入口验收。`/?view=dock&fail=farm` 模拟农场加载失败，`fail=fallback` 同时模拟返航加载失败；这些故障入口仅用于开发验收。

