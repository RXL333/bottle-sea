# Farm / Crop 数据基础

本轮只实现独立农业定义、状态、时间计算和持久化，沿用已有 FarmWorld 地图与全局 GameplayFoundation。无耕地交互、作物模型、农业 UI、驾驶、动物或经济玩法。遵循用户约定，仅运行 TypeScript strict 与变更检查，功能测试由用户验收。

## 实施顺序与模块

1. `gameplay/farm/FarmDefinition` 提供三块主田的稳定 ID、网格原点和尺寸；FarmMap 从同一来源生成渲染范围，农业模块不依赖 Three.js、资产或 UI。
2. `CropRegistry` 定义小麦、玉米、土豆的种子/产物引用、游戏分钟生长时长、阶段和单元基础产量。六种物品的名称、分类、描述、堆叠与图标仅在 ItemRegistry 定义。
3. `CropSystem` 用既有 GameClock 的 simulationTime 与播种时间计算阶段。`FarmSystem` 持有按田块/格坐标索引的土地与播种实例，提供查询、整笔耕地/播种/收割、点与区域选格接口。
4. 在 GameplayFoundation 上持有唯一 farm/crops 服务；查询与快照按当前时间派生生长，不依赖当前 World，也不添加计时器。SaveSystem 在现有 v2 上补 farm 字段与缺失默认值，并按已恢复的全局时间校正阶段。
5. 审查非法存档、状态转换、重复格、种子不足/满背包的整笔失败和独立快照；补充架构及接入文档，运行类型检查与变更检查。

## 关键决定与验收

- 三块田各 12 × 18 单元；每格状态独立，混种田通过 stateCounts 表达整体情况，不强行给整块田指定单一状态。
- 土地仅允许 UNTILLED/HARVESTED → TILLED → SEEDED → GROWING → MATURE → HARVESTED。播种每格消耗 1 种子，收获每格产出作物基础产量。
- 不按现实离线时长成长；只随已有游戏日历成长。暂停期间不长，睡觉/旅行显式推进后按同一日历计算。
- 区域按单元中心选格，支持轴对齐范围与旋转多边形；车辆以后可提交实际扫过的 footprint，按状态筛选避免重叠经过重复操作。
- 保存种植时间而非独立倒计时；恢复不相信序列化的成熟状态、网格尺寸、未知作物或越界坐标。旧 v1/v2 无农田状态时补全未耕田，不补发种子。
- 成功后背包与农田在保存回调中保持一致；失败不扣种子、不清除作物、不部分收获。快照和查询返回副本。
- 不改 HomeWorld / TravelWorld 架构，保留门缝修复与现有 Home / Fishing / Cooking / Inventory 数据。
