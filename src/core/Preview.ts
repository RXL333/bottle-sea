import type { Game } from './Game';
import { DAY_DURATION } from './GameClock';
// Development-only reproducible visual checkpoints; no extra controls in the game HUD.
export function configurePreview(game:Game){
  const params=new URLSearchParams(location.search),hour=Number(params.get('hour'));
  if(params.has('hour')&&Number.isFinite(hour)&&hour>=0&&hour<24)game.clock.simulationTime=DAY_DURATION*(7+hour/24);
  if(params.get('weather')==='storm'){game.weather.storm=true;game.weather.intensity=1;game.hud.setActive('storm',true);}
  if(game.worldManager.currentWorldId==='HOME'&&params.get('view')==='home-cottage'){
    game.overview.enabled=false;game.explorer.enter(false);game.hud.setExplore(true);
    game.camera.position.set(-1.564,4.446,.72);game.camera.lookAt(-1.6,4.30,-.4);game.explorer.syncLook();
  }
  if(game.worldManager.currentWorldId==='HOME'&&params.get('view')==='home-island'){
    game.overview.suspend();game.explorer.suspend();game.overview.target.set(-.7,4.25,0);game.overview.minDistance=2;game.camera.position.set(4,7.2,8);game.camera.lookAt(-.7,4.25,0);game.camera.fov=35;game.camera.updateProjectionMatrix();
  }
  if(game.worldManager.currentWorldId==='FARM'){
    const views:Record<string,{position:[number,number,number];target:[number,number,number]}>={
      'farm-overview':{position:[21,24,30],target:[0,4.1,0]},
      'farm-yard':{position:[-3,4.44,-3.8],target:[2,5,-6.6]},
      'farm-cottage':{position:[-8.0825,4.642,-5.13],target:[-7.85,4.65,-6.9]},
      'farm-pasture':{position:[4.5,4.44,1.0],target:[8,4.5,1.8]},
      'farm-fishing':{position:[-8,4.44,9.2],target:[-8,4.5,10.5]},
    };
    const view=params.get('view')??'',checkpoint=views[view];
    if(checkpoint){game.camera.position.fromArray(checkpoint.position);game.camera.lookAt(...checkpoint.target);game.explorer.syncLook();if(view==='farm-overview'){game.explorer.suspend();game.camera.fov=43;game.camera.updateProjectionMatrix();}}
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

