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

export class Game {
  readonly renderer=new Renderer();readonly scene=new Scene();
  readonly camera=new PerspectiveCamera(34,innerWidth/innerHeight,.12,200);
  readonly clock=new GameClock();readonly world=new World();readonly bottle=new Bottle();
  readonly weather=new WeatherSystem();
  readonly interaction=new InteractionSystem();readonly sound=new SoundSystem();
  readonly hud:HUD;readonly loop:GameLoop;readonly dayNight:DayNightSystem;readonly overview:OverviewController;
  readonly explorer:ExploreController;private underwaterFog=new FogExp2('#087b83',.14);
  readonly performance:PerformanceMonitor;
  private hudTimer=0;
  constructor(root:HTMLElement) {
    root.append(this.renderer.domElement);this.scene.background=new Color('#21343a');
    this.scene.add(new Room(),this.bottle,this.world,this.weather);
    this.dayNight=new DayNightSystem(this.scene);
    this.overview=new OverviewController(this.camera,this.renderer.domElement);
    this.explorer=new ExploreController(this.camera,this.renderer.domElement);
    this.hud=new HUD(root);this.bindUI();
    this.performance=new PerformanceMonitor(this.renderer,this.hud.element.querySelector<HTMLElement>('#fps')!,this.camera);
    this.world.fish.setCount(QUALITY.MEDIUM.fish);this.weather.rain.setCount(QUALITY.MEDIUM.rain);
    if(import.meta.env.DEV)configurePreview(this);
    this.hud.updateClock(this.clock,this.weather.storm);this.explorer.update(0);this.hud.updateDepth(this.explorer.underwater,this.camera.position.y);
    this.explorer.onInteract=()=>{this.interaction.update(this.camera.position);this.hud.notify(this.interaction.interact());this.hud.updateQuests(this.interaction.discovered);};
    window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.resize();if(!this.explorer.active)this.overview.fit();});
    this.loop=new GameLoop(this.update);this.loop.start();
  }
  private bindUI() {
    this.hud.element.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(button=>button.addEventListener('click',()=>{
      this.clock.timeScale=Number(button.dataset.speed);this.clock.paused=false;this.hud.setSpeed(this.clock.timeScale,false);
    }));
    this.hud.element.querySelector('[data-action="pause"]')!.addEventListener('click',()=>{this.clock.paused=!this.clock.paused;this.hud.setSpeed(this.clock.timeScale,this.clock.paused);});
    this.hud.element.querySelector('[data-action="storm"]')!.addEventListener('click',()=>{this.weather.storm=!this.weather.storm;this.hud.setActive('storm',this.weather.storm);});
    this.hud.element.querySelector('[data-action="explore"]')!.addEventListener('click',()=>{
      if(this.explorer.active){this.explorer.exit();this.overview.enabled=true;this.overview.reset();}
      else{this.overview.enabled=false;this.explorer.enter();}
      this.hud.setExplore(this.explorer.active);(document.activeElement as HTMLElement)?.blur();
    });
    this.explorer.onLockChange=locked=>{if(this.explorer.active)this.hud.setHint(locked?'WASD 移动 · Space 上升 · C 下潜 · E 交互':'拖动观察 · WASD 移动 · 双击画面锁定鼠标');};
    this.hud.element.querySelector('[data-action="sound"]')!.addEventListener('click',()=>{void this.sound.toggle().then(enabled=>this.hud.setActive('sound',enabled)).catch(()=>this.hud.notify('声音暂时无法启用，请再次点击重试。'));});
    this.hud.element.querySelector('.quality')!.addEventListener('click',()=>{
      const options:Quality[]=['LOW','MEDIUM','HIGH'];this.renderer.quality=options[(options.indexOf(this.renderer.quality)+1)%3];const quality=QUALITY[this.renderer.quality];
      this.renderer.resize();this.world.ocean.create(quality.waterStep);this.world.fish.setCount(quality.fish);this.weather.rain.setCount(quality.rain);
      this.hud.element.querySelector('.quality')!.textContent=`PIXEL / ${this.renderer.quality}`;
    });
  }
  private update=(delta:number)=>{
    const cpuStart=performance.now();
    this.clock.update(delta);const time=this.clock.elapsed;
    this.weather.update(this.clock.paused?0:delta,time);const storm=this.weather.intensity;
    if(this.explorer.active)this.explorer.update(delta);else this.overview.update();
    this.scene.fog=this.explorer.underwater?this.underwaterFog:null;
    document.body.classList.toggle('underwater',this.explorer.underwater);
    this.world.update(time,storm);this.bottle.update(time,storm);
    this.sound.update(time,storm);
    if(this.explorer.active)this.interaction.update(this.camera.position);
    this.dayNight.update(this.clock.normalizedDayTime,time,storm,this.weather.lightning.flash);
    this.world.island.house.setNight(this.dayNight.night);this.world.island.lighthouse.update(time,this.dayNight.night,storm);
    this.hudTimer+=delta;if(this.hudTimer>.25){this.hudTimer=0;this.hud.updateClock(this.clock,this.weather.storm);this.hud.updateDepth(this.explorer.underwater,this.camera.position.y);
      if(this.explorer.active)this.hud.setHint(this.interaction.nearest?`[ E ] 发现：${this.interaction.nearest.name}`:'WASD 移动 · 拖动 / 鼠标观察 · Space 上升 · C 下潜 · E 交互');
    }
    this.renderer.render(this.scene,this.camera);
    this.performance.update(performance.now()-cpuStart);
  };
}


