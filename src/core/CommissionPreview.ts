import type { Game } from './Game';
import { SAVE_KEY } from '../state/SaveSystem';
import { LANDMARKS } from '../world/underwater/Landmarks';
/** DEV fixture controls only. Production progress uses the same committed gameplay APIs as normal play. */
export function commissionPreviewControls(game:Game,params:URLSearchParams,button:(label:string,action:()=>void)=>void){
  if(params.get('view')!=='commissions'||params.get('fixture')!=='1')return;
  const g=game.gameplay,ref={fieldId:'field-central',column:0,row:0};
  button('委托验证 · 沙丁鱼补至三条',()=>{const n=3-g.inventory.count('fish.sardine');if(n>0)g.inventory.add('fish.sardine',n);});
  button('委托验证 · 移除一条沙丁鱼',()=>g.inventory.remove('fish.sardine'));
  button('委托验证 · 填满背包其余位置',()=>{while(g.inventory.emptySlots)g.inventory.add('wood',99);});
  button('委托验证 · 腾出木材一槽',()=>{const slot=g.inventory.snapshot().slots.findIndex(s=>s?.itemId==='wood');if(slot>=0)g.inventory.removeFromSlot(slot,g.inventory.getSlot(slot)!.quantity);});
  button('委托验证 · 移除验证木材',()=>{const count=g.inventory.count('wood');if(count)g.inventory.remove('wood',count);});
  button('委托验证 · 真实钓鱼状态机',()=>{
    const initial=g.fishing.interact();if(initial.status!=='success'){game.hud.notify(initial.message??'无法抛竿');return;}
    for(let i=0;i<4000&&g.fishing.state!=='IDLE';i++){
      if(g.fishing.state==='BITE')g.fishing.interact();if(g.fishing.state==='FIGHTING'){if(g.fishing.tension<g.fishing.zoneStart+g.fishing.zoneWidth/2)g.fishing.press();else g.fishing.release();}g.fishing.update(.05);
    }
  });
  button('委托验证 · 靠近主岛小屋门',()=>{if(game.worldManager.currentWorldId!=='HOME')return;g.cooking.cancel();game.explorer.enter(false,game.worldManager.currentWorld!.getSpawnPoint('home_cottage_exit'));});
  for(const [id,name] of [['cottage_stove','炉灶'],['cottage_bed','床'],['cottage_exit','出口']])button(`委托验证 · 靠近室内${name}`,()=>{if(game.worldManager.currentWorldId==='COTTAGE')game.explorer.enter(false,game.worldManager.currentWorld!.getSpawnPoint(id));});
  for(const id of ['anchor','ruins'])button(`委托验证 · 靠近发现点 ${id}`,()=>{if(game.worldManager.currentWorldId!=='HOME')return;const point=LANDMARKS.find(p=>p.id===id)!;game.explorer.enter(false,{id:'discovery-checkpoint',position:[point.x,point.y+.12,point.z+.25],lookAt:[point.x,point.y,point.z]});});
  button('委托验证 · 收获成熟测试格',()=>{const result=g.farm.harvest([ref]);game.hud.notify(result.ok?'真实收获已进入背包':`收获失败：${result.reason}`);});
  button('委托验证 · 真实睡觉推进一天',()=>{g.home.sleep();game.hud.notify('真实 HomeSystem 睡觉已完成');});
  button('委托验证 · 领取圈舍三份产物',()=>{
    for(const pen of ['chicken','cow','sheep']){g.inventory.add('feed.basic',1);g.livestock.feed(pen);}
    g.time.advanceMinutes(2*1440);for(const animal of g.livestock.getAnimals())if(animal.pending)g.livestock.collect(animal.id);
  });
  if(params.get('persist')==='1'){
    let legacy=false;
    const strip=()=>{if(!legacy)return;const raw=localStorage.getItem(SAVE_KEY);if(!raw)return;const saved=JSON.parse(raw);delete saved.commissions;localStorage.setItem(SAVE_KEY,JSON.stringify(saved));};
    window.addEventListener('pagehide',strip);window.addEventListener('beforeunload',strip);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')strip();});
    button('委托验证 · 保存无委托字段旧存档',()=>{g.requestSave(true);legacy=true;strip();});
  }
}
