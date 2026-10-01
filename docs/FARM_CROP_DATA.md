# Farm / Crop 数据基础

农业状态由 Game 的唯一 `GameplayFoundation` 持有，通过 `GameplayServices.farm` / `crops` 传入世界与交互上下文。FarmWorld 装卸不会重建农田；Home / Fishing / Cooking / Inventory 仍使用原有服务。现已接入手工耕地、播种、收获与三种作物的四阶段模型；驾驶与复杂农业 UI 尚未实现。

具体操作见 [手工农业](MANUAL_FARMING.md)，模型文件与建模方式见 [作物阶段模型](CROP_STAGE_MODELING.md)。下文说明数据底座；当前 farm 快照另包含兼容的 `starterSeedsClaimed` 标记。

## 模块与数据

| 模块 | 职责 |
| --- | --- |
| `src/gameplay/farm/FarmDefinition.ts` | 三块主田的 ID、名称、网格与纯坐标/区域规则；FarmMap 也从这里生成田块范围 |
| `src/gameplay/farm/CropRegistry.ts` | 作物定义、生长阶段、种子/产物物品引用及基础产量 |
| `src/gameplay/farm/CropSystem.ts` | 基于唯一 GameClock 的播种时间与生长阶段计算 |
| `src/gameplay/farm/FarmSystem.ts` | 持久土地、查询、状态转换、区域选格与 Inventory 协同变更 |
| `src/gameplay/farm/FarmState.ts` | 纯 JSON 农业存档结构、默认网格、字段校验和阶段恢复 |
| `src/gameplay/ItemRegistry.ts` | 种子和收获物的名称、分类、描述、图标、堆叠上限；不在农业层重复维护 |
| `src/state/SaveSystem.ts` | 保存、迁移、归一化及按恢复日历校正农业状态 |

三块主田 ID 仍为 `field-west`、`field-central`、`field-east`，各为 12 列 × 18 行，单元边长 1 世界单位，总计 648 单元。原点 X 分别为 -28 / -6 / 16，原点 Z 均为 -28，与现有地图范围一致。田头、道路、扩田和畜牧预留区不属于可操作主田。

单元引用是 `{ fieldId, column, row }`，稳定 ID 是 `fieldId:column:row`。单元保存 `landState` 与可空的 `crop`；作物实例保存 `{ cropId, plantedAtGameTime, currentStage }`。`currentStage` 是按日历派生的阶段缓存，读取、保存和恢复时都会重算；作物定义和进度不复制到实例中。`getField` 返回独立 cells、六种状态的 `stateCounts` 和最近一次 `nextGrowthAtGameTime`，支持一块田混种、部分耕地和部分收割。

```text
UNTILLED / HARVESTED → TILLED → SEEDED → GROWING → MATURE → HARVESTED
```

`till` 允许已耕格，已耕格视为无变化；不允许犁掉已经播种的格。`seed` 仅允许 TILLED，每格扣除 1 个种子。`harvest` 仅允许 MATURE，每格加入对应基础产量，随后清除作物实例并设为 HARVESTED。再次种植前需要重新耕地。GROWING / MATURE 由时钟派生，没有任意设置状态或强制成熟接口。

## 第一批作物

以下均为游戏时间；数值可集中修改，当前是农业底层的初始参数。

| 作物 ID / 名称 | 种子物品 | 收获物品 | 生长时长 | 发芽 / 生长 / 成熟阈值（分钟） | 每格产量 |
| --- | --- | --- | --- | --- | --- |
| wheat / 小麦 | seed.wheat | crop.wheat | 4320 分钟，3 天 | 720 / 2160 / 4320 | 3 |
| corn / 玉米 | seed.corn | crop.corn | 5760 分钟，4 天 | 1440 / 2880 / 5760 | 2 |
| potato / 土豆 | seed.potato | crop.potato | 2880 分钟，2 天 | 720 / 1440 / 2880 | 4 |

每种作物还有阈值为 0 的播种阶段。六种物品在统一 ItemRegistry 中注册，堆叠上限 99，并提供本地 SVG 图标；收获物归类为作物，不在本轮变成可食用料理。CropRegistry 验证物品分类、cropId、阶段递增、生长时长和产量。定义深度冻结，与玩家实例分离。

## 统一作物定义与查询

第一版强制 `stageCount: 4`，阶段 ID 和顺序统一为 `seed` / `sprout` / `growing` / `mature`，分别表示刚播种、幼苗、生长、成熟。每个阶段包含名称、游戏分钟阈值、稳定 `resourceId` 及可选 `modelAssetId`。注册校验阶段数、顺序、时间和资源 ID；未知作物、未知阶段或非法阶段索引查询返回 undefined，重复作物/种子关联不能注册。

