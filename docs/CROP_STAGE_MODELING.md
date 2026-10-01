# 农场作物阶段模型

小麦、玉米、土豆各有刚播种、幼苗、生长、成熟四个原创建模阶段，共 12 个。Blender 5.2 中使用既有农场色板制作实体低多边形网格，不使用贴图或透明交叉片。脚本为 `scripts/blender/crop_stages.py`；每个阶段有独立可编辑 `.blend`，另有 [总览场景](../assets/blender/farm/crops/crop_stage_gallery.blend) 和 [总览预览图](../assets/blender/farm/crops/previews/crop_stages.png)。

| 作物 | 阶段视觉变化 | 完熟高度 |
| --- | --- | --- |
| 小麦 | 覆土籽粒 → 双叶幼苗 → 青色秆与未开的穗 → 金黄色麦穗 | 约 0.80 单位 |
| 玉米 | 覆土籽粒 → 宽叶幼苗 → 高秆宽叶 → 黄玉米棒与顶穗 | 约 1.00 单位 |
| 土豆 | 种薯 → 幼苗 → 茂密的绿叶冠 → 叶冠、变黄下叶与露出的薯块 | 约 0.34 单位 |

每个模型的地面原点为 `(0,0,0)`，最大平面包围盒不超过 `0.9 × 0.9`，可落入 1 单位农田格；随阶段增长但不改变农田碰撞。模型按材质合并网格，FarmCropPresentation 对同一阶段采用 InstancedMesh。表土仍由农田表现层绘制，刚播种模型只包含少量覆土与种粒。

Registry 中 `crop.{cropId}.{stageId}` 是稳定逻辑 `resourceId`；对应 `modelAssetId` 为 `crop_{cropId}_{stageId}`。FarmAssets 将模型 ID 映射到 `public/models/farm/crops/crop_{cropId}_{stageId}.glb`。可编辑源文件在 `assets/blender/farm/crops/`，各模型的尺寸、面数和映射见 [manifest.json](../public/models/farm/crops/manifest.json)。旧的 `wheat_cluster.glb` 仍保留在农场资产包中。

制作时保留了用户原有 Blender 场景，每个阶段独立建 Scene 并导出。需要调整时修改脚本或对应 `.blend`，保持资源 ID、地面原点和单格尺寸，再重新导出同名 GLB。保存的农田记录作物 ID、播种游戏时间与可重算的阶段缓存；模型文件与矩阵不写入 SaveSystem。

已完成 Blender 总览渲染与 12 个模型的尺寸检查、TypeScript strict 检查。游戏内四阶段切换、离岛回来与存档恢复的功能验收由用户进行。
