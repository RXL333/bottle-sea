import type { ActivitySink } from '../progression/ProgressionRegistry';
import { DAY_DURATION } from '../../core/GameClock';
import type { GameClock } from '../../core/GameClock';
import type { Inventory,InventoryResult } from '../Inventory';
import { FEED_BATCH,FEED_ITEMS,LIVESTOCK_ANIMALS,LIVESTOCK_SPECIES,PEN_FEED_CAPACITY,penDefinition } from './LivestockDefinition';
import { normalizeLivestock,projectLivestock } from './LivestockState';
import type { LivestockSnapshot } from './LivestockState';
export type LivestockResult={ok:true;quantity:number;itemId:string}|Extract<InventoryResult,{ok:false}>|{ok:false;reason:'unknown-pen'|'unknown-animal'|'no-feed'|'feed-full'|'not-ready'};
/** Persistent model-free ownership; commits inventory and animal resources together. */
export class LivestockSystem {
  private state:LivestockSnapshot;private motionTime:number;
  revision=0;
  constructor(private clock:GameClock,private inventory:Inventory,saved?:unknown,private onChange:()=>void=()=>{},private onActivity:ActivitySink=()=>{}){this.state=normalizeLivestock(saved,clock.simulationTime);this.motionTime=clock.simulationTime;this.synchronize(false);}
  synchronize(notify=true){
    const now=this.clock.simulationTime;
    // An idle fixture may reset its hour; completed cycles must never be revived.
    if(now<this.state.lastSimulatedGameTime&&this.state.pens.every(p=>p.feed===0)&&this.state.animals.every(a=>a.nextProductAtGameTime===null))this.state.lastSimulatedGameTime=now;
    const changed=projectLivestock(this.state,now),dt=Math.max(0,Math.min(.25,now-this.motionTime));this.motionTime=now;
    const minutes=now/DAY_DURATION*1440,hour=this.clock.hour;
    for(const [index,animal] of this.state.animals.entries()){
      const eating=animal.nextProductAtGameTime!==null&&animal.fedAtGameTime!==null&&now>=animal.fedAtGameTime&&(now-animal.fedAtGameTime)*1440/DAY_DURATION<60;
      const phase=(minutes+index*17)%96;
      animal.behavior=hour>=22||hour<6?'SLEEPING':eating?'EATING':phase>=32&&phase<80?'WALKING':'IDLE';
      if(animal.behavior!=='WALKING'||dt<=0)continue;
      const def=LIVESTOCK_ANIMALS[index],b=penDefinition(animal.penId)!.bounds,turn=Math.floor((minutes+index*17)/96)%4;
      const tx=Math.max(b.minX,Math.min(b.maxX,def.x+(turn<2?.65:-.65))),tz=Math.max(b.minZ,Math.min(b.maxZ,def.z+(turn===1||turn===2?.65:-.65)));
      const dx=tx-animal.x,dz=tz-animal.z,length=Math.hypot(dx,dz),step=Math.min(length,dt*(animal.kind==='chicken'?.22:.14));
      if(length>.02){animal.x+=dx/length*step;animal.z+=dz/length*step;const target=Math.atan2(dx,dz),diff=Math.atan2(Math.sin(target-animal.yaw),Math.cos(target-animal.yaw));animal.yaw=(animal.yaw+Math.max(-dt*2,Math.min(dt*2,diff)))%(Math.PI*2);}
    }
    if(changed){this.revision++;if(notify)this.onChange();}
  }
  snapshot():LivestockSnapshot {this.synchronize(false);return structuredClone(this.state);}
  getAnimals(){this.synchronize();return this.state.animals.map(a=>({...a}));}
  getPen(id:string){this.synchronize();const pen=this.state.pens.find(p=>p.id===id);return pen?{...pen}:undefined;}
  getAnimal(id:string){this.synchronize();const animal=this.state.animals.find(a=>a.id===id);return animal?{...animal}:undefined;}
  feedChoice(preferred?:string){return FEED_ITEMS.find(id=>id===preferred&&this.inventory.count(id)>0)??FEED_ITEMS.find(id=>this.inventory.count(id)>0);}
  feed(id:string,preferred?:string):LivestockResult {
    this.synchronize();const pen=this.state.pens.find(p=>p.id===id);if(!pen)return {ok:false,reason:'unknown-pen'};
    if(pen.feed>=PEN_FEED_CAPACITY)return {ok:false,reason:'feed-full'};
    const itemId=this.feedChoice(preferred);if(!itemId)return {ok:false,reason:'no-feed'};
    const quantity=Math.min(FEED_BATCH,PEN_FEED_CAPACITY-pen.feed,this.inventory.count(itemId)),consumed=[{itemId,quantity}],checked=this.inventory.canExchange(consumed,[]);if(!checked.ok)return checked;
    const before=structuredClone(this.state);pen.feed+=quantity;projectLivestock(this.state,this.clock.simulationTime);
    const result=this.inventory.exchange(consumed,[]);if(!result.ok){this.state=before;return result;}
    this.onActivity('livestock.feed');this.revision++;this.onChange();return {ok:true,itemId,quantity};
  }
  collect(id:string):LivestockResult {
    this.synchronize();const animal=this.state.animals.find(a=>a.id===id);if(!animal)return {ok:false,reason:'unknown-animal'};
    if(!animal.pending)return {ok:false,reason:'not-ready'};
    const itemId=LIVESTOCK_SPECIES[animal.kind].productItemId;let quantity=animal.pending;
    while(quantity>0&&!this.inventory.canAdd(itemId,quantity))quantity--;
    if(!quantity)return {ok:false,reason:this.inventory.items.has(itemId)?'full':'unknown-item'};
    const produced=[{itemId,quantity}],checked=this.inventory.canExchange([],produced);if(!checked.ok)return checked;
    const before=structuredClone(this.state);animal.pending-=quantity;projectLivestock(this.state,this.clock.simulationTime);
    const result=this.inventory.exchange([],produced);if(!result.ok){this.state=before;return result;}
    this.onActivity('livestock.collect');this.revision++;this.onChange();return {ok:true,itemId,quantity};
  }
}
