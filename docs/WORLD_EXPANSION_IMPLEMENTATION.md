# World Expansion Foundation 实施记录

状态：进行中，未完成往返闭环，不能作为阶段完成报告。

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
- 此阶段模块尚未接入 Game，存档尚未成为实际游戏行为。
- 阶段验证：typecheck / 90 tests / build 通过。

## 后续阶段与验收

1. HomeWorld 包装与资源所有权；Navigation 适配；完整保护原碰撞与移动算法。
2. 交通船、DestinationPanel、TRAVEL action。
3. TravelWorld、FSM、第三人称镜头、海雾、失败返回。
4. Farm 原型：宽道路、三块空田、谷仓、码头、草地、树、栅栏、边界；无农业玩法。
5. Game 接入、持久时间天气质量发现、刷新和旅行中恢复。
6. 26 项浏览器检查，1080p 与窄屏，10 次往返资源/DOM/音频回调压力测试。
7. Pages base 构建，完整 33 项最终报告。未满足以上所有项目前不宣称完成。
