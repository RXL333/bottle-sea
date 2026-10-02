# 主角资产

`player_character.blend` 是独立可编辑角色源文件，依据用户提供的主角图纸原创制作。游戏使用 `public/models/character/player_character.glb`；作者脚本为 `scripts/blender/player_character.py`。

按 `part_id` 保留语义活动节点；修改外观时请保留 Hips、Spine、Head、Hat、Backpack 与左右四肢的节点及父子关系。节点动画由 `PlayerCharacter` 驱动。坐姿以 Hips 对齐现有车辆座位。

在 Blender 的脚本环境中导入作者脚本后调用 `build()` 可重新生成；会新增独立场景并导出到角色专属目录，不保存覆盖当前农场或作物工程。

2026-10-02：按参考图重做外观与脖颈衔接，3,380 三角面；`player_appearance.py` 定义可单独迭代的外观，原有活动节点与运行时动作保持兼容。
