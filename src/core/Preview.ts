import type { Game } from './Game';
import { DAY_DURATION } from './GameClock';
// Development-only reproducible visual checkpoints; no extra controls in the game HUD.
export function configurePreview(game:Game){
  const params=new URLSearchParams(location.search),hour=Number(params.get('hour'));
  if(params.has('hour')&&Number.isFinite(hour)&&hour>=0&&hour<24)game.clock.simulationTime=DAY_DURATION*(7+hour/24);
  if(params.get('weather')==='storm'){game.weather.storm=true;game.weather.intensity=1;game.hud.setActive('storm',true);}
  if(game.worldManager.currentWorldId==='HOME'&&params.get('view')==='home-fishing'){
    game.overview.suspend();game.explorer.enter(false,game.worldManager.currentWorld!.getSpawnPoint('home_fishing'));game.hud.setExplore(true);
  }
  if(game.worldManager.currentWorldId==='HOME'&&params.get('view')==='home-cottage'){
    game.overview.enabled=false;game.explorer.enter(false);game.hud.setExplore(true);
    game.camera.position.set(-1.564,4.446,.72);game.camera.lookAt(-1.6,4.30,-.4);game.explorer.syncLook();
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
    const views:Record<string,{position:[number,number,number];target:[number,number,number]}>={
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
    if(checkpoint){game.camera.position.fromArray(checkpoint.position);game.camera.lookAt(...checkpoint.target);game.explorer.syncLook();if(view==='farm-overview'){game.explorer.suspend();game.camera.fov=48;game.camera.far=230;game.camera.updateProjectionMatrix();}}
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

