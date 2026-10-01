# 第三人称与拖拉机基础驾驶

目标：FarmWorld 的现有 yard-tractor 支持 E 上车、W/S 前后、A/D 转向、Space 刹车、平滑第三人称镜头、低速安全 E 下车。

1. 识别 GLB 车体和四个 wheel part_id，补齐 Seat / Hitch_Back 标记并保留可编辑源文件。
2. 独立车辆运动模块：加速度、倒车、惯性、转向、子步积分与旋转车身碰撞。FarmWorld 提供道路/地形/障碍和相机遮挡查询；原静态拖拉机碰撞换成动态碰撞。
3. 专用驾驶控制与跟随镜头接入 Game，保持 Pointer Lock；上下车有平滑过渡，下车检查可站立位置。驾驶时停用第一人称、脚步晃动、农业与随身物品操作。
4. 车轮分别应用前轮转向与实际移动滚动；Hitch_Back 只暴露坐标接口。
5. 独立车辆位置快照接入现有 SaveSystem，不改 Farm/Crop 数据。刷新恢复停车位置与第一人称，瞬时速度与驾驶输入不保存。
6. TypeScript strict、资产和 diff 检查。功能游玩测试按用户约定由用户进行。

范围：gameplay/vehicles、controls/VehicleController、systems/vehicles、FarmWorld / FarmInteractions / FarmLayout、Game、车辆 HUD 与保存接口。无农具挂接逻辑、驾驶农业作业、燃油、损坏或复杂车辆模拟。
## 完成情况

已接入车辆数据、运动、控制器、第三人称跟随、安全上下车、动态碰撞、模型轮组和语义挂点、独立停放位置存档，以及驾驶 HUD。Farm / Crop 数据模块没有修改。已通过 TypeScript strict 类型检查、GLB 语义节点与清单检查、差异空白检查；功能测试与手感验收按用户要求留给用户。
