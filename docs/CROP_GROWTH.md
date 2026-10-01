# GameClock 作物生长

小麦、玉米、土豆共用 Game 所拥有的 GameClock。GameplayFoundation 创建 CropSystem 时传入同一时钟；农业状态位于 FarmSystem，和 FarmWorld 的加载、卸载分离。

## 时间与阶段

作物实例记录 `cropId`、`plantedAtGameTime` 和 `currentStage`。播种时使用 `GameClock.simulationTime`，阶段从 CropRegistry 的 seed 开始。任意读取都使用：

```text
已生长游戏分钟 = (GameClock.simulationTime - plantedAtGameTime) × 1440 / DAY_DURATION
DAY_DURATION = 480 模拟秒
```

CropSystem 从 Registry 读取四阶段阈值，直接选出当前应有的阶段，支持一次跳过多个阶段；最后阶段对应 `MATURE`，进度为 1，等待手工收割，不自动消失。`currentStage` 是由时间计算的缓存，不作为第二份成长依据。作物配置仍只通过 CropRegistry 查询。

| 作物 | 刚播种 | 幼苗开始 | 生长阶段开始 | 成熟 |
| --- | --- | --- | --- | --- |
| 小麦 | 0 分钟 | 720 分钟 | 2160 分钟 | 4320 分钟 / 3 天 |
| 玉米 | 0 分钟 | 1440 分钟 | 2880 分钟 | 5760 分钟 / 4 天 |
| 土豆 | 0 分钟 | 720 分钟 | 1440 分钟 | 2880 分钟 / 2 天 |

## 离岛、睡觉、快进与模型

WorldManager 只调用当前世界的 update。农场卸载后无作物 Timer、逐帧 delta 累加或后台农业循环，Home / Cottage / Travel 中全局日历正常推进即可。自然成长遵守日历的暂停和 1/4/12 倍速；HomeSystem.sleep 调用 GameplayTime.advanceToNextDay，旅行到达调用 GameplayTime.advanceMinutes，都是推进同一 `simulationTime`。动画时间 `elapsed` 不参与成长，页面关闭时经过的现实时间不计入日历。

FarmWorld.enter 强制刷新 FarmCropPresentation，直接取得当前阶段。若离岛前是幼苗、回来时已成熟，立即显示成熟模型。活动农场里，每块田的查询返回最近的 `nextGrowthAtGameTime`，表现层取全田最小值，达到这个时间或土地修改后才重读全田；成熟作物没有下一阶段时间。每帧只比较日历时间，单元提示与边框读取当前脚下作物。表现层按 stage.modelAssetId 选模型，按 resourceId 用 InstancedMesh 批量绘制。

## 保存和恢复

FarmSystem.snapshot 从同一当前时刻计算土地状态与作物阶段，再交给现有 SaveSystem。继续使用根版本 2、farm 子版本 1；旧存档缺少 currentStage 时自动计算。恢复首先还原 GameClock，再由 normalizeFarm 使用 cropId 与 plantedAtGameTime 重算阶段，过期或错误的阶段缓存不会改变结果。下一阶段时间、模型、矩阵不保存。

存档结构与归一化集中在 FarmState；成功农业操作立即保存，详细规则见 [农业存档](FARM_SAVE.md)。

## 检查与用户验收

已执行 TypeScript strict 与变更检查。按用户约定未执行功能测试、浏览器游玩或生产构建。

用户可分别播种三种作物，验收：在农场自然成长、暂停与倍速；离岛回家睡觉再返回；旅行跳时；刷新恢复；跨多个阶段后直接显示正确模型；成熟后持续保留并可收割。总生长时长从播种时刻计算，未必等于固定的睡觉次数。
