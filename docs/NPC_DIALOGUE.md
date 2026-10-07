# 岛民与对话底座

## 玩家使用

- 灯塔老人：主岛灯塔西侧。
- 商船老板：主岛商船侧泊位，跟随既有商船每日 08:00–20:00 靠岸状态出现。
- 渔夫：小屋西侧、钓鱼台入口旁的岸边，避开钓鱼台的 E 抛竿位置。
- 农场管理员：农场中心西侧，避开主路、田块与车辆停放位。

靠近按 E，进入底部字幕式交流：人物和场景保持可见，下方显示头像、角色名和台词，右侧显示话题选项。点击台词、按钮、E 或 Space 推进下一句；数字键 1–9 可选择对应话题；Esc / 关闭按钮结束对话，恢复探索控制。话题读完显示“已聊过”。商船老板的贸易话题打开已有 TradePanel；成长与日期话题打开既有成长手记、日历。

交流时隐藏普通 HUD 和当前角色头顶姓名牌，镜头平滑转向角色，并为右侧选项留出位置；结束后恢复原镜头朝向和姓名牌。镜头只调整朝向，不移动玩家位置。对话表现与验证见 `DIALOGUE_PRESENTATION.md`。

四位 NPC 的“查看 / 接取 / 提交委托”话题衔接统一 CommissionPanel；对话自身仍不拥有库存与奖励。J 打开全局委托手记。委托架构和验证见 `COMMISSIONS.md` 与 `COMMISSIONS_VALIDATION.md`。

## 模块边界

| 模块 | 职责 |
|---|---|
| `gameplay/npc/NpcRegistry.ts` | 静态身份、模型、头像、所属世界、位置、缩放、交互范围 |
| `gameplay/npc/DialogueRegistry.ts` | 验证和查询话题、多段文字、优先级条件、可见选项、界面入口 |
| `gameplay/npc/DialogueCatalog.ts` | 四位角色的内容配置 |
| `gameplay/npc/DialogueFacts.ts` | 从统一背包、GameClock 日历、Weather、农业、畜牧、经济和成长读取事实 |
| `gameplay/npc/DialogueSystem.ts` | 会话推进、认识记录和已听话题；不持有生产资源 |
| `worlds/npc/NpcPresentation.ts` | 世界拥有的 GLB、姓名牌、身体碰撞、资源释放 |
| `ui/DialoguePanel.ts` / `styles/dialogue.css` | 使用海岛 UI 变量的底部字幕、角色身份和右侧话题选项 |

NPC 模型依照 `assets/blender/npcs/README.md`：Y 向上、+Z 向前、脚底原点、自带材质；语义部件与独立道具保留。当前采用静态角色，不新增骨架、寻路或日程。角色缩放与现有主角尺度匹配。LOW 关闭角色投影。

新增 NPC 时先向 NpcRegistry 注册，再向对应 DialogueRegistry 注册问候和话题；每个话题具有稳定 ID。条件分支按配置顺序选择首个满足条件的分支，没有匹配时使用默认文字。`available` 控制可选话题；`action` 仅负责衔接现有界面。作物可播种名单、当季鱼讯从各自 Registry 派生，不在对话模块重复维护玩法配置。

Game 注册统一 `NPC_DIALOGUE` InteractionAction。Home/Farm 提供各自目标；车辆驾驶、钓鱼、旅行、睡觉和其他模态窗口中不能打开新对话。对话期间暂停移动及逻辑时间，保留环境动画。世界切换负责卸载模型，GameplayFoundation 持有跨世界的对话历史。

## 存档

保持既有 v2 存档键，新增 `dialogue: {version: 1, characters: {...}}`。每个角色只保存 `firstMet`、`lastMet`、`conversations` 和去重后的 `heard` 话题 ID。时间使用 GameClock 的 simulationTime。

不保存 UI 会话、Three.js 对象或临时条件事实。开启对话保存会面记录，完整读完话题保存已听记录；中途离开不会误记读完。加载时过滤未知角色/话题，修正无效数量和时间；旧存档没有 dialogue 时安全初始化为空，不影响任何背包、农业、车辆、畜牧、经济或成长字段。对话不发放奖励，不转移物品，也不替代交易检查。

## 验证入口

`?view=npc&hour=12` 是 DEV 专用接近角色检查点，默认隔离真实存档。`fixture=1` 显示受控生产条件按钮，`persist=1` 允许验证预览存档；检查时使用独立 localhost 端口，避免覆盖玩家常用来源的存档。这些按钮由现有 DEV gate 引入，生产构建不显示。

自动化覆盖通用注册、四角色多段推进、条件优先级、选项限制、打断、记录去重、恢复与旧存档、真实模型语义节点及实际 Home 碰撞/地面。具体本次检查结果见 `NPC_DIALOGUE_VALIDATION.md`。
