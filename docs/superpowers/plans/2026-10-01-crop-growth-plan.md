# GameClock 生长接入

目标：完善既有 CropSystem，让作物阶段记录、存档和模型显示始终使用唯一 GameClock，并减少活动农场的扫描。

1. 核对 GameplayFoundation 注入时钟、Home 睡觉、旅行跳时、WorldManager 当前世界 update 与 SaveSystem 恢复顺序。
2. 为 CropInstance 添加 currentStage 派生缓存，保存和旧存档归一化时从播种时间重算；保留根 v2/farm v1 兼容。
3. CropGrowth 提供下一阶段的全局时间戳，FarmFieldView 汇总最近阶段时间；一次查询使用同一时刻，只计算一次作物成长。
4. FarmCropPresentation 按土地 revision、下一阶段日历时间或 enter 强制刷新；离岛无农业循环，时间跳跃直接选出最终阶段。
5. 更新文档、TypeScript strict、diff 检查。功能测试与游玩验收由用户完成。

影响：CropSystem、FarmSystem、FarmCropPresentation 和农业文档。CropRegistry 的时长与产量、GameClock API、Home / Fishing / Cooking / Inventory 操作接口沿用既有实现。
