import { DoorTransition } from '../systems/DoorTransition';
import { SleepTransition } from '../systems/SleepTransition';
import { Color,FogExp2,PerspectiveCamera,Scene,Vector3 } from 'three';
import { QUALITY,Renderer } from './Renderer';
import type { Quality } from './Renderer';
import { GameLoop } from './GameLoop';
import { GameClock } from './GameClock';
import { HUD } from '../ui/HUD';
import { OverviewController } from '../controls/OverviewController';
import { ExploreController } from '../controls/ExploreController';
import { DayNightSystem } from '../systems/DayNightSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { SoundSystem } from '../systems/SoundSystem';
import { CameraTransitionSystem } from '../systems/CameraTransitionSystem';
import { SceneFocusSystem } from '../systems/SceneFocusSystem';
import type { FocusId } from '../systems/SceneFocusSystem';
import { PlayerFeedback } from '../systems/PlayerFeedback';
import { WaterEntrySystem } from '../systems/WaterEntrySystem';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { configurePreview } from './Preview';
import { WorldManager } from '../worlds/WorldManager';
import { WorldRegistry } from '../worlds/WorldRegistry';
import type { GameWorld,SpawnPoint,WorldUpdateContext } from '../worlds/types';
import { WorldStateRegistry } from '../state/WorldStateRegistry';
import { SaveSystem,defaultSave } from '../state/SaveSystem';
import type { SaveData } from '../state/SaveSystem';
import type { PlayerState,PlayableWorldId } from '../state/PlayerState';
import { DestinationPanel } from '../ui/DestinationPanel';
import { HomePanel } from '../ui/HomePanel';
import { SleepOverlay } from '../ui/SleepOverlay';
import { TravelSystem } from '../travel/TravelSystem';
import { TravelCamera } from '../travel/TravelCamera';
import { destination } from '../travel/DestinationRegistry';
import { daylightAt } from '../systems/DayTimeMath';
import { GameplayFoundation } from '../gameplay/GameplayFoundation';
import { InteractionActions } from '../systems/InteractionSystem';
import type { InteractionContext } from '../systems/InteractionSystem';
import '../styles/polish.css';
import '../styles/travel.css';
import '../styles/home.css';
import '../styles/interaction.css';

