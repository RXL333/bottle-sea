import type { Game } from './Game';
import { DAY_DURATION } from './GameClock';
import type { Quality } from './Renderer';

/** DEV-only, isolated inspection of geometry versus shadow artifacts. */
export function configureShadowPreview(game:Game,params:URLSearchParams){
  if(params.get('view')!=='render-check')return;
  game.clock.paused=true;game.overview.suspend();game.explorer.suspend();game.transition.state='EXPLORE';game.hud.setExplore(false);
  game.overview.minDistance=0;game.overview.maxDistance=Infinity;game.overview.minPolarAngle=0;game.overview.maxPolarAngle=Math.PI;game.overview.minAzimuthAngle=-Infinity;game.overview.maxAzimuthAngle=Infinity;
  const farm=game.worldManager.currentWorldId==='FARM';
  const checkpoints:Record<string,{position:[number,number,number];target:[number,number,number]}>=farm?{
    '谷仓':{position:[21,5.5,13],target:[20,6.2,4]},
    '谷仓屋顶':{position:[16,10,11],target:[20,7,4]},
    '农场道路':{position:[-8,4.5,8],target:[0,4.05,-7]},
    '农场小屋':{position:[7,4.8,2],target:[4.8,4.5,4.2]},
    '农机':{position:[-18,4.8,6],target:[-19,4.3,3]},
    '农田':{position:[-6,4.8,-9],target:[0,4.2,-19]},
  }:{
    '钓鱼台入口':{position:[-2.1,4.35,1.25],target:[-3.05,3.95,.65]},
    '码头':{position:[.1,4.30,1.6],target:[.85,3.9,1.4]},
    '小屋门廊':{position:[-.55,4.20,1.4],target:[-1.50,4.05,.5]},
    '小屋台阶':{position:[-1.55,4.18,1.3],target:[-1.55,3.98,.70]},
    '交通船':{position:[1.4,4.8,3.1],target:[.65,3.9,2.35]},
    '商船':{position:[-2.5,5,2.8],target:[-1.6,3.9,2.8]},
    '商船平台近景':{position:[-1.05,4.45,.96],target:[-1.60,3.94,1.65]},
    '渔夫与小树':{position:[-2.7,4.4,.90],target:[-2.55,4,-.38]},
  };
  const panel=document.createElement('details');panel.open=true;panel.style.cssText='position:fixed;left:12px;top:12px;z-index:1000;background:#fff3d6;color:#183b52;padding:8px;max-width:310px;font:12px sans-serif';
  const title=document.createElement('summary');title.textContent='开发验证 · 表面与阴影';panel.append(title);
  const button=(label:string,action:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.style.margin='3px';b.addEventListener('click',()=>{action();game.renderer.domElement.focus();game.renderer.render(game.scene,game.camera);});panel.append(b);};
  let current=Object.keys(checkpoints)[0],offset=0;
  const show=()=>{const p=checkpoints[current];game.overview.target.fromArray(p.target);game.camera.position.fromArray(p.position);game.camera.position.x+=offset;game.camera.lookAt(...p.target);game.camera.fov=48;game.camera.updateProjectionMatrix();};
  for(const name of Object.keys(checkpoints))button(name,()=>{current=name;offset=0;show();});
  button('微移镜头',()=>{offset+=.025;show();});button('重置镜头',()=>{offset=0;show();});
  button('开关阴影',()=>{game.renderer.shadowMap.enabled=!game.renderer.shadowMap.enabled;game.scene.traverse(o=>{if('material' in o){const material=o.material as {needsUpdate:boolean}|{needsUpdate:boolean}[];(Array.isArray(material)?material:[material]).forEach(m=>m.needsUpdate=true);}});});
  for(const q of ['LOW','MEDIUM','HIGH'] as Quality[])button(q,()=>{game.renderer.quality=q;game.renderer.resize();game.worldManager.currentWorld?.applyQuality(q);});
  for(const hour of [6,12,18,23])button(`${hour}:00`,()=>{game.clock.simulationTime=Math.floor(game.clock.simulationTime/DAY_DURATION)*DAY_DURATION+hour/24*DAY_DURATION;});
  document.body.append(panel);show();
}
