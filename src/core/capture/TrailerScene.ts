import { Group,Sprite,Vector3 } from 'three';
import type { Object3D } from 'three';
import type { Game } from '../Game';
import type { FarmSnapshot } from '../../gameplay/farm/FarmState';
import type { CropRegistry,CropStageId } from '../../gameplay/farm/CropRegistry';
import { DAY_DURATION } from '../GameClock';
import { FarmWorld } from '../../worlds/farm/FarmWorld';
import { LivestockPresentation } from '../../worlds/farm/LivestockPresentation';
import type { AnimalBehavior } from '../../gameplay/livestock/LivestockDefinition';
import { CombineVehicle } from '../../systems/vehicles/CombineVehicle';
import type { DriveableVehicle } from '../../systems/vehicles/Vehicle';
import type { TrailerShot } from './TrailerShots';
import { VoxelBatch } from '../../utils/voxel';
import { NPCS } from '../../gameplay/npc/NpcRegistry';
import { FARM_PLACEMENTS } from '../../worlds/farm/FarmLayout';
import { FarmModels } from '../../worlds/farm/FarmModels';
import { FARM_FIELD_DEFINITIONS,farmAreaContains,fieldCellCenter } from '../../gameplay/farm/FarmDefinition';
import type { FarmArea } from '../../gameplay/farm/FarmDefinition';

