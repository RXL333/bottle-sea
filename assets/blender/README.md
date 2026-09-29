# 农场参考模型

参考图 20 类低多边形模型均已制作，另补充果树、麦丛、草捆。

- `farm_asset_library.blend`：首批 20 类完整模型库。
- `farm/*.blend`：独立模型源文件。
- `farm/farm_integration_additions.blend`：网站接入时更新的小屋（空心墙体）及三种补充资产；小屋以此文件版本为准。
- `../../public/models/farm/`：GLB、模型元数据、模块和 manifest.json。
- `../../scripts/blender/`：可重复使用的建模、导出和验证脚本。

原始 `transport_boat.blend` 保留。模型是参考图的简化低多边形版本，并非逐细节复刻。Blender Z 向上，导出 GLB Y 向上。网站统一在 FarmLayout.ts 配置摆放比例和碰撞；静态模型按材质合批，风车和动物头部保留动画。

农场岛已接入建筑、农机、船、码头、围栏、动物和床。厨房炉灶（含锅、柴架、厨具）及储物箱/食材柜已制作，留作主岛家具，未放入农场。接入记录见 docs/FARM_MODEL_INTEGRATION.md。
