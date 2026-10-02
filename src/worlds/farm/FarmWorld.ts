import { SeasonalEnvironment } from '../../systems/SeasonalEnvironment';
import { Group } from 'three';
import type { Quality } from '../../core/Renderer';
import { PLAYER_FOOT_OFFSET,PLAYER_HEAD_OFFSET,PLAYER_RADIUS } from '../../world/Collision';
import { waveHeight } from '../../world/ocean/WaveMath';
import type { GameWorld,SpawnPoint,WorldEnterContext,WorldLeaveContext,WorldUpdateContext } from '../types';
import type { GameplayServices } from '../../gameplay/GameplayFoundation';
import type { NavigationSurface } from '../NavigationSurface';
import { disposeWorld } from '../disposeWorld';
import { FarmOcean } from './FarmOcean';
import { PlayerTravelBoat } from '../travel/PlayerTravelBoat';
import { FarmTerrain,farmHeight } from './FarmTerrain';
import { FARM_OBSTACLES } from './FarmBuildings';
import { FARM_SURFACES } from './FarmLayout';
import { FARM_MODEL_FILES,FarmAssets } from './FarmAssets';
import type { FarmAssetId,ModelLoader } from './FarmAssets';
import { FarmModels,compactInstance } from './FarmModels';
import { FARM_ARRIVAL,FARM_BOAT,FARM_MAP,FARM_NAVIGATION_BOUNDS } from './FarmMap';
import { FarmWayfinding } from './FarmWayfinding';
import { FarmInteractions } from './FarmInteractions';
import { FarmCropPresentation } from './FarmCropPresentation';
import { TractorVehicle } from '../../systems/vehicles/TractorVehicle';
import { CombineVehicle } from '../../systems/vehicles/CombineVehicle';
import type { WheeledVehicle } from '../../systems/vehicles/WheeledVehicle';
import { COMBINE_DEFINITION } from '../../gameplay/vehicles/VehicleDefinition';
import { FarmVehicleNavigation } from './FarmVehicleNavigation';
import { ImplementVehicle } from '../../systems/vehicles/ImplementVehicle';
import { HitchSystem } from '../../systems/vehicles/HitchSystem';
import { IMPLEMENTS } from '../../gameplay/vehicles/ImplementRegistry';
import { FARM_ASSET_BOUNDS } from './FarmMap';
import { PlowingSystem } from '../../gameplay/farm/PlowingSystem';
import { SeedingSystem } from '../../gameplay/farm/SeedingSystem';
import { TrailerVehicle } from '../../systems/vehicles/TrailerVehicle';
import { FarmTransportSystem } from './FarmTransportSystem';
import { FarmEffects } from './FarmEffects';
import type { FarmSoundFrame } from './FarmPresentation';
import { LivestockPresentation } from './LivestockPresentation';
import { PURCHASED_COMBINE_ID } from '../../gameplay/vehicles/VehicleIds';
import type { VehiclePose } from '../../gameplay/vehicles/VehicleState';
import type { MachineDeliveryPlan,TradeAccess } from '../../gameplay/economy/EconomySystem';
import { FARM_DELIVERY_BAYS } from './FarmDelivery';
import { hullsOverlap } from '../../gameplay/vehicles/HitchMath';
import { box } from '../../utils/voxel';
import { MerchantShip } from '../trade/MerchantShip';
import { FarmWarmLights,FarmWetness,farmSheltered } from './FarmWeatherResponse';
export class FarmWorld implements GameWorld {
  private seasons=new SeasonalEnvironment();
  private wetness=new FarmWetness();private warmLights=new FarmWarmLights();
  sheltered(position:import('three').Vector3){return farmSheltered(position);}
  readonly id='FARM' as const;readonly root=new Group();readonly boat=new PlayerTravelBoat();
  readonly map=FARM_MAP;
  private merchant=new MerchantShip(true);
  private ocean=new FarmOcean();readonly interaction=new FarmInteractions();
  private gameplay?:GameplayServices;private crops:FarmCropPresentation;
  private effects=new FarmEffects();farmSound?:FarmSoundFrame;
  private livestock?:LivestockPresentation;
  get livestockFocus(){const target=this.interaction.nearest;if(target?.action==='LIVESTOCK_FEED')return target.id.split(':')[1];if(target?.action==='LIVESTOCK_COLLECT')return target.id.split(':')[1].split('-')[0];return undefined;}
  get farmFocus(){return this.interaction.activeCell;}
  get farmPresentationDiagnostics(){return {cropCells:this.crops.userData.visibleCropCells??0,states:this.crops.userData.stateCounts,drawBatches:this.crops.userData.drawBatches,particles:this.effects.activeParticles,particleCapacity:this.effects.capacity,emitted:this.effects.emitted};}
  private restoringVehicles=false;
  private vehicleNavigations=new Map<string,FarmVehicleNavigation>();
  private playerPosition?:{x:number;z:number};
  get tradeAccess():TradeAccess{return {farm:true,upgraded:()=>{for(const v of this.vehicles)if(v instanceof CombineVehicle)v.updateVisual(0);},delivery:{available:()=>!!this.deliveryPose(),prepare:()=>this.prepareDelivery()}};}
  readonly vehicles:WheeledVehicle[]=[];private terrain=new FarmTerrain();combine?:CombineVehicle;
  readonly implements:ImplementVehicle[]=[];hitches?:HitchSystem;
  trailer?:TrailerVehicle;transport?:FarmTransportSystem;
  get storageContainers(){return this.trailer?[{id:'trailer_cargo',name:'农用拖车',inventory:this.trailer.cargo,partialTransfers:true}]:[];}
  private assets:FarmAssets;private models:FarmModels;private disposed=false;private loading:Promise<void>|undefined;
  readonly navigation:NavigationSurface={
    groundHeight:(x,z)=>farmHeight(x,z),
    hitsObstacle:(x,z,y)=>FARM_OBSTACLES.some(b=>y+PLAYER_HEAD_OFFSET>b.minY&&y-PLAYER_FOOT_OFFSET<b.maxY&&Math.hypot(Math.max(b.minX-x,0,x-b.maxX),Math.max(b.minZ-z,0,z-b.maxZ))<PLAYER_RADIUS),
    resolveVertical:(x,z,from,to)=>this.resolveVertical(x,z,from,to),isInside:(x,_y,z)=>x>=FARM_NAVIGATION_BOUNDS.minX&&x<=FARM_NAVIGATION_BOUNDS.maxX&&z>=FARM_NAVIGATION_BOUNDS.minZ&&z<=FARM_NAVIGATION_BOUNDS.maxZ,
    constrain:p=>{const b=FARM_NAVIGATION_BOUNDS;p.x=Math.max(b.minX,Math.min(b.maxX,p.x));p.z=Math.max(b.minZ,Math.min(b.maxZ,p.z));p.y=Math.max(.94,p.y);},
    waterLevel:waveHeight,dynamicObstacles:()=>[...this.boat.collisionBoxes,this.merchant.collision,...this.vehicles.map(v=>v.collision),...this.implements.map(i=>i.collision),...(this.livestock?.collisions??[])],
  };
  constructor(loader?:ModelLoader){this.assets=new FarmAssets(loader);this.models=new FarmModels(this.assets);this.crops=new FarmCropPresentation(id=>Object.hasOwn(FARM_MODEL_FILES,id)?this.assets.instance(id as FarmAssetId):undefined);this.root.name='FarmWorld';this.root.userData.mapVersion=this.map.version;this.boat.anchor(FARM_BOAT.x,FARM_BOAT.z);this.root.add(this.ocean,this.terrain,new FarmWayfinding(),this.models,this.assets.sources,this.boat,this.crops,this.effects,this.merchant);}
  load(){return this.loading??=this.loadModels();}
  private async loadModels(){await this.assets.load();if(this.disposed)return;this.models.build();this.livestock=new LivestockPresentation(this.models.placements);this.root.add(this.livestock);this.boat.setModel(this.assets.instance('transport_boat'));
    const model=this.models.placements.get('yard-tractor')!;
    const navigation=new FarmVehicleNavigation(this.navigation,()=>[...this.boat.collisionBoxes,...this.vehicleObstacles('farm.tractor'),...this.implements.filter(i=>!this.hitches?.isAttached(i.id)).map(i=>i.collision)],this.models,model,()=>[...this.boat.collisionBoxes,...this.vehicleObstacles('farm.tractor'),...this.implements.map(i=>i.collision)]);
    const tractor=new TractorVehicle(model,navigation);this.vehicles.push(tractor);this.vehicleNavigations.set(tractor.id,navigation);
    const combineModel=this.models.placements.get('combine')!;
    const combineNavigation=new FarmVehicleNavigation(this.navigation,()=>[...this.boat.collisionBoxes,...this.vehicleObstacles(COMBINE_DEFINITION.id),...this.implements.map(i=>i.collision)],this.models,combineModel,undefined,COMBINE_DEFINITION.hull);
    this.combine=new CombineVehicle(combineModel,combineNavigation);this.vehicles.push(this.combine);this.vehicleNavigations.set(this.combine.id,combineNavigation);
    for(const definition of IMPLEMENTS){const args=[definition,this.models.placements.get(definition.placementId)!,FARM_ASSET_BOUNDS.get(definition.asset)!,navigation] as const;const tool=definition.id==='farm.trailer'?new TrailerVehicle(...args):new ImplementVehicle(...args);this.implements.push(tool);if(tool instanceof TrailerVehicle)this.trailer=tool;}
    this.hitches=new HitchSystem(tractor,this.implements,navigation,()=>this.gameplay?.requestSave(true));this.root.add(this.hitches.presentation);
    for(const bay of FARM_DELIVERY_BAYS)for(const x of [-1.45,1.45])box(this.root,'#d8c891',bay.x+x,farmHeight(bay.x,bay.z)+.012,bay.z,.08,.024,3.3);
    this.interaction.setVehicles(this.vehicles);this.interaction.setHitches(this.hitches);this.root.add(this.warmLights);this.seasons.register(this.terrain);this.wetness.register(this.terrain);for(const child of this.models.children)if(child.name.startsWith('FarmStatic_')){if(child.name.endsWith(':foliage'))this.seasons.register(child);this.wetness.register(child);}this.root.userData.modelsReady=true;
  }
  private purchasedNavigation(model:Group){return new FarmVehicleNavigation(this.navigation,()=>[...this.boat.collisionBoxes,...this.vehicleObstacles(PURCHASED_COMBINE_ID),...this.implements.map(i=>i.collision)],this.models,model,undefined,COMBINE_DEFINITION.hull);}
  private deliveryPose():VehiclePose|undefined {
    if(!this.gameplay||this.vehicles.some(v=>v.id===PURCHASED_COMBINE_ID))return;
    const nav=this.purchasedNavigation(this.models.placements.get('combine')!);
    for(const bay of FARM_DELIVERY_BAYS){const pose={id:PURCHASED_COMBINE_ID,worldId:'FARM' as const,...bay};
      if(nav.accepts(pose)&&!this.gameplay.farm.cellAt(bay.x,bay.z)&&(!this.playerPosition||!hullsOverlap(nav.hull(pose),{...this.playerPosition,halfX:PLAYER_RADIUS+.15,halfZ:PLAYER_RADIUS+.15,yaw:0})))return pose;
    }
  }
  private buildPurchased(pose:VehiclePose){
    const model=this.assets.instance('combine_harvester');model.name=PURCHASED_COMBINE_ID;model.position.set(pose.x,farmHeight(pose.x,pose.z),pose.z);model.rotation.y=pose.yaw;model.scale.setScalar(.5);compactInstance(model);
    const navigation=this.purchasedNavigation(model),vehicle=new CombineVehicle(model,navigation,PURCHASED_COMBINE_ID);this.vehicleNavigations.set(vehicle.id,navigation);return vehicle;
  }
  private installPurchased(vehicle:CombineVehicle){
    this.models.add(vehicle.root);this.vehicles.push(vehicle);vehicle.bindGameplay(this.gameplay!);
    for(const navigation of this.vehicleNavigations.values())navigation.refreshCameraObstacles();
    if(this.trailer&&this.hitches){const transport=new FarmTransportSystem(this.gameplay!,vehicle,this.trailer,this.vehicles[0],()=>this.hitches!.isAttached('farm.trailer'));vehicle.setTransport({hint:()=>transport.combineHint,unload:()=>transport.unloadCombine()});}
    this.interaction.setVehicles(this.vehicles);
  }
  private prepareDelivery():MachineDeliveryPlan|undefined {
    const pose=this.deliveryPose();if(!pose)return;const vehicle=this.buildPurchased(pose);
    return {pose,apply:()=>this.installPurchased(vehicle),rollback:()=>{this.models.remove(vehicle.root);const index=this.vehicles.indexOf(vehicle);if(index>=0)this.vehicles.splice(index,1);this.vehicleNavigations.delete(vehicle.id);for(const navigation of this.vehicleNavigations.values())navigation.refreshCameraObstacles();}};
  }
  private vehicleObstacles(exclude:string){return this.restoringVehicles?[]:[...this.vehicles.filter(v=>v.id!==exclude).map(v=>v.collision),...(this.livestock?.collisions??[])];}
  enter({gameplay}:WorldEnterContext){
    this.effects.reset();this.farmSound=undefined;
    this.root.add(this.merchant);this.gameplay=gameplay;this.hitches?.setWork(new PlowingSystem(gameplay.farm),new SeedingSystem(gameplay.farm,gameplay.inventory));
    gameplay.livestock.synchronize();this.livestock?.update(gameplay,0);
    this.trailer?.bindCargo(gameplay,()=>this.hitches?.record(),()=>this.hitches?.isAttached('farm.trailer')?this.vehicles[0].speed:0);
    // Restore the whole fleet before using its dynamic colliders. An old default
    // parking position must not reject another vehicle's valid saved position.
    this.restoringVehicles=true;
    try{const purchased=gameplay.vehicles.get(PURCHASED_COMBINE_ID);if(purchased&&!this.vehicles.some(v=>v.id===purchased.id))this.installPurchased(this.buildPurchased(purchased));this.hitches?.bind(gameplay.vehicles);for(const vehicle of this.vehicles)if(vehicle instanceof CombineVehicle)vehicle.bindGameplay(gameplay);else vehicle.bind(gameplay.vehicles);}finally{this.restoringVehicles=false;}
    this.hitches?.restore();this.interaction.bind(gameplay);this.crops.refresh(gameplay,true);
    if(this.combine&&this.trailer&&this.hitches){this.transport=new FarmTransportSystem(gameplay,this.combine,this.trailer,this.vehicles[0],()=>this.hitches!.isAttached('farm.trailer'));this.combine.setTransport({hint:()=>this.transport!.combineHint,unload:()=>this.transport!.unloadCombine()});this.hitches.setTransport({hint:()=>this.transport!.trailerHint,unload:()=>this.transport!.unloadTrailer()});this.interaction.setTrailer(this.trailer);}
  }
  prepare(c:WorldUpdateContext){this.boat.update(c.time,c.storm);}
  update(c:WorldUpdateContext){
    if(c.season)this.seasons.update(c.season);
    this.playerPosition=c.player;this.ocean.update(c.time,c.storm);this.boat.update(c.time,c.storm);this.models.update(c.time,c.weather);this.warmLights.update(c.dayTime,c.delta);if(c.weather){this.terrain.applyWeather(c.weather);this.wetness.update(c.weather.wetness);}for(const tool of this.implements)tool.updateVisual(c.delta);for(const vehicle of this.vehicles)if(vehicle instanceof CombineVehicle)vehicle.updateVisual(c.delta);
    if(this.gameplay){
      this.crops.refresh(this.gameplay);this.crops.animate(c.time,c.weather);if(c.player)this.interaction.update(c.player);this.crops.focus(this.gameplay,c.player?this.interaction.activeCell:null);
      this.livestock?.update(this.gameplay,c.time);
      const machines=this.vehicles.map(vehicle=>{const work=vehicle instanceof CombineVehicle?vehicle.presentationWork:this.hitches?.presentationWork;return {id:vehicle.id,x:vehicle.pose.x,y:vehicle.root.position.y,z:vehicle.pose.z,yaw:vehicle.yaw,speed:vehicle.speed,occupied:vehicle.occupied,workKind:work?.kind,workEnabled:work?.enabled===true&&vehicle.occupied,operations:work?.operations??0};});
      const listener=c.listener??c.player,changes=this.crops.drainChanges();
      if(c.presentationPaused)this.effects.reset();else this.effects.update(c.delta,changes,machines,listener,this.gameplay.farm,c.weather?.wetness??c.storm);
      this.farmSound=listener?{machines,events:this.effects.drainSounds(),listener:{x:listener.x,y:listener.y,z:listener.z},paused:c.presentationPaused===true}:undefined;
    }
  }
  leave({gameTime}:WorldLeaveContext){this.effects.reset();this.farmSound=undefined;return {lastSimulatedGameTime:gameTime,discoveries:[]};}
  dispose(){this.disposed=true;this.assets.cancel();disposeWorld(this.root);}
  getSpawnPoint(id=FARM_ARRIVAL.id):SpawnPoint{return {id,position:[...FARM_ARRIVAL.position],lookAt:[...FARM_ARRIVAL.lookAt]};}
  applyQuality(quality:Quality){this.ocean.applyQuality(quality);this.crops.applyQuality(quality);this.effects.applyQuality(quality);this.livestock?.applyQuality(quality);this.terrain.applyQuality(quality);this.models.applyQuality(quality);this.warmLights.applyQuality(quality);}
  private resolveVertical(x:number,z:number,from:number,to:number){
    let result=to;
    const clip=(min:number,max:number)=>{if(to>from&&from+PLAYER_HEAD_OFFSET<=min&&to+PLAYER_HEAD_OFFSET>min)result=Math.min(result,min-PLAYER_HEAD_OFFSET);if(to<from&&from-PLAYER_FOOT_OFFSET>=max&&to-PLAYER_FOOT_OFFSET<max)result=Math.max(result,max+PLAYER_FOOT_OFFSET);};
    for(const s of FARM_SURFACES)if(x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ)clip(s.top-.12,s.top);
    for(const b of FARM_OBSTACLES)if(x>b.minX-PLAYER_RADIUS&&x<b.maxX+PLAYER_RADIUS&&z>b.minZ-PLAYER_RADIUS&&z<b.maxZ+PLAYER_RADIUS)clip(b.minY,b.maxY);
    return result;
  }
}
