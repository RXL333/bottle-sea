# 四位岛民角色模型交付

2026-10-07。依据用户提供的四张角色参考图制作；本次只交付建模资产，没有修改 src、场景注册、NPC 逻辑或游戏存档。

| 角色 | Blender 源文件 | GLB 文件 | 三角面 |
|---|---|---|---:|
| 灯塔老人 | lighthouse_keeper.blend | lighthouse_keeper.glb | 6252 |
| 商船老板 | merchant_captain.blend | merchant_captain.glb | 6028 |
| 渔夫 | fisherman.blend | fisherman.glb | 6118 |
| 农场管理员 | farm_steward.blend | farm_steward.glb | 3976 |

源文件位于 assets/blender/npcs/；GLB 与每人 JSON 位于 public/models/npcs/；正面、背面、侧面渲染位于 artifacts/npcs/。

## 各角色配件

- 灯塔老人：白发白须、灯塔徽船长帽、蓝马甲、绳腰带、提灯（发光材质）、烟斗、罗盘、背包、卷轴、航海日志。
- 商船老板：棕胡须、锚徽船长帽与羽毛、红领巾、金边长马甲、手套、高靴扣、贸易账本、金币袋、挂链与罗盘。
- 渔夫：灰胡须、蓝白渔夫帽、青色上衣、鱼纹围裙、手套、鱼挂件、立体菱形绳网、钓竿及鱼漂。
- 农场管理员：绿带草帽与叶饰、黄领巾、绿色背带裤、手套、工具腰带、叶纹种子袋、奶瓶、锄头。

## 接入约定

- Blender 坐标 Z 向上、-Y 向前；GLB 坐标 Y 向上、+Z 向前；单位米，脚底原点。
- 根节点 asset_id 与文件名一致。部件节点具有 part_id。Hips/Spine/Head/Hat 和左右 Thigh/Shin/Foot/Arm/Forearm/Hand 保留明确父子关系及转轴。
- 额外道具各有独立节点，例如 Lantern、Pipe、TradeLedger、FishingNet、FishingRod、Hoe、SeedBag。可以按节点隐藏、拆卸或重新挂接。网格按部件和颜色分开，并非整个人物合并为一张网格。
- 这是静态建模交付：提供可转动的语义节点，不含蒙皮骨架、动画片段、表情切换或交互代码。参考图中的其他动作和周围场景没有制作。
- GLB 自带材质，不依赖外部纹理；摄影灯与相机仅存在于 Blender 源文件，不导出到 GLB。源文件可以单独打开，无需运行脚本。
- 材质按角色命名，四人同时加载不会互相覆盖。灯笼发光已写入材质；若希望照亮周围环境，接入时另加局部灯光。
- public/models/npcs/manifest.json 提供完整文件映射、网格数、部件清单与预览位置。

## 校验与重建

- node scripts/validate-npc-assets.mjs：Three.js 读取全部 GLB，核对节点、索引、法线、脚底原点、三角面和外部依赖，结果 export_validation.json；四人均通过，无退化三角形。
- Blender 后台运行 scripts/blender/validate_npc_sources.py：重新加载四份源文件，验证编辑结构，结果 source_validation.json；四人均通过。
- Blender 后台运行 scripts/blender/npc_characters.py：重建这四个 NPC 及预览。复用现有作者脚本中的建模函数，但不会导出或覆盖主角资产，也不会保存当前打开的其他 Blender 工程。

## 游戏接入补充（2026-10-07）

四个已有 GLB 已接入 `NpcRegistry` / `NpcPresentation`，保留上述语义部件、道具和材质；未重新建模。灯塔老人、商船老板与渔夫在 HomeWorld，农场管理员在 FarmWorld。商船老板按现有靠岸时段出现。静态模型描述仍适用，本阶段没有添加蒙皮、动作片段或复杂 NPC AI。

共用 E 交互、DialogueSystem、海岛风格对话面板与 SaveSystem。玩家会面和已聊话题单独保存，玩法条件从现有系统读取。详细架构与本次检查分别见 `docs/NPC_DIALOGUE.md`、`docs/NPC_DIALOGUE_VALIDATION.md`。模型 JSON / manifest 的 integrated 标记已更新为 true；若重新运行原建模脚本，需重新确认资源与接入清单。
