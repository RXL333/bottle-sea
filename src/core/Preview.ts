import { configureNpcPreview } from './NpcPreview';
import { configureShadowPreview } from './ShadowPreview';
import { configureSeasonPreview } from './SeasonPreview';
import { configureFarmTreePreview } from './FarmTreePreview';
import type { Game } from './Game';
import { DAY_DURATION } from './GameClock';
import type { FarmWorld } from '../worlds/farm/FarmWorld';
import { getImplement } from '../gameplay/vehicles/ImplementRegistry';
import { LIVESTOCK_PENS } from '../gameplay/livestock/LivestockDefinition';
import { HOME_TRADE_POINT,FARM_TRADE_POINT } from '../worlds/trade/MerchantShip';
import { HOME_MERCHANT_BERTH } from '../worlds/trade/MerchantRoute';
import { PURCHASED_COMBINE_ID } from '../gameplay/vehicles/VehicleIds';
import { Vector3 } from 'three';
import { isWeatherKind,WEATHER_KINDS,WEATHER_LABELS,WEATHER_PROFILES } from '../systems/WeatherState';
import { COTTAGE } from '../worlds/farm/FarmLayout';
// Development-only reproducible visual checkpoints; no extra controls in the game HUD.
export function configurePreview(game:Game){
  const params=new URLSearchParams(location.search),hour=Number(params.get('hour'));
  if(params.has('hour')&&Number.isFinite(hour)&&hour>=0&&hour<24)game.clock.simulationTime=DAY_DURATION*(Math.floor(game.clock.simulationTime/DAY_DURATION)+hour/24);
  const previewDay=Number(params.get('day'));if(params.has('day')&&Number.isSafeInteger(previewDay)&&previewDay>=1&&previewDay<=100000)game.clock.simulationTime=DAY_DURATION*(previewDay-1+game.clock.normalizedDayTime);
  const weather=params.get('weather')?.toUpperCase();if(isWeatherKind(weather))game.weather.restore({kind:weather,...WEATHER_PROFILES[weather],wetness:WEATHER_PROFILES[weather].rain,windPhase:game.clock.elapsed*.6},false,0,game.gameplay.calendar.date.dayIndex);
  configureNpcPreview(game,params);
  configureSeasonPreview(game,params);
  configureFarmTreePreview(game,params);
  configureShadowPreview(game,params);
  if(params.get('view')==='farm-weather'){
    game.overview.suspend();game.explorer.enter(false);game.hud.setExplore(true);game.camera.position.set(-7.3,4.44,-8);game.camera.lookAt(0,5,-25);game.explorer.syncLook();
    const controls=document.createElement('details');controls.style.cssText='position:fixed;top:112px;left:18px;z-index:20;background:#142621d9;color:#ffe4a3;padding:10px;max-width:480px';const title=document.createElement('summary');title.textContent='开发验证 · 天气与昼夜';controls.append(title);
    const button=(label:string,action:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.style.margin='5px';b.addEventListener('click',()=>{action();controls.open=false;game.renderer.domElement.focus();});controls.append(b);};
    for(const kind of WEATHER_KINDS)button(WEATHER_LABELS[kind],()=>{game.weather.setWeather(kind);game.clock.paused=false;});
    for(const [hour,label] of [[6,'清晨'],[12,'正午'],[18,'黄昏'],[23,'夜晚']] as const)button(label,()=>game.clock.simulationTime=DAY_DURATION*(Math.floor(game.clock.simulationTime/DAY_DURATION)+hour/24));
    button('定格天气与时间',()=>{const kind=game.weather.kind;Object.assign(game.weather.frame,WEATHER_PROFILES[kind]);game.clock.paused=true;game.dayNight.update(game.clock.normalizedDayTime,game.clock.elapsed,game.weather.intensity,0,game.weather.frame,game.camera.position,60);});
    const move=(x:number,y:number,z:number,lookZ:number)=>{game.overview.suspend();game.explorer.enter(false);game.hud.setExplore(true);game.camera.position.set(x,y,z);game.camera.lookAt(x,y,lookZ);game.explorer.syncLook();};
    button('小屋屋顶下',()=>move(COTTAGE.x,COTTAGE.floor+.44,COTTAGE.z,COTTAGE.z-3));
    button('走到屋外',()=>move(COTTAGE.x,4.44,COTTAGE.z-4,COTTAGE.z));
    button('农场码头 · 真实旅行',()=>{const spawn=game.worldManager.currentWorld!.getSpawnPoint();move(...spawn.position,spawn.lookAt[2]);});
    document.body.append(controls);
  }
  if(params.get('view')==='home-trade'||params.get('view')==='farm-trade'){
    const farm=game.worldManager.currentWorldId==='FARM',point=farm?FARM_TRADE_POINT:HOME_TRADE_POINT;game.overview.suspend();game.explorer.enter(false);game.hud.setExplore(true);game.camera.position.set(point.x,point.y,point.z);game.camera.lookAt(farm?point.x-2:HOME_MERCHANT_BERTH.x,point.y-.4,farm?point.z:HOME_MERCHANT_BERTH.z);game.explorer.syncLook();
    if(params.get('fixture')==='1'&&game.gameplay.economy.nextRequest===1&&!game.gameplay.inventory.count('crop.corn')){game.gameplay.inventory.add('crop.corn',200);game.gameplay.inventory.add('fish.tuna',10);game.gameplay.inventory.add('food.grilled_fish',3);game.gameplay.inventory.add('livestock.milk',4);}
    const controls=document.createElement('details');controls.style.cssText='position:fixed;top:140px;left:18px;z-index:20;background:#142621e6;color:#ffe4a3;padding:10px';const title=document.createElement('summary');title.textContent='开发验证 · 商船';controls.append(title);
    const button=(label:string,action:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.addEventListener('click',()=>{action();controls.open=false;game.renderer.domElement.focus();});controls.append(b);};
    if(!farm)for(const hour of [7,8,19,20,21])button(`商船时段 ${hour}:00`,()=>game.clock.simulationTime=DAY_DURATION*(Math.floor(game.clock.simulationTime/DAY_DURATION)+hour/24));
    button('查看增购收割机',()=>{const vehicle=game.worldManager.currentWorld?.vehicles?.find(v=>v.id===PURCHASED_COMBINE_ID);if(!vehicle)return;game.camera.position.copy(vehicle.entryPosition());game.camera.position.y=vehicle.root.position.y+.44;game.camera.lookAt(vehicle.seatPosition());game.explorer.syncLook();});
    if(params.get('fixture')==='1'){
      button('填满交易测试背包',()=>{const bag=game.gameplay.inventory;for(let n=0;n<bag.capacity;n++){const s=bag.getSlot(n);if(s)bag.add(s.itemId,game.gameplay.items.get(s.itemId)!.maxStack-s.quantity);}bag.add('wood',bag.emptySlots*99);});
      button('腾出交易测试槽位',()=>{const bag=game.gameplay.inventory;for(let n=bag.capacity-1;n>=0;n--){const s=bag.getSlot(n);if(s?.itemId==='wood'){bag.removeFromSlot(n,s.quantity);break;}}});
    }
    document.body.append(controls);
  }
  if(game.worldManager.currentWorldId==='HOME'&&params.get('view')==='home-fishing'){
    game.overview.suspend();game.explorer.enter(false,game.worldManager.currentWorld!.getSpawnPoint('home_fishing'));game.hud.setExplore(true);
  }
  if(game.worldManager.currentWorldId==='HOME'&&params.get('view')==='home-cottage'){
    game.overview.enabled=false;game.explorer.enter(false);game.hud.setExplore(true);
    game.camera.position.set(-1.564,4.446,.72);game.camera.lookAt(-1.6,4.30,-.4);game.explorer.syncLook();
  }
  if(game.worldManager.currentWorldId==='HOME'&&params.get('view')==='home-cottage-right'){
    game.overview.suspend();game.explorer.enter(false);game.hud.setExplore(true);game.camera.position.set(-.38,4.36,1.60);game.camera.lookAt(-.38,4.36,.5);game.explorer.syncLook();
    const button=document.createElement('button');button.textContent='开发验证 · 右侧通道前进 2 秒';button.style.cssText='position:fixed;top:140px;left:18px;z-index:20';
    button.addEventListener('click',()=>{const canvas=game.renderer.domElement;canvas.focus();canvas.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',key:'w',bubbles:true}));window.setTimeout(()=>canvas.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',key:'w',bubbles:true})),2000);});document.body.append(button);
  }
  if(game.worldManager.currentWorldId==='HOME'&&params.get('view')==='home-island'){
    game.overview.suspend();game.explorer.suspend();game.overview.target.set(-.7,4.25,0);game.overview.minDistance=2;game.camera.position.set(4,7.2,8);game.camera.lookAt(-.7,4.25,0);game.camera.fov=35;game.camera.updateProjectionMatrix();
  }
  if(game.worldManager.currentWorldId==='COTTAGE'){
    const checkpoints:Record<string,string>={'cottage-bed':'cottage_bed','cottage-chest':'cottage_chest','cottage-stove':'cottage_stove','cottage-door':'cottage_door','cottage-exit':'cottage_exit'};
    const id=checkpoints[params.get('view')??''];
    if(id){const spawn=game.worldManager.currentWorld!.getSpawnPoint(id);game.camera.position.fromArray(spawn.position);game.camera.lookAt(...spawn.lookAt);game.explorer.syncLook();}
  }
  if(game.worldManager.currentWorldId==='FARM'){
    const world=game.worldManager.currentWorld as FarmWorld;
    if(params.get('view')==='farm-character'){
      game.overview.suspend();game.explorer.suspend();game.hud.setExplore(false);game.characterPreview={feet:new Vector3(0,4,3),yaw:0,pose:'IDLE'};game.camera.position.set(.68,4.50,4.17);game.camera.lookAt(0,4.28,3);game.camera.fov=40;game.camera.updateProjectionMatrix();
      const controls=document.createElement('details');controls.open=true;controls.style.cssText='position:fixed;top:140px;left:18px;z-index:20;background:#142621e6;color:#ffe4a3;padding:10px';const title=document.createElement('summary');title.textContent='开发验证 · 主角';controls.append(title);
      const button=(label:string,action:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.addEventListener('click',()=>{action();game.renderer.domElement.focus();});controls.append(b);};
      for(const [pose,label] of [['IDLE','站姿'],['WALK','行走'],['RUN','跑步'],['SEATED','坐姿']] as const)button(label,()=>{if(game.characterPreview)game.characterPreview.pose=pose;});
      button('查看背包与背面',()=>{if(game.characterPreview)game.characterPreview.yaw=Math.PI;});
      for(const vehicle of world.vehicles)button(`靠近${vehicle.name}`,()=>{game.characterPreview=undefined;game.explorer.enter(false);game.hud.setExplore(true);game.camera.position.copy(vehicle.entryPosition());game.camera.position.y=vehicle.root.position.y+.44;game.camera.lookAt(vehicle.seatPosition());game.explorer.syncLook();controls.open=false;});
      document.body.append(controls);
    }
    if(params.get('view')==='farm-character-body'){game.overview.suspend();game.explorer.enter(false);game.hud.setExplore(true);game.camera.position.set(0,4.44,3);game.camera.lookAt(.001,3.9,3.08);game.explorer.syncLook();}
    if(params.get('view')?.startsWith('farm-livestock')){
      if(params.get('fixture')==='1'&&!game.gameplay.inventory.count('crop.wheat'))game.gameplay.inventory.add('crop.wheat',30);
      const atFeed=(kind:string)=>{const p=LIVESTOCK_PENS.find(p=>p.id===kind)!;const side=kind==='chicken'?1:-1;game.camera.position.set(p.feeder.x,4.44,p.feeder.z+side*(side===1?.85:.65));game.camera.lookAt(p.feeder.x,4.1,p.feeder.z-side*3);game.explorer.syncLook();};
      const atAnimal=(id:string)=>{const animal=game.gameplay.livestock.getAnimal(id);if(!animal)return;game.camera.position.set(animal.x+.85,4.44,animal.z);game.camera.lookAt(animal.x,4.3,animal.z);game.explorer.syncLook();};
      if(params.get('view')==='farm-livestock-feed')atFeed('chicken');
      if(params.get('view')==='farm-livestock-collect')atAnimal(params.get('animal')??'chicken-0');
      const controls=document.createElement('details');controls.style.cssText='position:fixed;top:140px;left:18px;z-index:20;background:#142621e6;color:#ffe4a3;padding:10px;border:1px solid #d9bf79';const summary=document.createElement('summary');summary.textContent='开发验证 · 牧场时间';controls.append(summary);
      const button=(label:string,action:()=>void)=>{const el=document.createElement('button');el.textContent=label;el.style.margin='6px';el.addEventListener('click',()=>{action();controls.open=false;game.renderer.domElement.focus();});controls.append(el);};
      button('推进 1 天',()=>game.gameplay.time.advanceMinutes(1440));button('推进 2 天',()=>game.gameplay.time.advanceMinutes(2880));button('夜晚 23 点',()=>game.gameplay.time.advanceToNextDay(23));button('清晨 8 点',()=>game.gameplay.time.advanceToNextDay(8));button('暂停 / 恢复时间',()=>{game.clock.paused=!game.clock.paused;});
      for(const p of LIVESTOCK_PENS){button(`查看${p.name}饲槽`,()=>atFeed(p.id));button(`靠近${p.name}动物 1`,()=>atAnimal(`${p.id}-0`));}
      if(params.get('fixture')==='1'){
        button('填满测试背包',()=>{const bag=game.gameplay.inventory;for(let n=0;n<bag.capacity;n++){const stack=bag.getSlot(n);if(stack)bag.add(stack.itemId,game.gameplay.items.get(stack.itemId)!.maxStack-stack.quantity);}bag.add('wood',bag.emptySlots*game.gameplay.items.get('wood')!.maxStack);});
        button('腾出一个测试槽位',()=>{const bag=game.gameplay.inventory;for(let n=bag.capacity-1;n>=0;n--){const stack=bag.getSlot(n);if(stack?.itemId==='wood'){bag.removeFromSlot(n,stack.quantity);break;}}});
      }
      document.body.append(controls);
    }
    if(['farm-presentation','farm-weather'].includes(params.get('view')??'')&&params.get('fixture')==='1'){
      const now=game.clock.simulationTime,dense=params.get('dense')==='1',crops=game.gameplay.crops.registry.list();
      // Explicit disposable visual fixture: normal APIs retain inventory and growth rules.
      for(const [fieldIndex,field] of game.gameplay.farm.definitions.entries())for(let row=0;row<field.grid.rows;row++)for(let column=0;column<field.grid.columns;column++){
        if(!dense&&(fieldIndex!==1||row<14))continue;
        const ref={fieldId:field.id,row,column};if(game.gameplay.farm.getCell(ref)?.landState!=='UNTILLED')continue;
        if(row===17&&column===0)continue;
        game.gameplay.farm.till([ref]);if(row===17&&column===1)continue;
        const crop=crops[dense?fieldIndex:Math.min(2,Math.max(0,row-14))],stage=row===17&&column===2?3:column%4;
        game.clock.simulationTime=now-crop.stages[stage].startsAtGameMinute*DAY_DURATION/1440;
        game.gameplay.inventory.add(crop.seedItemId,1);game.gameplay.farm.seed([ref],crop.id);game.clock.simulationTime=now;
        if(row===17&&column===2)game.gameplay.farm.harvest([ref]);
      }
      game.clock.simulationTime=now;game.clock.paused=true;game.gameplay.requestSave(true);
    }
    const transportView=params.get('view')?.startsWith('farm-transport');
    if(transportView&&world.combine&&world.trailer){
      const trailer=world.trailer,tractor=world.vehicles[0],combine=world.combine,barn=params.get('view')==='farm-transport-barn';
      if(params.get('fixture')==='1'){
        const pose={x:barn?20:2.1,z:barn?-2.8:-9.59,yaw:0},front=trailer.frontPosition(pose),offset=tractor.hitchPosition('Hitch_Back',{x:0,z:0,yaw:0});
        game.gameplay.vehicles.record({...combine.snapshot(),x:0,z:-9,yaw:0,workEnabled:false});
        game.gameplay.vehicles.commitFleet({...tractor.snapshot(),x:front.x-offset.x,z:front.z-offset.z,yaw:0},world.implements.map(i=>i===trailer?{...i.snapshot(),...pose}:i.snapshot()),[{vehicleId:tractor.id,implementId:trailer.id,port:'Hitch_Back'}]);
        world.enter({gameplay:game.gameplay,gameTime:game.clock.simulationTime,state:{lastSimulatedGameTime:0,discoveries:[]},spawn:world.getSpawnPoint()});
        // Explicit throwaway-origin fixture only; production never grants cargo.
        if(params.get('fill')==='1'&&!trailer.cargo.usedQuantity&&!combine.grainTank.used){trailer.cargo.add('crop.corn',100);combine.grainTank.exchange([],[{itemId:'crop.wheat',quantity:60}]);game.gameplay.inventory.add('wood',10);}
        game.gameplay.requestSave(true);
      }
      const driver=barn||params.get('driver')==='tractor'?tractor:combine;
      const entry=params.get('onfoot')==='1'?trailer.loadingPoint().addScaledVector({x:Math.cos(trailer.pose.yaw),y:0,z:-Math.sin(trailer.pose.yaw)},1):driver.entryPosition();
      game.camera.position.copy(entry);game.camera.position.y=driver.root.position.y+.44;game.camera.lookAt(params.get('onfoot')==='1'?trailer.loadingPoint():driver.seatPosition());game.explorer.syncLook();
    }
    const combineView=params.get('view')?.startsWith('farm-combine');
    if(combineView&&world.combine){
      const combine=world.combine;
      if(params.get('fixture')==='1'){
        const unloading=params.get('view')==='farm-combine-unload';
        game.gameplay.vehicles.record({...combine.snapshot(),x:unloading?20:0,z:unloading?-2.8:-9,yaw:unloading?0:Math.PI});combine.bindGameplay(game.gameplay);
        if(!unloading){
          const now=game.clock.simulationTime;
          // An explicit isolated fixture consumes registered seed items normally.
          // Existing planted/harvested cells are preserved when a fixture is revisited.
          for(let row=0;row<18;row++)for(const column of [5,6]){
            const ref={fieldId:'field-central',column,row};if(game.gameplay.farm.getCell(ref)?.landState!=='UNTILLED')continue;
            const id=row===0?(column===5?'potato':'wheat'):row<8?'corn':'wheat',crop=game.gameplay.crops.registry.get(id)!;
            game.clock.simulationTime=now-(row===0&&column===6?0:crop.growthGameMinutes*DAY_DURATION/1440);
            game.gameplay.farm.till([ref]);game.gameplay.inventory.add(crop.seedItemId,1);game.gameplay.farm.seed([ref],id);
          }
          game.clock.simulationTime=now;
        }
        game.gameplay.requestSave(true);
      }
      game.camera.position.copy(combine.entryPosition());game.camera.position.y=combine.root.position.y+.44;game.camera.lookAt(combine.seatPosition());game.explorer.syncLook();
    }
    const plowing=params.get('view')==='farm-plowing';
    const seeding=params.get('view')==='farm-seeding',working=plowing||seeding;
    const tool=getImplement(seeding?'farm.seeder':plowing?'farm.plow':`farm.${params.get('view')?.replace('farm-hitch-','')}`);
    if(tool&&(working||params.get('view')?.startsWith('farm-hitch-'))){
      const tractor=world.vehicles[0],implement=world.implements.find(i=>i.id===tool.id)!;
      // Explicit isolated DEV fixture, never reset a saved fleet implicitly.
      if(params.get('fixture')==='1'){
        const yaw=working?Math.PI:implement.pose.yaw,front=implement.frontPosition(),offset=tractor.hitchPosition('Hitch_Back',{x:0,z:0,yaw});
        const parent=working?{x:0,z:-9,yaw}:{x:front.x+Math.sin(yaw)*.3-offset.x,z:front.z+Math.cos(yaw)*.3-offset.z,yaw};
        const joint=tractor.hitchPosition('Hitch_Back',parent),f=implement.frontLocal;
        const attached={x:joint.x-Math.cos(yaw)*f.x-Math.sin(yaw)*f.z,z:joint.z+Math.sin(yaw)*f.x-Math.cos(yaw)*f.z,yaw,workState:'RAISED' as const};
        game.gameplay.vehicles.commitFleet({id:tractor.id,worldId:'FARM',...parent},world.implements.map(i=>working&&i.id===tool.id?{...i.snapshot(),...attached}:i.snapshot()),working?[{vehicleId:tractor.id,implementId:tool.id,port:'Hitch_Back'}]:[]);
        world.hitches!.bind(game.gameplay.vehicles);tractor.bind(game.gameplay.vehicles);world.hitches!.restore();
        if(seeding){
          game.gameplay.farm.till(game.gameplay.farm.cellsInArea({kind:'bounds',minX:-6,maxX:6,minZ:-28,maxZ:-10},['UNTILLED','HARVESTED']));
          if(!game.gameplay.farm.starterSeedsClaimed)game.gameplay.farm.claimStarterSeeds();
        }
        if(plowing&&params.get('protect')==='1'){
          const ref={fieldId:'field-central',column:5,row:9},crop=game.gameplay.crops.registry.get('wheat')!;
          if(!game.gameplay.farm.getCell(ref)?.crop){
            const now=game.clock.simulationTime,minutes=crop.stages[2].startsAtGameMinute;game.clock.simulationTime=now-minutes*DAY_DURATION/1440;
            game.gameplay.farm.till([ref]);game.gameplay.inventory.add(crop.seedItemId,1);game.gameplay.farm.seed([ref],crop.id);game.clock.advanceGameMinutes(minutes);
          }
        }
      }
      const entry=params.get('onfoot')==='1'?implement.frontPosition().addScaledVector({x:Math.cos(implement.pose.yaw),y:0,z:-Math.sin(implement.pose.yaw)},.9):tractor.entryPosition();game.camera.position.copy(entry);game.camera.position.y=tractor.root.position.y+.44;game.camera.lookAt(params.get('onfoot')==='1'?implement.frontPosition():tractor.seatPosition());game.explorer.syncLook();
    }
    if(transportView||combineView||(tool&&(working||params.get('view')?.startsWith('farm-hitch-')))){
      const controls=document.createElement('details');controls.style.cssText='position:fixed;top:140px;left:18px;z-index:20;background:#142621e6;color:#ffe4a3;padding:10px;border:1px solid #d9bf79';
      const summary=document.createElement('summary');summary.textContent='开发验证 · 驾驶输入';controls.append(summary);
      const canvas=game.renderer.domElement,held=new Set<string>();let stopTimer=0;
      const key=(code:string,down:boolean)=>canvas.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,key:code==='Space'?' ':code.replace('Key','').toLowerCase(),bubbles:true}));
      const drive=(codes:readonly string[])=>{window.clearTimeout(stopTimer);canvas.focus();for(const code of held)key(code,false);held.clear();for(const code of codes){key(code,true);held.add(code);}controls.open=false;};
      if(params.get('fixture')==='1')for(const [label,dx] of [['鼠标向左 80px',-80],['鼠标向右 80px',80]] as const){
        const button=document.createElement('button');button.textContent=label;button.addEventListener('click',()=>{
          controls.open=false;canvas.focus();
          // Explicit synthetic displacement exercises the real unlocked handler.
          canvas.dispatchEvent(new PointerEvent('pointermove',{clientX:400,clientY:300,pointerId:2}));
          canvas.dispatchEvent(new PointerEvent('pointermove',{clientX:400+dx,clientY:300,pointerId:2}));
        });controls.append(button);
      }
      for(const [label,codes] of [['持续前进',['KeyW']],['持续前进左转',['KeyW','KeyA']],['持续倒车',['KeyS']],['持续倒车右转',['KeyS','KeyD']],['停车',['Space']]] as const){
        const button=document.createElement('button');button.textContent=label;button.style.margin='6px';button.addEventListener('click',()=>drive(codes));controls.append(button);
      }
      for(const [label,codes,seconds] of [['前进 3 秒',['KeyW'],3],['前进 6 秒',['KeyW'],6],['倒车 6 秒',['KeyS'],6],['左转 2 秒',['KeyW','KeyA'],2]] as const){
        const button=document.createElement('button');button.textContent=label;button.style.margin='6px';button.addEventListener('click',()=>{drive(codes);stopTimer=window.setTimeout(()=>drive(['Space']),seconds*1000);});controls.append(button);
      }
      document.body.append(controls);
    }
    const views:Record<string,{position:[number,number,number];target:[number,number,number]}>={
      'farm-presentation':params.get('dense')==='1'?{position:[36,32,4],target:[0,4.3,-20]}:{position:[8,12,-3],target:[0,4.3,-12.5]},
      'farm-hand':{position:[-5.5,4.464,-10.5],target:[-5.5,4.25,-13]},
      'farm-overview':{position:[48,65,43],target:[0,4.1,-26]},
      'farm-yard':{position:[-21,4.464,-1],target:[-25,5.2,4]},
      'farm-cottage':{position:[5.12,4.72,2.15],target:[5.12,4.75,4.5]},
      'farm-fields':{position:[-11,4.464,-16],target:[0,4.472,-19]},
      'farm-pasture':{position:[11,4.464,-55],target:[19,4.7,-55]},
      'farm-livestock':{position:[18,4.44,-40.5],target:[22,4.7,-46]},
      'farm-expansion':{position:[-11,4.464,-48],target:[-22,4.5,-50]},
      'farm-fishing':{position:[-8,4.44,9.2],target:[-8,4.5,10.5]},
    };
    const view=params.get('view')??'',checkpoint=views[view];
    if(checkpoint){game.camera.position.fromArray(checkpoint.position);game.camera.lookAt(...checkpoint.target);game.explorer.syncLook();if(view==='farm-overview'||view==='farm-presentation'){game.explorer.suspend();game.camera.fov=48;game.camera.far=230;game.camera.updateProjectionMatrix();}}
  }
  if(['underwater','under-island','dock','water-entry','chest','lighthouse','ruins'].includes(params.get('view')??'')){
    game.overview.enabled=false;game.explorer.enter(false);game.hud.setExplore(true);
    if(params.get('view')==='lighthouse'){game.camera.position.set(.35,4.49,.35);game.camera.lookAt(.35,5.1,-.28);}
    if(params.get('view')==='underwater'){game.camera.position.set(-3.4,2.35,1.28);game.camera.lookAt(-.6,2.4,.4);}
    if(params.get('view')==='under-island'){game.camera.position.set(-3.15,2.1,0);game.camera.lookAt(1.2,2.1,0);}
    if(params.get('view')==='water-entry'){game.camera.position.set(2,4.5,1);game.camera.lookAt(-.85,3.4,0);}
    if(params.get('view')==='chest'){game.camera.position.set(-1.8,2.12,1.9);game.camera.lookAt(-1.8,2.12,1.1);}
    if(params.get('view')==='ruins'){game.camera.position.set(3.1,2.2,1.1);game.camera.lookAt(3.1,2,.45);}
    game.explorer.syncLook();
  }
}

