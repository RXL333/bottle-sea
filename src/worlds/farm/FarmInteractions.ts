import { InteractionSystem } from '../../systems/InteractionSystem';
import type { InteractionPosition,InteractionTarget } from '../../systems/InteractionSystem';
import type { GameplayServices } from '../../gameplay/GameplayFoundation';
import { ManualFarmingSystem } from '../../gameplay/farm/ManualFarmingSystem';
import type { FarmCellRef } from '../../gameplay/farm/FarmDefinition';
import { STARTER_SEEDS_PER_CROP } from '../../gameplay/farm/FarmSystem';
import { PLAYER_FOOT_OFFSET } from '../../world/Collision';
import { FARM_BOAT,FARM_GROUND,FARM_SEED_SUPPLY,FARM_GRAIN_UNLOAD } from './FarmMap';
import { farmHeight } from './FarmTerrain';
import type { DriveableVehicle } from '../../systems/vehicles/Vehicle';
import type { HitchSystem } from '../../systems/vehicles/HitchSystem';
import type { TrailerVehicle } from '../../systems/vehicles/TrailerVehicle';
import { LivestockInteractions } from './LivestockInteractions';
import { merchantTarget } from '../trade/MerchantShip';

/** Re-resolve the actual foot cell at every prompt and E press, including boundaries. */
export class FarmInteractions extends InteractionSystem {
  private game?:GameplayServices;private manual?:ManualFarmingSystem;
  private current:FarmCellRef|null=null;
  private vehicles:readonly DriveableVehicle[]=[];
  private hitches?:HitchSystem;
  private trailer?:TrailerVehicle;
  private livestock?:LivestockInteractions;
  private boat:InteractionTarget={id:'farm_boat',name:'登船',action:'TRAVEL',...FARM_BOAT.interaction};
  constructor(){super([]);this.setTargets([this.boat]);}
  bind(game:GameplayServices){this.game=game;this.manual=new ManualFarmingSystem(game);this.livestock=new LivestockInteractions(game);}
  setVehicles(vehicles:readonly DriveableVehicle[]){this.vehicles=vehicles;}
  setHitches(hitches:HitchSystem){this.hitches=hitches;}
  setTrailer(trailer:TrailerVehicle){this.trailer=trailer;}
  get activeCell(){return this.nearest?.action==='FARM_WORK'?this.current:null;}
  override update(position:InteractionPosition):void {
    const game=this.game,manual=this.manual,targets:InteractionTarget[]=[this.boat,merchantTarget(true)];this.current=null;
    const driven=this.vehicles.find(v=>v.occupied);
    if(driven){
      const seat=driven.seatPosition(),hitches=this.hitches;
      const targets:InteractionTarget[]=[{id:driven.id,name:'下车',action:'EXIT_VEHICLE',...seat,range:1.5,prompt:'下车',unavailable:()=>Math.abs(driven.speed)>.12?'Space 刹车 · 停稳后下车':undefined}];
      if(driven.toggleHeader){
        targets.push({id:'vehicle_work',name:'割台抬落',action:'VEHICLE_WORK',...seat,range:1.5,prompt:'抬起 / 落下割台',onInteract:()=>driven.toggleHeader!()});
        targets.push({id:'vehicle_machine',name:'收割开关',action:'VEHICLE_WORK',...seat,range:1.5,prompt:'开启 / 关闭收割',onInteract:()=>driven.toggleMachine!()});
        targets.push({id:'vehicle_unload',name:'谷仓卸货',action:'VEHICLE_WORK',...seat,range:1.5,prompt:'停车向谷仓卸货',onInteract:()=>driven.unload!()});
        this.setTargets(targets);super.update(position);return;
      }
      if(hitches)targets.push({id:'vehicle_hitch',name:'农具连接',action:'VEHICLE_HITCH',...seat,range:1.5,prompt:hitches.inspect()?.prompt,unavailable:()=>hitches.inspect()?.reason,onInteract:c=>hitches.interact(undefined,c.position)});
      if(hitches)targets.push({id:'vehicle_work',name:'农具抬落',action:'VEHICLE_WORK',...seat,range:1.5,prompt:'抬起 / 落下作业农具',onInteract:()=>hitches.toggleWork()});
      if(hitches){
        for(const choice of hitches.seedChoices)targets.push({id:`vehicle_seed:${choice.id}`,name:'播种机选种',action:'VEHICLE_WORK',...seat,range:1.5,prompt:`选择${choice.name}种子`,onInteract:()=>hitches.selectSeed(choice.id)});
        targets.push({id:'vehicle_seed:next',name:'播种机换种',action:'VEHICLE_WORK',...seat,range:1.5,prompt:'切换播种机种子',onInteract:()=>hitches.selectSeed()});
      }
      if(driven.unload)targets.push({id:'vehicle_unload',name:'拖车卸货',action:'VEHICLE_WORK',...seat,range:1.5,prompt:'停稳向谷仓卸货',onInteract:()=>driven.unload!()});
      this.setTargets(targets);super.update(position);return;
    }
    const hitches=this.hitches;
    if(this.livestock)targets.push(...this.livestock.targets());
    if(hitches)for(const tool of hitches.tools){const front=tool.frontPosition(),id=tool.id;targets.push({id:`hitch:${id}`,name:tool.definition.name,action:'VEHICLE_HITCH',x:front.x,y:front.y,z:front.z,range:1.35,prompt:hitches.inspect(id)?.prompt,unavailable:()=>hitches.inspect(id)?.reason,onInteract:c=>hitches.interact(id,c.position)});}
    for(const vehicle of this.vehicles){const entry=vehicle.seatPosition();targets.push({id:vehicle.id,name:vehicle.name,action:'ENTER_VEHICLE',x:entry.x,y:entry.y,z:entry.z,range:1.65,prompt:`驾驶${vehicle.name} · 上车`});}
    const trailer=this.trailer;
    if(trailer){const point=trailer.loadingPoint();targets.push({id:'trailer_cargo',name:'农用拖车',action:'FARM_TRAILER_STORAGE',...point,range:1.65,prompt:`管理货物 · ${trailer.cargoHint}`,unavailable:()=>Math.abs(trailer.speed)>.12?'请先停稳拖车，再存取货物':undefined});}
    // A parked machine on tilled land must remain usable: the foot cell is
    // otherwise always nearer and would swallow E with a seed-selection hint.
    const nearMachine=targets.some(t=>(t.action==='ENTER_VEHICLE'||t.action==='VEHICLE_HITCH'||t.action==='FARM_TRAILER_STORAGE')&&Math.hypot(position.x-t.x,position.y-t.y,position.z-t.z)<(t.range??.85));
    if(game&&manual){
      const boarding=targets.some(t=>t.action==='ENTER_VEHICLE'&&Math.hypot(position.x-t.x,position.y-t.y,position.z-t.z)<(t.range??.85));
      if(!boarding)targets.push({id:'farm_barn',name:'谷仓仓库',action:'FARM_STORAGE',x:FARM_GRAIN_UNLOAD.x,y:FARM_GROUND+.44,z:-.9,range:2,prompt:'查看谷仓仓库 · 存取物品'});
      const supply=FARM_SEED_SUPPLY;
      targets.push({id:'farm_seed_supply',name:'初始种子箱',action:'FARM_SEEDS',x:supply.x,y:FARM_GROUND+.44,z:supply.z,range:1.45,
        prompt:`领取初始种子 · 每种 ${STARTER_SEEDS_PER_CROP} 份，仅一次`,
        unavailable:()=>game.farm.starterSeedsClaimed?'初始种子已领取 · 从背包或小屋箱子取用':!game.inventory.canExchange([],game.farm.starterSeeds()).ok?'背包空间不足 · 腾出空间再领取':undefined,
        onInteract:context=>context.worldId==='FARM'?manual.claimSeeds():{status:'unavailable',message:'请在农场岛领取种子。'}});
      const ref=game.farm.cellAt(position.x,position.z),height=farmHeight(position.x,position.z)+PLAYER_FOOT_OFFSET;
      if(ref&&!nearMachine&&Math.abs(position.y-height)<.16){
        const center=game.farm.cellCenter(ref)!;this.current=ref;
        targets.push({id:`farm_cell:${ref.fieldId}:${ref.column}:${ref.row}`,name:'当前农田单元',action:'FARM_WORK',x:center.x,y:height,z:center.z,range:.9,
          get prompt(){return manual.inspect(ref).prompt;},
          unavailable:context=>context.worldId==='FARM'?manual.inspect(ref).reason:'请在农场主田内作业。',
          onInteract:context=>context.worldId==='FARM'?manual.work(ref):{status:'unavailable',message:'请在农场主田内作业。'}});
      }
    }
    this.setTargets(targets);super.update(position);
  }
}
