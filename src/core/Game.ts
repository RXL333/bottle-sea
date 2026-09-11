import { Color, FogExp2, PerspectiveCamera, Scene } from 'three';
import { QUALITY, Renderer } from './Renderer';
import type { Quality } from './Renderer';
import { GameLoop } from './GameLoop';
import { GameClock } from './GameClock';
import { HUD } from '../ui/HUD';
import { Room } from '../world/Room';
import { Bottle } from '../world/bottle/Bottle';
import { OverviewController } from '../controls/OverviewController';
import { World } from '../world/World';
import { DayNightSystem } from '../systems/DayNightSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { ExploreController } from '../controls/ExploreController';
import { InteractionSystem } from '../systems/InteractionSystem';
import { SoundSystem } from '../systems/SoundSystem';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { configurePreview } from './Preview';
import { CameraTransitionSystem } from '../systems/CameraTransitionSystem';
import '../styles/polish.css';
import { SceneFocusSystem } from '../systems/SceneFocusSystem';
import type { FocusId } from '../systems/SceneFocusSystem';
import { PlayerFeedback } from '../systems/PlayerFeedback';
import { WaterEntrySystem } from '../systems/WaterEntrySystem';
import { DiscoveryPulse } from '../systems/DiscoveryPulse';
import { MicroAnimationSystem } from '../systems/MicroAnimationSystem';

