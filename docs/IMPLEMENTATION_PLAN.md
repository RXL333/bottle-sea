# 瓶中沧海 · 实施计划

目标：纯前端 Vite + TypeScript strict + Three.js 体素瓶中世界，包含浏览、探索、昼夜、风暴和发现任务。以附件 2 的外部构图为默认视图，以附件 1/4 为探索方向。未提供原始视频。

## 顺序与验收
- Phase 0：初始化依赖、单一 GameLoop、Renderer、场景和 HTML HUD。typecheck/build。
- Phase 1：桌面、背景摆件、横向玻璃瓶、木架及 OrbitControls。typecheck/build。
- Phase 2：实例化体素海洋、分层岛屿、房屋、棕榈、码头、灯塔。typecheck/build，浏览器检查体素风。
- Phase 3：连续波浪、航线、四点浮力。typecheck/build，数学测试。
- Phase 4：海底、锚、宝箱、遗迹、沉船、珊瑚、鱼、气泡。typecheck/build。
- Phase 5：统一模拟时钟、暂停/倍速、平滑昼夜、灯光和星月。typecheck/build，时钟和昼夜测试。
- Phase 6：天气渐变、雨、闪电、强浪与独立瓶壳摇晃。typecheck/build。
- Phase 7：第一人称、陆地/游泳、碰撞及瓶内边界。typecheck/build。
- Phase 8：四处探索目标、E 交互、任务 UI 与程序化声音。typecheck/build。
- Phase 9：像素分辨率、响应式 HUD、透明排序、构图与视觉验证。typecheck/build。
- Phase 10：运行时 draw calls/triangles/FPS/内存检查、实例合批优化与文档。全量测试、构建及浏览器交互检查。

## 架构与决策
main.ts 仅启动 Game。core 管理循环/时间/渲染；world 构建房间、瓶壳、地形与模型；systems 管理动态、天气、音频和交互；controls 管理两类视角；ui 使用 DOM。静态方块按材质合批为 InstancedMesh，几何和材质共享。玻璃与世界分离。水面与船共用 waveHeight；透明水面 depthWrite=false，采用轻薄水体保留水下可见性。探索用离散地面高度及简易 AABB，不引入物理引擎。

## 验证
每阶段运行 npm run typecheck 和 npm run build；加入测试后运行 npm run test。最终实际浏览器核验默认/风暴/夜晚/探索/水下、按钮、键盘和 resize；性能记录实测环境，不把目标 60 FPS 当作已达到的结果。

## 实施结果（2026-09-09）

Phase 0–9 已实现并逐阶段检查/构建；Phase 10 已加入实时性能计数、实例合批、对象复用、像素质量切换，完成当前内嵌浏览器检查。最终 22 项自动测试通过。正式预览 1080p 采样接近 60 FPS；长期多设备 GC trace 未覆盖。逐项对应见 COMPLETION_AUDIT.md。

实现中修正了 Three.js 0.186 的阴影常量变化、PointerLock 被拒绝的处理、瓶肩边界、静态体素相邻面重叠、首次 HUD 时间显示和窄屏取景。无未实现的占位按钮。

