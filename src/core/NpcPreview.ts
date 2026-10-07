import { collectionPreviewControls } from './CollectionPreview';
import type { Game } from './Game';
import { NPCS } from '../gameplay/npc/NpcRegistry';
import { DAY_DURATION } from './GameClock';
import { WEATHER_PROFILES } from '../systems/WeatherState';
import { SAVE_KEY } from '../state/SaveSystem';
import { commissionPreviewControls } from './CommissionPreview';
/** Explicit DEV inspection checkpoints; normal interactions and save APIs remain authoritative. */
export function configureNpcPreview(game:Game,params:URLSearchParams){
  if(!['npc','commissions','collections'].includes(params.get('view')??''))return;
  game.clock.paused=true;
  const approach=(id:string)=>{const n=NPCS.get(id);if(!n||n.worldId!==game.worldManager.currentWorldId)return;const distance=n.worldId==='HOME'?.34:.65;const x=n.position[0]+Math.sin(n.yaw)*distance,z=n.position[2]+Math.cos(n.yaw)*distance;game.overview.suspend();game.explorer.enter(false);game.hud.setExplore(true);game.camera.position.set(x,n.position[1]+.44,z);game.camera.lookAt(n.position[0],n.position[1]+.44,n.position[2]);game.explorer.syncLook();};
  approach(params.get('npc')??(game.worldManager.currentWorldId==='FARM'?'farm_steward':'lighthouse_keeper'));
  const controls=document.createElement('details');controls.style.cssText='position:fixed;top:120px;left:18px;z-index:20;background:#183b52ed;color:#fff3d6;padding:10px;max-width:390px;font:12px sans-serif';
  const summary=document.createElement('summary');summary.textContent=params.get('view')==='collections'?'开发验证 · 航海手记':params.get('view')==='commissions'?'开发验证 · 岛民委托':'开发验证 · 岛民对话';controls.append(summary);
  const button=(label:string,action:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.style.cssText='margin:4px;padding:6px';b.addEventListener('click',()=>{action();controls.open=false;game.renderer.domElement.focus();});controls.append(b);};
  for(const n of NPCS.list())button(`靠近${n.name}`,()=>approach(n.id));
  button('靠岸正午',()=>game.clock.simulationTime=DAY_DURATION*(Math.floor(game.clock.simulationTime/DAY_DURATION)+.5));
  button('远航夜晚',()=>game.clock.simulationTime=DAY_DURATION*(Math.floor(game.clock.simulationTime/DAY_DURATION)+23/24));
  button('风暴问候',()=>game.weather.restore({kind:'STORM',...WEATHER_PROFILES.STORM,wetness:1,windPhase:0},false,0,game.gameplay.calendar.date.dayIndex));
  button('晴天问候',()=>game.weather.restore({kind:'CLEAR',...WEATHER_PROFILES.CLEAR,wetness:0,windPhase:0},false,0,game.gameplay.calendar.date.dayIndex));
  button('推进至冬季',()=>{const current=game.gameplay.calendar.date.seasonIndex,offset=(3-current%4+4)%4||4,target=((current+offset)*28+.5)*DAY_DURATION;game.clock.advanceGameMinutes((target-game.clock.simulationTime)*1440/DAY_DURATION);});
  button('当前岛码头 · 实际旅行',()=>{game.overview.suspend();game.explorer.enter(false,game.worldManager.currentWorld!.getSpawnPoint());game.hud.setExplore(true);});
  button('保存 NPC 记录',()=>game.gameplay.requestSave(true));
  if(params.get('fixture')==='1'){
    button('背包放入一条测试鱼',()=>game.gameplay.inventory.add('fish.sardine',1));
    button('记录首次钓鱼',()=>game.gameplay.progression.record('fish.catch'));
    button('种下一格测试小麦',()=>{const ref={fieldId:'field-central',column:0,row:0};game.gameplay.inventory.add('seed.wheat',1);game.gameplay.farm.till([ref]);const result=game.gameplay.farm.seed([ref],'wheat');game.hud.notify(result.ok?'测试格已播种':`测试格播种失败：${result.reason}`);});
    button('推进作物成长四天',()=>game.clock.advanceGameMinutes(4*1440));
    if(params.get('persist')==='1'){let legacy=false;const strip=()=>{if(!legacy)return;const raw=localStorage.getItem(SAVE_KEY);if(!raw)return;const saved=JSON.parse(raw);delete saved.dialogue;localStorage.setItem(SAVE_KEY,JSON.stringify(saved));};window.addEventListener('pagehide',strip);window.addEventListener('beforeunload',strip);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')strip();});button('保存无 NPC 字段旧存档',()=>{game.gameplay.requestSave(true);legacy=true;strip();});}
  }
  collectionPreviewControls(game,params,button);commissionPreviewControls(game,params,button);document.body.append(controls);
}
