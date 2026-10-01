# 联合收割机驾驶、收割和卸粮

复用既有联合收割机 GLB、VehicleController、平滑第三人称镜头、碰撞、InteractionSystem、Inventory、FarmSystem、CropRegistry、GameClock 和 SaveSystem。没有新增作物计时、第二份库存数量或车辆农业存档文件。

## 操作

1. 在农机棚前靠近联合收割机按 **E** 上车。
2. **W/S** 前进或倒车，**A/D** 转向，**Space** 刹车；停稳后 **E** 安全下车，恢复第一人称。
3. **J** 落下割台，**L** 开启收割；再次 L 关闭。J 抬起割台或下车都会停止作业。割台抬起时不能开启收割。
4. 仅实际移动的割台收割成熟小麦和玉米。土豆仍通过原手工 E 收获；未成熟作物不改变。
5. HUD 显示割台、作业开关、本次收割格数和 **60 份总容量**粮仓，允许同时存小麦和玉米。
6. 停稳并关闭作业，按 **U** 卸粮。卸粮口对准拖车时装入拖车；也可驶到谷仓门前虚线卸货区（中心 X=20、Z=-2.8，8×3 米）直接卸入谷仓。接收方容量不足只移动能容纳的数量，剩余保留在车上。详见 [拖车运输](TRAILER_TRANSPORT.md)。
7. 下车靠近谷仓门前按 **E** 打开现有背包 / 储物网格；支持单个、整堆、Shift 快速转移、拖拽及全部存入。谷仓仓库 24 格，与小屋箱子独立。

## 车辆与作业范围

- `WheeledVehicle` 抽出原拖拉机轮式车辆控制，`TractorVehicle` 保持原接口和参数；`VehicleDefinition` 为联合收割机配置尺寸、轴距、速度、座位、上车侧及镜头距离。
- 使用 GLB 的 `drive_wheel_-1/1` 和 `steer_wheel_-1/1`，前轮滚动、后轮转向；`header` 带动 `header_reel` 升降，作业时拨禾轮旋转。
- 两车及全部农具使用现有动态碰撞，联合收割机包围盒覆盖伸出的卸粮管；障碍、道路边、码头及危险坡面延续既有导航限制。车辆存档一起恢复后才启用相互碰撞，避免旧默认停车位置挡住另一辆车的有效存档位置。
- 原 GLB 22 个切割齿范围 X ±1.5285、Three Z [2.325, 2.675]，农场比例 0.5 后割台宽 **1.5285 米**。扫幅按 1 米农田单元中心覆盖，沿用 `ImplementSweep` 连续多边形，支持转弯和倒车，长步与短步结果一致。
- `CropRegistry.machineHarvestable` 统一声明当前支持小麦和玉米；产物 ID、每格产量均从 Registry 查询，不在车辆重复定义。
- `HarvestingSystem` 只筛选 MATURE 且可机械收割的作物。道路 / 建筑 / 非农田没有单元；重复通过 HARVESTED、抬起、关闭和静止均不产出。

## 不丢粮的事务与持久化

- `GrainTank` 包装统一 Inventory，只有一份 Slot / Stack 数据。总量上限 60，现有堆叠上限仍由 ItemRegistry 管理。
- `FarmSystem.harvest(refs, receiver)` 扩展接收接口，默认仍是玩家背包。先验证整格基础产量可接收，再提交农田与粮仓；失败回滚土地。容量不足不会收割该格，满仓自动停止作业，剩余作物不受影响。
- 每格收割提交前记录当前车姿和作业状态；粮仓 / 农田回调看到一致的“已收割 + 已入仓 + 当前车辆位置”。恰好满仓时先记录关闭作业再提交产物。
- 装卸调用统一 `Inventory.transferAvailableTo`，两个库存及各自车辆快照都提交后才触发保存回调。没有先清空粮仓再添加接收方的中间状态；重复卸货不重复生成产物。
- 外层 SaveData 和 VehicleSnapshot 保持 version 2。联合收割机 VehiclePose 保存位置 / 方向、`headerState`、`workEnabled`、`grainTank`，GameplaySnapshot 保存 `barn`；原 FarmSnapshot 保存土地与作物。拖拉机 / 挂接关系提交保留联合收割机状态。
- 旧存档没有粮仓或谷仓时默认空仓、割台抬起、作业关闭。加载时过滤无效物品、非机械作物和超容量粮仓；仅保存 JSON 数据。
- `GrainTank.unloadAvailableTo(target: Inventory)` 用于拖车 / 谷仓部分装卸；原 `unloadTo` 保留整笔转移语义。`CombineVehicle.dischargePosition()` 使用现有 `unloading_auger` 节点给出世界卸粮口。

## 验证（2026-10-01）

- typecheck、test、build 全部通过：47 个测试文件、202 项测试，包括新增 11 项。
- 数据测试验证小麦 / 玉米混粮、未成熟与土豆保护、余量不足保留整格、恰好满仓关闭、连续长短扫幅、重复 / 逆向 / 静止 / 道路、接收失败回滚、仓库容量不足及成功卸货、非法存档归一化。
- 真实 GLB 集成测试验证原轮轴、后轮转向、割台 / 拨禾轮层级、前进 / 倒车 / 碰撞、镜头地面保护、安全下车、统一 E/J/L/U 交互、收割同步保存、两车互不覆盖、正常及旧存档恢复、粮仓已满、仓库已满。
- 独立浏览器来源 `127.0.0.1:5192`：E 上车、J 落下、L 开启、实际沿田行驶收割 20 格小麦，粮仓 60/60 自动停止；余下 15 格成熟作物与 1 格未成熟作物保留，东西两田不变。普通重新进入（去掉 fixture / hour）恢复车辆位置、割台、满仓和 20 格 HARVESTED，未成熟作物继续按 GameClock 生长。
- 谷仓测试使用显式 DEV 定位到停车区，实际 U 卸入 60 份小麦；非卸货区和空仓 U 拒绝。实际 E 下车、步行靠近谷仓 E 打开仓库，单个取出后仓库 59 / 背包 1，全部存回后仓库 60 / 背包 0。
- 卸货后再次经过已收小麦田，没有重复产物；实际收割另外 14 格玉米，粮仓增加 28 份，累计 HARVESTED 34 格，仍保留 1 格成熟土豆和 1 格生长中小麦。倒车复查仍为 28 份；普通重新进入恢复玉米粮仓、LOWERED 及开启状态，控制台无 error / warn。第二次谷仓 U 在作业开启时拒绝，J 抬台停止后成功卸入 28 份玉米。
- 最终谷仓实际显示小麦 60、玉米 28，背包为空，粮仓为空；累计收割 34 格，成熟土豆与生长中小麦保留。满仓、玉米与仓库截图：`artifacts/combine/full-tank.png`、`artifacts/combine/corn-harvest.png`、`artifacts/combine/barn-storage.png`。

开发复现入口（生产构建无此入口）：`?world=farm&view=farm-combine&fixture=1&persist=1&hour=10`。显式 fixture 对准中央田，使用原种子消耗与农业 API 准备成熟小麦 / 玉米、成熟土豆及未成熟小麦，已有作物和已收割格不重置。`view=farm-combine-unload&fixture=1` 只将车辆定位到谷仓，不增加粮食。应仅在隔离测试来源使用；普通恢复验证去掉 fixture 和 hour。
