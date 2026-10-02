# 《瓶中沧海》海岛生活界面规范

适用于所有游戏内 UI。参考用户提供的《瓶中沧海》海岛界面风格指南：温暖纸面、航海蓝、木棕细节、阳光金强调。信息优先，装饰克制；不使用整块深绿、强模糊玻璃、RPG 品质色或商务后台风。

## 样式入口与边界

- `src/styles/ui-theme.css`：通用设计变量与组件，后续界面直接复用。
- `src/styles/ui-screens.css`：现有界面的视觉适配，不持有游戏状态。
- 现有各模块 CSS：仍负责布局、定位、响应式和玩法相关可见性。主题在它们之后加载。
- `src/ui/UIChrome.ts`：`panelHeader(title, caption, onClose)`、`progressMeter(value, total, label)`，只负责 DOM 展示。
- 所有物品图标仍由统一 `ItemRegistry` + `itemIcon` 提供。快捷栏仍引用库存，无额外库存或存档字段。

## 设计变量

| 用途 | 变量 | 色值 |
| --- | --- | --- |
| 标题、导航、正文重点 | `--ui-navy` | `#1E4B73` |
| 选中边框、键盘焦点 | `--ui-ocean` | `#327AA3` |
| 海洋辅助色 | `--ui-sea` | `#7FB3D6` |
| 纸面 | `--ui-paper` | `#F7EBD6` |
| 卡片和输入内容 | `--ui-paper-light` | `#FFF8E9` |
| 木质细节、次要数值 | `--ui-wood` | `#8B5E3C` |
| 主要操作、当前目标 | `--ui-gold` | `#F4C15D` |
| 完成文字 / 完成底色 | `--ui-success` / `--ui-success-soft` | `#427E45` / `#E6EFDA` |
| 警示文字 / 警示底色 | `--ui-warning` / `--ui-warning-soft` | `#AD551E` / `#FFF0D7` |

完成和警示文字使用比图纸更深的绿色与橙棕色，以保证浅纸面可读性。正文用微软雅黑/苹方/系统无衬线，标题用宋体类衬线；不下载字体。正文主要 13–14px，标题 22–27px，紧凑槽位保留小标签和可访问名称。

## 新界面组件约定

```ts
import { panelHeader,progressMeter } from './UIChrome';
const dialog=document.createElement('dialog');
dialog.className='example-panel ui-panel';
dialog.setAttribute('aria-label','界面标题');
dialog.append(panelHeader('界面标题','ISLAND LIFE · 海岛生活',close));
// 由所属系统读出数值；展示函数不保存或推断游戏进度。
dialog.append(progressMeter(completed,total,'完成进度'));
```

- `.ui-panel`：纸面、海蓝边框、温暖细纹、海岛水印、统一遮罩与滚动条。标题使用 `.ui-panel-header` 与 `.ui-close`。
- `.ui-tabs`：海蓝导航；按钮用 `aria-pressed="true"` 或 `.selected` 表示金色选中态。
- `.ui-sidebar`：相同状态语言的纵向海蓝导航，当前用于观察点菜单。
- `.ui-button` 或 `.ui-panel button`：金色主按钮；`.ui-button.secondary` 使用海蓝次级操作。禁用使用真实 `disabled`，有可读的灰色文字，不能只靠透明度。
- `.ui-card`：详情、目标、任务与信息卡片；`.current` 强调当前目标，`.complete` 表示已完成。文字仍需标明状态。
- `.ui-progress`：暖色轨道和金色进度。由展示帮助函数提供 ARIA 数值。
- `.ui-chip`：分类、轻量状态标签；`.ui-status`：简短反馈。
- `.ui-hotbar`：海蓝快捷栏、金色选中描边、清晰数量。复用 `HotbarView`，不要复制持有数量。
- `.ui-item-slot`：纸面物品槽，支持 `.empty`、`.selected` / `aria-selected`、`disabled` 与 `.complete`；正式库存继续复用 `InventoryPanel` 的交互实现。
- 图标用统一线条 SVG 或 `itemIcon`；指南针、海岛水印是内置 SVG/CSS，不额外加载大图片或动画。

现有背包保留原有 Slot/Grid/Stack 交互与固定外框。详情、格子与操作区采用内部滚动，不能根据 Hover 的描述长度改变弹窗大小。选中态优先于悬停，不得被通用主按钮悬停覆盖。

## 覆盖范围

成长手记、背包/小屋储物箱/谷仓共用库存界面、详情、分类标签、快捷栏、商船贸易、炉灶/随身食物、睡觉确认、旅行目的地、航海手记发现卡、通用通知、右侧 E 交互提示、车辆作业/装载反馈、农田状态、天气/时间/体力/金币 HUD、工具栏与观察点导航。

睡眠与旅行的全屏过场、3D 场景标签、DEV 验证控件不是内容弹窗，保留其原有表现或调试用途。没有新增任务、装备、品质、经济或农业规则。

## 响应式与可用性

- 700px 以下库存详情与操作分列，交易与成长列叠排；长内容可滚动。
- 较低桌面屏幕压缩库存标题、槽位和快捷栏；保留固定外框。
- 键盘焦点使用明显蓝色描边；海蓝 HUD 内使用金色焦点。
- 状态不只靠颜色，还保留文字、数量、禁用语义和完成标记。
- 遵循 `prefers-reduced-motion`；无新增长期动画、外部字体或重型模糊效果。

验证记录与实机截图见 `docs/UI_REDESIGN_VALIDATION.md`、`artifacts/ui-redesign/`。

季节阶段新增海岛日历：继续复用 `ui-panel`、`panelHeader`、`ui-card` 和 `ui-chip`。月历使用金色今日标记、海蓝文字与纸面格子，内部滚动；日期入口沿用海蓝 HUD。验证见 `docs/SEASON_CALENDAR_VALIDATION.md`。
