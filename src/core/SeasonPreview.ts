import type { Game } from './Game';
import { DAY_DURATION } from './GameClock';
import { SEASONS,DAYS_PER_SEASON } from '../gameplay/calendar/SeasonRegistry';
import { fishSeasonWeight } from '../gameplay/FishingCatalog';
import { SAVE_KEY } from '../state/SaveSystem';
/** Explicit DEV checkpoints. Production imports this module only behind the existing DEV gate. */
export function configureSeasonPreview(game:Game,params:URLSearchParams){
  if(params.get('view')!=='season-calendar')return;
  const controls=document.createElement('details');controls.className='season-preview';controls.style.cssText='position:fixed;top:120px;left:18px;z-index:20;background:#183b52ed;color:#fff3d6;padding:10px;max-width:390px;font:12px sans-serif';
  const summary=document.createElement('summary');summary.textContent='开发验证 · 季节时间链';controls.append(summary);
  const button=(label:string,action:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-label',label);b.style.cssText='margin:4px;color:#183b52;background:#fff3d6;border:1px solid #d5b877;padding:5px;cursor:pointer';b.addEventListener('click',()=>{action();controls.open=false;game.renderer.domElement.focus();});controls.append(b);};
  const advance=(target:number)=>game.clock.advanceGameMinutes(Math.max(0,(target-game.clock.simulationTime)*1440/DAY_DURATION));
  button('推进到季末 23:50',()=>advance(((game.gameplay.calendar.date.seasonIndex+1)*28-1+1430/1440)*DAY_DURATION));
  button('次日 06:00',()=>game.clock.advanceToNextDay());
  button('推进一年',()=>game.clock.advanceGameMinutes(112*1440));
  for(const [index,season] of SEASONS.entries())button(`推进至${season.name}季`,()=>{const current=game.gameplay.calendar.date.seasonIndex,offset=(index-current%4+4)%4||4;advance(((current+offset)*DAYS_PER_SEASON+.5)*DAY_DURATION);});
  button('日期定格',()=>game.clock.paused=true);button('继续时间',()=>game.clock.paused=false);
  button('推进作物成长 4 天',()=>game.clock.advanceGameMinutes(4*1440));
  button('鱼讯权重检查',()=>{const season=game.gameplay.calendar.date.season;game.hud.notify(game.gameplay.fishing.seasonalPool.map(f=>`${f.name} ${fishSeasonWeight(f,season).toFixed(1)}`).join(' · '));});
  if(game.worldManager.currentWorldId==='FARM'){
    game.overview.suspend();game.explorer.enter(false);game.hud.setExplore(true);game.camera.position.set(-7.3,4.44,-8);game.camera.lookAt(0,5,-25);game.explorer.syncLook();
    if(params.get('fixture')==='1'){
      if(!game.gameplay.farm.starterSeedsClaimed)game.gameplay.farm.claimStarterSeeds();
      for(const [index,crop] of game.gameplay.crops.registry.list().entries())button(`验证播种${crop.name}`,()=>{const ref={fieldId:'field-central',column:index,row:0};game.gameplay.farm.till([ref]);const result=game.gameplay.farm.seed([ref],crop.id);game.hud.notify(result.ok?`${crop.name}播种成功 · 背包种子 ${game.gameplay.inventory.count(crop.seedItemId)}`:game.gameplay.crops.plantingReason(crop.id)??`播种未完成：${result.reason}`);});
      button('收割验证单元',()=>{const mature=game.gameplay.farm.getField('field-central')!.cells.filter(c=>c.row===0&&c.column<3&&c.landState==='MATURE');const result=game.gameplay.farm.harvest(mature);game.hud.notify(result.ok?`收割 ${result.changedCells} 格 · 产物 ${result.produced.map(s=>`${s.itemId} × ${s.quantity}`).join(' / ')}`:`收割未完成：${result.reason}`);});
    }
  }
  button('当前岛码头 · 实际旅行',()=>{const spawn=game.worldManager.currentWorld?.getSpawnPoint();if(!spawn)return;game.overview.suspend();game.explorer.enter(false,spawn);game.hud.setExplore(true);});
  if(params.get('fixture')==='1'&&params.get('persist')==='1'){
    let legacy=false;
    const strip=()=>{if(!legacy)return;const raw=localStorage.getItem(SAVE_KEY);if(!raw)return;const saved=JSON.parse(raw);delete saved.calendar;if(saved.global?.weather)delete saved.global.weather.scheduledDay;localStorage.setItem(SAVE_KEY,JSON.stringify(saved));};
    // Registered after Game's save listeners: its normal unload flush cannot overwrite the isolated legacy checkpoint.
    window.addEventListener('beforeunload',strip);window.addEventListener('pagehide',strip);
    button('写入无季节字段的旧存档',()=>{game.gameplay.requestSave(true);legacy=true;strip();game.hud.notify('开发副本已移除季节字段；刷新验证旧存档，库存和农田保留。');});
  }
  document.body.append(controls);
}
