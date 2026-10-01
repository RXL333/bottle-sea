# 农业存档完善

目标：在现有 SaveSystem 内完整保存农业 JSON 数据，操作后立即写入，按恢复日历校正作物阶段并兼容旧存档。

1. 检查 GameClock 恢复顺序、GameplayFoundation 生命周期、农田/背包提交回调、Game 保存和页面退出入口。
2. 集中 FarmState 纯数据结构、子版本和 normalizeFarm；FarmSystem 保留原有类型/函数导出兼容，并按字段构造快照。
3. SaveSystem 直接使用 FarmState，默认日历与农业归一化使用同一时间，读取先恢复日历。
4. 公共 requestSave 增加可选立即写入参数，农田最终提交 flush；Game 增加 pagehide 保存，沿用既有其他存档行为。
5. 更新格式/时机/旧数据与用户验收文档，执行 TypeScript strict 与 diff 检查。按用户约定不运行功能测试或浏览器游玩。

范围：FarmState、FarmSystem、SaveSystem、GameplayFoundation、Game 页面事件及农业文档。根版本 2、farm 子版本 1、既有玩法库存 API 和作物时间配置保持兼容。
