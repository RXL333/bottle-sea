# 🌊 瓶中沧海 · Bottle Sea

> 一个能走进去的桌面微缩海洋世界。探索岛屿、钓鱼、种田，在玻璃瓶中发现无限可能。

[![在线游玩](https://img.shields.io/badge/Play%20Online-Live-brightgreen?style=flat-square)](https://rxl333.github.io/bottle-sea/)
[![TypeScript](https://img.shields.io/badge/TypeScript-80.3%25-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.186.0-black?style=flat-square)](https://threejs.org/)

<div align="center">
  <img src="assets/preview.png" alt="Bottle Sea Preview" width="600" />
</div>

## ✨ 特点

- 🎨 **完全程序化生成**：纯前端实现，无依赖第三方模型库
- 📦 **零后端架构**：Vite + TypeScript strict + Three.js WebGL 2
- 🌍 **完整世界**：主岛、农场、海洋、水下等多个探索区域
- 🎮 **丰富玩法**：自由探索、钓鱼、烹饪、种田、家居装扮
- 💾 **本地存档**：游戏进度自动保存，支持跨会话继承
- 🔧 **高度可定制**：完善的游戏系统架构，易于扩展

## 🚀 快速开始

### 环境要求
- Node.js 22.12+ (推荐 24.11.1)
- 现代浏览器 (Chrome/Firefox/Safari/Edge)

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
# 访问：http://127.0.0.1:5173/

# 代码质量检查
npm run typecheck    # TypeScript 类型检查
npm run test        # 运行单元测试（70+ 项）

# 构建与预览
npm run build       # 生产构建
npm run preview     # 预览生产版本
```

构建产物位于 `dist/` 目录，可部署到任何静态 Web 服务。

> ⚠️ **不要**直接用 `file://` 协议打开 `index.html`

## 🎮 游戏玩法

### 基础操作

| 操作 | 按键/手势 | 说明 |
|------|---------|------|
| 旋转视角 | 拖动鼠标 | 自由旋转观察 |
| 缩放 | 滚轮 | 调整视距 |
| 场景切换 | 右侧菜单 | 全景、灯塔、帆船、岛屿、海底 |
| 时间控制 | UI 按钮 | 暂停/继续、1x/4x/12x 倍速 |
| 声音开关 | UI 按钮 | 5 层环境音 + 3 类脚步音 |

### 探索模式

进入码头约 1.7 秒后自动进入探索模式：

| 操作 | 按键 | 说明 |
|------|------|------|
| 移动 | WASD | 前后左右移动 |
| 观察 | 鼠标 | 第一人称视角 |
| 跳跃/上升 | Space | 跳跃（陆地）或上升（水中） |
| 下潜 | C | 水下下潜 |
| 加速 | Shift | 冲刺（视野扩大） |
| 交互 | E | 打开背包、进屋、发现、钓鱼等 |
| 食用 | F/Q | 快捷食用已选料理 |
| 菜单 | B | 打开背包 |
| 退出 | Esc | 返回自由视角 |

> 💡 当鼠标指针变为 ◇ 时，表示可交互

### 🏠 小屋生活

- **进屋**：门外按 E
- **睡觉**：床边按 E 选择"睡到明天"（6 秒动画 → 次日 06:00，恢复全部体力）
- **储物**：铁皮箱旁打开双栏网格背包
- **烹饪**：炉灶旁选择食谱，用鱼制作料理
- **保存**：关闭游戏自动存档

### 🎣 钓鱼系统

1. 木制钓鱼台按 E 抛竿（消耗 6 体力）
2. 等待 4～8 秒咬钩
3. 咬钩后 2.8 秒内按 E 提钩
4. 挣扎阶段：
   - **长按模式**（默认）：按住鼠标让张力条向右，松开向左
   - **点击模式**：每次点击推一段，停止回落
5. 保持在黄色区域内直到进度环完成

**可钓鱼类**：沙丁鱼、竹荚鱼、鲭鱼、海鲈鱼、红鲷鱼、金枪鱼
（稀有鱼难度更高）

### 🍳 烹饪食谱

| 料理 | 材料 | 恢复体力 |
|------|------|--------|
| 烤鱼 | 任意鱼 | 20 |
| 海鲜汤 | 混合鱼 | 45 |
| 香煎鲈鱼 | 海鲈鱼 | 35 |
| 烟熏鱼 | 特定鱼 | 30 |

### 🎒 背包与快捷栏

- **打开背包**：探索时按 B
- **24 格网格**：拖拽、合并、拆分、丢弃
- **分类筛选**：全部、食物、鱼类、作物、种子、材料、工具、特殊
- **快捷栏**（8 格）：拖拽物品绑定，按 1～8 快速切换
- **与小屋共享**：同一套物品系统

### ⛈️ 天气系统

点击进入/退出风暴模式：
- 渐变云层效果
- 连续强浪
- 雨、闪电视效
- 船体摇摆
- 海浪声增强

### 🗺️ 旅行与农场

码头交通船附近按 E 选择目的地：
- **家园岛**：主岛小屋、灯塔、码头
- **农场岛**：12×76 网格农场，含建筑、农机、田地
- **深海 / 遗迹**：占位目的地（开发中）

## 📁 项目结构

```
bottle-sea/
├── src/
│   ├── main.ts                    # 启动入口
│   ├── core/                      # 游戏循环、渲染、时钟
│   ├── controls/                  # 自由视角 & 第一人称控制
│   ├── world/
│   │   ├── bottle/                # 玻璃瓶容器
│   │   ├── ocean/                 # 程序化波浪水面
│   │   ├── island/                # 分层地形、建筑、灯塔
│   │   ├── ship/                  # 帆船航线与浮力系统
│   │   ├── underwater/            # 海底、珊瑚、海草
│   │   └── Details.ts             # 装饰物件（浮标、海鸟等）
│   ├── systems/
│   │   ├── DayNightSystem.ts      # 昼夜循环与光照
│   │   ├── WeatherSystem.ts       # 风暴、雨、闪电
│   │   ├── FishingSystem.ts       # 钓鱼玩法
│   │   ├── AudioManager.ts        # Web Audio 环境音
│   │   ├── GameFoundation.ts      # 存档、进度、物品系统
│   │   └── DiscoverySystem.ts     # 发现点与航海手记
│   ├── ui/                        # HTML HUD & SVG 图标
│   ├── utils/                     # 共享几何、材质、性能计数
│   └── styles/                    # 响应式像素渲染样式
├── docs/                          # 详细文档
│   ├── GAMEPLAY_FOUNDATION.md     # 游戏系统架构
│   ├── HOME_SYSTEM.md             # 小屋系统详解
│   ├── FISHING_COOKING.md         # 钓鱼烹饪规则
│   ├── INVENTORY_SYSTEM.md        # 背包系统 API
│   ├── FARM_MAP_FOUNDATION.md     # 农场地图规划
│   ├── PERFORMANCE.md             # 性能指标
│   └── STAGE1_BUGFIX_REPORT.md    # 修复记录
├── assets/blender/                # Blender 源文件与模型
├── public/models/                 # GLB 模型及 manifest
└── package.json
```

## 🔍 调试与开发

### 预览参数

仅在 `npm run dev` 时支持（不进入生产包）：

```bash
# 时间与天气预设
http://localhost:5173/?hour=14                    # 白天
http://localhost:5173/?hour=22                    # 夜晚
http://localhost:5173/?weather=storm&hour=17     # 风暴

# 视角预设
http://localhost:5173/?view=dock&hour=14         # 码头第一人称
http://localhost:5173/?view=underwater&hour=14   # 水下第一人称
http://localhost:5173/?view=home-fishing&hour=14 # 钓鱼台
http://localhost:5173/?view=chest&hour=14        # 宝箱发现

# 世界选择（扩展分支）
http://localhost:5173/?world=farm                # 农场岛
http://localhost:5173/?world=travel              # 旅行面板
```

### 性能监控

右下角 **PIXEL** 按钮：
- **LOW / MEDIUM / HIGH** 质量切换
- **FPS** 实时帧率显示
- 悬停查看绘制统计（顶点、三角形等）

## 📊 技术指标

### 构建与性能
- **主包体积**：约 500 kB（Gzip 164 kB，无大型美术资源）
- **帧率**（1080p）：57～60 FPS
- **测试覆盖**：70+ 单元测试通过
- **类型检查**：TypeScript strict 完全通过
- **浏览器兼容**：Chrome、Firefox、Safari、Edge（WebGL 2 支持）

### 实现特性
- ✅ 昼夜循环与动态光照
- ✅ 风暴天气系统（云、浪、雨、电）
- ✅ Web Audio 5 层环境音 + 脚步音
- ✅ 钓鱼与烹饪完整流程
- ✅ 24 格背包 + 快捷栏
- ✅ 多世界存档系统（v2 版本）
- ✅ 发现点系统与航海手记
- ✅ 正式农场地图（72×76 网格）
- ✅ 响应式 UI（390×844 ~ 1920×1080）

### 已验证
- 默认构图、拖动旋转、风暴效果
- 夜景与水下视效
- E 交互与发现反馈
- 声音倍速与质量切换
- 多分辨率布局

## 📝 文档

详细技术文档位于 `docs/` 目录：

- **[GAMEPLAY_FOUNDATION.md](docs/GAMEPLAY_FOUNDATION.md)** - 游戏系统架构与存档格式
- **[HOME_SYSTEM.md](docs/HOME_SYSTEM.md)** - 小屋系统实现与待验收项
- **[FISHING_COOKING.md](docs/FISHING_COOKING.md)** - 钓鱼烹饪规则与食谱
- **[INVENTORY_SYSTEM.md](docs/INVENTORY_SYSTEM.md)** - 背包系统 API 与筛选
- **[FARM_MAP_FOUNDATION.md](docs/FARM_MAP_FOUNDATION.md)** - 农场地图规划与布局
- **[PERFORMANCE.md](docs/PERFORMANCE.md)** - 帧率与绘制统计
- **[STAGE1_BUGFIX_REPORT.md](docs/STAGE1_BUGFIX_REPORT.md)** - 已知问题与修复状态

## 🎨 美术资源

### Blender 模型库

```
assets/blender/
├── farm_asset_library.blend            # 农场资源库（20+ 类模型）
├── farm/                               # 独立模型源文件
├── character/player_character.blend    # 玩家角色源文件
└── scripts/                            # 建模、导出、验证脚本
```

所有模型已导出为 GLB 格式，位于 `public/models/`：
- 坐标系：Blender Z 向上 → 导出后 Y 向上
- 摆放配置：统一在 `src/world/FarmLayout.ts` 管理
- 模型元数据：包含 `manifest.json`

## 🌐 部署

### 本地构建与部署

```bash
npm run build      # 生成 dist/ 目录
npm run preview    # 本地预览

# 部署到静态服务（如 GitHub Pages、Vercel、Netlify）
# 仅需上传 dist/ 目录内容
```

### 在线游玩

默认部署地址：https://rxl333.github.io/bottle-sea/

## ✋ 已知限制

- 🖱️ **鼠标指针锁定**：某些嵌入式浏览器中被拒绝，已提供拖动备用方案
- 📱 **移动端**：暂未实现虚拟摇杆，主要针对桌面优化
- 🎬 **动画**：船只、角色、天气效果已完成；部分高级动画开发中
- 🔔 **第三方库**：完全自研实现，无依赖

## 📄 许可证

详见 LICENSE 文件

## 🙋 反馈与贡献

- 🐛 问题报告：[Issues](https://github.com/RXL333/bottle-sea/issues)
- 💡 功能建议：[Discussions](https://github.com/RXL333/bottle-sea/discussions)
- 🔧 代码贡献：欢迎 Pull Requests

## 🙏 致谢

感谢所有贡献者、测试者与玩家的支持！

---

**祝你在瓶中沧海中探险愉快！** 🌊✨
