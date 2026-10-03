import type { Game } from './Game';
import { DAY_DURATION } from './GameClock';
import { FARM_TREE_PLACEMENTS,FARM_TREES } from '../worlds/farm/FarmTrees';
import { farmHeight } from '../worlds/farm/FarmTerrain';
import { SEASONS } from '../gameplay/calendar/SeasonRegistry';

/** DEV-only inspection of actual map placements; never duplicates trees or writes a fixture. */
export function configureFarmTreePreview(game:Game,params:URLSearchParams){
  if(game.worldManager.currentWorldId!=='FARM'||params.get('view')!=='farm-trees')return;
  game.clock.paused=true;
  const inspect=(id:string)=>{const p=FARM_TREE_PLACEMENTS.find(p=>p.asset===id)!;game.overview.suspend();game.explorer.suspend();game.hud.setExplore(false);game.camera.position.set(p.x+3.5,farmHeight(p.x,p.z)+2,p.z-4);game.camera.lookAt(p.x,farmHeight(p.x,p.z)+1.5,p.z);};
  inspect('tree_apple');
  const controls=document.createElement('details');controls.style.cssText='position:fixed;left:18px;top:120px;z-index:20;padding:10px;background:#183b52ed;color:#fff3d6;max-width:400px';
  const summary=document.createElement('summary');summary.textContent='开发验证 · 农场树木';controls.append(summary);
  const button=(label:string,action:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-label',label);b.style.cssText='margin:4px;padding:5px;background:#fff3d6;color:#183b52;border:1px solid #d5b877';b.addEventListener('click',()=>{action();controls.open=false;game.renderer.domElement.focus();});controls.append(b);};
  for(const [id,tree] of Object.entries(FARM_TREES))button(`查看${tree.label}`,()=>inspect(id));
  for(const [index,season] of SEASONS.entries())button(`${season.name}季树色`,()=>{const current=game.gameplay.calendar.date.seasonIndex,offset=(index-current%4+4)%4||4,target=((current+offset)*28+.5)*DAY_DURATION;game.clock.advanceGameMinutes((target-game.clock.simulationTime)*1440/DAY_DURATION);});
  button('码头步行 · 实际旅行',()=>{game.overview.suspend();game.explorer.enter(false,game.worldManager.currentWorld!.getSpawnPoint());game.hud.setExplore(true);game.clock.paused=false;});
  document.body.append(controls);
}
