import { ITEMS } from '../ItemRegistry';
import type { ItemRegistry } from '../ItemRegistry';
import type { ItemStack } from '../Inventory';
import { NPCS } from '../npc/NpcRegistry';
import { PROGRESSION } from '../progression/ProgressionRegistry';
import { DISCOVERY_IDS } from '../../state/PlayerState';

export type ProductionActivity='fish.catch'|'cook.complete'|'farm.harvest'|'livestock.collect';
export type CommissionObjective=
  |{readonly kind:'delivery';readonly itemId:string;readonly quantity:number}
  |{readonly kind:'production';readonly activity:ProductionActivity;readonly itemId?:string;readonly quantity:number}
  |{readonly kind:'discovery';readonly discoveryId:string}
  |{readonly kind:'milestone';readonly milestoneId:string};
export interface CommissionDefinition {
  readonly id:string;readonly npcId:string;readonly name:string;readonly description:string;
  readonly objectives:readonly CommissionObjective[];
  readonly rewards:{readonly coins:number;readonly items:readonly ItemStack[];readonly unlocks:readonly string[]};
  readonly requiresUnlock?:string;
}
const productionActivities:readonly string[]=['fish.catch','cook.complete','farm.harvest','livestock.collect'];
/** Static rules only. Item names, stack limits and production rules remain with their registries. */
export class CommissionRegistry {
  private definitions=new Map<string,Readonly<CommissionDefinition>>();
  constructor(readonly items:ItemRegistry=ITEMS){}
  register(d:CommissionDefinition):this {
    const quantity=(n:number)=>Number.isSafeInteger(n)&&n>0&&n<=10000;
    const itemsValid=(s:ItemStack)=>quantity(s.quantity)&&this.items.has(s.itemId);
    const deliveries=d.objectives.filter((o):o is Extract<CommissionObjective,{kind:'delivery'}>=>o.kind==='delivery');
    if(!/^[a-z][a-z0-9_.-]*$/.test(d.id)||this.definitions.has(d.id)||!NPCS.get(d.npcId)||!d.name.trim()||!d.description.trim()||!d.objectives.length||d.objectives.length>8
      ||new Set(deliveries.map(o=>o.itemId)).size!==deliveries.length
      ||!Number.isSafeInteger(d.rewards.coins)||d.rewards.coins<0||d.rewards.coins>1000000
      ||d.requiresUnlock&&!PROGRESSION.getUnlock(d.requiresUnlock)?.implemented
      ||d.rewards.items.some(s=>!itemsValid(s))||d.rewards.unlocks.some(id=>!PROGRESSION.getUnlock(id)?.implemented)
      ||d.objectives.some(o=>o.kind==='delivery'? !itemsValid(o):o.kind==='production'?!productionActivities.includes(o.activity)||!quantity(o.quantity)||!!o.itemId&&!this.items.has(o.itemId):o.kind==='discovery'?!(DISCOVERY_IDS as readonly string[]).includes(o.discoveryId):!PROGRESSION.getMilestone(o.milestoneId)))throw Error(`Invalid commission: ${d.id}`);
    this.definitions.set(d.id,Object.freeze({...d,objectives:Object.freeze(d.objectives.map(o=>Object.freeze({...o}))),rewards:Object.freeze({coins:d.rewards.coins,items:Object.freeze(d.rewards.items.map(s=>Object.freeze({...s}))),unlocks:Object.freeze([...new Set(d.rewards.unlocks)])})}));return this;
  }
  get(id:string){return this.definitions.get(id);}
  list(npcId?:string){return [...this.definitions.values()].filter(d=>!npcId||d.npcId===npcId);}
}

