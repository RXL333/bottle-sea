# 拖拉机犁地机作业

沿用挂接、车辆子步、FarmSystem / CropSystem、Inventory、GameClock 和 SaveSystem。仅增加农具抬落及耕地，不创建新的土地或物品状态。

1. 在 ImplementRegistry 定义已有犁刃的实际作业范围；ImplementPose 保存抬起/落下状态，旧存档默认抬起。视觉围绕连接点抬升，挂点和碰撞接口保持稳定。
2. 纯数据扫幅模块计算连续移动/转向的扫过多边形；仅处理已接受的车辆移动，不处理挂接、分离、恢复或静止。按共享农业网格的单元中心覆盖规则工作。
3. PlowingSystem 去重并筛选 UNTILLED / HARVESTED，调用原有 FarmSystem.till；保护已播种/生长/成熟作物，重复经过不改状态、不加物品。农业提交前同步车辆及农具姿态，现有即时存档保存一致数据。
4. 沿用 InteractionSystem，驾驶中 J 抬起/落下，E 下车和 H 挂接行为保持原样。HUD 显示状态、实际宽度、农田外/静止/已耕/作物保护反馈。现有农田渲染按 revision 当帧刷新。
5. 测试连续扫幅、低帧率/倒车/转弯、抬起/静止/断开无作业、边界与作物保护、重复无收益、保存恢复以及与手工农业混用。执行 typecheck + test + build，在独立开发来源实际验证并保存截图。
6. 记录操作及验证范围，通过 Gmail 通知用户结果。

## 完成记录

2026-10-01：以上 6 项均完成。typecheck 和 build 通过，44 个测试文件 / 182 项测试通过；实际验证落犁前进、倒车重复、转弯、抬起停止、上下车和两种模式存档恢复。验证发现并修复已耕地脚下交互抢占车辆 E 的问题，补充回归断言。

操作及完整验证说明：`docs/TRACTOR_PLOWING.md`。验收截图：`artifacts/plowing/plowed-field.png`。Gmail 完成通知已发送至 2654799110@qq.com，返回 SENT。