export class Game {
  readonly renderer=new Renderer();readonly scene=new Scene();readonly camera=new PerspectiveCamera(34,innerWidth/innerHeight,.12,200);
  readonly clock=new GameClock();readonly weather=new WeatherSystem();readonly sound=new SoundSystem();
  readonly hud:HUD;readonly loop:GameLoop;readonly dayNight:DayNightSystem;readonly overview:OverviewController;readonly explorer:ExploreController;
  readonly performance:PerformanceMonitor;readonly transition=new CameraTransitionSystem(this.camera);readonly focus:SceneFocusSystem;
  readonly playerFeedback=new PlayerFeedback();readonly waterEntry=new WaterEntrySystem();readonly worldManager:WorldManager;
  readonly player:PlayerState;readonly travel:TravelSystem;readonly doorTransition=new DoorTransition();
  readonly sleepTransition=new SleepTransition();
  readonly gameplay:GameplayFoundation;
  private interactionActions=new InteractionActions();
  private save:SaveSystem;private states=new WorldStateRegistry();private lastSuccessfulWorld:PlayableWorldId='HOME';
  private panel:DestinationPanel;private travelCamera=new TravelCamera(this.camera);private cover=document.createElement('div');private caption=document.createElement('div');
  private homePanel:HomePanel;
  private sleepOverlay:SleepOverlay;
  private destinationCamera=new PerspectiveCamera();private underwaterFog=new FogExp2('#087b83',.14);private seaFog=new FogExp2('#899d9c',.025);
  private staged:GameWorld|null=null;private spawn:SpawnPoint={id:'',position:[0,0,0],lookAt:[0,0,-1]};
  private completedTrips=0;private interactionCount=0;
  private dock=new Vector3();private previousTravelState='IDLE';private hudTimer=0;private ready=false;
  private readonly preview=import.meta.env.DEV&&['view','world','hour','weather','fail'].some(key=>new URLSearchParams(location.search).has(key));
  private readonly persistPreview=import.meta.env.DEV&&new URLSearchParams(location.search).get('persist')==='1';
  constructor(root:HTMLElement){
    root.append(this.renderer.domElement);this.renderer.domElement.tabIndex=0;this.scene.background=new Color('#21343a');this.scene.add(this.weather,this.waterEntry);
    this.dayNight=new DayNightSystem(this.scene);this.overview=new OverviewController(this.camera,this.renderer.domElement);this.focus=new SceneFocusSystem(this.camera,this.overview.target);
    this.explorer=new ExploreController(this.camera,this.renderer.domElement);this.hud=new HUD(root);this.panel=new DestinationPanel(root);this.homePanel=new HomePanel(root);this.sleepOverlay=new SleepOverlay(root);
    this.cover.className='travel-cover';this.caption.className='travel-caption';this.caption.hidden=true;root.append(this.cover);this.hud.element.append(this.caption);
    // Access to localStorage itself can throw in restricted embeds.
    this.save=new SaveSystem({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
    const saved=this.preview&&!this.persistPreview?defaultSave():this.save.load();this.player=saved.player;this.lastSuccessfulWorld=saved.lastSuccessfulWorld;this.clock.restore(saved.gameTime);this.states.restore(saved.worlds);
    this.gameplay=new GameplayFoundation(this.clock,saved,undefined,()=>this.persist());
    this.weather.storm=saved.global.storm;this.weather.intensity=saved.global.intensity;
    const failure=import.meta.env.DEV?new URLSearchParams(location.search).get('fail'):null;
    const registry=new WorldRegistry().register('HOME',async()=>{const world=new (await import('../worlds/home/HomeWorld')).HomeWorld();if(failure==='fallback'&&this.worldManager.currentWorldId==='TRAVEL')world.load=()=>{throw new Error('DEV: HOME fallback failure');};return world;}).register('FARM',async()=>{const world=new (await import('../worlds/farm/FarmWorld')).FarmWorld();if(failure==='farm'||failure==='fallback')world.load=()=>{throw new Error('DEV: FARM load failure');};return world;}).register('COTTAGE',async()=>{const world=new (await import('../worlds/cottage/CottageWorld')).CottageWorld();if(failure==='cottage')world.load=async()=>{throw new Error('DEV: cottage load failure');};return world;}).register('TRAVEL',async()=>new (await import('../worlds/travel/TravelWorld')).TravelWorld());
    this.worldManager=new WorldManager(this.scene,registry,this.states,spawn=>{this.spawn=spawn;},this.gameplay);
    this.travel=new TravelSystem(this.player,{
      board:()=>{this.explorer.suspend(true);this.overview.suspend();this.focus.cancel();this.transition.state='EXPLORE';this.playerFeedback.reset();this.hud.closeDiscovery();this.worldManager.currentWorld?.setTravelPresentation?.(true);this.worldManager.currentWorld!.boat!.reset();this.dock.copy(this.worldManager.currentWorld!.boat!.position);this.travelCamera.capture();document.body.classList.add('traveling');this.caption.hidden=false;this.caption.textContent='解缆 · 准备启航';},
      switchToTravel:async()=>{await this.worldManager.switchTo('TRAVEL',this.clock.simulationTime);this.configureEnvironment();this.worldManager.currentWorld!.boat!.yaw=0;this.travelCamera.capture();},
      prepareDestination:async id=>{this.staged=await this.worldManager.prepare(id,this.clock.simulationTime);},
      switchToDestination:async id=>{const staged=this.staged;this.staged=null;await this.worldManager.switchTo(id,this.clock.simulationTime,destination(id).arrivalSpawnId,staged??undefined);const world=this.worldManager.currentWorld!;world.setTravelPresentation?.(true);this.configureEnvironment();this.dock.copy(world.boat!.berth);const boat=world.boat!;boat.position.copy(boat.berth);boat.position.x+=Math.sin(boat.berthYaw)*boat.departureDistance;boat.position.z+=Math.cos(boat.berthYaw)*boat.departureDistance;boat.yaw=boat.berthYaw+Math.PI;this.camera.position.copy(boat.position).add(new Vector3(-Math.sin(boat.yaw)*3.4,2.7,-Math.cos(boat.yaw)*3.4));this.camera.lookAt(world.boat!.position);},
      arrive:(id,minutes)=>{this.completedTrips++;this.gameplay.time.advanceMinutes(minutes);this.player.lastTravelDestination=id;this.finishArrival(id);},
      recoverHome:async error=>{console.warn('Travel failed',error);this.hud.notify('航线暂时无法抵达，正在返回家园岛……');this.staged?.dispose();this.staged=null;await this.worldManager.switchTo('HOME',this.clock.simulationTime);this.finishArrival('HOME');},
      fatal:error=>this.showFatal(error),
    });
    this.waterEntry.onEnter=()=>{this.playerFeedback.splash();this.sound.play('water-enter');};this.playerFeedback.onStep=surface=>this.sound.footstep(surface);
    this.interactionActions.register('TRAVEL',()=>{
      this.explorer.suspendForPanel();this.hud.setInteractionPrompt();this.panel.show(this.player,id=>{this.explorer.beginTransitionFromPanel();this.persist(true);this.travel.begin(id);},()=>{this.explorer.resumeFromPanel();});
      return {status:'success'};
    }).register('ENTER_COTTAGE',()=>({status:this.useCottageDoor(true)?'success':'unavailable'}))
      .register('EXIT_COTTAGE',()=>({status:this.useCottageDoor(false)?'success':'unavailable'}))
      .register('HOME_SLEEP',()=>{
        this.explorer.suspendForPanel();this.hud.closeDiscovery();this.hud.setInteractionPrompt();
        this.homePanel.showSleep(this.gameplay,()=>this.sleepAtHome(),()=>this.resumeFurnitureExplore());
        return {status:'success'};
      }).register('HOME_STORAGE',()=>{
        this.explorer.suspendForPanel();this.hud.closeDiscovery();this.hud.setInteractionPrompt();
        this.homePanel.showStorage(this.gameplay,()=>{this.persist(true);this.resumeFurnitureExplore();});
        return {status:'success'};
      }).register('HOME_STOVE',()=>({status:'success',message:'烹饪尚未解锁'}));
    this.explorer.onInteract=()=>{void this.interact();};this.explorer.onLockChange=locked=>{if(this.explorer.active)this.hud.setHint(locked?'WASD 移动 · Space 上升 · C 下潜 · E 交互':'拖动观察 · WASD 移动 · 双击画面锁定鼠标');};
    this.performance=new PerformanceMonitor(this.renderer,this.hud.element.querySelector<HTMLElement>('#fps')!,this.camera);this.bindUI();this.applyQuality(saved.global.quality);
    window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.resize();this.overview.fit(this.worldManager.currentWorldId==='HOME'&&this.transition.state==='OVERVIEW'&&!this.focus.active&&this.focus.selected==='overview');});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')this.persist(true);});window.addEventListener('beforeunload',()=>this.persist(true));
    this.loop=new GameLoop(this.update);this.loop.start();void this.initialize(saved);
  }
  private async initialize(saved:SaveData){
    this.cover.style.opacity='1';this.caption.hidden=false;this.caption.textContent='正在展开航海图……';
    const previewWorld=import.meta.env.DEV?new URLSearchParams(location.search).get('world'):null;
    const id=previewWorld==='cottage'?'COTTAGE':previewWorld==='farm'?'FARM':previewWorld==='travel'?'TRAVEL':saved.lastSuccessfulWorld==='HOME'&&saved.player.currentSpawnId==='cottage_entry'?'COTTAGE':saved.lastSuccessfulWorld;
    try {await this.worldManager.switchTo(id,this.clock.simulationTime,id==='HOME'&&saved.player.currentSpawnId==='home_cottage_exit'?'home_cottage_exit':undefined);this.configureEnvironment();
      if(id==='COTTAGE'){this.player.currentWorldId='HOME';this.lastSuccessfulWorld='HOME';this.player.currentSpawnId='cottage_entry';this.resumeExplore();}else if(id==='HOME'&&saved.player.currentSpawnId==='home_cottage_exit'){this.resumeExplore();}else if(id==='FARM'){this.player.currentWorldId='FARM';this.lastSuccessfulWorld='FARM';this.resumeExplore();}else if(id==='TRAVEL'){this.overview.suspend();this.camera.position.set(0,4.8,-3);this.camera.lookAt(0,3.6,1);}
      if(import.meta.env.DEV)configurePreview(this);
      if(this.explorer.active)this.transition.state='EXPLORE';this.ready=true;this.cover.style.opacity='0';this.caption.hidden=true;this.hud.setSpeed(this.clock.timeScale,this.clock.paused);this.hud.setActive('storm',this.weather.storm);this.hud.updateQuests(new Set(this.player.discoveries));
    }catch(error){try{this.hud.notify('航线暂时无法抵达，正在返回家园岛……');await this.worldManager.switchTo('HOME',this.clock.simulationTime);this.ready=true;this.finishArrival('HOME');}catch(fatal){this.showFatal(fatal??error);}}
  }
  private showFatal(error:unknown){console.error(error);this.ready=false;this.explorer.suspend();this.cover.style.opacity='0';this.caption.hidden=false;this.caption.textContent='加载失败，请刷新页面重试。';document.body.classList.remove('traveling');}
  private configureEnvironment(){
    const home=this.worldManager.currentWorldId==='HOME',inside=this.worldManager.currentWorldId==='COTTAGE';document.body.classList.toggle('farm-world',!home);document.body.classList.toggle('cottage-world',inside);
    this.weather.visible=!inside;this.waterEntry.visible=!inside;this.dayNight.sky.visible=!inside;this.dayNight.sun.visible=!inside;this.dayNight.ambient.visible=!inside;this.dayNight.hemi.visible=!inside;
    this.dayNight.sky.scale.setScalar(home?1:3);this.dayNight.sky.position.set(0,home?0:-6,0);
    this.weather.scale.set(home?1:3,home?1:2,home?1:5);this.weather.position.set(0,home?0:-3,0);
    const shadow=this.dayNight.sun.shadow.camera;Object.assign(shadow,home?{left:-13,right:13,top:10,bottom:-10,far:35}:{left:-25,right:25,top:25,bottom:-25,far:90});shadow.updateProjectionMatrix();
    if(this.worldManager.currentWorld?.navigation)this.explorer.setNavigation(this.worldManager.currentWorld.navigation);
  }
  private resumeExplore(){this.overview.suspend();this.focus.cancel();this.explorer.enter(false,this.spawn);this.camera.far=this.worldManager.currentWorldId==='HOME'?40:150;this.camera.updateProjectionMatrix();this.transition.state='EXPLORE';this.playerFeedback.reset();this.hud.setExplore(true);this.hud.setTransition(false);this.renderer.domElement.focus();}
  private resumeFurnitureExplore(){this.explorer.resumeFromPanel();this.hud.setTransition(false);}
  private sleepAtHome(){
    if(this.sleepTransition.active||this.worldManager.currentWorldId!=='COTTAGE'){this.resumeFurnitureExplore();return;}
    this.explorer.beginTransitionFromPanel();this.hud.setTransition(true);this.playerFeedback.reset();document.body.classList.add('sleeping');
    this.caption.hidden=true;this.cover.style.opacity='0';this.sleepOverlay.show();
    let completed=false;
    this.sleepTransition.start(()=>{
      this.gameplay.home.sleep();completed=true;
      this.hud.updateClock(this.clock,this.weather.storm);this.persist(true);
    },()=>{
      this.sleepOverlay.hide();this.cover.style.opacity='0';this.caption.hidden=true;document.body.classList.remove('sleeping');this.resumeFurnitureExplore();
      if(completed)this.hud.notify(`新的一天开始了 · 体力已恢复至 ${this.gameplay.progress.maxEnergy}`);
    },error=>{console.warn('Sleep failed',error);this.hud.notify('暂时无法休息，请稍后再试。');});
  }
  private finishArrival(id:PlayableWorldId){
    const world=this.worldManager.currentWorld!;world.setTravelPresentation?.(false);world.boat?.reset();this.configureEnvironment();this.spawn=world.getSpawnPoint(destination(id).arrivalSpawnId);this.resumeExplore();
    if(id==='HOME'&&world.interaction)this.player.discoveries=[...world.interaction.discovered];
    this.lastSuccessfulWorld=id;this.player.currentWorldId=id;this.player.currentSpawnId=this.spawn.id;this.cover.style.opacity='0';this.caption.hidden=true;document.body.classList.remove('traveling');this.hud.updateQuests(new Set(this.player.discoveries));this.persist(true);
  }
  private captureSave():SaveData {
    const world=this.worldManager.currentWorld;if(world?.id==='HOME'&&world.interaction){this.player.discoveries=[...world.interaction.discovered];this.states.set('HOME',{lastSimulatedGameTime:this.clock.simulationTime,discoveries:this.player.discoveries});}
    return {version:2,...this.gameplay.snapshot(),gameTime:this.clock.snapshot(),player:structuredClone(this.player),worlds:this.states.snapshot(),lastSuccessfulWorld:this.lastSuccessfulWorld,global:{storm:this.weather.storm,intensity:this.weather.intensity,quality:this.renderer.quality}};
  }
  private persist(immediate=false){if(!this.ready||(this.preview&&!this.persistPreview))return;if(immediate)this.save.flush(()=>this.captureSave());else this.save.schedule(()=>this.captureSave());}
  private interactionContext(world:GameWorld):InteractionContext {
    return {worldId:world.id,position:{x:this.camera.position.x,y:this.camera.position.y,z:this.camera.position.z},gameplay:this.gameplay};
  }
  private async interact(){
    const world=this.worldManager.currentWorld,interaction=world?.interaction;
    if(!this.ready||!this.explorer.active||!world||!interaction||interaction.busy||this.worldManager.state!=='READY'||this.transition.active||this.travel.active||this.doorTransition.active||this.sleepTransition.active||this.panel.open||this.homePanel.open)return;
    this.interactionCount++;
    const result=await interaction.interact(this.interactionContext(world),this.interactionActions);
    if(this.worldManager.currentWorld!==world)return;
    if(result.status==='error')console.warn('Interaction failed',result.error);
    if(result.discovery){
      this.player.discoveries=[...interaction.discovered];this.hud.updateQuests(interaction.discovered);
      this.hud.showDiscovery(result.discovery.id,result.discovery.count);world.triggerDiscovery?.(result.discovery.id);this.sound.play('ui-discover');
    }else if(result.message)this.hud.notify(result.message);
    if(result.changed)this.persist();
  }
  private useCottageDoor(entering:boolean):boolean{
    if(this.doorTransition.active||this.worldManager.state!=='READY')return false;
    const previous:SpawnPoint={id:'door_recovery',position:this.camera.position.toArray(),lookAt:this.camera.position.clone().add(this.camera.getWorldDirection(new Vector3())).toArray()};
    this.persist(true);this.explorer.suspend(true);this.overview.suspend();this.hud.closeDiscovery();this.hud.setInteractionPrompt();this.hud.setTransition(true);this.playerFeedback.reset();
    document.body.classList.add('door-transition');this.caption.hidden=false;this.caption.textContent=entering?'推门入屋 · 灯火正暖':'走出小屋 · 海风拂面';
    return this.doorTransition.start(async()=>{
      const id=entering?'COTTAGE':'HOME',prepared=await this.worldManager.prepare(id,this.clock.simulationTime);
      await this.worldManager.switchTo(id,this.clock.simulationTime,entering?'cottage_entry':'home_cottage_exit',prepared);
      this.configureEnvironment();this.camera.position.fromArray(this.spawn.position);this.camera.lookAt(...this.spawn.lookAt);this.camera.fov=68;this.camera.updateProjectionMatrix();
      this.player.currentWorldId='HOME';this.lastSuccessfulWorld='HOME';this.player.currentSpawnId=entering?'cottage_entry':'home_cottage_exit';
    },()=>{
      this.resumeExplore();this.cover.style.opacity='0';this.caption.hidden=true;document.body.classList.remove('door-transition');this.renderer.domElement.focus();this.persist(true);
    },error=>{
      console.warn('Cottage transition failed',error);this.spawn=previous;this.configureEnvironment();if(this.worldManager.currentWorld)this.worldManager.state='READY';
      this.caption.textContent='暂时无法开门，已返回原处';this.hud.notify('小屋暂时无法加载，请稍后再试。');
    });
  }
  private applyQuality(quality:Quality){this.renderer.quality=quality;this.renderer.resize();this.worldManager.applyQuality(quality);this.weather.rain.setCount(QUALITY[quality].rain);this.waterEntry.setDensity(QUALITY[quality].waterStep);this.hud.element.querySelector('.quality')!.textContent=`PIXEL / ${quality}`;}
  private bindUI(){
    this.hud.element.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(button=>button.addEventListener('click',()=>{this.clock.timeScale=Number(button.dataset.speed);this.clock.paused=false;this.hud.setSpeed(this.clock.timeScale,false);this.persist();}));
    this.hud.element.querySelector('[data-action="pause"]')!.addEventListener('click',()=>{this.clock.paused=!this.clock.paused;this.hud.setSpeed(this.clock.timeScale,this.clock.paused);this.persist();});
    this.hud.element.querySelector('[data-action="storm"]')!.addEventListener('click',()=>{this.weather.storm=!this.weather.storm;this.hud.setActive('storm',this.weather.storm);this.persist();});
    this.hud.element.querySelector('[data-action="explore"]')!.addEventListener('click',()=>{
      if(!this.ready||this.transition.active||this.travel.active||this.doorTransition.active||this.sleepTransition.active||this.panel.open||this.homePanel.open||this.worldManager.currentWorldId!=='HOME')return;
      const entering=this.transition.state==='OVERVIEW';this.focus.cancel();this.overview.suspend();this.explorer.suspend();
      if(entering){const spawn=this.worldManager.currentWorld!.getSpawnPoint();this.destinationCamera.position.fromArray(spawn.position);this.destinationCamera.lookAt(...spawn.lookAt);}else{this.destinationCamera.position.copy(this.overview.position0);this.destinationCamera.lookAt(this.overview.target0);}
      this.transition.start(entering?'EXPLORE':'OVERVIEW',this.destinationCamera.position,this.destinationCamera.quaternion,entering?68:34);this.hud.setTransition(true);(document.activeElement as HTMLElement)?.blur();
    });
    this.hud.element.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(button=>button.addEventListener('click',()=>{if(this.transition.state!=='OVERVIEW'||this.worldManager.currentWorldId!=='HOME'||this.travel.active)return;this.overview.suspend();this.focus.start(button.dataset.focus as FocusId,this.worldManager.currentWorld!.getFocusPosition!(),this.overview.position0,this.overview.target0);this.hud.element.querySelectorAll('[data-focus]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));}));
    const soundButton=this.hud.element.querySelector<HTMLButtonElement>('[data-action="sound"]')!;soundButton.addEventListener('click',()=>{soundButton.disabled=true;void this.sound.toggle().then(enabled=>this.hud.setActive('sound',enabled)).catch(()=>this.hud.notify('声音暂时无法启用，请再次点击重试。')).finally(()=>soundButton.disabled=false);});
    this.hud.element.querySelector('.quality')!.addEventListener('click',()=>{const options:Quality[]=['LOW','MEDIUM','HIGH'];this.applyQuality(options[(options.indexOf(this.renderer.quality)+1)%3]);this.persist();});
  }
  private animateTravel(delta:number,time:number,storm:number){
    const state=this.travel.state,p=this.travel.progress*this.travel.progress*(3-2*this.travel.progress),world=this.worldManager.currentWorld,boat=world?.boat;if(!boat)return;
    if(state!==this.previousTravelState){if(state==='DISEMBARKING')this.travelCamera.capture();this.previousTravelState=state;}
    let cover=0;
    if(state==='DEPARTING'||state==='SAILING_OUT'){const t=state==='DEPARTING'?p*.4:.4+p*.6;boat.position.x=this.dock.x+Math.sin(boat.berthYaw)*t*boat.departureDistance;boat.position.z=this.dock.z+Math.cos(boat.berthYaw)*t*boat.departureDistance;}
    if(state==='SAILING_OUT')cover=p*p;
    if(state==='WORLD_SWITCH')cover=1;
    if(state==='SAILING_IN'&&world?.id==='TRAVEL'){boat.position.z=p*3;cover=p<.3?1-p/.3*.7:p>.75?.3+(p-.75)/.25*.7:.3;}
    if(state==='ARRIVING'){boat.position.x=this.dock.x+Math.sin(boat.berthYaw)*(1-p)*boat.departureDistance;boat.position.z=this.dock.z+Math.cos(boat.berthYaw)*(1-p)*boat.departureDistance;cover=(1-p)**2;}
    boat.update(time,storm);
    if(state==='DISEMBARKING')this.travelCamera.disembark(this.spawn,p);else this.travelCamera.follow(boat,delta,state==='BOARDING'?p:1);
    this.cover.style.opacity=String(cover);this.caption.textContent=state==='BOARDING'?'解缆 · 准备启航':state==='ARRIVING'||state==='DISEMBARKING'?`正在抵达 · ${destination(this.travel.target!).name}`:'向着海雾深处 · 航行中';
  }
  private update=(delta:number)=>{
    const cpuStart=performance.now();if(!this.ready){this.renderer.render(this.scene,this.camera);return;}
    if(this.travel.active||this.doorTransition.active||this.sleepTransition.active||this.homePanel.open)this.clock.updateAnimation(delta);else this.clock.update(delta);
    const time=this.clock.elapsed;this.weather.update(this.clock.paused?0:delta,time);const storm=this.weather.intensity;
    const context:WorldUpdateContext={delta,time,gameTime:this.clock.simulationTime,storm,dayTime:this.clock.normalizedDayTime,night:1-daylightAt(this.clock.normalizedDayTime),flash:this.weather.lightning.flash,player:this.explorer.active?this.camera.position:undefined};
    this.worldManager.currentWorld?.prepare?.(context);this.travel.update(delta);
    const home=this.worldManager.currentWorldId==='HOME';let water=this.worldManager.currentWorld?.navigation?.waterLevel(this.camera.position.x,this.camera.position.z,time,storm)??3.3;
    if(!this.travel.active&&!this.doorTransition.active&&!this.sleepTransition.active&&this.travel.state!=='ERROR'&&!this.panel.open&&!this.homePanel.open){
      if(this.transition.active){if(this.transition.update(delta)){if(this.transition.state==='EXPLORE')this.resumeExplore();else{this.explorer.exit();this.focus.selected='overview';this.overview.target.copy(this.overview.target0);this.overview.minDistance=12;this.overview.enabled=true;this.overview.update();}this.hud.setExplore(this.explorer.active);this.hud.setTransition(false);}}
      else if(this.explorer.active)this.explorer.update(delta,water);
      else if(home){if(this.focus.active){if(this.focus.update(delta)){this.overview.minDistance=this.focus.selected==='overview'?12:2;this.overview.enabled=true;this.overview.update();}}else this.overview.update();}
    }
    water=this.worldManager.currentWorld?.navigation?.waterLevel(this.camera.position.x,this.camera.position.z,time,storm)??3.3;
    const underwater=this.explorer.active&&this.explorer.underwater;this.scene.fog=underwater?this.underwaterFog:(home&&!this.travel.active)||this.worldManager.currentWorldId==='COTTAGE'?null:this.seaFog;
    this.waterEntry.update(delta,this.camera.position,this.explorer.active,this.explorer.swimming,this.explorer.sprinting,water);
    if(this.explorer.active){this.playerFeedback.update(delta,this.camera.position,this.explorer.grounded,this.explorer.swimming,this.explorer.sprinting);this.camera.fov=this.playerFeedback.fov;this.camera.updateProjectionMatrix();}
    document.body.classList.toggle('underwater',underwater);this.dayNight.update(this.clock.normalizedDayTime,time,storm,this.weather.lightning.flash);
    if(this.scene.fog===this.seaFog)this.seaFog.color.copy(this.scene.background as Color);this.cover.style.background=this.doorTransition.active||this.sleepTransition.active?'#171b20':(this.scene.background as Color).getStyle();
    this.worldManager.update(context);if(this.doorTransition.active){this.doorTransition.update(delta);this.cover.style.opacity=String(this.doorTransition.opacity);}if(this.travel.active)this.animateTravel(delta,time,storm);
    if(this.sleepTransition.active){this.sleepTransition.update(delta);if(this.sleepTransition.active)this.sleepOverlay.render(this.sleepTransition.progress);}
    this.sound.update(time,storm,this.worldManager.currentWorldId==='COTTAGE'?'INDOOR':underwater?'UNDERWATER':this.explorer.active||this.travel.active?'ISLAND':'OVERVIEW',this.weather.lightning.flash);
    const interaction=this.worldManager.currentWorld?.interaction;if(this.explorer.active)interaction?.update(this.camera.position);
    this.hudTimer+=delta;if(this.hudTimer>.25){this.hudTimer=0;this.hud.updateClock(this.clock,this.weather.storm);this.hud.updateHomeStats(this.gameplay.progress,this.worldManager.currentWorldId==='COTTAGE');this.hud.updateDepth(underwater,water-this.camera.position.y);
      if(import.meta.env.DEV){Object.assign(this.renderer.domElement.dataset,{world:this.worldManager.currentWorldId,travel:this.travel.state,door:this.doorTransition.state,sleep:this.sleepTransition.state,energy:String(this.gameplay.progress.energy),cameraMode:this.transition.state,waterEntries:String(this.waterEntry.entries),waterLeaves:String(this.waterEntry.leaves),fov:this.camera.fov.toFixed(2),gameTime:String(this.clock.simulationTime),storm:String(this.weather.storm),quality:this.renderer.quality,discoveries:this.player.discoveries.join(','),completedTrips:String(this.completedTrips),interactionCount:String(this.interactionCount),audio:JSON.stringify(this.sound.diagnostics)});}
      if(this.explorer.active){const world=this.worldManager.currentWorld!,prompt=interaction?.getPrompt(this.interactionContext(world),this.interactionActions);this.hud.setInteractable(prompt?.available??false);this.hud.setInteractionPrompt(prompt);this.hud.setHint(world.id==='COTTAGE'?'WASD 移动 · E 使用家具 / 出屋':'WASD 移动 · 拖动 / 鼠标观察 · Space 上升 · C 下潜 · E 交互');}
      else this.hud.setInteractionPrompt();
    }
    const bob=this.explorer.active?this.playerFeedback.offsetY+this.explorer.renderOffsetY:0;this.camera.position.y+=bob;this.renderer.render(this.scene,this.camera);this.camera.position.y-=bob;this.performance.update(performance.now()-cpuStart);
  };
}
