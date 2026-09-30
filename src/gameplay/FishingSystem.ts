import { fishDefinition } from './FishingCatalog';
import type { FishDefinition } from './FishingCatalog';
import type { Inventory } from './Inventory';
import type { PlayerProgress } from './PlayerProgressState';
import type { ItemRegistry } from './ItemRegistry';
import type { InteractionOutcome } from '../systems/InteractionSystem';

export const FISHING_ENERGY=6, BITE_WINDOW=2.8;
export type FishingPhase='IDLE'|'CASTING'|'WAITING'|'BITE'|'FIGHTING'|'REELING';
export type FishingInputMode='hold'|'click';
export interface FishingSnapshot { pendingCatch:string|null; inputMode:FishingInputMode }
export interface FishingEvent { kind:'bite'|'miss'|'caught'|'stored'|'cancel';message:string;fish?:FishDefinition }
export function normalizeFishing(value:unknown,items:ItemRegistry):FishingSnapshot {
  const raw=value&&typeof value==='object'?value as Partial<FishingSnapshot>:{};
  return {pendingCatch:typeof raw.pendingCatch==='string'&&fishDefinition(raw.pendingCatch,items)?raw.pendingCatch:null,inputMode:raw.inputMode==='click'?'click':'hold'};
}
export class FishingSystem {
  private phase:FishingPhase='IDLE';private elapsed=0;private wait=0;private hooked?:FishDefinition;
  private pending:string|null;
  private mode:FishingInputMode;private pressing=false;private tensionValue=.5;private catchValue=.25;private zone=.5;private offset=0;private escapeTime=0;
  onEvent:(event:FishingEvent)=>void=()=>{};
  constructor(private inventory:Inventory,private progress:PlayerProgress,saved?:unknown,
    private onChange:()=>void=()=>{},private random:()=>number=Math.random){
    const snapshot=normalizeFishing(saved,inventory.items);this.pending=snapshot.pendingCatch;this.mode=snapshot.inputMode;
  }
  get state(){return this.phase;}
  get active(){return this.phase!=='IDLE';}
  get phaseProgress(){return Math.min(1,this.elapsed/(this.phase==='CASTING'?.85:this.phase==='WAITING'?this.wait:this.phase==='BITE'?BITE_WINDOW:1.1));}
  get hookedFish(){return this.phase==='REELING'?this.hooked:undefined;}
  get pendingCatch(){return this.pending;}
  get inputMode(){return this.mode;}
  get tension(){return this.tensionValue;}
  get catchProgress(){return this.catchValue;}
  get zoneWidth(){return this.hooked?.fishing.rarity==='稀有'?.22:this.hooked?.fishing.rarity==='少见'?.28:.34;}
  get zoneStart(){return this.zone-this.zoneWidth/2;}
  get inZone(){return Math.abs(this.tensionValue-this.zone)<=this.zoneWidth/2;}
  get fierce(){return this.phase==='FIGHTING'&&this.elapsed>3&&this.elapsed%7>4.7;}
  get danger(){return this.phase==='FIGHTING'&&this.catchValue<=.08;}
  setInputMode(mode:FishingInputMode){if(mode===this.mode)return;this.mode=mode;this.pressing=false;this.onChange();}
  press(){if(this.phase!=='FIGHTING')return false;this.pressing=true;if(this.mode==='click')this.tensionValue=Math.min(1,this.tensionValue+.12);return true;}
  release(){this.pressing=false;}
  get prompt(){return this.phase==='CASTING'?'正在抛竿……':this.phase==='WAITING'?'等待咬钩……':this.phase==='BITE'?'咬钩了！立即收杆':this.phase==='FIGHTING'?'左键控制张力 · Esc 放弃':this.phase==='REELING'?'正在收杆……':this.pending?'领取暂存的鱼':'抛竿钓鱼 · 体力 -6';}
  blockReason():string|undefined {
    if(this.phase==='CASTING'||this.phase==='WAITING'||this.phase==='FIGHTING'||this.phase==='REELING')return this.prompt;
    if(this.phase==='BITE')return;
    if(this.pending)return this.inventory.canAdd(this.pending)?undefined:'背包空间不足，请先腾出空位领取鱼';
    if(this.progress.energy<FISHING_ENERGY)return '体力不足，吃点东西或回家睡觉';
    if(!this.inventory.items.fish().some(fish=>this.inventory.canAdd(fish.id)))return '背包已满，请先回家储物';
  }
  interact():InteractionOutcome {
    const reason=this.blockReason();if(reason)return {status:'unavailable',message:reason};
    if(this.phase==='BITE'){this.phase='FIGHTING';this.elapsed=0;this.tensionValue=.5;this.catchValue=.25;this.zone=.5;this.offset=this.roll()*Math.PI*2;this.escapeTime=0;this.pressing=false;return {status:'success'};}
    if(this.pending){
      const fish=fishDefinition(this.pending,this.inventory.items)!;this.pending=null;const result=this.inventory.add(fish.id);
      if(!result.ok){this.pending=fish.id;return {status:'unavailable',message:'背包空间不足，请先腾出空位。'};}
      this.onChange();this.onEvent({kind:'caught',message:`获得 ${fish.name} × 1 · 已放入背包`,fish});return {status:'success'};
    }
    const pool=this.inventory.items.fish().filter(fish=>this.inventory.canAdd(fish.id));
    let roll=this.roll()*pool.reduce((sum,fish)=>sum+fish.fishing.weight,0);this.hooked=pool.at(-1);
    for(const fish of pool){roll-=fish.fishing.weight;if(roll<0){this.hooked=fish;break;}}
    if(!this.hooked||!this.progress.spendEnergy(FISHING_ENERGY))return {status:'unavailable',message:'暂时无法抛竿。'};
    this.wait=4+this.roll()*4;this.phase='CASTING';this.elapsed=0;return {status:'success'};
  }
  update(delta:number){
    if(!this.active)return;
    const dt=Number.isFinite(delta)?Math.min(.1,Math.max(0,delta)):0;this.elapsed+=dt;
    if(this.phase==='CASTING'&&this.elapsed>=.85){this.phase='WAITING';this.elapsed=0;}
    else if(this.phase==='WAITING'&&this.elapsed>=this.wait){this.phase='BITE';this.elapsed=0;this.onEvent({kind:'bite',message:'鱼咬钩了！按 E 收杆！'});}
    else if(this.phase==='BITE'&&this.elapsed>=BITE_WINDOW){this.reset();this.onEvent({kind:'miss',message:'鱼逃走了，再试一次吧。'});}
    else if(this.phase==='FIGHTING'){
      const difficulty=this.hooked?.fishing.rarity==='稀有'?1.3:this.hooked?.fishing.rarity==='少见'?1.12:1;
      const speed=this.fierce?1.6:1;
      const target=.5+Math.sin(this.elapsed*.8*difficulty+this.offset)*.24+Math.sin(this.elapsed*1.9+this.offset)*.06;
      // Slide rather than teleport the ideal zone, including on entry and fierce bursts.
      this.zone+=Math.max(-dt*.24*speed,Math.min(dt*.24*speed,target-this.zone));
      this.zone=Math.max(this.zoneWidth/2,Math.min(1-this.zoneWidth/2,this.zone));
      const rate=this.mode==='hold'?(this.pressing?.46:-.28):-.22;
      this.tensionValue=Math.max(0,Math.min(1,this.tensionValue+rate*speed*dt));
      // Initial grace gives the player time to read the controls without losing progress.
      this.catchValue=Math.max(0,Math.min(1,this.catchValue+(this.inZone?.115/difficulty:this.elapsed<1?0:-.07)*dt));
      this.escapeTime=this.catchValue===0?this.escapeTime+dt:0;
      if(this.catchValue>=1){this.phase='REELING';this.elapsed=0;this.pressing=false;}
      else if(this.escapeTime>=1.5||this.elapsed>=90){this.reset();this.onEvent({kind:'miss',message:'鱼挣脱了鱼线，再试一次吧。'});}
    }
    else if(this.phase==='REELING'&&this.elapsed>=1.1){
      const fish=this.hooked!;this.reset();
      const result=this.inventory.add(fish.id);
      if(result.ok)this.onEvent({kind:'caught',message:`获得 ${fish.name} × 1 · 已放入背包`,fish});
      else {this.pending=fish.id;this.onChange();this.onEvent({kind:'stored',message:`钓到 ${fish.name}，背包已满；已暂存，腾空后回钓鱼台领取。`,fish});}
    }
  }
  cancel(message='已收起鱼竿。'){if(!this.active)return;this.reset();this.onEvent({kind:'cancel',message});}
  snapshot():FishingSnapshot{return {pendingCatch:this.pending,inputMode:this.mode};}
  private reset(){this.phase='IDLE';this.elapsed=0;this.hooked=undefined;this.pressing=false;}
  private roll(){const value=this.random();return Number.isFinite(value)?Math.max(0,Math.min(.999999,value)):0;}
}
