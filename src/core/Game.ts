import { SettingsState } from '../state/GameSettings';
import type { GameSettings } from '../state/GameSettings';
import { SettingsPanel } from '../ui/SettingsPanel';
import '../styles/settings.css';
import { CollectionPanel } from '../ui/CollectionPanel';
import '../styles/collections.css';
import { DialoguePanel } from '../ui/DialoguePanel';
import { CommissionPanel } from '../ui/CommissionPanel';
import { NPCS } from '../gameplay/npc/NpcRegistry';
import '../styles/commissions.css';
import { dialogueFacts } from '../gameplay/npc/DialogueFacts';
import '../styles/dialogue.css';
import { CalendarPanel } from '../ui/CalendarPanel';
import { dateLabel } from '../gameplay/calendar/CalendarSystem';
import '../styles/calendar.css';
import { ProgressionPanel } from '../ui/ProgressionPanel';
import { ProgressionView } from '../ui/ProgressionView';
import '../styles/progression.css';
import { DoorTransition } from '../systems/DoorTransition';
import { SleepTransition } from '../systems/SleepTransition';
import { Color,FogExp2,PerspectiveCamera,Quaternion,Scene,Vector3 } from 'three';
import { QUALITY,Renderer } from './Renderer';
import type { Quality } from './Renderer';
import { GameLoop } from './GameLoop';
import { GameClock } from './GameClock';
import { HUD } from '../ui/HUD';
import { OverviewController } from '../controls/OverviewController';
import { ExploreController } from '../controls/ExploreController';
import { VehicleController } from '../controls/VehicleController';
import { VehicleHUD } from '../ui/VehicleHUD';
import { FarmHUD } from '../ui/FarmHUD';
import { TradePanel } from '../ui/TradePanel';
import { DayNightSystem } from '../systems/DayNightSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { SoundSystem } from '../systems/SoundSystem';
import { CameraTransitionSystem } from '../systems/CameraTransitionSystem';
import { SceneFocusSystem } from '../systems/SceneFocusSystem';
import type { FocusId } from '../systems/SceneFocusSystem';
import { PlayerFeedback } from '../systems/PlayerFeedback';
import { PlayerCharacter } from '../systems/PlayerCharacter';
import { WaterEntrySystem } from '../systems/WaterEntrySystem';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { configurePreview } from './Preview';
import { WorldManager } from '../worlds/WorldManager';
import { WorldRegistry } from '../worlds/WorldRegistry';
import type { GameWorld,SpawnPoint,WorldUpdateContext,WorldStorageContainer } from '../worlds/types';
import { WorldStateRegistry } from '../state/WorldStateRegistry';
import { SaveSystem,defaultSave } from '../state/SaveSystem';
import type { SaveData } from '../state/SaveSystem';
import { sessionStorageForTrailer,trailerEnabled } from './capture/TrailerIsolation';
import type { TrailerCaptureMode } from './capture/TrailerCaptureMode';
import type { CaptureWorld } from './capture/TrailerShots';
import type { PlayerState,PlayableWorldId } from '../state/PlayerState';
import { DestinationPanel } from '../ui/DestinationPanel';
import { HomePanel } from '../ui/HomePanel';
import { SleepOverlay } from '../ui/SleepOverlay';
import { CookingPanel } from '../ui/CookingPanel';
import { InventoryPanel } from '../ui/InventoryPanel';
import { HotbarView } from '../ui/HotbarView';
import { FishingPresentation } from '../systems/FishingPresentation';
import { FISHING_SPOT,FISHING_WATER } from '../gameplay/FishingCatalog';
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
import '../styles/production.css';
import '../styles/inventory.css';
import '../styles/vehicle.css';
import '../styles/farm-feedback.css';
import '../styles/trade.css';
import '../styles/farm-weather.css';
import '../styles/ui-theme.css';
import '../styles/ui-screens.css';