/** Pure temporary scene payload; all thresholds and item IDs come from CropRegistry. */
export function captureFarm(source:FarmSnapshot,registry:CropRegistry,gameTime:number,stage:CropStageId='mature',clearLane?:FarmArea):FarmSnapshot {
  const state=structuredClone(source),crops=registry.list();
  state.starterSeedsClaimed=true;
  for(const [index,field] of state.fields.entries()){
    const crop=registry.get(field.id==='field-central'?'wheat':field.id==='field-west'?'corn':'potato')??crops[index%crops.length];if(!crop)continue;
    const definition=registry.getStage(crop.id,stage)!;
    const grid=FARM_FIELD_DEFINITIONS.find(f=>f.id===field.id);
    for(const cell of field.cells){const center=grid?fieldCellCenter(grid,cell.column,cell.row):null;if(clearLane&&center&&farmAreaContains(clearLane,center)){cell.crop=null;cell.landState='HARVESTED';continue;}cell.crop={cropId:crop.id,plantedAtGameTime:Math.max(0,gameTime-definition.startsAtGameMinute*DAY_DURATION/1440),currentStage:stage};cell.landState=stage==='mature'?'MATURE':stage==='seed'?'SEEDED':'GROWING';}
  }
  return state;
}
export class TrailerScene {
  actor?:DriveableVehicle;animalBehavior?:AnimalBehavior;
  private baseline?:{world:FarmWorld;fleet:ReturnType<Game['gameplay']['vehicles']['snapshot']>};
  private feet=new Vector3(.65,3.68,1.85);
  private boatFeet=new Vector3();
  private millRotor?:Object3D;
  constructor(private game:Game){}
  prepare(shot:TrailerShot){
    this.stop();const world=this.game.worldManager.currentWorld;if(!world)return;
    world.setTravelPresentation?.(shot.world==='HOME'&&!shot.bottle);
    if(shot.bottle&&!world.root.getObjectByName('CaptureTableExtension')){const floor=new Group(),b=new VoxelBatch();floor.name='CaptureTableExtension';for(let z=11.3;z<70;z+=.62)b.add(Math.round(z/.62)%2?'#61452f':'#634831',0,.045,z,36,.13,.6);b.add('#1d3037',0,32,-7.01,80,25,.2);b.build(floor);world.root.add(floor);}
    const floor=world.root.getObjectByName('CaptureTableExtension');if(floor)floor.visible=shot.bottle===true;
    this.cleanLabels();
    for(const npc of NPCS.list(world.id))this.moveNpc(npc.id,[...npc.position],npc.yaw);
    if(world instanceof FarmWorld){
      // A temporary copy brings the existing windmill into the portrait pastoral background.
      // The real map's merged geometry and collision layout remain untouched.
      let mill=world.root.getObjectByName('CapturePastoralMill');
      if(shot.id==='farm-life'&&!mill){const source=world.root.getObjectByName('BlenderFarmModels'),body=source instanceof FarmModels?source.cameraSources.getObjectByName('mill'):undefined,rotor=source?.children.find(o=>o.userData.part_id==='windmill_rotor'),placement=FARM_PLACEMENTS.find(p=>p.id==='mill');if(body&&rotor&&placement){mill=new Group();mill.name='CapturePastoralMill';mill.add(body.clone(true));this.millRotor=rotor.clone(true);mill.add(this.millRotor);mill.position.set(23-placement.x,0,-23-placement.z);world.root.add(mill);}}
      if(mill)mill.visible=shot.id==='farm-life';
      if(this.baseline?.world!==world)this.baseline={world,fleet:this.game.gameplay.vehicles.snapshot()};
      this.prepareCrops('mature',shot.subject==='tractor'?{kind:'bounds',minX:-2,maxX:6,minZ:-28,maxZ:-10}:undefined);const fleet=structuredClone(this.baseline.fleet);
      if(shot.subject==='tractor'||shot.subject==='combine'){
        const id=shot.subject==='tractor'?world.vehicles[0].id:world.combine!.id;
        fleet.vehicles=fleet.vehicles.filter(v=>v.id!==id);
        fleet.vehicles.push({id,worldId:'FARM',x:0,z:-12,yaw:Math.PI,headerState:'RAISED',workEnabled:false});
      }
      this.game.gameplay.vehicles.restore(fleet);
      world.enter({gameplay:this.game.gameplay,gameTime:this.game.clock.simulationTime,state:{lastSimulatedGameTime:0,discoveries:[]},spawn:world.getSpawnPoint()});
      for(const vehicle of world.vehicles){vehicle.stop();vehicle.root.traverse(o=>{if(o.name.endsWith('_Roll'))o.rotation.set(0,0,0);});}
      this.actor=shot.subject==='tractor'?world.vehicles[0]:shot.subject==='combine'?world.combine:undefined;
      if(this.actor instanceof CombineVehicle){this.actor.occupy(true);this.actor.toggleHeader();this.actor.toggleMachine();}
      else this.actor?.occupy(true);
    }
    this.setAnimalBehavior(shot.id==='farm-life'?'WALKING':undefined);this.game.character.visible=false;
  }
  prepareCrops(stage:CropStageId='mature',clearLane?:FarmArea){
    this.game.gameplay.farm.restore(captureFarm(this.game.gameplay.farm.snapshot(),this.game.gameplay.crops.registry,this.game.clock.simulationTime,stage,clearLane));
  }
  cleanLabels(){this.game.worldManager.currentWorld?.root.traverse(o=>{if(o instanceof Sprite&&o.name.startsWith('NPCLabel_'))o.visible=false;});}
  setAnimalBehavior(behavior?:AnimalBehavior){this.animalBehavior=behavior;const visual=this.game.worldManager.currentWorld?.root.getObjectByName('LivestockPresentation');if(visual instanceof LivestockPresentation)visual.captureBehavior=behavior;}
  moveNpc(id:string,position:[number,number,number],yaw:number){const model=this.game.worldManager.currentWorld?.root.getObjectByName(`NPC_${id}`);if(!model)return false;model.position.fromArray(position);model.rotation.y=yaw;return true;}
  moveVehicle(id:string,x:number,z:number,yaw:number){const world=this.game.worldManager.currentWorld;if(!(world instanceof FarmWorld)||![x,z,yaw].every(Number.isFinite))return false;const vehicle=world.vehicles.find(v=>v.id===id);if(!vehicle)return false;vehicle.stop();this.game.gameplay.vehicles.record({...vehicle.snapshot(),x,z,yaw});if(vehicle instanceof CombineVehicle)vehicle.bindGameplay(this.game.gameplay);else vehicle.bind(this.game.gameplay.vehicles);return Math.hypot(vehicle.pose.x-x,vehicle.pose.z-z)<.001;}
  update(delta:number,playing:boolean){
    if(this.millRotor&&delta>0)this.millRotor.rotation.z=this.game.weather.frame.windPhase*.35;
    if(!this.actor||!playing||delta<=0)return;
    this.actor.advance(delta,{throttle:this.actor.speed<.64?1:0,steer:0,brake:false});
  }
  showPlayer(shot:TrailerShot|undefined,hidden:boolean,time:number,delta:number){
    if(hidden){this.game.character.visible=false;return;}
    if(this.actor){this.game.character.update({delta,time,visible:true,firstPerson:false,eye:this.game.camera.position,orientation:this.game.camera.quaternion,vehicle:this.actor});return;}
    if(shot?.subject==='sea'){this.game.character.showAt(this.feet,0,'IDLE');this.game.character.setPose('IDLE',0,time);return;}
    const world=this.game.worldManager.currentWorld;if(world?.id==='TRAVEL'&&world.boat){const boat=world.boat;this.boatFeet.copy(boat.position);this.boatFeet.y+=.2;this.boatFeet.z+=.2;this.game.character.showAt(this.boatFeet,boat.yaw,'SEATED');this.game.character.setPose('SEATED',0,time);return;}
    const spawn=this.game.worldManager.currentWorld?.getSpawnPoint();if(spawn){const feet=new Vector3().fromArray(spawn.position);feet.y-=.44;this.game.character.showAt(feet,Math.PI,'IDLE');this.game.character.setPose('IDLE',0,time);}
  }
  stop(){this.actor?.stop();this.actor?.occupy(false);this.actor=undefined;}
}
