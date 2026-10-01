# SaveSystem 农业存档

农业状态写入现有 `bottle-sea.save.v2` 的根 `farm` 字段，根版本 2、农业子版本 1。Inventory、Hotbar、Home 箱子、Fishing、玩家进度、GameClock 和世界状态仍在同一个完整存档中。

## 可序列化字段

`FarmState.ts` 定义农业 schema 与归一化；FarmSystem.snapshot 按字段创建独立的普通对象。下例只展示一个单元，实际快照包含三块田的全部 648 个合法单元。

```json
{
  "version": 1,
  "starterSeedsClaimed": true,
  "fields": [{
    "id": "field-west",
    "cells": [{
      "id": "field-west:0:0",
      "fieldId": "field-west",
      "column": 0,
      "row": 0,
      "landState": "SEEDED",
      "crop": {
        "cropId": "wheat",
        "plantedAtGameTime": 4320,
        "currentStage": "seed"
      }
    }]
  }]
}
```

- 田块 ID 与行列索引来自现有 FarmDefinition，可用 cellCenter 恢复世界位置；不复制地图几何或网格配置。
- 土地状态支持 UNTILLED、TILLED、SEEDED、GROWING、MATURE、HARVESTED。
- 作物记录 ID、播种 GameClock 时间与阶段缓存；空地及已收割地的 crop 为 null。
- currentStage 在保存和加载时按日历重算，定义、产量、种子与收获物从统一 CropRegistry 读取。
- 初始种子领取标记同时保存，避免刷新重复领取。
- Mesh、Object3D、材质、模型路径、UI、handler、Map、下一阶段刷新时间均不进入农业存档。

## 写入时机与一致性

FarmSystem 先检查土地与 Inventory 容量，再提交全部土地变化与种子/产物交易。Inventory 回调只请求延迟保存；FarmSystem 的最终回调调用 GameplayFoundation.requestSave(true)，Game 转发到 SaveSystem.flush，取消前一个延迟请求并捕获最终完整状态。耕地、播种、收割和领取种子均走这条路径，无变化及失败操作不触发农业提交保存。

满背包收割失败时仍保留成熟作物，也不增加产物；种子不足则土地不变。成功收割同时保存 HARVESTED、crop=null 与背包新增收获物，恢复后不能再收割同一株。一次完整保存覆盖所有子系统，不维护第二份农业库存或单独的农场 localStorage key。

页面 visibilitychange 到 hidden、beforeunload 和 pagehide 会 flush。世界切换前后沿用既有保存入口；FarmWorld 装卸只重建视觉，农业状态由长存的 GameplayFoundation 持有。SaveSystem 原有存储异常处理保持生效。

## 恢复与旧数据

1. SaveSystem.migrateSave 恢复合法 GameClock 快照。
2. FarmState.normalizeFarm 按当前田块 ID、索引和土地状态读取白名单字段。
3. 由 CropRegistry 与 `当前 simulationTime - plantedAtGameTime` 重算土地/作物阶段；旧阶段缓存不会冻结时间。
4. Game 再恢复同一全局日历并创建 GameplayFoundation，FarmWorld.enter 显示当前阶段。加载不消耗种子、不再次收割、不自动赠送物品。

旧根 v1 或 v2 没有 farm 时补齐三块未耕田；农田子字段缺失/类型错误/未知子版本使用安全默认值，不让整个存档加载失败。旧农业数据缺 currentStage 时自动计算。未知田块、越界索引、非法状态被忽略，重复单元只取第一个记录；未知 cropId、非法或未来播种时间清除该作物并保留已耕地。额外运行时字段不复制到恢复对象。既有根存档版本与合法的其他子系统数据不因缺少农业字段而重置。

成长仍只使用游戏日历，页面关闭期间的现实时间不算成长。已保存 GameClock 从相同时间继续推进，暂停、倍速、睡觉和旅行按照既有 API 工作。

## 用户验收

已执行 TypeScript strict 与 diff 检查；按照用户约定，功能测试和游玩验收由用户进行。

1. 耕一个单元后立即刷新：仍为 TILLED。
2. 播种后三种种子分别减少 1，立即刷新：同一位置、作物 ID、播种时间与阶段恢复。
3. 离岛、回家睡觉、返回农场：阶段按经过的游戏时间更新，刷新后继续成长。
4. 成熟收割后立即刷新：土地为 HARVESTED，作物为空，背包保留正确产量。
5. 保存/恢复未耕、已耕、刚播种、生长、成熟、已收割的混合田块；确认三块田互不影响。
6. 验收旧存档缺 farm/currentStage，以及 Home 箱子、Fishing、Cooking、背包和快捷栏继续恢复正常。
