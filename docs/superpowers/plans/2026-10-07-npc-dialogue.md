# 通用 NPC / Dialogue 与四位岛民

复用 InteractionSystem、GameplayFoundation、统一 UIChrome、GameClock 和 SaveSystem。读取 `assets/blender/npcs/README.md`，加载已交付模型，不重建角色资产。

1. 静态 NPC Registry 管理身份、资源、世界与点位；Dialogue Registry 管理话题、多段内容、条件分支及现有界面入口。DialogueSystem 只保存认识/已听话题/游戏时间，不复制农业、经济或物品状态。
2. Home 放置灯塔老人、渔夫与靠岸商船老板；Farm 放置管理员。角色小范围碰撞不阻挡主要动线；商船老板与现有航线靠岸状态一致。
3. 统一羊皮纸/海军蓝对话框，头像、名字、职责、话题选择、下一句、返回话题、Esc 关闭；暂停移动/游戏时间、正确恢复控制。商船话题可打开现有交易，成长与日历入口复用现有面板。
4. SaveSystem 兼容旧存档及坏字段；存储数据可序列化，不保存 Mesh 或正在显示的对话框，不发放物品或重复奖励。
5. 测试 Registry、条件分支、多段推进/关闭、旧存档和恢复、模型与交互点；typecheck + test + build；实际查看四角色、条件变化、世界往返与刷新恢复，保存截图并 Gmail 通知。

暂不开发委托、订单内容、好感度、日程、寻路或大型 AI。
