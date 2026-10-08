import type { Game } from './Game';
/** Disposable DEV checkpoints use existing controllers and production APIs. Never persist without persist=1. */
export function configureHudPreview(game:Game,params:URLSearchParams){
  if(params.get('view')!=='hud-check')return;
  const controls=document.createElement('details');controls.className='hud-dev-check';const summary=document.createElement('summary');summary.textContent='开发验证 · HUD 场景';controls.append(summary);
  controls.style.cssText='position:fixed;left:12px;top:200px;z-index:20;font:11px sans-serif;background:#fff8e9;color:#1e4b73;padding:6px;max-width:210px';
  const button=(label:string,action:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.style.cssText='padding:6px;margin:3px';b.addEventListener('click',()=>{action();controls.open=false;game.renderer.domElement.focus();});controls.append(b);};
  if(game.worldManager.currentWorldId==='HOME'){
    game.overview.suspend();game.explorer.enter(false,game.worldManager.currentWorld!.getSpawnPoint('home_fishing'));game.hud.setExplore(true);
    button('钓鱼咬钩检查点',()=>{
      if(game.gameplay.fishing.active)game.gameplay.fishing.cancel();
      // Accelerate the existing finite waiting phase for UI inspection, without inventing fish or reward state.
      game.renderer.domElement.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE',key:'e',bubbles:true}));
      game.renderer.domElement.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyE',key:'e',bubbles:true}));
      for(let step=0;step<100&&['CASTING','WAITING'].includes(game.gameplay.fishing.state);step++)game.gameplay.fishing.update(.1);
    });
  }
  if(game.worldManager.currentWorldId==='FARM')for(const vehicle of game.worldManager.currentWorld!.vehicles??[])button(`靠近${vehicle.name}`,()=>{
    if(game.vehicleController.active)return;game.explorer.enter(false);game.hud.setExplore(true);game.camera.position.copy(vehicle.entryPosition());game.camera.position.y=vehicle.root.position.y+.44;game.camera.lookAt(vehicle.seatPosition());game.explorer.syncLook();
  });
  document.body.append(controls);
}