export const COMMISSIONS=new CommissionRegistry()
  .register({id:'keeper.farm_chart',npcId:'lighthouse_keeper',name:'把田野写进航海图',description:'乘交通船前往农场岛，回来告诉老人那里的见闻。已经抵达过也算数。',objectives:[{kind:'milestone',milestoneId:'first_farm'}],rewards:{coins:35,items:[{itemId:'seed.wheat',quantity:3}],unlocks:[]}})
  .register({id:'keeper.old_anchor',npcId:'lighthouse_keeper',name:'旧锚的记忆',description:'探索主岛海边的旧锚，记录一次发现。发现记录即可，无需取走海中的模型。',objectives:[{kind:'discovery',discoveryId:'anchor'}],rewards:{coins:40,items:[{itemId:'wood',quantity:3}],unlocks:[]}})
  .register({id:'keeper.ruins',npcId:'lighthouse_keeper',name:'近岸石柱的故事',description:'在主岛附近发现沉没石柱。慢慢探索即可，不需要进入尚未开放的遗迹世界。',objectives:[{kind:'discovery',discoveryId:'ruins'}],rewards:{coins:60,items:[{itemId:'food.grilled_fish',quantity:1}],unlocks:[]}})
  .register({id:'fisher.sardines',npcId:'fisherman',name:'两条沙丁鱼',description:'带两条沙丁鱼来，我们一起看看这一季的近岸鱼群。',objectives:[{kind:'delivery',itemId:'fish.sardine',quantity:2}],rewards:{coins:32,items:[{itemId:'seed.potato',quantity:2}],unlocks:[]}})
  .register({id:'fisher.practice',npcId:'fisherman',name:'稳稳的三次收竿',description:'接取后真正钓获三条鱼，不限种类。买来的鱼不算，背包满时暂存的钓获只计一次。',objectives:[{kind:'production',activity:'fish.catch',quantity:3}],rewards:{coins:45,items:[{itemId:'wood',quantity:2}],unlocks:['recipe.smoke']}})
  .register({id:'fisher.tuna',npcId:'fisherman',name:'海中的游泳健将',description:'带来一条金枪鱼。鱼讯随季节改变，没有期限，耐心等一次好机会。',objectives:[{kind:'delivery',itemId:'fish.tuna',quantity:1}],rewards:{coins:180,items:[],unlocks:[]}})
  .register({id:'merchant.supper',npcId:'merchant_captain',name:'船员的热晚餐',description:'接取后亲手做好两份烤鱼，再带到商船交付。食谱和炉灶仍在小屋里。',objectives:[{kind:'production',activity:'cook.complete',itemId:'food.grilled_fish',quantity:2},{kind:'delivery',itemId:'food.grilled_fish',quantity:2}],rewards:{coins:75,items:[{itemId:'seed.corn',quantity:4}],unlocks:['recipe.soup']}})
  .register({id:'merchant.wheat',npcId:'merchant_captain',name:'远航的麦穗',description:'交付十二份小麦作为船队补给。完成钓鱼、做饭、睡觉的生活循环后可接取。',requiresUnlock:'foundation.requests',objectives:[{kind:'delivery',itemId:'crop.wheat',quantity:12}],rewards:{coins:132,items:[{itemId:'feed.basic',quantity:3}],unlocks:[]}})
  .register({id:'merchant.cargo',npcId:'merchant_captain',name:'柔软与鲜甜',description:'带来两份牛奶和两份羊毛，为船员准备一些岛上特产。',objectives:[{kind:'delivery',itemId:'livestock.milk',quantity:2},{kind:'delivery',itemId:'livestock.wool',quantity:2}],rewards:{coins:100,items:[{itemId:'seed.wheat',quantity:4}],unlocks:[]}})
  .register({id:'farm.wheat',npcId:'farm_steward',name:'第一把麦穗',description:'带来三份小麦，一株成熟小麦的基础收获就够了。按自己的节奏等待成长。',objectives:[{kind:'delivery',itemId:'crop.wheat',quantity:3}],rewards:{coins:50,items:[{itemId:'seed.wheat',quantity:4}],unlocks:[]}})
  .register({id:'farm.harvest',npcId:'farm_steward',name:'田野的六份收获',description:'接取后实际收获六份作物，不限种类。手工或联合收割机都算，转运和买卖不会重复计数。',objectives:[{kind:'production',activity:'farm.harvest',quantity:6}],rewards:{coins:60,items:[{itemId:'seed.potato',quantity:3}],unlocks:[]}})
  .register({id:'farm.neighbours',npcId:'farm_steward',name:'圈舍的三份回礼',description:'提交一份鸡蛋、一份牛奶和一份羊毛。领不下的产物会留在动物那里。',objectives:[{kind:'delivery',itemId:'livestock.egg',quantity:1},{kind:'delivery',itemId:'livestock.milk',quantity:1},{kind:'delivery',itemId:'livestock.wool',quantity:1}],rewards:{coins:60,items:[{itemId:'feed.basic',quantity:6}],unlocks:['capacity.upgrades']}});
