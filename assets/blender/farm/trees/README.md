# 农场树木源文件

依据用户提供的《瓶中沧海》农场树木参考图制作的原创 Voxel / Low Poly 模型。每种树保存独立 Blender 源文件，`farm_tree_gallery.blend` 用于集中检查八种树形；`previews/` 保存 Blender 渲染图。

| 源文件 / 资源 ID | 树种 | 三角面数 |
| --- | --- | ---: |
| tree_broadleaf | 阔叶树 | 3184 |
| tree_poplar | 杨树 | 2552 |
| tree_apple | 苹果树 | 3488 |
| tree_pear | 梨树 | 3584 |
| tree_sapling | 果树幼苗 | 2876 |
| tree_pine | 松树 | 4140 |
| tree_willow | 垂柳 | 5144 |
| tree_blossom | 花树 | 3392 |

游戏资源位于 `public/models/farm/trees/`。模型使用实心外表面、共享颜色材质、地面原点；不包含底座、草坪、围栏、碰撞 Mesh 或外部纹理。`canopy` 是树叶语义节点，果实/花朵和树干单独建模。

作者脚本为 `scripts/blender/farm_trees.py`，复用现有 `farm_common.py`。在 Blender 的 Python 控制台运行（路径按工作区调整）：

```python
import sys
sys.path.insert(0, 'D:/Projects/D_vibe_coding/瓶中沧海/scripts/blender')
import farm_trees
farm_trees.build_all()
farm_trees.render_previews()
farm_trees.gallery()
import bpy
bpy.ops.render.render(write_still=True)
```

脚本新建场景，输出树木 `.blend`、GLB、资源元数据和 TypeScript 使用的 `farmTreeCatalog.json`，不覆盖原作物或农机源文件。重新导出会更新本目录中的同名树木源文件，请先保存手工修改。

当前果实和花朵只用于环境装饰；没有添加果树生产、采摘或物品发放规则。