export class Game {
  readonly renderer=new Renderer();readonly scene=new Scene();
  readonly camera=new PerspectiveCamera(34,innerWidth/innerHeight,.12,200);
  readonly clock=new GameClock();readonly world=new World();readonly bottle=new Bottle();
  readonly weather=new WeatherSystem();
  readonly interaction=new InteractionSystem();readonly sound=new SoundSystem();
  readonly hud:HUD;readonly loop:GameLoop;readonly dayNight:DayNightSystem;readonly overview:OverviewController;
  readonly explorer:ExploreController;private underwaterFog=new FogExp2('#087b83',.14);
  readonly performance:PerformanceMonitor;
  readonly transition=new CameraTransitionSystem(this.camera);private destination=new PerspectiveCamera();
  readonly focus:SceneFocusSystem;
  readonly playerFeedback=new PlayerFeedback();
  readonly waterEntry=new WaterEntrySystem();
  readonly discoveryPulse=new DiscoveryPulse(this.world);
  readonly micro=new MicroAnimationSystem();
  private hudTimer=0;
  constructor(root:HTMLElement) {
    root.append(this.renderer.domElement);this.scene.background=new Color('#21343a');
    this.scene.add(new Room(),this.bottle,this.world,this.weather,this.waterEntry,this.micro);
    this.waterEntry.onEnter=()=>{this.playerFeedback.splash();this.sound.play('water-enter');};
    this.playerFeedback.onStep=surface=>this.sound.footstep(surface);
    this.dayNight=new DayNightSystem(this.scene);
    this.overview=new OverviewController(this.camera,this.renderer.domElement);
    this.focus=new SceneFocusSystem(this.camera,this.overview.target);
    this.explorer=new ExploreController(this.camera,this.renderer.domElement);
    this.hud=new HUD(root);this.bindUI();
    this.performance=new PerformanceMonitor(this.renderer,this.hud.element.querySelector<HTMLElement>('#fps')!,this.camera);
    this.world.fish.setCount(QUALITY.MEDIUM.fish);this.weather.rain.setCount(QUALITY.MEDIUM.rain);
    if(import.meta.env.DEV)configurePreview(this);
    if(this.explorer.active)this.transition.state='EXPLORE';
    this.hud.updateClock(this.clock,this.weather.storm);this.explorer.update(0);this.hud.updateDepth(this.explorer.underwater,this.camera.position.y);
    this.explorer.onInteract=()=>{
      this.interaction.update(this.camera.position);const target=this.interaction.nearest;
      const message=this.interaction.interact();this.hud.updateQuests(this.interaction.discovered);
      if(target){this.hud.showDiscovery(target.id,this.interaction.discovered.size);this.discoveryPulse.trigger(target.id);this.sound.play('ui-discover');}else this.hud.notify(message);
    };
    window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.resize();this.overview.fit(this.transition.state==='OVERVIEW'&&this.focus.selected==='overview'&&!this.focus.active);});
    this.loop=new GameLoop(this.update);this.loop.start();
  }
  private bindUI() {
    this.hud.element.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(button=>button.addEventListener('click',()=>{
      this.clock.timeScale=Number(button.dataset.speed);this.clock.paused=false;this.hud.setSpeed(this.clock.timeScale,false);
    }));
    this.hud.element.querySelector('[data-action="pause"]')!.addEventListener('click',()=>{this.clock.paused=!this.clock.paused;this.hud.setSpeed(this.clock.timeScale,this.clock.paused);});
    this.hud.element.querySelector('[data-action="storm"]')!.addEventListener('click',()=>{this.weather.storm=!this.weather.storm;this.hud.setActive('storm',this.weather.storm);});
    this.hud.element.querySelector('[data-action="explore"]')!.addEventListener('click',()=>{
      if(this.transition.active)return;
      const entering=this.transition.state==='OVERVIEW';this.focus.cancel();this.overview.suspend();this.explorer.suspend();
      if(entering){this.destination.position.set(.65,4.12,1.87);this.destination.lookAt(-.65,4.8,-.4);}
      else{this.destination.position.copy(this.overview.position0);this.destination.lookAt(this.overview.target0);}
      this.transition.start(entering?'EXPLORE':'OVERVIEW',this.destination.position,this.destination.quaternion,entering?68:34);
      this.hud.setTransition(true);(document.activeElement as HTMLElement)?.blur();
    });
    this.explorer.onLockChange=locked=>{if(this.explorer.active)this.hud.setHint(locked?'WASD 移动 · Space 上升 · C 下潜 · E 交互':'拖动观察 · WASD 移动 · 双击画面锁定鼠标');};
    this.hud.element.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(button=>button.addEventListener('click',()=>{
      if(this.transition.state!=='OVERVIEW')return;
      this.overview.suspend();this.focus.start(button.dataset.focus as FocusId,this.world.ship.position,this.overview.position0,this.overview.target0);
      this.hud.element.querySelectorAll('[data-focus]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    }));
    const soundButton=this.hud.element.querySelector<HTMLButtonElement>('[data-action="sound"]')!;
    soundButton.addEventListener('click',()=>{soundButton.disabled=true;void this.sound.toggle().then(enabled=>this.hud.setActive('sound',enabled)).catch(()=>this.hud.notify('声音暂时无法启用，请再次点击重试。')).finally(()=>soundButton.disabled=false);});
    this.hud.element.querySelector('.quality')!.addEventListener('click',()=>{
      const options:Quality[]=['LOW','MEDIUM','HIGH'];this.renderer.quality=options[(options.indexOf(this.renderer.quality)+1)%3];const quality=QUALITY[this.renderer.quality];
      this.renderer.resize();this.world.ocean.create(quality.waterStep);this.world.fish.setCount(quality.fish);this.weather.rain.setCount(quality.rain);
      this.world.wake.setDensity(quality.waterStep);
      this.waterEntry.setDensity(quality.waterStep);
      this.micro.setDensity(quality.waterStep);
      this.hud.element.querySelector('.quality')!.textContent=`PIXEL / ${this.renderer.quality}`;
    });
  }
  private update=(delta:number)=>{
    const cpuStart=performance.now();
    this.clock.update(delta);const time=this.clock.elapsed;
    this.weather.update(this.clock.paused?0:delta,time);const storm=this.weather.intensity;
    if(this.transition.active){
      if(this.transition.update(delta)){
        if(this.transition.state==='EXPLORE'){this.explorer.enter(false);this.playerFeedback.reset();}
        else{this.explorer.exit();this.focus.selected='overview';this.overview.target.copy(this.overview.target0);this.overview.minDistance=12;this.overview.enabled=true;this.overview.update();
          this.hud.element.querySelectorAll<HTMLElement>('[data-focus]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.focus==='overview')));
        }
        this.hud.setExplore(this.explorer.active);this.hud.setTransition(false);
      }
    }else if(this.explorer.active)this.explorer.update(delta);
    else if(this.focus.active){if(this.focus.update(delta)){this.overview.minDistance=this.focus.selected==='overview'?12:2;this.overview.enabled=true;this.overview.update();}}
    else this.overview.update();
    const underwater=this.explorer.underwater&&(this.explorer.active||this.transition.active&&this.camera.position.y<3.23);
    this.scene.fog=underwater?this.underwaterFog:null;
    this.waterEntry.update(delta,this.camera.position,this.explorer.active,this.explorer.swimming,this.explorer.sprinting);
    if(this.explorer.active){this.playerFeedback.update(delta,this.camera.position,this.explorer.grounded,this.explorer.swimming,this.explorer.sprinting);this.camera.fov=this.playerFeedback.fov;this.camera.updateProjectionMatrix();}
    document.body.classList.toggle('underwater',underwater);
    this.world.update(time,storm,this.clock.normalizedDayTime,this.explorer.active?this.camera.position:undefined);this.bottle.update(time,storm,this.weather.lightning.flash);
    this.sound.update(time,storm,underwater?'UNDERWATER':this.explorer.active?'ISLAND':'OVERVIEW',this.weather.lightning.flash);
    this.discoveryPulse.update(delta);
    if(this.explorer.active)this.interaction.update(this.camera.position);
    this.dayNight.update(this.clock.normalizedDayTime,time,storm,this.weather.lightning.flash);
    this.micro.update(time,this.dayNight.night,storm);
    this.world.island.house.setNight(this.dayNight.night);this.world.island.lighthouse.update(time,this.dayNight.night,storm);
    this.hudTimer+=delta;if(this.hudTimer>.25){this.hudTimer=0;this.hud.updateClock(this.clock,this.weather.storm);this.hud.updateDepth(underwater,this.camera.position.y);
      if(import.meta.env.DEV){const data=this.renderer.domElement.dataset;data.cameraMode=this.transition.state;data.waterEntries=String(this.waterEntry.entries);data.waterLeaves=String(this.waterEntry.leaves);data.fov=this.camera.fov.toFixed(2);}
      if(this.explorer.active){this.hud.setInteractable(Boolean(this.interaction.nearest));this.hud.setHint(this.interaction.nearest?`[ E ] 观察：${this.interaction.nearest.name}`:'WASD 移动 · 拖动 / 鼠标观察 · Space 上升 · C 下潜 · E 交互');}
    }
    const bob=this.explorer.active?this.playerFeedback.offsetY:0;this.camera.position.y+=bob;
    this.renderer.render(this.scene,this.camera);this.camera.position.y-=bob;
    this.performance.update(performance.now()-cpuStart);
  };
}


