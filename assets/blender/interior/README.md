# 航海小屋 · 模块化室内

参考用户提供的「ChatGPT 图像 2026年9月28日 21_18_45.png」。独立室内按约 8 × 7 米布置，保持蓝白织物、白砖木梁、航海桌面、收纳角及暖灯炉火的构图。

## 打开与编辑

- `cottage_interior.blend`：完整组装场景，默认场景 `Cottage_Interior_Assembly`、相机 `Hero`。每件家具和建筑模块均为独立父节点，网格按部件/材质保留，未合并整个房间。
- `modules/*.blend`：58 个单独模块，各自带查看相机。
- `previews/interior_hero.png`：总览；`interior_bed.png`、`interior_desk.png`、`interior_hearth.png`：近景。
- `../../../public/models/interior/*.glb`：对应的 58 个独立网站模型，均无需外部贴图。
- `../../../public/models/interior/layout.json`：组装位置、旋转、缩放及分类，使用 Blender Z 向上的坐标。换成 glTF 坐标时点映射为 `(x,z,-y)`。
- `../../../public/models/interior/manifest.json`：完整模块清单及复用来源。

## 集合与剖视

`Architecture`、`Furniture`、`Decor`、`Textiles`、`Lighting` 分开管理。`Presentation` 是渲染背景，不是房间模块。

`Full_Enclosure_Hidden` 内有正面/右侧墙和屋顶，默认关闭视口与渲染显示，以呈现参考图剖视。需要完整围合时打开该集合。门、门框、窗、地板、屋顶、梁柱都可单独替换；蓝门、柜门和箱盖保留独立转轴节点，未制作进出动画。

## 复用与新增

直接复用已有床、食材柜、粮食袋。原炉灶按已有几何拆出火箱、锅、木柴架、挂具架四个独立模块，便于按参考图布局；原农场模型文件未改动。所有复用件在 manifest 和 Blender 根节点记录来源。

新增建筑模块、航海桌椅、衣柜、床头柜、包铁木箱、墙架、地毯、灯笼、望远镜、罗盘、海图、羽笔墨水瓶、书籍、杯罐、食物、画框、小帆船、盆栽、藤蔓、盘绳、木桶等。

窗外海景由独立窗模块里的低多边形装饰几何表现；灯笼与炉火照明是独立光源，网站接入时按引擎重新配置即可。游戏已通过 CottageWorld 接入主岛房门：按 E 进出，使用遮挡加载的淡出／淡入过场。建筑及家具保持独立模块，运行时启用完整墙顶。

## 验证与重建

- `node scripts/validate-interior-assets.mjs`：逐件由 Three.js GLTFLoader 解析，检查几何、坐标、法线、索引、退化三角形、来源与实例引用。
- `scripts/blender/interior_review.py`：重新打开所有独立 .blend 文件、检查模块数量与相机，并生成细节渲染。
- `export_validation.json`、`source_validation.json`：验证记录。
- 在单独的后台 Blender 进程运行 `scripts/blender/interior_build.py` 可重建资产和组装；它不会覆盖已有农场/主岛模型。