| 作物 | Seed 资源 | Sprout 资源 | Growing 资源 | Mature 资源 | 模型 ID |
| --- | --- | --- | --- | --- | --- |
| 小麦 | crop.wheat.seed | crop.wheat.sprout | crop.wheat.growing | crop.wheat.mature | crop_wheat_{stage} |
| 玉米 | crop.corn.seed | crop.corn.sprout | crop.corn.growing | crop.corn.mature | crop_corn_{stage} |
| 土豆 | crop.potato.seed | crop.potato.sprout | crop.potato.growing | crop.potato.mature | crop_potato_{stage} |

`resourceId` 是逻辑资源标识，不是文件路径。当前三种作物各四个阶段均有 `modelAssetId`，经 FarmAssets 映射到 `public/models/farm/crops/` 下的 GLB；旧 `wheat_cluster.glb` 保留供兼容的静态装饰使用。模型只负责外观，阶段依旧由 CropSystem 根据 GameClock 计算。

```ts
import { CROPS, getCropRegistry } from '../gameplay/farm/CropRegistry';

const wheat = CROPS.get('wheat');
const corn = CROPS.getBySeedItemId('seed.corn');
const sprout = CROPS.getStage('potato', 'sprout');
const mature = CROPS.getStageAt('wheat', 3); // 0～3
const all = CROPS.list();
const exists = CROPS.has('corn');
const shared = getCropRegistry(gameplay.items); // 与 gameplay.crops.registry 是同一实例
```

静态配置输入在 CropRegistry 模块内私有，业务系统只能经 Registry 读取。FarmSystem 的扣种子/产物规则、CropSystem 的生长规则以及 SaveSystem 的恢复校验使用同一 ItemRegistry 对应的 canonical CropRegistry；不再为存档另建配置副本。`createCropRegistry` 仅在明确需要隔离配置副本时使用，游戏功能应调用 `getCropRegistry` 或既有 `gameplay.crops.registry`。返回的作物定义、阶段及可选扩展字段均冻结，`list()` 返回独立列表。

`CropDefinition` 仅保存静态配置，不保存土地状态、播种日期、当前阶段或进度。保留 `allowedSeasons`、`growthSpeedMultiplier`、`weatherGrowthMultipliers` 可选静态字段，当前三种作物未启用，当前生长计算也不应用这些扩展。售价仍由收获物的 `ItemDefinition.sellPrice` 管理，避免两套售价配置。

阶段 ID 从早期 `seeded` / `vegetative` 统一为 `seed` / `growing`；旧存档没有 `currentStage` 时从 cropId 和播种时间补齐，新存档的阶段缓存也由日历重新校正。根版本 2 与 farm 子版本 1 保持兼容。

## 时钟与跨世界成长

沿用 `GameClock.simulationTime` 的单位：`DAY_DURATION = 480` 模拟秒等于 1440 游戏分钟。`elapsedGameMinutes = (当前 simulationTime - plantedAtGameTime) × 1440 / DAY_DURATION`。

`getCell`、`getField`、`cellsInArea`、`snapshot` 与收获检查都会按当前全局时间计算。没有 `setTimeout`、独立累计 delta、现实时间戳或需要补跑的逐日循环。离开 FARM 后继续使用同一个时钟；自然推进、倍速、旅行和睡觉跳时都会直接体现到下次读取的阶段。暂停日历期间不成长，页面关闭后的现实时间不计入游戏时间。

`CropGrowth` 包含 state、stageIndex、stage、elapsedGameMinutes、progress 和 `nextStageAtGameTime`。下一阶段时间是同一 GameClock 中的时间戳，成熟后为 null；成熟时 progress 为 1，作物保持成熟等待收割。查询和快照无副作用，不会因每帧读取不断请求存档。`farm.revision` 只代表耕地/播种/收割/restore 的实际状态写入。

FarmCropPresentation 记录全田最早的下一阶段时间，在活动世界中只比较共享日历时间与该值；达到阶段时间、土地 revision 改变、日历回退或 enter 强制刷新时才重读全田。模型矩阵只在可见状态改变时重建。FarmWorld 未激活时没有农业逐帧扫描，返回时一次性按当前时间得到最终阶段，无需补跑中间阶段。详细连接见 [GameClock 作物生长](CROP_GROWTH.md)。

## 操作 API 与库存一致性

以下示例在已有玩法服务上调用，没有创建第二个时钟或背包。后续交互需要先提供合法种子获取途径。

