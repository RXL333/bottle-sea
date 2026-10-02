export type ProgressionActivity='home.enter'|'fish.catch'|'cook.complete'|'home.sleep'|'farm.visit'|'farm.till'|'farm.seed'|'farm.harvest'|'vehicle.drive'|'livestock.feed'|'livestock.collect'|'trade.sell'|'trade.buy';
export type ActivitySink=(activity:ProgressionActivity)=>void;
export interface MilestoneDefinition {
  readonly id:string;readonly name:string;readonly description:string;readonly hint:string;
  readonly activity?:ProgressionActivity;readonly requires?:readonly string[];
}
export interface UnlockDefinition {
  readonly id:string;readonly name:string;readonly description:string;
  readonly requires:readonly string[];readonly implemented:boolean;
  /** Only content that was playable before progression may be grandfathered. */
  readonly legacyAccess?:boolean;
}
/** Static route and unlock rules, independent of inventory, worlds and presentation. */
export class ProgressionRegistry {
  private milestones=new Map<string,Readonly<MilestoneDefinition>>();
  private unlocks=new Map<string,Readonly<UnlockDefinition>>();
  registerMilestone(definition:MilestoneDefinition):this {
    if(!/^[a-z][a-z0-9_.-]*$/.test(definition.id)||!definition.name.trim()||this.milestones.has(definition.id)
      ||(definition.activity&&definition.requires?.length)||(!definition.activity&&!definition.requires?.length)||definition.requires?.some(id=>!this.milestones.has(id)))throw Error(`Invalid milestone: ${definition.id}`);
    this.milestones.set(definition.id,Object.freeze({...definition,requires:Object.freeze([...(definition.requires??[])])}));return this;
  }
  registerUnlock(definition:UnlockDefinition):this {
    if(!/^[a-z][a-z0-9_.-]*$/.test(definition.id)||!definition.name.trim()||this.unlocks.has(definition.id)
      ||definition.requires.some(id=>!this.milestones.has(id))||definition.legacyAccess&&!definition.implemented)throw Error(`Invalid unlock: ${definition.id}`);
    this.unlocks.set(definition.id,Object.freeze({...definition,requires:Object.freeze([...definition.requires])}));return this;
  }
  getMilestone(id:string){return this.milestones.get(id);}
  getUnlock(id:string){return this.unlocks.get(id);}
  listMilestones(){return [...this.milestones.values()];}
  listUnlocks(){return [...this.unlocks.values()];}
}