export class Game {
  readonly captureEnabled=trailerEnabled(import.meta.env.DEV,new URLSearchParams(location.search));
  private trailer?:TrailerCaptureMode;
  readonly renderer=new Renderer();readonly scene=new Scene();readonly camera=new PerspectiveCamera(34,innerWidth/innerHeight,.12,200);
  readonly clock=new GameClock();readonly weather=new WeatherSystem();readonly sound=new SoundSystem();
  readonly hud:HUD;readonly loop:GameLoop;readonly dayNight:DayNightSystem;readonly overview:OverviewController;readonly explorer:ExploreController;
  readonly performance:PerformanceMonitor;readonly transition=new CameraTransitionSystem(this.camera);readonly focus:SceneFocusSystem;
  readonly playerFeedback=new PlayerFeedback();readonly waterEntry=new WaterEntrySystem();readonly worldManager:WorldManager;
  readonly character=new PlayerCharacter();
  characterPreview?:{feet:Vector3;yaw:number;pose:'IDLE'|'WALK'|'RUN'|'SEATED'};
  readonly player:PlayerState;readonly travel:TravelSystem;readonly doorTransition=new DoorTransition();
  readonly sleepTransition=new SleepTransition();
  readonly gameplay:GameplayFoundation;
  readonly vehicleController:VehicleController;private vehicleHUD=new VehicleHUD();
  private farmHUD=new FarmHUD();
  readonly settings:SettingsState;private settingsPanel:SettingsPanel;private soundBusy=false;private soundWanted=false;
  private tradePanel:TradePanel;
  private dialoguePanel:DialoguePanel;private dialogueAim?:Quaternion;private dialogueReturn?:Quaternion;
  private commissionPanel:CommissionPanel;private collectionPanel:CollectionPanel;
  private calendarPanel:CalendarPanel;private progressionPanel:ProgressionPanel;private progressionView:ProgressionView;
  private interactionActions=new InteractionActions();
  private save:SaveSystem;private states=new WorldStateRegistry();private lastSuccessfulWorld:PlayableWorldId='HOME';
  private panel:DestinationPanel;private travelCamera=new TravelCamera(this.camera);private cover=document.createElement('div');private caption=document.createElement('div');
  private homePanel:HomePanel;
  private sleepOverlay:SleepOverlay;
  private cookingPanel:CookingPanel;
  private inventoryPanel:InventoryPanel;
  private hotbarView:HotbarView;
  private fishingPresentation:FishingPresentation;
  private destinationCamera=new PerspectiveCamera();private underwaterFog=new FogExp2('#087b83',.14);private seaFog=new FogExp2('#899d9c',.025);
  private staged:GameWorld|null=null;private spawn:SpawnPoint={id:'',position:[0,0,0],lookAt:[0,0,-1]};
  private completedTrips=0;private interactionCount=0;
  private dock=new Vector3();private previousTravelState='IDLE';private hudTimer=0;private ready=false;
  private readonly preview=import.meta.env.DEV&&['view','world','hour','day','weather','fail'].some(key=>new URLSearchParams(location.search).has(key));
  private readonly persistPreview=import.meta.env.DEV&&new URLSearchParams(location.search).get('persist')==='1';
  private readonly diagnostics=import.meta.env.DEV&&(this.preview||new URLSearchParams(location.search).get('debug')==='1');
  constructor(root:HTMLElement){
    root.append(this.renderer.domElement);this.renderer.domElement.tabIndex=0;this.scene.background=new Color('#21343a');this.scene.add(this.weather,this.waterEntry,this.character);
    this.dayNight=new DayNightSystem(this.scene);this.overview=new OverviewController(this.camera,this.renderer.domElement);this.focus=new SceneFocusSystem(this.camera,this.overview.target);
    this.explorer=new ExploreController(this.camera,this.renderer.domElement);this.hud=new HUD(root);this.panel=new DestinationPanel(root);this.homePanel=new HomePanel(root);this.sleepOverlay=new SleepOverlay(root);
    this.vehicleController=new VehicleController(this.camera,this.renderer.domElement,this.explorer);this.hud.element.append(this.vehicleHUD.element);
    this.hud.element.append(this.farmHUD.element);
    this.vehicleController.onInteract=()=>{void this.interact();};
    this.vehicleController.onHitch=()=>{void this.interact('vehicle_hitch');};
    this.vehicleController.onWork=()=>{void this.interact('vehicle_work');};
    this.vehicleController.onMachine=()=>{void this.interact('vehicle_machine');};
    this.vehicleController.onUnload=()=>{void this.interact('vehicle_unload');};
    this.vehicleController.onSeed=cropId=>{void this.interact(`vehicle_seed:${cropId??'next'}`);};
    this.vehicleController.onDismount=spawn=>{this.explorer.enter(false,spawn);this.camera.far=150;this.camera.updateProjectionMatrix();this.playerFeedback.reset();this.renderer.domElement.focus();};
    this.vehicleController.onPark=()=>this.persist(true);
    this.cookingPanel=new CookingPanel(root);
    this.inventoryPanel=new InventoryPanel(root);
    this.settingsPanel=new SettingsPanel(root);
    this.collectionPanel=new CollectionPanel(root);this.commissionPanel=new CommissionPanel(root);this.dialoguePanel=new DialoguePanel(root);this.calendarPanel=new CalendarPanel(root);this.tradePanel=new TradePanel(root);this.progressionPanel=new ProgressionPanel(root);this.progressionView=new ProgressionView(this.hud.element,()=>this.openProgression());
    this.cover.className='travel-cover';this.caption.className='travel-caption';this.caption.hidden=true;root.append(this.cover);this.hud.element.append(this.caption);
    // Access to localStorage itself can throw in restricted embeds.
    this.save=new SaveSystem(sessionStorageForTrailer(this.captureEnabled,()=>({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)})));
    const saved=this.preview&&!this.persistPreview?defaultSave():this.save.load();this.player=saved.player;this.lastSuccessfulWorld=saved.lastSuccessfulWorld;this.clock.restore(saved.gameTime);this.states.restore(saved.worlds);
    this.settings=new SettingsState(saved.settings,settings=>{this.applySettings(settings);this.persist();});
    this.gameplay=new GameplayFoundation(this.clock,saved,undefined,immediate=>this.persist(immediate));
    this.gameplay.collections.onDiscover=entry=>{this.hud.notify(`航海手记新增 · ${entry.name}`);};
    this.gameplay.calendar.onSeasonChange=date=>{this.hud.notify(`${dateLabel(date)} · 季节悄然更替，已有作物继续生长。`);this.sound.play('ui-discover');};
    this.gameplay.progression.onComplete=completion=>{this.progressionView.completed(completion,this.gameplay.progression);this.sound.play('ui-discover');};
    this.vehicleController.onDrive=()=>{this.gameplay.progression.record('vehicle.drive');};
    this.hotbarView=new HotbarView(this.gameplay.hotbar);this.hotbarView.element.hidden=true;this.hud.element.append(this.hotbarView.element);this.hotbarView.onSelect=()=>this.renderer.domElement.focus();
    this.fishingPresentation=new FishingPresentation(this.camera,this.gameplay.fishing);this.scene.add(this.fishingPresentation);
    this.gameplay.fishing.onEvent=event=>{this.hud.notify(event.message);if(event.kind==='bite'||event.kind==='caught')this.sound.play('ui-discover');if(event.kind==='caught'||event.kind==='stored')this.persist(true);};
    this.gameplay.cooking.onResult=result=>{this.cookingPanel.refresh(result.message);this.hud.notify(result.message);if(result.ok){this.sound.play('ui-discover');this.persist(true);}};
    this.weather.restore(saved.global.weather,saved.global.storm,saved.global.intensity,saved.global.weather===undefined||saved.global.weather.scheduledDay===undefined?this.gameplay.calendar.date.dayIndex:undefined);
    const failure=import.meta.env.DEV?new URLSearchParams(location.search).get('fail'):null;
    const registry=new WorldRegistry().register('HOME',async()=>{const world=new (await import('../worlds/home/HomeWorld')).HomeWorld();if(failure==='fallback'&&this.worldManager.currentWorldId==='TRAVEL')world.load=()=>{throw new Error('DEV: HOME fallback failure');};return world;}).register('FARM',async()=>{const world=new (await import('../worlds/farm/FarmWorld')).FarmWorld();if(failure==='farm'||failure==='fallback')world.load=()=>{throw new Error('DEV: FARM load failure');};return world;}).register('COTTAGE',async()=>{const world=new (await import('../worlds/cottage/CottageWorld')).CottageWorld();if(failure==='cottage')world.load=async()=>{throw new Error('DEV: cottage load failure');};return world;}).register('TRAVEL',async()=>new (await import('../worlds/travel/TravelWorld')).TravelWorld());
    this.worldManager=new WorldManager(this.scene,registry,this.states,spawn=>{this.spawn=spawn;},this.gameplay);
    this.travel=new TravelSystem(this.player,{
      board:()=>{this.explorer.suspend(true);this.overview.suspend();this.focus.cancel();this.transition.state='EXPLORE';this.playerFeedback.reset();this.hud.closeDiscovery();this.worldManager.currentWorld?.setTravelPresentation?.(true);this.worldManager.currentWorld!.boat!.reset();this.dock.copy(this.worldManager.currentWorld!.boat!.position);this.travelCamera.capture();document.body.classList.add('traveling');this.caption.hidden=false;this.caption.textContent='解缆 · 准备启航';},
      switchToTravel:async()=>{await this.worldManager.switchTo('TRAVEL',this.clock.simulationTime);this.configureEnvironment();this.worldManager.currentWorld!.boat!.yaw=0;this.travelCamera.capture();},
      prepareDestination:async id=>{this.staged=await this.worldManager.prepare(id,this.clock.simulationTime);},
      switchToDestination:async id=>{const staged=this.staged;this.staged=null;await this.worldManager.switchTo(id,this.clock.simulationTime,destination(id).arrivalSpawnId,staged??undefined);const world=this.worldManager.currentWorld!;world.setTravelPresentation?.(true);this.configureEnvironment();this.dock.copy(world.boat!.berth);const boat=world.boat!;boat.position.copy(boat.berth);boat.position.x+=Math.sin(boat.berthYaw)*boat.departureDistance;boat.position.z+=Math.cos(boat.berthYaw)*boat.departureDistance;boat.yaw=boat.berthYaw+Math.PI;this.camera.position.copy(boat.position).add(new Vector3(-Math.sin(boat.yaw)*3.4,2.7,-Math.cos(boat.yaw)*3.4));this.camera.lookAt(world.boat!.position);},
      arrive:(id,minutes)=>{this.completedTrips++;this.gameplay.time.advanceMinutes(minutes);this.player.lastTravelDestination=id;this.finishArrival(id);if(id==='FARM')this.gameplay.progression.record('farm.visit');},
      recoverHome:async error=>{console.warn('Travel failed',error);this.hud.notify('航线暂时无法抵达，正在返回家园岛……');this.staged?.dispose();this.staged=null;await this.worldManager.switchTo('HOME',this.clock.simulationTime);this.finishArrival('HOME');},
      fatal:error=>this.showFatal(error),
    });
    this.waterEntry.onEnter=()=>{this.playerFeedback.splash();this.sound.play('water-enter');};this.playerFeedback.onStep=surface=>this.sound.footstep(surface);
    this.interactionActions.register('TRAVEL',()=>{
      this.explorer.suspendForPanel();this.hud.setInteractionPrompt();this.panel.show(this.player,id=>{this.explorer.beginTransitionFromPanel();this.persist(true);this.travel.begin(id);},()=>{this.explorer.resumeFromPanel();});
      return {status:'success'};
    }).register('NPC_DIALOGUE',(_context,target)=>({status:this.openDialogue(target.id.replace('npc:',''))?'success':'unavailable',message:this.gameplay.fishing.active?'请先收起鱼竿，再与岛民交谈。':undefined})).register('ENTER_COTTAGE',()=>({status:this.useCottageDoor(true)?'success':'unavailable'}))
      .register('EXIT_COTTAGE',()=>({status:this.useCottageDoor(false)?'success':'unavailable'}))
      .register('HOME_SLEEP',()=>{
        this.explorer.suspendForPanel();this.hud.closeDiscovery();this.hud.setInteractionPrompt();
        this.homePanel.showSleep(this.gameplay,()=>this.sleepAtHome(),()=>this.resumeFurnitureExplore());
        return {status:'success'};
      }).register('HOME_STORAGE',()=>{
        this.openInventory(true);
        return {status:'success'};
      }).register('FARM_STORAGE',()=>{this.openInventory(true,true);return {status:'success'};})
      .register('FARM_TRAILER_STORAGE',(_context,target)=>{
        const container=this.worldManager.currentWorld?.storageContainers?.find(c=>c.id===target.id);
        if(!container)return {status:'unavailable',message:'拖车货仓暂时不可用。'};
        this.openInventory(true,false,container);return {status:'success'};
      })
      .register('HOME_STOVE',()=>{this.openCooking('stove');return {status:'success'};})
      .register('TRADE',()=>({status:this.openTrade()?'success':'unavailable',message:this.gameplay.fishing.active?'请先收起鱼竿再交易。':undefined}))
      .register('FISH',()=>{
        const idle=!this.gameplay.fishing.active,result=this.gameplay.fishing.interact();
        if(idle&&this.gameplay.fishing.state==='CASTING'){this.hud.closeDiscovery();this.camera.lookAt(FISHING_WATER.x,3.38,FISHING_WATER.z);this.explorer.syncLook();this.playerFeedback.reset();}
        return result;
      }).register('ENTER_VEHICLE',(_context,target)=>{
        const vehicle=this.worldManager.currentWorld?.vehicles?.find(v=>v.id===target.id);
        if(!vehicle)return {status:'unavailable',message:'车辆暂时不可用。'};
        const result=this.vehicleController.board(vehicle);if(result.status==='success'){this.overview.suspend();this.focus.cancel();this.playerFeedback.reset();this.hud.closeDiscovery();this.hud.setInteractionPrompt();this.persist(true);}return result;
      }).register('EXIT_VEHICLE',()=>this.vehicleController.dismount());
    this.explorer.onFood=()=>this.openCooking('food');this.explorer.onFishingMode=()=>this.toggleFishingMode();
    this.explorer.onInventory=()=>this.openInventory();this.explorer.onHotbarSelect=index=>this.gameplay.hotbar.select(index);this.explorer.onHotbarUse=()=>this.useHotbar();
    this.explorer.onPrimaryDown=()=>this.gameplay.fishing.press();this.explorer.onPrimaryUp=()=>this.gameplay.fishing.release();
    this.explorer.onInteract=()=>{void this.interact();};this.explorer.onLockChange=locked=>{if(this.explorer.active)this.hud.setHint(locked?'WASD 移动 · Space 上升 · C 下潜 · E 交互':'拖动观察 · WASD 移动 · 双击画面锁定鼠标');};
    this.performance=new PerformanceMonitor(this.renderer,this.hud.element.querySelector<HTMLElement>('#fps')!,this.camera);this.bindUI();this.applyQuality(saved.global.quality);this.applySettings(this.settings.snapshot());
    window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.resize();if(!this.captureEnabled)this.overview.fit(this.worldManager.currentWorldId==='HOME'&&this.transition.state==='OVERVIEW'&&!this.focus.active&&this.focus.selected==='overview');});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){this.gameplay.fishing.cancel('钓鱼已暂停，本次鱼竿已收起。');this.persist(true);}});window.addEventListener('beforeunload',()=>this.persist(true));
    window.addEventListener('pagehide',()=>this.persist(true));
    window.addEventListener('keydown',event=>{if(event.code==='Escape'&&this.gameplay.fishing.active)this.gameplay.fishing.cancel();});
    this.loop=new GameLoop(this.update);this.loop.start();void this.initialize(saved);
  }
  private async initialize(saved:SaveData){
    this.cover.style.opacity='1';this.caption.hidden=false;this.caption.textContent='正在展开航海图……';
    const previewWorld=import.meta.env.DEV?new URLSearchParams(location.search).get('world'):null;
    const id=this.captureEnabled?'HOME':previewWorld==='home'?'HOME':previewWorld==='cottage'?'COTTAGE':previewWorld==='farm'?'FARM':previewWorld==='travel'?'TRAVEL':saved.lastSuccessfulWorld==='HOME'&&saved.player.currentSpawnId==='cottage_entry'?'COTTAGE':saved.lastSuccessfulWorld;
    await this.character.load().catch(error=>console.warn('Player character could not be loaded',error));
    try {await this.worldManager.switchTo(id,this.clock.simulationTime,id==='HOME'&&saved.player.currentSpawnId==='home_cottage_exit'?'home_cottage_exit':undefined);this.configureEnvironment();
      if(id==='COTTAGE'){this.player.currentWorldId='HOME';this.lastSuccessfulWorld='HOME';this.player.currentSpawnId='cottage_entry';this.resumeExplore();}else if(id==='HOME'&&saved.player.currentSpawnId==='home_cottage_exit'){this.resumeExplore();}else if(id==='FARM'){this.player.currentWorldId='FARM';this.lastSuccessfulWorld='FARM';this.resumeExplore();}else if(id==='TRAVEL'){this.overview.suspend();this.camera.position.set(0,4.8,-3);this.camera.lookAt(0,3.6,1);}
      if(this.diagnostics&&!this.captureEnabled)configurePreview(this);
      if(this.explorer.active)this.transition.state='EXPLORE';this.ready=true;this.recordArrival(id);this.cover.style.opacity='0';this.caption.hidden=true;this.hud.setSpeed(this.clock.timeScale,this.clock.paused);this.hud.setWeather(this.weather.kind);this.hud.updateQuests(new Set(this.player.discoveries));
      if(import.meta.env.DEV&&this.captureEnabled){const {TrailerCaptureMode}=await import('./capture/TrailerCaptureMode');this.trailer=new TrailerCaptureMode(this);await this.trailer.initialize();}
    }catch(error){try{this.hud.notify('航线暂时无法抵达，正在返回家园岛……');await this.worldManager.switchTo('HOME',this.clock.simulationTime);this.ready=true;this.finishArrival('HOME');}catch(fatal){this.showFatal(fatal??error);}}
  }
  private showFatal(error:unknown){console.error(error);this.ready=false;this.explorer.suspend();this.cover.style.opacity='0';this.caption.hidden=false;this.caption.textContent='加载失败，请刷新页面重试。';document.body.classList.remove('traveling');}
  /** Called only by the DEV capture session; normal travel orchestration remains unchanged. */
  async switchCaptureWorld(id:CaptureWorld){if(!this.captureEnabled)throw new Error('Capture mode is unavailable');await this.worldManager.switchTo(id,this.clock.simulationTime);this.configureEnvironment();this.explorer.exit();this.overview.suspend();this.focus.cancel();}
  captureQuality(quality:Quality){if(this.captureEnabled)this.applyQuality(quality);}
  private configureEnvironment(){
    const home=this.worldManager.currentWorldId==='HOME',inside=this.worldManager.currentWorldId==='COTTAGE';document.body.classList.toggle('farm-world',!home);document.body.classList.toggle('cottage-world',inside);
    this.weather.visible=!inside;this.waterEntry.visible=!inside;this.dayNight.sky.visible=!inside;this.dayNight.sun.visible=!inside;this.dayNight.ambient.visible=!inside;this.dayNight.hemi.visible=!inside;
    this.dayNight.sky.scale.setScalar(home?1:3);this.dayNight.sky.position.set(0,home?0:-6,0);
    const farm=this.worldManager.currentWorldId==='FARM';this.weather.configure(farm,inside);
    this.weather.scale.set(home||farm?1:3,home||farm?1:2,home||farm?1:5);this.weather.position.set(0,home||farm?0:-3,0);
    this.dayNight.configureShadows(this.worldManager.currentWorldId!);
    if(this.worldManager.currentWorld?.navigation)this.explorer.setNavigation(this.worldManager.currentWorld.navigation);
  }
  private resumeExplore(){this.overview.suspend();this.focus.cancel();this.explorer.enter(false,this.spawn);this.camera.far=this.worldManager.currentWorldId==='HOME'?40:150;this.camera.updateProjectionMatrix();this.transition.state='EXPLORE';this.playerFeedback.reset();this.hud.setExplore(true);this.hud.setTransition(false);this.renderer.domElement.focus();}
  private resumeFurnitureExplore(){this.explorer.resumeFromPanel();this.hud.setTransition(false);}
  private get gameplayPanelOpen(){return this.settingsPanel.open||this.collectionPanel.open||this.commissionPanel.open||this.dialoguePanel.open||this.calendarPanel.open||this.homePanel.open||this.cookingPanel.open||this.inventoryPanel.open||this.tradePanel.open||this.progressionPanel.open;}
  private openDialogue(npcId:string){
    if(!this.ready||!this.explorer.active||this.vehicleController.active||this.worldManager.state!=='READY'||this.travel.active||this.transition.active||this.doorTransition.active||this.sleepTransition.active||this.panel.open||this.gameplayPanelOpen||this.gameplay.fishing.active)return false;
    const definition=this.gameplay.dialogue.registry.get(npcId);if(!definition||this.gameplay.dialogue.registry.npc(npcId)?.worldId!==this.worldManager.currentWorldId)return false;
    const facts=()=>dialogueFacts(this.gameplay,this.weather.kind);
    if(!this.gameplay.dialogue.begin(npcId,facts()))return false;
    this.explorer.suspendForPanel();this.hud.closeDiscovery();this.hud.setInteractionPrompt();
    const npc=this.gameplay.dialogue.registry.npc(npcId)!;
    // Turn toward the speaker without moving the player or creating a second controller.
    this.dialogueReturn=this.camera.quaternion.clone();this.destinationCamera.position.copy(this.camera.position);
    const face=new Vector3(npc.position[0],npc.position[1]+npc.scale*1.5,npc.position[2]),right=new Vector3(1,0,0).applyQuaternion(this.camera.quaternion);face.addScaledVector(right,this.camera.position.distanceTo(face)*.28);this.destinationCamera.lookAt(face);this.dialogueAim=this.destinationCamera.quaternion.clone();this.worldManager.currentWorld?.setDialoguePresentation?.(npcId);
    this.dialoguePanel.show(this.gameplay.dialogue,facts,()=>{if(this.dialogueReturn)this.camera.quaternion.copy(this.dialogueReturn);this.dialogueAim=this.dialogueReturn=undefined;this.worldManager.currentWorld?.setDialoguePresentation?.();this.explorer.syncLook();this.resumeFurnitureExplore();},action=>{if(action==='trade')this.openTrade();else if(action==='progression')this.openProgression();else if(action==='collections')this.openCollections();else if(action==='commissions')this.openCommissions(npcId);else this.openCalendar();});return true;
  }
  private commissionAccess(npcId:string){
    const n=NPCS.get(npcId);return !!n&&n.worldId===this.worldManager.currentWorldId&&Math.hypot(this.camera.position.x-n.position[0],this.camera.position.z-n.position[2])<=n.range&&Math.abs(this.camera.position.y-n.position[1])<1.2&&(npcId!=='merchant_captain'||this.worldManager.currentWorld?.tradeAccess?.available?.()===true);
  }
  private openCommissions(npcId?:string){
    if(!this.ready||this.vehicleController.active||this.worldManager.state!=='READY'||this.travel.active||this.transition.active||this.doorTransition.active||this.sleepTransition.active||this.panel.open||this.gameplayPanelOpen||this.gameplay.fishing.active||npcId&&!this.commissionAccess(npcId))return;
    const exploring=this.explorer.active,overviewEnabled=this.overview.enabled;if(exploring)this.explorer.suspendForPanel();else this.overview.suspend();this.hud.closeDiscovery();this.hud.setInteractionPrompt();
    this.commissionPanel.show(this.gameplay,npcId,()=>this.player.discoveries,()=>!npcId||this.commissionAccess(npcId),()=>{if(exploring)this.resumeFurnitureExplore();else{this.overview.enabled=overviewEnabled;this.renderer.domElement.focus();}},message=>{this.hud.notify(message);this.sound.play('ui-discover');});
  }
  private openCollections(){
    if(!this.ready||this.vehicleController.active||this.worldManager.state!=='READY'||this.travel.active||this.transition.active||this.doorTransition.active||this.sleepTransition.active||this.panel.open||this.gameplayPanelOpen||this.gameplay.fishing.active)return;
    const exploring=this.explorer.active,overviewEnabled=this.overview.enabled;if(exploring)this.explorer.suspendForPanel();else this.overview.suspend();this.hud.closeDiscovery();this.hud.setInteractionPrompt();
    this.recordVisibleAnimals();this.collectionPanel.show(this.gameplay,()=>{if(exploring)this.resumeFurnitureExplore();else{this.overview.enabled=overviewEnabled;this.renderer.domElement.focus();}});
  }
  private recordVisibleAnimals(){if(this.worldManager.currentWorldId==='FARM'&&!this.travel.active&&Math.abs(this.camera.position.y-4)<1.5)this.gameplay.collections.observeAnimals(this.gameplay.livestock.getAnimals(),this.camera.position);}
  private recordArrival(id:string){
    this.gameplay.collections.arrive(id);
    this.gameplay.collections.syncDiscoveries(this.player.discoveries);
  }
  private openCalendar(){
    if(!this.ready||this.vehicleController.active||this.worldManager.state!=='READY'||this.travel.active||this.transition.active||this.doorTransition.active||this.sleepTransition.active||this.panel.open||this.gameplayPanelOpen||this.gameplay.fishing.active)return;
    const exploring=this.explorer.active,overviewEnabled=this.overview.enabled;if(exploring)this.explorer.suspendForPanel();else this.overview.suspend();
    this.hud.closeDiscovery();this.hud.setInteractionPrompt();this.calendarPanel.show(this.gameplay,()=>{if(exploring)this.resumeFurnitureExplore();else{this.overview.enabled=overviewEnabled;this.renderer.domElement.focus();}});
  }
  private openProgression(){
    if(!this.ready||this.vehicleController.active||this.worldManager.state!=='READY'||this.travel.active||this.transition.active||this.doorTransition.active||this.sleepTransition.active||this.panel.open||this.gameplayPanelOpen||this.gameplay.fishing.active)return;
    const exploring=this.explorer.active,overviewEnabled=this.overview.enabled;
    if(exploring)this.explorer.suspendForPanel();else this.overview.suspend();
    this.hud.closeDiscovery();this.hud.setInteractionPrompt();
    this.progressionPanel.show(this.gameplay.progression,()=>{if(exploring)this.resumeFurnitureExplore();else{this.overview.enabled=overviewEnabled;this.renderer.domElement.focus();}});
  }
  private openTrade(){
    if(!this.ready||!this.explorer.active||this.vehicleController.active||this.worldManager.state!=='READY'||this.travel.active||this.transition.active||this.doorTransition.active||this.sleepTransition.active||this.panel.open||this.gameplayPanelOpen||this.gameplay.fishing.active)return false;
    this.explorer.suspendForPanel();this.hud.closeDiscovery();this.hud.setInteractionPrompt();
    this.tradePanel.show(this.gameplay,()=>this.worldManager.currentWorld?.tradeAccess??{farm:false},()=>{this.persist(true);this.resumeFurnitureExplore();});return true;
  }
  private openInventory(storage=false,barn=false,container?:WorldStorageContainer){
    if(!this.ready||!this.explorer.active||this.worldManager.state!=='READY'||this.travel.active||this.transition.active||this.doorTransition.active||this.sleepTransition.active||this.panel.open||this.gameplayPanelOpen)return;
    if(storage&&this.worldManager.currentWorldId!==((barn||container)?'FARM':'COTTAGE'))return;
    if(this.gameplay.fishing.active){this.hud.notify('先收起鱼竿，再打开背包。');return;}
    this.explorer.suspendForPanel();this.hud.closeDiscovery();this.hud.setInteractionPrompt();
    this.inventoryPanel.show(this.gameplay,storage,()=>{this.persist(true);this.resumeFurnitureExplore();},container?.inventory??(barn?this.gameplay.barn:undefined),container?.name??(barn?'谷仓仓库':'小屋储物箱'),container?.partialTransfers??false);
  }
  private useHotbar(){
    if(!this.ready||!this.explorer.active||this.transition.active||this.travel.active||this.doorTransition.active||this.sleepTransition.active||this.gameplayPanelOpen)return;
    if(this.gameplay.fishing.active){this.hud.notify('先收起鱼竿，再使用食物。');return;}
    const item=this.gameplay.hotbar.selectedItem;
    if(!item){this.hud.notify('快捷栏为空，按 B 打开背包绑定物品。');return;}
    if(item.category==='food'){const result=this.gameplay.cooking.eat(item.id);if(!result.ok)this.hud.notify(result.message);}
    else if(item.category==='seed')this.hud.notify(this.worldManager.currentWorldId==='FARM'?`${item.name}已选中 · 站在已耕农田的高亮单元内，按 E 播种。`:'带着种子前往农场岛，在已耕农田按 E 播种。');
    else this.hud.notify(`${item.name}用于${item.category==='fish'?'炉灶烹饪':'对应玩法'}，可在背包或储物箱管理。`);
  }
  private openCooking(mode:'stove'|'food'){
    if(!this.ready||!this.explorer.active||this.worldManager.state!=='READY'||this.travel.active||this.transition.active||this.doorTransition.active||this.sleepTransition.active||this.panel.open||this.gameplayPanelOpen)return;
    if(mode==='stove'&&this.worldManager.currentWorldId!=='COTTAGE')return;
    if(this.gameplay.fishing.active){this.hud.notify('先收起鱼竿，再打开食物面板。');return;}
    this.explorer.suspendForPanel();this.hud.closeDiscovery();this.hud.setInteractionPrompt();
    this.cookingPanel.show(this.gameplay,mode,()=>{this.persist(true);this.resumeFurnitureExplore();});
  }
  private toggleFishingMode(){if(!this.explorer.active||this.worldManager.currentWorldId!=='HOME')return;this.gameplay.fishing.setInputMode(this.gameplay.fishing.inputMode==='hold'?'click':'hold');this.renderer.domElement.focus();}
  private sleepAtHome(){
    if(this.sleepTransition.active||this.worldManager.currentWorldId!=='COTTAGE'){this.resumeFurnitureExplore();return;}
    this.explorer.beginTransitionFromPanel();this.hud.setTransition(true);this.playerFeedback.reset();document.body.classList.add('sleeping');
    this.caption.hidden=true;this.cover.style.opacity='0';this.sleepOverlay.show();
    let completed=false;
    this.sleepTransition.start(()=>{
      this.gameplay.home.sleep();completed=true;
      this.hud.updateClock(this.clock,this.weather.kind,this.gameplay.calendar.date);this.persist(true);
    },()=>{
      this.sleepOverlay.hide();this.cover.style.opacity='0';this.caption.hidden=true;document.body.classList.remove('sleeping');this.resumeFurnitureExplore();
      if(completed)this.hud.notify(`新的一天开始了 · 体力已恢复至 ${this.gameplay.progress.maxEnergy}`);
    },error=>{console.warn('Sleep failed',error);this.hud.notify('暂时无法休息，请稍后再试。');});
  }
  private finishArrival(id:PlayableWorldId){
    const world=this.worldManager.currentWorld!;world.setTravelPresentation?.(false);world.boat?.reset();this.configureEnvironment();this.spawn=world.getSpawnPoint(destination(id).arrivalSpawnId);this.resumeExplore();
    if(id==='HOME'&&world.interaction)this.player.discoveries=[...world.interaction.discovered];
    this.lastSuccessfulWorld=id;this.player.currentWorldId=id;this.player.currentSpawnId=this.spawn.id;this.recordArrival(id);this.cover.style.opacity='0';this.caption.hidden=true;document.body.classList.remove('traveling');this.hud.updateQuests(new Set(this.player.discoveries));this.persist(true);
  }
  private captureSave():SaveData {
    const world=this.worldManager.currentWorld;if(world?.id==='HOME'&&world.interaction){this.player.discoveries=[...world.interaction.discovered];this.states.set('HOME',{lastSimulatedGameTime:this.clock.simulationTime,discoveries:this.player.discoveries});}
    return {version:2,settings:this.settings.snapshot(),...this.gameplay.snapshot(),gameTime:this.clock.snapshot(),player:structuredClone(this.player),worlds:this.states.snapshot(),lastSuccessfulWorld:this.lastSuccessfulWorld,global:{storm:this.weather.storm,intensity:this.weather.intensity,quality:this.renderer.quality,weather:this.weather.snapshot()}};
  }
  private persist(immediate=false){if(this.captureEnabled||!this.ready||(this.preview&&!this.persistPreview))return;if(immediate)this.save.flush(()=>this.captureSave());else this.save.schedule(()=>this.captureSave());}
  private interactionContext(world:GameWorld):InteractionContext {
    const position=this.vehicleController.position??this.camera.position;
    return {worldId:world.id,position:{x:position.x,y:position.y,z:position.z},gameplay:this.gameplay};
  }
  private async interact(targetId?:string){
    const world=this.worldManager.currentWorld,interaction=world?.interaction;
    if(!this.ready||(!this.explorer.active&&!this.vehicleController.active)||!world||!interaction||interaction.busy||this.worldManager.state!=='READY'||this.transition.active||this.travel.active||this.doorTransition.active||this.sleepTransition.active||this.panel.open||this.gameplayPanelOpen)return;
    this.interactionCount++;
    const result=await interaction.interact(this.interactionContext(world),this.interactionActions,targetId);
    if(this.worldManager.currentWorld!==world)return;
    if(result.status==='error')console.warn('Interaction failed',result.error);
    if(result.discovery){
      this.player.discoveries=[...interaction.discovered];this.gameplay.collections.record({kind:'discovery',id:result.discovery.id},'discovered');this.hud.updateQuests(interaction.discovered);
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
      if(entering){this.gameplay.progression.record('home.enter');this.recordArrival('COTTAGE');}
    },()=>{
      this.resumeExplore();this.cover.style.opacity='0';this.caption.hidden=true;document.body.classList.remove('door-transition');this.renderer.domElement.focus();this.persist(true);
    },error=>{
      console.warn('Cottage transition failed',error);this.spawn=previous;this.configureEnvironment();if(this.worldManager.currentWorld)this.worldManager.state='READY';
      this.caption.textContent='暂时无法开门，已返回原处';this.hud.notify('小屋暂时无法加载，请稍后再试。');
    });
  }
  private applyQuality(quality:Quality){this.renderer.quality=quality;this.renderer.resize();this.worldManager.applyQuality(quality);this.character.applyQuality(quality);this.dayNight.applyQuality(quality);this.weather.rain.setCount(QUALITY[quality].rain);this.waterEntry.setDensity(QUALITY[quality].waterStep);this.hud.element.querySelector('.quality')!.textContent=`PIXEL / ${quality}`;}
  private applySettings(s:GameSettings){
    this.explorer.lookSensitivity=s.lookSensitivity;this.explorer.invertLookY=s.invertLookY;
    this.vehicleController.configure(s);this.sound.setVolume(s.volume);
    if(this.renderer.renderScale!==s.renderScale){this.renderer.renderScale=s.renderScale;this.renderer.resize();}
    this.hud.element.querySelector<HTMLElement>('#fps')!.hidden=!s.showFps;
    this.hud.setActive('sound',s.soundEnabled);
    if(!s.soundEnabled&&this.sound.enabled)void this.sound.setEnabled(false);
  }
  private async setSound(enabled:boolean){
    this.soundWanted=enabled;if(this.soundBusy)return this.sound.enabled;this.soundBusy=true;
    try{while(this.sound.enabled!==this.soundWanted)await this.sound.setEnabled(this.soundWanted);this.settings.set({soundEnabled:this.sound.enabled});this.hud.setActive('sound',this.sound.enabled);}
    catch{this.hud.notify('声音暂时无法启用，请再次点击重试。');this.settings.set({soundEnabled:false});}
    finally{this.soundBusy=false;}return this.sound.enabled;
  }
  private openSettings(){
    if(!this.ready||this.worldManager.state!=='READY'||this.travel.active||this.transition.active||this.doorTransition.active||this.sleepTransition.active||this.panel.open||this.gameplayPanelOpen||this.gameplay.fishing.active||this.vehicleController.active&&this.vehicleController.phase!=='DRIVING')return;
    const driving=this.vehicleController.active,exploring=this.explorer.active,overviewEnabled=this.overview.enabled;
    if(driving)this.vehicleController.suspendForPanel();else if(exploring)this.explorer.suspendForPanel();else this.overview.suspend();this.hud.closeDiscovery();this.hud.setInteractionPrompt();
    this.settingsPanel.show({state:this.settings,quality:()=>this.renderer.quality,setQuality:quality=>{this.applyQuality(quality);this.persist(true);},fishingMode:()=>this.gameplay.fishing.inputMode,setFishingMode:mode=>{this.gameplay.fishing.setInputMode(mode);this.persist(true);},setSound:enabled=>this.setSound(enabled),reset:()=>{this.settings.reset();this.applyQuality('MEDIUM');this.gameplay.fishing.setInputMode('hold');void this.setSound(false);this.persist(true);}},()=>{this.persist(true);if(driving)this.vehicleController.resumeFromPanel();else if(exploring)this.resumeFurnitureExplore();else{this.overview.enabled=overviewEnabled;this.renderer.domElement.focus();}});
  }
  private bindUI(){
    if(this.captureEnabled)return;
    this.hud.element.querySelector('[data-action="settings"]')!.addEventListener('click',()=>this.openSettings());
    window.addEventListener('keydown',event=>{const target=event.target as HTMLElement|null;if(event.code!=='KeyO'||event.repeat||target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName??''))return;event.preventDefault();this.openSettings();});
    // Browsers require a real gesture to start saved audio preferences.
    const restoreAudio=()=>{if(this.settings.snapshot().soundEnabled&&!this.sound.enabled&&!this.soundBusy)void this.setSound(true);};
    this.renderer.domElement.addEventListener('pointerdown',restoreAudio);this.renderer.domElement.addEventListener('keydown',restoreAudio);
    this.hud.element.querySelector('[data-action="collections"]')!.addEventListener('click',()=>this.openCollections());
    window.addEventListener('keydown',event=>{const target=event.target as HTMLElement|null;if(event.code!=='KeyN'||event.repeat||target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName??''))return;event.preventDefault();this.openCollections();});
    this.hud.element.querySelector('[data-action="calendar"]')!.addEventListener('click',()=>this.openCalendar());
    window.addEventListener('keydown',event=>{const target=event.target as HTMLElement|null;if(event.code!=='KeyL'||event.repeat||target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName??''))return;event.preventDefault();this.openCalendar();});
    this.hud.element.querySelector('[data-action="progression"]')!.addEventListener('click',()=>this.openProgression());
    this.hud.element.querySelector('[data-action="commissions"]')!.addEventListener('click',()=>this.openCommissions());
    window.addEventListener('keydown',event=>{const target=event.target as HTMLElement|null;if(event.code!=='KeyJ'||event.repeat||target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName??''))return;event.preventDefault();this.openCommissions();});
    window.addEventListener('keydown',event=>{const target=event.target as HTMLElement|null;if(event.code!=='KeyP'||event.repeat||target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName??''))return;event.preventDefault();this.openProgression();});
    this.hud.element.querySelector('[data-action="inventory"]')!.addEventListener('click',()=>this.openInventory());
    this.hud.element.querySelector('[data-action="food"]')!.addEventListener('click',()=>this.openCooking('food'));
    this.hud.element.querySelector('[data-action="fishing-mode"]')!.addEventListener('click',()=>this.toggleFishingMode());
    this.hud.element.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(button=>button.addEventListener('click',()=>{this.clock.timeScale=Number(button.dataset.speed);this.clock.paused=false;this.hud.setSpeed(this.clock.timeScale,false);this.persist();}));
    this.hud.element.querySelector('[data-action="pause"]')!.addEventListener('click',()=>{this.clock.paused=!this.clock.paused;this.hud.setSpeed(this.clock.timeScale,this.clock.paused);this.persist();});
    this.hud.element.querySelector('[data-action="storm"]')!.addEventListener('click',()=>{this.weather.cycle();this.hud.setWeather(this.weather.kind);this.persist();});
    this.hud.element.querySelector('[data-action="explore"]')!.addEventListener('click',()=>{
      if(!this.ready||this.transition.active||this.travel.active||this.doorTransition.active||this.sleepTransition.active||this.panel.open||this.gameplayPanelOpen||this.worldManager.currentWorldId!=='HOME')return;
      this.gameplay.fishing.cancel();
      const entering=this.transition.state==='OVERVIEW';this.focus.cancel();this.overview.suspend();this.explorer.suspend();
      if(entering){const spawn=this.worldManager.currentWorld!.getSpawnPoint();this.destinationCamera.position.fromArray(spawn.position);this.destinationCamera.lookAt(...spawn.lookAt);}else{this.destinationCamera.position.copy(this.overview.position0);this.destinationCamera.lookAt(this.overview.target0);}
      this.transition.start(entering?'EXPLORE':'OVERVIEW',this.destinationCamera.position,this.destinationCamera.quaternion,entering?68:34);this.hud.setTransition(true);(document.activeElement as HTMLElement)?.blur();
    });
    this.hud.element.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(button=>button.addEventListener('click',()=>{if(this.transition.state!=='OVERVIEW'||this.worldManager.currentWorldId!=='HOME'||this.travel.active)return;this.overview.suspend();this.focus.start(button.dataset.focus as FocusId,this.worldManager.currentWorld!.getFocusPosition!(),this.overview.position0,this.overview.target0);this.hud.element.querySelectorAll('[data-focus]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));}));
    const soundButton=this.hud.element.querySelector<HTMLButtonElement>('[data-action="sound"]')!;soundButton.addEventListener('click',()=>{soundButton.disabled=true;void this.setSound(!this.settings.snapshot().soundEnabled).finally(()=>soundButton.disabled=false);});
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
    if(this.captureEnabled){if(this.trailer)this.updateCapture(delta);else this.renderer.render(this.scene,this.camera);return;}
    if(this.travel.active||this.doorTransition.active||this.sleepTransition.active||this.gameplayPanelOpen)this.clock.updateAnimation(delta);else this.clock.update(delta);
    this.weather.synchronizeCalendar(this.gameplay.calendar.date);this.gameplay.calendar.synchronize();this.gameplay.calendar.updatePresentation(delta);
    const lightDayTime=this.gameplay.calendar.lightDayTime,season=this.gameplay.calendar.visual;
    const time=this.clock.elapsed;
    if(this.worldManager.currentWorldId==='FARM'){
      if(this.camera.far<220){this.camera.far=220;this.camera.updateProjectionMatrix();}
      // Keep the local sky/rain around the explorer on the expanded farm island.
      this.weather.position.x=this.camera.position.x;this.weather.position.z=this.camera.position.z;
      this.dayNight.sky.position.x=this.camera.position.x;this.dayNight.sky.position.z=this.camera.position.z;
    }
    this.weather.update(delta,time,season);const storm=this.weather.intensity;
    const context:WorldUpdateContext={delta,time,gameTime:this.clock.simulationTime,storm,weather:this.weather.frame,dayTime:lightDayTime,season,night:1-daylightAt(lightDayTime),flash:this.weather.lightning.flash,player:this.vehicleController.position??(this.explorer.active?this.camera.position:undefined),listener:this.camera.position,presentationPaused:document.visibilityState==='hidden'||this.travel.active||this.gameplayPanelOpen||this.doorTransition.active||this.sleepTransition.active};
    this.worldManager.currentWorld?.prepare?.(context);this.travel.update(delta);
    const home=this.worldManager.currentWorldId==='HOME';let water=this.worldManager.currentWorld?.navigation?.waterLevel(this.camera.position.x,this.camera.position.z,time,storm)??3.3;
    this.explorer.blockLook=this.gameplay.fishing.state==='FIGHTING';
    if(!this.travel.active&&!this.doorTransition.active&&!this.sleepTransition.active&&this.travel.state!=='ERROR'&&!this.panel.open&&!this.gameplayPanelOpen){
      if(this.transition.active){if(this.transition.update(delta)){if(this.transition.state==='EXPLORE')this.resumeExplore();else{this.explorer.exit();this.focus.selected='overview';this.overview.target.copy(this.overview.target0);this.overview.minDistance=12;this.overview.enabled=true;this.overview.update();}this.hud.setExplore(this.explorer.active);this.hud.setTransition(false);}}
      else if(this.vehicleController.active)this.vehicleController.update(delta);
      else if(this.explorer.active)this.explorer.update(delta,water);
      else if(home){if(this.focus.active){if(this.focus.update(delta)){this.overview.minDistance=this.focus.selected==='overview'?12:2;this.overview.enabled=true;this.overview.update();}}else this.overview.update();}
    }
    if(this.dialoguePanel.open&&this.dialogueAim)this.camera.quaternion.slerp(this.dialogueAim,1-Math.exp(-Math.min(.1,delta)*8));
    if(this.gameplay.fishing.active){
      const distance=Math.hypot(this.camera.position.x-FISHING_SPOT.x,this.camera.position.y-FISHING_SPOT.y,this.camera.position.z-FISHING_SPOT.z);
      if(!home||!this.explorer.active||this.explorer.swimming||distance>=FISHING_SPOT.range)this.gameplay.fishing.cancel('已离开钓鱼台，鱼竿已收起。');
      else if(document.visibilityState!=='hidden')this.gameplay.fishing.update(delta);
    }
    if(this.cookingPanel.open&&document.visibilityState!=='hidden')this.gameplay.cooking.update(delta);
    this.progressionView.update(delta,this.gameplay.progression,!this.gameplayPanelOpen&&!this.panel.open&&!this.vehicleController.active,!this.gameplayPanelOpen&&!this.panel.open&&!this.travel.active&&!this.doorTransition.active&&!this.sleepTransition.active);
    this.tradePanel.update(this.gameplay);this.cookingPanel.update();this.inventoryPanel.update();this.hud.updateFishing(this.gameplay.fishing);this.hotbarView.update();this.hotbarView.element.hidden=!this.explorer.active;this.vehicleHUD.update(this.vehicleController);
    water=this.worldManager.currentWorld?.navigation?.waterLevel(this.camera.position.x,this.camera.position.z,time,storm)??3.3;
    const underwater=this.explorer.active&&this.explorer.underwater,inside=this.worldManager.currentWorldId==='COTTAGE'||this.worldManager.currentWorld?.sheltered?.(this.camera.position)===true;
    this.weather.shelter(inside);this.scene.fog=underwater?this.underwaterFog:(home&&!this.travel.active)||this.worldManager.currentWorldId==='COTTAGE'?null:this.worldManager.currentWorldId==='FARM'?this.dayNight.farm.fog:this.seaFog;
    this.waterEntry.update(delta,this.camera.position,this.explorer.active,this.explorer.swimming,this.explorer.sprinting,water);
    if(this.explorer.active){this.playerFeedback.update(delta,this.camera.position,this.explorer.grounded,this.explorer.swimming,this.explorer.sprinting);this.camera.fov=this.playerFeedback.fov;this.camera.updateProjectionMatrix();}
    document.body.classList.toggle('underwater',underwater);this.dayNight.update(lightDayTime,time,storm,this.weather.lightning.flash,this.weather.frame,this.camera.position,delta,season);
    if(this.scene.fog===this.seaFog)this.seaFog.color.copy(this.scene.background as Color);this.cover.style.background=this.doorTransition.active||this.sleepTransition.active?'#171b20':(this.scene.background as Color).getStyle();
    context.player=this.vehicleController.position??(this.explorer.active?this.camera.position:undefined);
    this.worldManager.update(context);if(this.doorTransition.active){this.doorTransition.update(delta);this.cover.style.opacity=String(this.doorTransition.opacity);}if(this.travel.active)this.animateTravel(delta,time,storm);
    this.sound.updateFarm(this.worldManager.currentWorld?.farmSound);
    this.farmHUD.update(this.gameplay,this.worldManager.currentWorld?.farmFocus,this.worldManager.currentWorldId==='FARM'&&this.explorer.active&&!this.gameplayPanelOpen&&!this.travel.active,this.worldManager.currentWorld?.livestockFocus);
    if(this.sleepTransition.active){this.sleepTransition.update(delta);if(this.sleepTransition.active)this.sleepOverlay.render(this.sleepTransition.progress);}
    this.sound.update(time,storm,inside?'INDOOR':underwater?'UNDERWATER':this.explorer.active||this.vehicleController.active||this.travel.active?'ISLAND':'OVERVIEW',this.weather.lightning.flash,this.weather.frame);
    const interaction=this.worldManager.currentWorld?.interaction;if(this.explorer.active||this.vehicleController.active)interaction?.update(this.vehicleController.position??this.camera.position);
    this.hudTimer+=delta;if(this.hudTimer>.25){this.hudTimer=0;this.collectionPanel.refresh();this.commissionPanel.refresh();this.hud.updateCollections(this.gameplay.collections);
      if(this.explorer.active&&!this.gameplayPanelOpen)this.recordVisibleAnimals();this.hud.updateClock(this.clock,this.weather.kind,this.gameplay.calendar.date);this.hud.updateHomeStats(this.gameplay.progress,false);this.hud.updateProductionStats(this.gameplay,this.explorer.active||this.gameplayPanelOpen);this.hud.updateDepth(underwater,water-this.camera.position.y);
      if(this.diagnostics){Object.assign(this.renderer.domElement.dataset,{world:this.worldManager.currentWorldId,travel:this.travel.state,door:this.doorTransition.state,sleep:this.sleepTransition.state,energy:String(this.gameplay.progress.energy),cameraMode:this.transition.state,waterEntries:String(this.waterEntry.entries),waterLeaves:String(this.waterEntry.leaves),fov:this.camera.fov.toFixed(2),gameTime:String(this.clock.simulationTime),storm:String(this.weather.storm),quality:this.renderer.quality,discoveries:this.player.discoveries.join(','),completedTrips:String(this.completedTrips),interactionCount:String(this.interactionCount),audio:JSON.stringify(this.sound.diagnostics),vehiclePhase:this.vehicleController.active?this.vehicleController.phase:'ON_FOOT',fleet:JSON.stringify(this.gameplay.vehicles.snapshot()),farmStats:JSON.stringify(this.gameplay.farm.definitions.map(f=>({id:f.id,counts:this.gameplay.farm.getField(f.id)!.stateCounts})))});}
      if(this.diagnostics)this.renderer.domElement.dataset.collections=JSON.stringify({open:this.collectionPanel.open,...this.gameplay.collections.snapshot()});
      if(this.diagnostics)this.renderer.domElement.dataset.commissions=JSON.stringify({open:this.commissionPanel.open,...this.gameplay.commissions.snapshot()});
      if(this.diagnostics)this.renderer.domElement.dataset.dialogue=JSON.stringify({open:this.dialoguePanel.open,npcId:this.gameplay.dialogue.current?.npc.id,history:this.gameplay.dialogue.snapshot()});
      if(this.diagnostics)this.renderer.domElement.dataset.farmEffects=JSON.stringify(this.worldManager.currentWorld?.farmPresentationDiagnostics??{});
      if(this.diagnostics){this.renderer.domElement.dataset.cameraPosition=JSON.stringify(this.camera.position.toArray());this.renderer.domElement.dataset.vehicleYaw=String(this.vehicleController.vehicle?.yaw??0);}
      if(this.diagnostics)this.renderer.domElement.dataset.livestock=JSON.stringify(this.gameplay.livestock.snapshot());
      if(this.diagnostics)this.renderer.domElement.dataset.calendar=JSON.stringify({...this.gameplay.calendar.date,visual:season,lightDayTime,weatherTarget:this.weather.kind,fishPool:this.gameplay.fishing.seasonalPool.map(f=>f.id)});
      if(this.diagnostics)this.renderer.domElement.dataset.progression=JSON.stringify(this.gameplay.progression.snapshot());
      if(this.diagnostics)this.renderer.domElement.dataset.economy=JSON.stringify(this.gameplay.economy.snapshot());
      if(this.diagnostics)this.renderer.domElement.dataset.weather=JSON.stringify({kind:this.weather.kind,...this.weather.frame,rainVisible:this.weather.rain.visible,precipitation:this.weather.rain.diagnostics,sheltered:inside,atmosphere:this.dayNight.farm.visible?this.dayNight.farm.diagnostics:null,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles});
      if(this.explorer.active||this.vehicleController.active){const world=this.worldManager.currentWorld!,prompt=interaction?.getPrompt(this.interactionContext(world),this.interactionActions);this.hud.setInteractable(prompt?.available??false);this.hud.setInteractionPrompt(this.gameplay.fishing.state==='FIGHTING'?undefined:prompt);this.hud.setHint(this.vehicleController.active?'W/S 前进后退 · A/D 转向 · Space 刹车 · 停稳后 E 下车':world.id==='FARM'?(world.livestockFocus?'饲槽 E 补充饲料 / 小麦 / 玉米 · 动物 E 收蛋 / 挤奶 / 剪毛 · B 背包':'E 耕地 / 播种 / 收割 · 靠近车辆 E 上车 · B 拿起种子 · 1～8 换种'):world.id==='COTTAGE'?'WASD 移动 · E 使用家具 / 出屋 · B 背包 · 1～8 快捷栏 · Q 使用':this.gameplay.fishing.active?'E 提钩 · 左键控制张力 · R 切换操作 · Esc 放弃':'WASD 移动 · E 交互 · B 背包 · 1～8 快捷栏 · Q 使用');}
      else this.hud.setInteractionPrompt();
    }
    this.character.update({delta,time,visible:(this.explorer.active||this.vehicleController.active)&&!this.travel.active&&!this.doorTransition.active&&!this.sleepTransition.active&&!this.gameplayPanelOpen&&!this.panel.open&&!this.transition.active,firstPerson:!this.vehicleController.active,eye:this.camera.position,orientation:this.camera.quaternion,eyeHeight:this.worldManager.currentWorld?.navigation?.eyeHeight,grounded:this.explorer.grounded,sprinting:this.explorer.sprinting,paused:document.visibilityState==='hidden',vehicle:this.vehicleController.phase==='DRIVING'?this.vehicleController.vehicle:undefined});
    if(this.vehicleController.active&&this.vehicleController.phase!=='DRIVING')this.character.visible=false;
    if(import.meta.env.DEV&&this.characterPreview)this.character.showAt(this.characterPreview.feet,this.characterPreview.yaw,this.characterPreview.pose,time*7);
    if(this.diagnostics)this.renderer.domElement.dataset.character=JSON.stringify(this.character.diagnostics);
    const bob=this.explorer.active?this.playerFeedback.offsetY+this.explorer.renderOffsetY:0;this.camera.position.y+=bob;this.fishingPresentation.update(time,storm,delta);this.renderer.render(this.scene,this.camera);this.camera.position.y-=bob;this.performance.update(performance.now()-cpuStart);
  };
  /** Fixed-step frame export remains inside the isolated DEV capture session. */
  renderCaptureFrame(delta:number){if(!this.captureEnabled||!this.trailer)throw new Error('Capture mode is unavailable');this.updateCapture(delta,true);}
  private updateCapture(delta:number,exporting=false){
    const capture=this.trailer!,dt=document.hidden&&!exporting?0:Math.max(0,Math.min(.1,delta));capture.update(dt);
    const worldDelta=capture.worldPaused||capture.busy?0:dt,snap=capture.snapLighting;capture.snapLighting=false;
    this.clock.updateAnimation(worldDelta);this.gameplay.calendar.updatePresentation(snap?1000:worldDelta*4);
    const season=this.gameplay.calendar.visual,dayTime=this.gameplay.calendar.lightDayTime,time=this.clock.elapsed;
    const farm=this.worldManager.currentWorldId==='FARM',home=this.worldManager.currentWorldId==='HOME';
    const bottle=home&&capture.shot?.bottle===true;this.dayNight.farm.visible=!bottle;this.dayNight.sky.visible=bottle;
    if(farm){this.weather.position.x=this.camera.position.x;this.weather.position.z=this.camera.position.z;}
    this.weather.shelter(false);this.weather.update(worldDelta,time,season);
    const context:WorldUpdateContext={delta:worldDelta,time,gameTime:this.clock.simulationTime,storm:this.weather.intensity,weather:this.weather.frame,dayTime,season,night:1-daylightAt(dayTime),flash:this.weather.lightning.flash,listener:this.camera.position,presentationPaused:false};
    this.scene.fog=home?null:farm?this.dayNight.farm.fog:this.seaFog;
    this.dayNight.update(dayTime,time,this.weather.intensity,this.weather.lightning.flash,this.weather.frame,this.camera.position,snap?1000:worldDelta,season);
    if(farm){const fog=this.dayNight.farm.fog,altitude=Math.max(0,this.camera.position.y-12)*1.6;capture.fog.color.copy(fog.color);capture.fog.near=fog.near+altitude;capture.fog.far=fog.far+altitude;this.scene.fog=capture.fog;}
    if(this.scene.fog===this.seaFog)this.seaFog.color.copy(this.scene.background as Color);
    this.worldManager.currentWorld?.prepare?.(context);this.worldManager.update(context);
    capture.scene.showPlayer(capture.shot,capture.hidePlayer,time,worldDelta);
    const sound=this.worldManager.currentWorld?.farmSound;this.sound.updateFarm(sound?{...sound,paused:capture.worldPaused}:undefined);this.sound.update(time,this.weather.intensity,'ISLAND',this.weather.lightning.flash,this.weather.frame);
    if(!capture.hideHud)this.hud.updateClock(this.clock,this.weather.kind,this.gameplay.calendar.date);
    capture.render();
  }
}
