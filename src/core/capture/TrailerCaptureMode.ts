import { Fog,Vector3 } from 'three';
import type { Game } from '../Game';
import { DAY_DURATION } from '../GameClock';
import { SEASON_IDS } from '../../gameplay/calendar/SeasonRegistry';
import type { SeasonId } from '../../gameplay/calendar/SeasonRegistry';
import { WEATHER_PROFILES } from '../../systems/WeatherState';
import type { WeatherKind } from '../../systems/WeatherState';
import { CameraPath,cameraPose,lookPose,orbitPath,validCapturePath } from './CameraPath';
import type { CapturePath } from './CameraPath';
import { TrailerFreeCamera } from './TrailerFreeCamera';
import { TrailerScene } from './TrailerScene';
import { TRAILER_SHOTS,trailerShot } from './TrailerShots';
import type { CaptureWorld,TrailerShot } from './TrailerShots';
import { TrailerVideoExporter } from './TrailerVideoExporter';
import { landscapeShot } from './TrailerLandscapeShots';
import './trailer.css';

export class TrailerCaptureMode {
  readonly panel=document.createElement('aside');readonly free:TrailerFreeCamera;readonly path:CameraPath;
  readonly scene:TrailerScene;
  readonly fog=new Fog('#b4d4df',46,180);
  worldPaused=false;hidePlayer=false;hideHud=true;aspect:'portrait'|'landscape'|'window'='portrait';
  outputSize?:{width:number;height:number};
  shot?:TrailerShot;busy=false;snapLighting=true;cameraMode:'free'|'path'='path';
  private hour=12;private season:SeasonId='spring';private weather:WeatherKind='CLEAR';private sequenceStep=-1;
  private ui=new Map<string,HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>();private status=document.createElement('output');private notes=document.createElement('p');private timer=0;
  private listeners=new AbortController();private target=new Vector3();private message='';private messageTime=0;
  constructor(private game:Game){
    game.explorer.exit();game.overview.suspend();game.focus.cancel();game.characterPreview=undefined;
    this.free=new TrailerFreeCamera(game.camera,game.renderer.domElement);this.free.enabled=false;this.path=new CameraPath(game.camera);this.scene=new TrailerScene(game);
    document.body.classList.add('trailer-capture','trailer-clean');this.panel.className='trailer-panel';this.panel.setAttribute('aria-label','宣传片拍摄控制');document.body.append(this.panel);this.buildPanel();
    window.addEventListener('keydown',e=>{if(e.code==='F8'){e.preventDefault();this.panel.hidden=!this.panel.hidden;this.free.clear();game.renderer.domElement.focus();}else if(e.code==='Escape'&&this.panel.hidden){this.panel.hidden=false;}}, {signal:this.listeners.signal});
  }
  async initialize(){await this.selectShot(new URLSearchParams(location.search).get('shot')??'bottle-reveal');}
  private setStatus(message:string){this.message=message;this.messageTime=4;this.status.textContent=message;}
  private async run(action:()=>void|Promise<void>){if(this.busy)return;this.busy=true;this.panel.dataset.busy='true';this.free.clear();try{await action();}catch(error){console.error('Trailer scene preparation failed',error);this.setStatus('准备失败，请重试或切换世界。');}finally{this.busy=false;delete this.panel.dataset.busy;this.syncUI();}}
  async selectShot(id:string){await this.run(async()=>{this.scene.stop();this.shot=trailerShot(id);await this.game.switchCaptureWorld(this.shot.world);this.reset();});}
  private reset(){
    if(!this.shot){this.path.reset();this.game.clock.elapsed=0;this.setCalendar(this.season,this.hour,true);this.setWeather(this.weather,true);this.cameraMode='path';this.free.enabled=false;this.free.sync();this.snapLighting=true;return;}
    this.shot=this.aspect==='landscape'?landscapeShot(trailerShot(this.shot.id)):trailerShot(this.shot.id);
    this.path.stop();this.worldPaused=false;this.hour=this.shot.hour;this.season=this.shot.season;this.weather=this.shot.weather;this.game.clock.elapsed=0;this.game.clock.timeScale=1;this.game.clock.paused=false;this.sequenceStep=-1;
    this.setCalendar(this.season,this.hour,true);this.setWeather(this.weather,true);this.scene.prepare(this.shot);this.ui.get('crop')!.value='mature';this.path.configure(this.shot.path);this.cameraMode='path';this.free.enabled=false;this.free.sync();this.snapLighting=true;this.notes.textContent=this.shot.notes;this.setStatus('镜头已重置 · 场景副本 · 正式存档零读写');
  }
  resetShot(){void this.run(()=>this.reset());}
  private stopPlayback(){this.path.stop();this.scene.actor?.stop();}
  play(){if(this.busy)return;if(this.path.progress===1&&this.shot)this.reset();this.cameraMode='path';this.free.enabled=false;this.free.clear();this.path.play();this.game.renderer.domElement.focus();this.syncUI();}
  private setCalendar(season:SeasonId,hour:number,snap=false){this.season=season;this.hour=hour;this.game.clock.simulationTime=(SEASON_IDS.indexOf(season)*28+7+hour/24)*DAY_DURATION;this.game.gameplay.calendar.synchronize();if(snap)this.game.gameplay.calendar.updatePresentation(1000);}
  private setWeather(weather:WeatherKind,snap=false){this.weather=weather;if(snap)this.game.weather.restore({kind:weather,...WEATHER_PROFILES[weather],wetness:weather==='RAIN'||weather==='STORM'?1:0,windPhase:0},false,0,this.game.gameplay.calendar.date.dayIndex);else this.game.weather.setWeather(weather);}
  private setFree(){this.cameraMode='free';this.path.stop();this.scene.actor?.stop();this.free.enabled=true;this.free.sync();this.game.renderer.domElement.focus();this.syncUI();}
  private timePreset(){const d=this.game.gameplay.calendar.definition;return this.hour<d.sunrise||this.hour>=d.sunset+1?'23':this.hour<=d.sunrise+3?'6.4':this.hour>=d.sunset-3?'18.2':'12';}
  private async selectWorld(world:CaptureWorld){
    if(world!=='TRAVEL'){await this.selectShot(world==='FARM'?'farm-reveal':'bottle-reveal');return;}
    await this.run(async()=>{this.scene.stop();await this.game.switchCaptureWorld('TRAVEL');this.shot=undefined;this.game.clock.elapsed=0;this.setCalendar(this.season,this.hour,true);this.setWeather(this.weather,true);this.game.camera.position.set(0,5.8,-5);this.game.camera.lookAt(0,3.8,0);this.game.camera.fov=48;this.path.configure({duration:16,poses:[cameraPose(this.game.camera),lookPose([0,7.5,-8],[0,3.8,0],48)]});this.scene.cleanLabels();this.setFree();this.snapLighting=true;this.notes.textContent='TravelWorld：自由机位或自定义起终点拍摄航海场景。';});
  }
  update(delta:number){
    if(this.busy)return;const dt=Math.max(0,Math.min(.1,delta)),wasPlaying=this.path.playing;
    if(this.cameraMode==='free')this.free.update(dt);else this.path.update(dt);
    if(!this.worldPaused)this.scene.update(dt,wasPlaying);
    if(wasPlaying&&!this.path.playing)this.scene.actor?.stop();
    if(this.cameraMode==='path'&&this.shot?.subject==='combine'&&this.scene.actor){const root=this.scene.actor.root;this.game.camera.position.copy(root.position).add(this.target.fromArray(this.shot.followOffset??[6.5,3.1,6.5]));this.game.camera.lookAt(root.position.x,root.position.y+.9,root.position.z-.4);}
    if(this.cameraMode==='path'&&this.shot?.subject==='tractor'&&this.scene.actor){const root=this.scene.actor.root;this.game.camera.lookAt(root.position.x,root.position.y+.75,root.position.z);}
    if(this.shot?.sequence&&wasPlaying){
      if(this.shot.sequence==='seasons'){const step=Math.min(3,Math.floor(this.path.elapsed/8));if(step!==this.sequenceStep){this.sequenceStep=step;this.setCalendar(SEASON_IDS[step],this.shot.hour);this.setWeather('CLEAR');}}
      else{const step=Math.min(3,Math.floor(this.path.elapsed/7));if(step!==this.sequenceStep){this.sequenceStep=step;this.setWeather((['CLEAR','OVERCAST','RAIN','CLEAR'] as const)[step]);}const t=Math.min(1,this.path.elapsed/28);this.setCalendar(this.season,6.4+t*12);}
    }
    this.messageTime=Math.max(0,this.messageTime-dt);this.timer+=dt;if(this.timer>.2){this.timer=0;this.status.textContent=`${this.messageTime>0?this.message+' · ':''}${this.busy?'准备中':this.path.playing?'播放中':this.cameraMode==='free'?'自由摄影机':'已停止'} · ${this.path.elapsed.toFixed(1)} / ${this.path.duration}s · ${this.game.worldManager.currentWorldId} · ${this.season} · ${this.game.clock.formatted} · ${this.weather}${this.worldPaused?' · 世界暂停':''}`;
      if(this.shot?.sequence&&wasPlaying){this.ui.get('season')!.value=this.season;this.ui.get('weather')!.value=this.weather;this.ui.get('hour')!.value=String(Math.round(this.hour*100)/100);}
      Object.assign(this.panel.dataset,{world:this.game.worldManager.currentWorldId,shot:this.shot?.id??'custom',camera:JSON.stringify(cameraPose(this.game.camera)),elapsed:String(this.path.elapsed),weather:this.weather,season:this.season,worldPaused:String(this.worldPaused),farm:JSON.stringify(this.game.gameplay.farm.definitions.map(f=>this.game.gameplay.farm.getField(f.id)?.stateCounts)),vehicle:JSON.stringify(this.scene.actor?{...this.scene.actor.root.position, speed:this.scene.actor.speed}:null)});
    }
  }
  render(){
    const renderer=this.game.renderer,camera=this.game.camera,width=this.outputSize?.width??innerWidth,height=this.outputSize?.height??innerHeight,ratio=this.aspect==='portrait'?9/16:this.aspect==='landscape'?16/9:width/height;
    if(this.outputSize&&(renderer.domElement.width!==width||renderer.domElement.height!==height)){renderer.setPixelRatio(1);renderer.setSize(width,height,false);}
    const w=Math.min(width,height*ratio),h=w/ratio,x=(width-w)/2,y=(height-h)/2;
    camera.aspect=ratio;camera.near=.04;camera.far=450;camera.updateProjectionMatrix();
    this.panel.dataset.frame=JSON.stringify({width:w,height:h,aspect:ratio,playerVisible:this.game.character.visible,animationTime:this.game.clock.elapsed});
    renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);renderer.setClearColor('#000000');renderer.clear();renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);renderer.setScissorTest(true);renderer.render(this.game.scene,camera);renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);
  }
  private syncUI(){const set=(id:string,value:string)=>{const e=this.ui.get(id);if(e)e.value=value;};set('world',this.game.worldManager.currentWorldId??'HOME');set('shot',this.shot?.id??'');set('season',this.season);set('weather',this.weather);set('camera',this.cameraMode);set('hour',String(this.hour));set('time',this.timePreset());set('duration',String(this.path.duration));set('fov',String(this.game.camera.fov));set('animal',this.scene.animalBehavior??'');const paused=this.ui.get('pause');if(paused instanceof HTMLInputElement)paused.checked=this.worldPaused;this.ui.get('path')!.value=JSON.stringify(this.path.snapshot,null,2);}
  private buildPanel(){
    const title=document.createElement('h2');title.textContent='Trailer Capture · 拍摄副本';const intro=document.createElement('p');intro.textContent='DEV ONLY · 不读写正式存档 · F8 隐藏/显示面板 · Esc 显示面板';this.panel.append(title,intro,this.status);
    const section=(name:string)=>{const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=name;field.append(legend);this.panel.append(field);return field;};
    const select=(parent:HTMLElement,id:string,label:string,values:readonly (readonly [string,string])[],change:(value:string)=>void)=>{const wrap=document.createElement('label'),el=document.createElement('select');wrap.textContent=label;el.setAttribute('aria-label',label);for(const [value,text] of values){const option=document.createElement('option');option.value=value;option.textContent=text;el.append(option);}el.addEventListener('change',()=>change(el.value));wrap.append(el);parent.append(wrap);this.ui.set(id,el);return el;};
    const number=(parent:HTMLElement,id:string,label:string,min:number,max:number,step:number,value:number,change:(value:number)=>void)=>{const wrap=document.createElement('label'),el=document.createElement('input');wrap.textContent=label;el.type='number';el.min=String(min);el.max=String(max);el.step=String(step);el.value=String(value);el.setAttribute('aria-label',label);el.addEventListener('change',()=>{const v=Number(el.value);if(Number.isFinite(v)&&v>=min&&v<=max)change(v);else el.value=String(value);});wrap.append(el);parent.append(wrap);this.ui.set(id,el);return el;};
    const check=(parent:HTMLElement,id:string,label:string,value:boolean,change:(v:boolean)=>void)=>{const wrap=document.createElement('label'),el=document.createElement('input');el.type='checkbox';el.checked=value;el.addEventListener('change',()=>change(el.checked));wrap.append(el,document.createTextNode(label));parent.append(wrap);this.ui.set(id,el);};
    const button=(parent:HTMLElement,label:string,action:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.type='button';b.addEventListener('click',action);parent.append(b);};
    const world=section('World / Climate');
    select(world,'world','世界',[['HOME','HomeWorld'],['FARM','FarmWorld'],['TRAVEL','TravelWorld']],v=>{void this.selectWorld(v as CaptureWorld);});
    select(world,'time','时间预设',[['6.4','清晨'],['12','正午'],['18.2','黄昏'],['23','夜晚']],v=>{this.stopPlayback();const d=this.game.gameplay.calendar.definition,requested=Number(v);this.setCalendar(this.season,requested===18.2?d.sunset-.2:requested===6.4?d.sunrise+.4:requested);this.syncUI();});
    number(world,'hour','小时（0–23.99）',0,23.99,.1,12,v=>{this.stopPlayback();this.setCalendar(this.season,v);this.syncUI();});
    select(world,'season','季节',[['spring','春'],['summer','夏'],['autumn','秋'],['winter','冬']],v=>{this.stopPlayback();this.setCalendar(v as SeasonId,this.hour);this.syncUI();});
    select(world,'weather','天气',[['CLEAR','晴天'],['OVERCAST','阴天'],['RAIN','雨天'],['STORM','风暴']],v=>{this.stopPlayback();this.setWeather(v as WeatherKind);this.syncUI();});
    const shots=section('Camera / Shots');
    select(shots,'shot','镜头预设',[['','自由机位 / 自定义'],...TRAILER_SHOTS.map(s=>[s.id,s.name] as const)],v=>{if(v)void this.selectShot(v);});shots.append(this.notes);
    button(shots,'Reset Shot · 重置镜头',()=>this.resetShot());button(shots,'Play Shot · 播放镜头',()=>this.play());button(shots,'Stop Shot · 停止镜头',()=>this.stopPlayback());
    select(shots,'camera','摄影机',[['free','自由摄影机'],['path','自动轨迹']],v=>{if(v==='free')this.setFree();else{this.free.enabled=false;this.free.clear();this.cameraMode='path';this.syncUI();}});
    number(shots,'move','移动速度',.1,30,.1,2,v=>this.free.moveSpeed=v);number(shots,'look','旋转速度',.1,3,.1,.7,v=>this.free.lookSpeed=v);number(shots,'smooth','镜头响应速度',.2,3,.1,1,v=>this.free.motionSpeed=v);
    number(shots,'fov','视野 FOV',15,100,1,48,v=>{this.setFree();this.game.camera.fov=v;});
    const help=document.createElement('p');help.textContent='自由机位：WASD 前后左右 · Q/E 降升 · 方向键旋转 · 左键拖动观察 · Shift 加速。移动与旋转带平滑缓冲。';shots.append(help);
    const path=section('Camera Path · 起点 → 终点');
    button(path,'记录起点（当前机位）',()=>{const p=this.readPath()??this.path.snapshot??{duration:12,poses:[cameraPose(this.game.camera),cameraPose(this.game.camera)]},poses=[...p.poses];poses[0]=cameraPose(this.game.camera);this.ui.get('path')!.value=JSON.stringify({...p,poses},null,2);});
    button(path,'记录终点（当前机位）',()=>{const p=this.readPath();if(!p)return;const poses=[...p.poses];poses[poses.length-1]=cameraPose(this.game.camera);this.ui.get('path')!.value=JSON.stringify({...p,poses},null,2);});
    const duration=number(path,'duration','持续时间（秒）',1,180,1,12,v=>{const p=this.readPath();if(p)this.ui.get('path')!.value=JSON.stringify({...p,duration:v},null,2);});
    const editor=document.createElement('textarea');editor.rows=4;editor.setAttribute('aria-label','轨迹数据');path.append(editor);this.ui.set('path',editor);
    // Keep both editable representations in sync before Apply, including input without blur.
    duration.addEventListener('input',()=>{const seconds=duration.valueAsNumber;if(!Number.isFinite(seconds)||seconds<1||seconds>180)return;try{const p=JSON.parse(editor.value) as CapturePath;if(validCapturePath(p))editor.value=JSON.stringify({...p,duration:seconds},null,2);}catch{/* Keep unfinished JSON editable. */}});
    editor.addEventListener('input',()=>{try{const p=JSON.parse(editor.value) as CapturePath;if(validCapturePath(p))duration.value=String(p.duration);}catch{/* Validate unfinished JSON only when applied. */}});
    button(path,'应用轨迹',()=>{const p=this.readPath();if(!p)return;this.shot=undefined;this.scene.stop();this.path.configure(p);this.cameraMode='path';this.free.enabled=false;this.free.sync();this.syncUI();});
    number(path,'orbit','环绕角度（度）',30,360,10,120,()=>{});
    button(path,'生成缓慢环绕轨迹',()=>{const camera=this.game.camera,actor=this.scene.actor;this.target.copy(actor?actor.root.position:camera.position).add(actor?new Vector3(0,.9,0):camera.getWorldDirection(new Vector3()).multiplyScalar(8));const p=orbitPath(cameraPose(camera),this.target.toArray(),Number(this.ui.get('orbit')!.value),Number(this.ui.get('duration')!.value));if(!validCapturePath(p)){this.setStatus('请先设置有效环绕角度和持续时间。');return;}this.shot=undefined;this.scene.stop();this.path.configure(p);this.cameraMode='path';this.free.enabled=false;this.free.sync();this.notes.textContent='环绕当前农机，或自由机位前方 8 米的注视点。';this.syncUI();});
    const capture=section('Capture');
    select(capture,'aspect','拍摄画幅',[['portrait','9:16 竖屏（真实画幅）'],['landscape','16:9 横屏'],['window','跟随窗口']],v=>this.aspect=v as typeof this.aspect);
    select(capture,'quality','画质',[['LOW','LOW'],['MEDIUM','MEDIUM'],['HIGH','HIGH']],v=>this.game.captureQuality(v as 'LOW'|'MEDIUM'|'HIGH'));
    number(capture,'resolution','渲染比例',.5,2,.1,1,v=>{this.game.renderer.renderScale=v;this.game.renderer.resize();});
    check(capture,'hud','隐藏全部 HUD / 提示 / 调试',true,v=>{this.hideHud=v;document.body.classList.toggle('trailer-clean',v);});
    check(capture,'player','隐藏玩家',false,v=>this.hidePlayer=v);check(capture,'pause','暂停世界（摄影机继续可用）',false,v=>this.worldPaused=v);
    check(capture,'sound','启用拍摄声音',false,v=>{void this.game.sound.setEnabled(v).catch(()=>this.setStatus('浏览器未允许音频，请再次点击启用。'));});number(capture,'volume','拍摄音量',0,1,.05,.65,v=>this.game.sound.setVolume(v));
    button(capture,'隐藏控制面板 [F8]',()=>{this.panel.hidden=true;this.free.clear();this.game.renderer.domElement.focus();});
    const video=section('本地 MP4 样片导出');video.className='export-controls';
    const progress=document.createElement('p');progress.setAttribute('aria-label','视频导出进度');progress.textContent='逐帧输出十个 1920×1080 / 30fps 横屏样片，无 HUD、无声音。需要本地 FFmpeg。';video.append(progress);
    const exporter=new TrailerVideoExporter(this.game,this,text=>progress.textContent=text);
    button(video,'拍摄十个横屏 MP4（1080p / 30fps / 无声）',()=>{void exporter.exportAll();});
    button(video,'停止导出（保留已完成视频）',()=>exporter.cancel());
    const prep=section('临时 Scene Preparation');
    select(prep,'crop','作物阶段',[['mature','成熟作物'],['growing','生长作物'],['sprout','幼苗'],['seed','刚播种']],v=>{this.scene.prepareCrops(v as 'mature'|'growing'|'sprout'|'seed');});
    button(prep,'准备成熟三块农田',()=>this.scene.prepareCrops());
    select(prep,'animal','动物活动',[['','使用正常状态'],['WALKING','圈舍内行走'],['IDLE','静止待机'],['EATING','进食'],['SLEEPING','睡眠']],v=>this.scene.setAnimalBehavior(v?v as 'WALKING'|'IDLE'|'EATING'|'SLEEPING':undefined));
    select(prep,'npc','NPC 模型',[['lighthouse_keeper','灯塔老人'],['merchant_captain','商船老板'],['fisherman','渔夫'],['farm_steward','农场管理员']],()=>{});
    const pose=document.createElement('input');pose.setAttribute('aria-label','NPC 位置 x,y,z');pose.value='-8.5,4,5.4';prep.append(pose);this.ui.set('npc-position',pose);number(prep,'npc-yaw','NPC 朝向（弧度）',-6.3,6.3,.1,0,()=>{});
    button(prep,'应用 NPC 临时位置',()=>{const xyz=pose.value.split(',').map(Number),yaw=Number(this.ui.get('npc-yaw')!.value);if(xyz.length!==3||!xyz.every(Number.isFinite)||!Number.isFinite(yaw)||!this.scene.moveNpc(this.ui.get('npc')!.value,xyz as [number,number,number],yaw))this.setStatus('NPC 不在当前世界或位置无效。');});
    select(prep,'machine','农机模型',[['farm.tractor','拖拉机'],['farm.combine','联合收割机']],()=>{});
    const machinePose=document.createElement('input');machinePose.setAttribute('aria-label','农机位置 x,z,yaw');machinePose.value='0,-12,3.141592653589793';prep.append(machinePose);
    button(prep,'应用农机临时位置',()=>{const p=machinePose.value.split(',').map(Number);if(p.length!==3||!this.scene.moveVehicle(this.ui.get('machine')!.value,p[0],p[1],p[2]))this.setStatus('农机不在当前世界或位置被地形/障碍物阻挡。');});
    button(this.panel,'退出拍摄模式 · 返回正常游戏',()=>{this.scene.stop();this.free.dispose();this.listeners.abort();location.assign(location.pathname);});
    this.ui.get('quality')!.value=this.game.renderer.quality;
  }
  private readPath():CapturePath|undefined {try{const value=JSON.parse(this.ui.get('path')!.value) as CapturePath;if(!validCapturePath(value))throw new Error('invalid');return value;}catch{this.setStatus('轨迹无效：需要 2–16 个机位、1–180 秒以及有效位置/四元数/FOV。');return undefined;}}
}