export const PROGRESSION=new ProgressionRegistry()
  .registerMilestone({id:'first_fish',name:'海的第一份礼物',description:'成功钓起一条鱼。',hint:'主岛钓鱼台：E 抛竿，咬钩后 E 提钩，左键控制张力。',activity:'fish.catch'})
  .registerMilestone({id:'first_home',name:'灯火里的小屋',description:'第一次走进自己的小屋。',hint:'主岛小屋门前按 E 进入；屋内有炉灶、床和储物箱。',activity:'home.enter'})
  .registerMilestone({id:'first_cook',name:'亲手做一顿饭',description:'在炉灶完成一份料理。',hint:'带一条鱼回小屋，炉灶按 E，选择烤鱼；做好后可用 F 或快捷栏食用。',activity:'cook.complete'})
  .registerMilestone({id:'first_sleep',name:'明天也有好天气',description:'在小屋睡到新一天。',hint:'小屋的床按 E，选择睡到明天；作物与动物也会按游戏时间推进。',activity:'home.sleep'})
  .registerMilestone({id:'home_cycle',name:'海岛生活的节奏',description:'钓鱼、做饭、睡觉，完成第一次生活循环。',hint:'不必按固定顺序完成，已经做过的事情都会被记住。',requires:['first_fish','first_cook','first_sleep']})
  .registerMilestone({id:'first_farm',name:'驶向田野',description:'乘交通船抵达农场岛。',hint:'主岛交通船按 E，选择农场岛；交通船与商船各有自己的泊位。',activity:'farm.visit'})
  .registerMilestone({id:'first_till',name:'翻开第一块土地',description:'手工或使用犁地机耕好一格土地。',hint:'农场三个主要农田内按 E 耕地；道路、草地和建筑不能耕作。',activity:'farm.till'})
  .registerMilestone({id:'first_seed',name:'埋下一个期待',description:'成功播下一份种子。',hint:'在农场初始种子箱领取种子，B 绑定快捷栏；选中种子，在已耕土地按 E。',activity:'farm.seed'})
  .registerMilestone({id:'first_harvest',name:'田野的第一份收获',description:'收获一株成熟作物。',hint:'小麦、玉米、土豆按游戏时间生长；可回家睡觉。成熟后 E 收获，背包需有空间。',activity:'farm.harvest'})
  .registerMilestone({id:'first_sale',name:'劳动换来的金币',description:'向靠岸商船成功出售一件商品。',hint:'商船每天 08:00–20:00 靠岸，码头 E 交易；鱼、作物、料理、畜产品都可出售。',activity:'trade.sell'})
  .registerMilestone({id:'first_purchase',name:'为下一次生产做准备',description:'成功购买一份商品、农机或容量升级。',hint:'用金币购买种子或饲料；扩容和增购农机仍需满足价格与交付条件。',activity:'trade.buy'})
  .registerMilestone({id:'first_drive',name:'田野上的车轮',description:'亲自驾驶一台农机并让它移动。',hint:'农机旁 E 上车，W/S 行驶，鼠标或 A/D 转向；停车后 E 下车。',activity:'vehicle.drive'})
  .registerMilestone({id:'first_feed',name:'照顾新的邻居',description:'向圈舍补充一次饲料。',hint:'商船购买饲料，或用小麦、玉米；农场圈舍的饲槽旁 E 补充。',activity:'livestock.feed'})
  .registerMilestone({id:'first_product',name:'牧场的回礼',description:'成功收蛋、挤奶或剪毛，产物进入背包。',hint:'喂养后按游戏时间等待；动物旁 E 领取。背包满时产物会保留。',activity:'livestock.collect'})
  .registerMilestone({id:'production_cycle',name:'一座会生长的家园',description:'收获、出售、购买与领取畜产品，连接生产和生活。',hint:'继续经营喜欢的玩法，更多系统以后可通过统一解锁接口接入。',requires:['first_harvest','first_sale','first_purchase','first_product']})
  .registerUnlock({id:'recipe.soup',name:'海鲜汤食谱',description:'小屋炉灶可用两条鱼制作暖汤。',requires:['first_cook'],implemented:true,legacyAccess:true})
  .registerUnlock({id:'recipe.smoke',name:'烟熏鱼食谱',description:'小屋炉灶可用鲜鱼与木材制作烟熏鱼。',requires:['first_cook'],implemented:true,legacyAccess:true})
  .registerUnlock({id:'capacity.upgrades',name:'仓库与粮仓扩容',description:'商船开放容量升级商品；仍需支付金币并按级购买。',requires:['first_sale'],implemented:true,legacyAccess:true})
  .registerUnlock({id:'foundation.requests',name:'NPC 与委托接入基础',description:'后续系统预留；当前没有 NPC 委托玩法。',requires:['home_cycle'],implemented:false})
  .registerUnlock({id:'foundation.collections',name:'图鉴接入基础',description:'后续系统预留；当前没有图鉴收集界面。',requires:['first_fish','first_harvest','first_product'],implemented:false})
  .registerUnlock({id:'foundation.seasons',name:'季节接入基础',description:'后续系统预留；当前不改变作物规则。',requires:['production_cycle'],implemented:false})
  .registerUnlock({id:'foundation.expeditions',name:'深海与遗迹接入基础',description:'后续系统预留；当前不开放新的旅行目的地。',requires:['home_cycle','production_cycle'],implemented:false});
