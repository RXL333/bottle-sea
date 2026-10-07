import type { Game } from './Game';
import { LANDMARKS } from '../world/underwater/Landmarks';
import { SAVE_KEY } from '../state/SaveSystem';
/** DEV-only reproducible checkpoints; every production action uses its real service API. */
export function collectionPreviewControls(game:Game,params:URLSearchParams,button:(label:string,action:()=>void)=>void){
  if(params.get('view')!=='collections'||params.get('fixture')!=='1')return;
  const g=game.gameplay;
  button('手记验证 · 完成真实钓鱼',()=>{
    if(game.worldManager.currentWorldId!=='HOME')return;
    g.fishing.interact();for(let i=0;i<4000&&g.fishing.state!=='IDLE';i++){if(g.fishing.state==='BITE')g.fishing.interact();if(g.fishing.state==='FIGHTING'){if(g.fishing.tension<g.fishing.zoneStart+g.fishing.zoneWidth/2)g.fishing.press();else g.fishing.release();}g.fishing.update(.05);}
  });
  button('手记验证 · 重复获得已知鱼',()=>{const fish=g.collections.list('fish').find(v=>v.discovered);if(fish)g.inventory.add(fish.id);});
  button('手记验证 · 靠近小屋门',()=>{if(game.worldManager.currentWorldId==='HOME')game.explorer.enter(false,game.worldManager.currentWorld!.getSpawnPoint('home_cottage_exit'));});
  for(const [id,name] of [['cottage_stove','炉灶'],['cottage_bed','床'],['cottage_exit','出口']])button(`手记验证 · 靠近室内${name}`,()=>{if(game.worldManager.currentWorldId==='COTTAGE')game.explorer.enter(false,game.worldManager.currentWorld!.getSpawnPoint(id));});
  button('手记验证 · 靠近旧锚发现点',()=>{if(game.worldManager.currentWorldId!=='HOME')return;const p=LANDMARKS.find(l=>l.id==='anchor')!;game.explorer.enter(false,{id:'collection-discovery',position:[p.x,p.y+.12,p.z+.25],lookAt:[p.x,p.y,p.z]});});
  button('手记验证 · 农田实际生产',()=>{if(game.worldManager.currentWorldId!=='FARM')return;const ref={fieldId:'field-central',column:0,row:0};g.inventory.add('seed.wheat');g.farm.till([ref]);const seeded=g.farm.seed([ref],'wheat');if(!seeded.ok){game.hud.notify(`播种未完成：${seeded.reason}`);return;}g.time.advanceMinutes(4*1440);const harvested=g.farm.harvest([ref]);game.hud.notify(harvested.ok?'真实小麦收获已记录':`收获未完成：${harvested.reason}`);});
  button('手记验证 · 靠近奶牛',()=>{if(game.worldManager.currentWorldId!=='FARM')return;const a=g.livestock.getAnimal('cow-0')!;game.explorer.enter(false,{id:'collection-animal',position:[a.x+1,4.44,a.z],lookAt:[a.x,4.3,a.z]});});
  button('手记验证 · 真实喂养并领取牛奶',()=>{if(game.worldManager.currentWorldId!=='FARM')return;g.inventory.add('feed.basic');g.livestock.feed('cow');g.time.advanceMinutes(1440);g.livestock.collect('cow-0');});
  button('手记验证 · 保存记录',()=>g.requestSave(true));
  if(params.get('persist')==='1'){
    let legacy=false;const strip=()=>{if(!legacy)return;const raw=localStorage.getItem(SAVE_KEY);if(!raw)return;const saved=JSON.parse(raw);delete saved.collections;localStorage.setItem(SAVE_KEY,JSON.stringify(saved));};
    window.addEventListener('pagehide',strip);window.addEventListener('beforeunload',strip);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')strip();});
    button('手记验证 · 保存无图鉴字段旧存档',()=>{g.requestSave(true);legacy=true;strip();});
  }
}
