# 作物阶段模型与农场接入

目标：在已打开的 Blender 中完成小麦、玉米、土豆各四个阶段的原创建模，并替换 FarmWorld 阶段占位表现。

1. 检查 Blender 与现有农场色板；保留原始 Scene，按作物/阶段建立独立场景。
2. 用既有农场网格作者工具制作有体积的体素/低多边形模型；地面原点、无贴图，单格占地不超过 0.9 × 0.9，按材质合并网格。
3. 导出 12 个 GLB、12 个可编辑 blend 和总览 blend/图片，记录尺寸、三角面、资源 ID 与文件对应关系。
4. CropRegistry 为每个阶段提供模型 ID；FarmAssets 加载对应文件；FarmCropPresentation 使用原尺寸实例化。保留 resourceId、时间、种子、产量和原存档。
5. Blender 视觉核对、GLB 结构/资源检查、TypeScript strict 与 diff 检查。按用户约定，功能测试与游戏验收由用户完成，不运行测试套件或浏览器游玩。

涉及 scripts/blender/crop_stages.py、assets/blender/farm/crops、public/models/farm/crops、CropRegistry、FarmAssets、FarmCropPresentation 与农业文档。阶段模型不含土地、碰撞和游戏状态；土地继续由原表现层绘制，成长仍由唯一 GameClock 派生。