```ts
const farm = gameplay.farm;
const ref = { fieldId: 'field-west', column: 0, row: 0 };

farm.till([ref]);
const planted = farm.seed([ref], 'wheat'); // 检查并扣除随身背包 1 份 seed.wheat
const view = farm.getCell(ref);          // 当前土地状态、作物及生长阶段
// 全局时钟成长到成熟后：
const harvested = farm.harvest([ref]);   // 将 crop.wheat × 3 加入同一个背包
```

方法接受一组单元，也可跨田块；操作结果为 `{ ok: true, changedCells, consumed, produced }` 或 `{ ok: false, reason }`。空选择返回成功且无变化；未知田块、越界坐标、重复格、状态不合法、未知作物、种子不足、产物放不下均会整笔失败。失败时不扣种子、不清除成熟作物，也不部分收割。多个作物的产量按物品 ID 汇总检查，复用 `Inventory.canExchange/exchange`，不维护农业独立库存。

成功变更先校验，随后在 Inventory 的保存回调运行前写入全部土地状态。任何同步保存快照都能同时看见正确的背包和农田。FarmSystem 最终回调通过 GameplayFoundation.requestSave(true) 立即 flush，取消 Inventory 先前请求的延迟保存；耕地、播种、收割及初始种子领取的最终状态一起落盘。农田 snapshot / getCell / getField 均返回独立数据，修改返回值不能修改运行状态。

## 手工操作与农机的空间入口

- `cellAt(x, z)`：世界坐标定位单元，田外返回 null；田块最小边界包含，最大边界不包含。
- `cellCenter(ref)`：获得单元中心，不含模型或地面高度；表现层仍使用现有 NavigationSurface。
- `cellsInArea(area, states?)`：按单元中心选择经过范围，并可只选指定状态。
- `area.kind = 'bounds'` 使用 minX / maxX / minZ / maxZ，最小值包含、最大值不包含。
- `area.kind = 'polygon'` 使用有序 points `{ x, z }[]`，适用于旋转后的车具矩形或实际运动扫过的简单多边形，边界包含。非法或退化区域返回空选择。

```ts
import type { FarmArea } from '../gameplay/farm/FarmDefinition';

const swept: FarmArea = {
  kind: 'bounds', minX: -28, maxX: -25, minZ: -28, maxZ: -26,
};
farm.till(farm.cellsInArea(swept, ['UNTILLED', 'HARVESTED']));
farm.seed(farm.cellsInArea(swept, ['TILLED']), 'wheat');
farm.harvest(farm.cellsInArea(swept, ['MATURE']));
```

重复经过时先筛选可操作状态即可避免重复消耗。车辆层以后只需负责计算车具覆盖范围与操作时机，不直接改土地状态，也不添加计时器。若一趟经过需分批收获，应由调用方明确划分批次；本层一次调用始终整笔成功或失败。

## 存档与兼容

继续使用 `bottle-sea.save.v2` 和根 `version: 2`，新增根字段 `farm = { version: 1, fields: [{ id, cells }] }`。不保存模型、UI、类实例、网格尺寸或第二份库存。`Game.captureSave` 已通过 GameplayFoundation.snapshot 自动包含 farm。

`FarmState` 集中定义版本和可序列化字段；`SaveSystem` 直接调用该模块归一化。FarmSystem 的快照按明确字段构造，保存不会沿用额外运行时属性。完整格式、保存时机与验收步骤见 [农业存档](FARM_SAVE.md)。

旧 v1/v2 缺少 farm 时补三块未耕田，不改变现有背包、箱子、快捷栏、鱼、料理、进度或航行恢复规则，也不赠送种子。读取先恢复合法 GameClock，再按该时间计算播种阶段；不相信序列化的 GROWING / MATURE 或 `currentStage` 缓存。未知 cropId、非法/未来播种时间会清除该作物并保留 TILLED；未知状态恢复 UNTILLED，未知田块和越界格忽略。重复格只读取第一个记录，单块田最多读取当前合法格数。HARVESTED / UNTILLED / TILLED 不保留作物实例。

新增田块可加入统一 FarmDefinition。已有 ID、原点和格索引应保持稳定；将来修改既有网格粒度时须显式迁移，不能仅修改显示网格。

## 检查与后续验收

本轮执行 TypeScript strict 和变更检查。未执行测试套件、浏览器游玩测试或生产构建，功能验收由用户完成。

用户功能验收重点：不同田块独立、三种作物各阶段模型、暂停/倍速/睡觉/旅行后成长、离岛返场及刷新恢复、种子不足整批失败、背包满仍保留成熟作物、成功收割产量正确、重复收割不能复制物品、区域经过不影响道路与其他田块，以及原 Home / Fishing / Cooking / 箱子 / 快捷栏继续正常。
