import { NPCS } from './NpcRegistry';
import { DialogueRegistry } from './DialogueRegistry';
import type { DialogueTopic } from './DialogueRegistry';
const route:DialogueTopic={id:'progression',label:'我接下来可以做什么？',lines:['每一份小小的收获都会写进成长手记。想去海边、下厨还是照顾田野，都按自己的节奏来。'],action:'progression'};
const calendar:DialogueTopic={id:'calendar',label:'聊聊季节和日子',lines:['四季会随着游戏时间推进。日历记着今天的季节、日期和接下来的日子，睡一觉也会迎来新的清晨。'],action:'calendar'};
const collections:DialogueTopic={id:'collections',label:'翻看航海手记',lines:['鱼获、料理、田野和走过的地方，都会自动留下记录。还没相遇的名字先藏着，N 可以随时翻开手记。'],variants:[{when:f=>(f.collectionCount??0)>=6,lines:['你的手记已经攒下不少见闻了。重逢不会抹去第一次相遇的日期，未写下的纸页也不必急着填满。']}],action:'collections'};
const commissions:DialogueTopic={id:'commissions',label:'查看 / 接取 / 提交委托',lines:['这里是我的委托记录。不需要赶时间，准备好了再回来交付；J 可以随时查看进度。'],action:'commissions'};
export const DIALOGUES=new DialogueRegistry(NPCS)
  .register({npcId:'lighthouse_keeper',greeting:{id:'hello',label:'问候',lines:['欢迎来到灯塔。海再宽，灯火也会替归航的人留一条路。','这里的岛屿像装进瓶中的记忆。先认识脚下的家园，再慢慢向远处出发。'],variants:[{when:f=>f.weather==='STORM',lines:['风暴来了，先在近岸休息吧。海上的灯会一直亮着。','等风小一些再出发，航行不必赶时间。']},{when:f=>f.met,lines:['又来看灯火了？熟悉的岸边，也总能发现新的故事。']}]},topics:[
    {id:'sea',label:'灯塔为什么一直亮着？',lines:['灯塔替所有来往的船辨认岸边，也替这座岛守着旧日的航海故事。','你的小屋、钓鱼台和农场，都会成为自己的航海日志。']},
    {id:'islands',label:'怎样去别的岛？',lines:['主岛的交通船有自己的泊位。靠近后按 E，航海图上会列出可以前往的地方。','农场岛已经可以抵达。深海和失落遗迹暂未开放，先把家园照顾好。'],variants:[{when:f=>f.completed.includes('first_farm'),lines:['你已经去过农场岛了。交通船会接你往返，两座岛共用同一段时间。','远海还有许多故事，深海与遗迹仍在等待后续开放。']}]},
    {id:'ruins',label:'海底的遗迹是什么？',lines:['那些石柱曾经听过航海者的脚步，如今只剩鱼群穿过。','在家园附近探索时可以发现旧物。这里先记录见闻，还没有远海遗迹任务。']},commissions,collections,route,calendar]})
  .register({npcId:'merchant_captain',greeting:{id:'hello',label:'问候',lines:['欢迎来到远海帆船！我每天 08:00 到 20:00 靠岸，带来补给，也收购岛上的收获。','交通船负责送你去农场，我的船负责交易，各有各的泊位。'],variants:[{when:f=>f.completed.includes('first_sale'),lines:['又带来新的收获了？你已经学会把劳动换成金币。','鱼、作物、料理和畜产品都能出售，买补给前看看余额和背包空位。']}]},topics:[
    {id:'trade',label:'出售收获 / 购买补给',lines:['账本就在这里。单价、数量、总价和余额都写清楚，买卖前还会检查空间。'],action:'trade'},
    {id:'money',label:'金币怎样用更合适？',lines:['先买适合当前季节的种子，再备些饲料。有了稳定收获，再考虑扩容和新的农机。'],variants:[{when:f=>f.coins<30,lines:['手头金币不多时，先卖一些现有收获，不必急着购买大机器。','现有的家园和车辆仍可使用，商店不会回收你的东西。']}]},
    commissions,collections,route,calendar]})
  .register({npcId:'fisherman',greeting:{id:'hello',label:'问候',lines:['来钓鱼台坐坐吧。第一次抛竿，耐心比运气更重要。'],variants:[{when:f=>f.fishCount>0,lines:['背包里有鱼的气息！可以带回小屋做饭，或等商船靠岸后出售。']},{when:f=>f.completed.includes('first_fish'),lines:['已经钓到过鱼了吧？每天的海和鱼群都值得再看一眼。']}]},topics:[
    {id:'fishing',label:'教我怎样钓鱼',lines:['在钓鱼台按 E 抛竿，等待咬钩，再按 E 提钩。','挣扎时用左键长按或点按控制张力，让竖条留在最佳区域。R 可以切换操作设置。','成功后的鱼进入背包；背包满了，先腾出空间再领取，别让收获丢了。']},
    {id:'fish',label:'这季节能遇到什么鱼？',lines:['当前是{seasonName}季，近岸可能遇到：{fishNames}。鱼群也跟着季节变化。'],variants:[{when:f=>f.season==='winter',lines:['冬天的鱼群偏向耐寒的种类。当前可遇到：{fishNames}，各类鱼的机会也有季节差异。']},{when:f=>f.season==='summer',lines:['夏季的海很有活力。当前可遇到：{fishNames}，遇到鱼群就稳住鱼线。']}]},
    {id:'special',label:'稀有鱼与远海传闻',lines:['当季鱼讯里机会较少的鱼，需要一些耐心。鱼种会随季节变化，打开日历看看今天的鱼讯。','更远的海域还没有开放。先把近岸的收获记在成长手记里，特殊鱼的故事以后再慢慢展开。']},
    {id:'weather',label:'今天的海适合出门吗？',lines:['晴朗的海适合慢慢钓鱼。带上空间和耐心，傍晚回家做一顿热饭。'],variants:[{when:f=>f.weather==='STORM',lines:['乌云和斜雨已经来了。今天海上风大，注意环境，也可以先回家休息。']},{when:f=>f.weather==='RAIN',lines:['雨点让海面热闹起来。鱼不会因为谈话改变概率，稳稳控制张力就好。']},{when:f=>f.weather==='OVERCAST',lines:['云层厚一点，天光柔和。钓鱼的操作还是一样，别被突然咬钩吓到。']}]},commissions,collections,route,calendar]})
  .register({npcId:'farm_steward',greeting:{id:'hello',label:'问候',lines:['欢迎来田野！先去种子箱领取初始种子，再从三块主田的一小格开始。'],variants:[{when:f=>f.matureCells>0,lines:['田里有成熟作物了。收获前看看背包空间，小麦和玉米也可以使用联合收割机。']},{when:f=>f.pendingProducts>0,lines:['圈舍里有待领取的产物。鸡蛋、牛奶和羊毛都等着你，背包满时它们会保留。']},{when:f=>f.growingCells>0,lines:['你种下的作物正在生长。回家、睡觉或去另一座岛，时间都会继续照顾它们。']},{when:f=>f.met,lines:['又来照顾农场了？不必把一天填满，田野也喜欢慢一点的生活。']}]},topics:[
    {id:'crops',label:'耕地、播种和收获',lines:['主田内按 E 耕地，背包拿起种子后在已耕地按 E 播种。种子会从背包扣除。','小麦、玉米和土豆使用同一套生长系统。成熟后才能收获，背包满了就先留在田里。','睡觉和离开农场都不会冻结作物，重新回来时会按经过的游戏时间恢复。']},
    {id:'season',label:'现在适合种什么？',lines:['看日历和种子说明。当前是{seasonName}季，播种建议：{plantableCrops}。空闲时可以照顾牧场和整理收获。','已经种下的作物会继续生长。季节更替不会直接清掉你的农田。']},
    {id:'machines',label:'农机怎样分工？',lines:['拖拉机按 E 上车，停稳后连接农具。犁与播种机落下才能作业，播种机用背包里的种子。','联合收割机只收成熟小麦和玉米，土豆仍手工收获。粮仓满了先卸货，拖车能把粮食送到谷仓。']},
    {id:'animals',label:'鸡、牛和羊怎样照顾？',lines:['在各圈舍的饲槽补充饲料，也可以使用小麦或玉米。动物满足喂养条件后，按游戏时间产出。','靠近动物按 E 收蛋、挤奶或剪毛。领不下的产物会等你，不必反复操作。']},commissions,collections,route,calendar]});
