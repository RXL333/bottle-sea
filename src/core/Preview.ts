import type { Game } from './Game';
import { DAY_DURATION } from './GameClock';
// Development-only reproducible visual checkpoints; no extra controls in the game HUD.
export function configurePreview(game:Game){
  const params=new URLSearchParams(location.search),hour=Number(params.get('hour'));
  if(params.has('hour')&&Number.isFinite(hour)&&hour>=0&&hour<24)game.clock.simulationTime=DAY_DURATION*(7+hour/24);
  if(params.get('weather')==='storm'){game.weather.storm=true;game.weather.intensity=1;game.hud.setActive('storm',true);}
  if(params.get('view')==='underwater'||params.get('view')==='dock'){
    game.overview.enabled=false;game.explorer.enter(false);game.hud.setExplore(true);
    if(params.get('view')==='underwater'){game.camera.position.set(-3.4,2.35,1.28);game.camera.lookAt(-.6,2.4,.4);}
  }
}

