# Stage 1 交付与验收报告

状态：实现与自动测试已完成；最终流畅性验收仍受浏览器帧调度限制，尚未发布。

最后复核：退出镜头已到达OVERVIEW，外部HUD恢复、探索按钮解除选中。浏览器仍显示1FPS、max frame 1000.0ms、CPU1.0ms、visibility visible。同一帧调度限制连续多轮复现，停止重复采样；待可正常连续绘制的浏览器环境恢复后，补验持续流畅性与移动路线，再发布。此状态不是Stage 1全部验收通过。

1. **完成内容**：海洋色彩与泡沫、轻量玻璃、模式过渡、五观察点、微动画、行走与入水反馈、互动卡片、昼夜天气、声音混音和HUD微交互。保留原有Voxel、Vite、TypeScript、Three.js架构。
2. **核心文件**：Game、ExploreController、OverviewController、Ocean、WaveMath、BottleMaterial、World、Island、DayNightSystem、WeatherSystem、SoundSystem、HUD；追加Collision防穿模修复。
3. **新增模块**：OceanAppearance、ShipWake、CameraTransitionSystem、SceneFocusSystem、MicroAnimationSystem、PlayerFeedback、WaterEntrySystem、DiscoveryPulse、AudioAssets、AudioMixer与polish.css。
4. **海洋**：水深、岸距、波高、波峰、昼夜和风暴共同驱动连续水色；局部波高曲率识别浪峰；岸/码头周期泡沫；船首0.55秒、尾迹2.2秒，固定实例池；浮力继续共用waveHeight。
5. **玻璃**：主边缘与柔和次级Fresnel、方向高光带、肩/口/底厚度变化、轻微青绿边缘；不增加反射相机或渲染pass。
6. **镜头**：OVERVIEW/ENTERING/EXPLORE/EXITING四状态；200ms淡出后1.5秒cubic插值位置、四元数及FOV；控制器互斥，返回全景时恢复观察点标记。
7. **第一人称**：极轻render-only bob、平滑68→72冲刺FOV、三种材质脚步、落地反馈；竖直扫掠、卡顿子步、异常鼠标增量拒绝，修复入水高度强制跳变。
8. **水下**：带迟滞的enter/leave边缘；0.8秒水花；游泳小气泡；青色雾与低通环境声；进入事件不逐帧重复。
9. **昼夜/天气**：清晨、白天、黄昏、夜间连续权重；可读夜景、稀疏星光；暗云降高加速、增强浪峰与航迹、闪电照亮环境与玻璃、风暴渐退。树冠、云、鸟、鱼、烟及稀有流星共用模拟时钟。
10. **声音**：五层程序化循环与状态混音；水下260Hz低通；脚步、入水、发现、海鸥和雷声；可选音频存在则加载，缺失或解码失败安全fallback。无外部音频文件，未进行人工听音评价。
11. **测试**：55项，覆盖原有时钟、波浪、浮力、天气、移动、交互，以及过渡、焦点、入水、反馈、音频fallback、发现pulse、微动画、航迹寿命/容量/暂停、岛底横向通行与上浮阻挡、薄障碍竖直穿越、鼠标异常及平滑转向。
12. **typecheck**：通过。
13. **test**：22个文件、55项全部通过。
14. **build**：通过；JS650.64kB、gzip171.53kB，产物index-CsAl5wBg.js。
15. **FPS**：9月10日同一1080p MEDIUM浏览器对照，原版与Stage 1平静/风暴均60FPS。9月11日当前代码曾取得60FPS有效窗口，但随后浏览器帧调度变为约1秒一次；不能将短窗口推广为持续性能结论。
16. **Draw Calls**：9月10日原版平静93、风暴86；Stage 1平静110、风暴102；三角形分别90,696/91,000与91,356/91,564。9月11日当前代码白天窗口109calls、91,284triangles、CPU1.4ms，详见PERFORMANCE.md。
17. **遗留验收**：浏览器持续流畅性及修复后完整移动路线的可视验收、最终发布。390×844布局、拖拽、锁定拒绝回退、各时段截图已核验；稀有流星有逻辑测试但未捕捉实际出现画面。可选hover标签、玻璃雨痕、空间音频未加入。
18. **下一阶段**：先完成本阶段剩余验收及发布；之后可替换已预留的音频素材，并根据实际玩家反馈微调灵敏度与水色。不要以新增玩法掩盖尚未完成的验收。

## 帧调度对照实验（2026-09-11）

在同一浏览器、相同视口打开临时Canvas 2D页面，只清空300×100画布并移动20×20方块，不加载Three.js和任何游戏模块。页面自行计算requestAnimationFrame间隔，实际显示：`1.0 FPS; max 1000.0 ms; visible`。游戏同时段约1–2FPS、CPU提交1–2ms。证据证明异常可在无游戏负载时复现；尚不能确定宿主节流的具体机制。临时页面已删除，不进入生产构建。
