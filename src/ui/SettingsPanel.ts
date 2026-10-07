import type { SettingsState,GameSettings } from '../state/GameSettings';
import { STEERING_LABELS } from '../state/GameSettings';
import type { Quality } from '../core/Renderer';
import { panelHeader } from './UIChrome';
export interface SettingsAccess {
  state:SettingsState;quality:()=>Quality;setQuality:(quality:Quality)=>void;
  fishingMode:()=> 'hold'|'click';setFishingMode:(mode:'hold'|'click')=>void;
  setSound:(enabled:boolean)=>Promise<boolean>;reset:()=>void;
}
/** Preferences act on existing owners; this panel holds no gameplay data. */
export class SettingsPanel {
  readonly element=document.createElement('dialog');private access?:SettingsAccess;private onClose=()=>{};
  constructor(root:HTMLElement){this.element.className='settings-panel ui-panel';this.element.setAttribute('aria-label','游戏设置');root.append(this.element);this.element.addEventListener('cancel',e=>{e.preventDefault();this.close();});this.element.addEventListener('keydown',e=>{e.stopPropagation();if(e.code==='KeyO'&&!e.repeat){e.preventDefault();this.close();}});}
  get open(){return this.element.open;}
  show(access:SettingsAccess,close:()=>void){this.access=access;this.onClose=close;this.render();this.element.showModal();this.element.querySelector<HTMLButtonElement>('.ui-close')!.focus();}
  private render(){
    const a=this.access!,s=a.state.snapshot();this.element.replaceChildren(panelHeader('游戏设置','BOTTLE SEA · 按自己的节奏生活',()=>this.close()));
    const intro=document.createElement('p');intro.className='settings-intro';intro.textContent='设置立即生效并自动保存。打开设置时暂停游玩、停稳车辆；关闭后继续原来的旅程。';this.element.append(intro);
    const grid=document.createElement('div');grid.className='settings-sections';this.element.append(grid);
    const section=(title:string)=>{const box=document.createElement('section');box.className='ui-card settings-section';const h=document.createElement('h3');h.textContent=title;box.append(h);grid.append(box);return box;};
    const row=(box:HTMLElement,title:string,hint:string,input:HTMLElement)=>{const label=document.createElement('label');label.className='settings-row';const text=document.createElement('span'),name=document.createElement('strong'),note=document.createElement('small');name.textContent=title;note.textContent=hint;text.append(name,note);label.append(text,input);box.append(label);};
    const select=(box:HTMLElement,title:string,hint:string,value:string,options:Record<string,string>,change:(value:string)=>void)=>{const input=document.createElement('select');input.setAttribute('aria-label',title);for(const [id,name] of Object.entries(options)){const option=document.createElement('option');option.value=id;option.textContent=name;input.append(option);}input.value=value;input.addEventListener('change',()=>change(input.value));row(box,title,hint,input);};
    const range=(box:HTMLElement,key:'renderScale'|'lookSensitivity'|'vehicleSensitivity'|'orbitSensitivity'|'vehicleCameraDistance'|'volume',title:string,hint:string,min:number,max:number)=>{const wrap=document.createElement('div');wrap.className='settings-slider';const input=document.createElement('input'),output=document.createElement('output');input.type='range';input.min=String(min);input.max=String(max);input.step='.05';input.value=String(s[key]);input.setAttribute('aria-label',title);const show=()=>{output.textContent=key==='volume'||key==='renderScale'?`${Math.round(Number(input.value)*100)}%`:`${Number(input.value).toFixed(2)}×`;};show();input.addEventListener('input',()=>{a.state.set({[key]:Number(input.value)});show();});wrap.append(input,output);row(box,title,hint,wrap);};
    const check=(box:HTMLElement,key:'invertLookY'|'showFps',title:string,hint:string)=>{const input=document.createElement('input');input.type='checkbox';input.checked=s[key];input.setAttribute('aria-label',title);input.addEventListener('change',()=>a.state.set({[key]:input.checked}));row(box,title,hint,input);};
    const vehicle=section('农机驾驶');
    select(vehicle,'车辆转向方式','只改变左右转向。所有方式均保留 W / S 前进后退、Space 刹车。',s.vehicleSteering,STEERING_LABELS,v=>a.state.set({vehicleSteering:v as GameSettings['vehicleSteering']}));
    range(vehicle,'vehicleSensitivity','鼠标转向灵敏度','默认已降低。数值越小，左右转向越缓。',.25,2);
    range(vehicle,'orbitSensitivity','观察视角灵敏度','按住左键拖动观察农机，松开回到跟随视角。',.25,2);
    range(vehicle,'vehicleCameraDistance','跟随镜头距离','调整第三人称远近；遇到障碍仍会自动收近。',.8,1.6);
    const graphics=section('画面与性能');
    select(graphics,'画质档位','影响阴影、天气、植被与粒子。卡顿时可选择 LOW。',a.quality(),{LOW:'LOW · 流畅',MEDIUM:'MEDIUM · 均衡',HIGH:'HIGH · 精致'},v=>a.setQuality(v as Quality));
    range(graphics,'renderScale','渲染精度','相对于画质档位的分辨率，降低可减轻显卡负担。',.5,1.25);
    check(graphics,'showFps','显示帧率','在画面角落显示当前 FPS。');
    const look=section('步行与钓鱼');
    range(look,'lookSensitivity','第一人称视角灵敏度','同时作用于锁定鼠标和拖动观察。',.25,2);
    check(look,'invertLookY','反转视角纵轴','开启后上下观察方向反转。');
    select(look,'钓鱼张力操作','沿用现有钓鱼控制，不改变鱼获或农业规则。',a.fishingMode(),{hold:'长按控制',click:'点击控制'},v=>a.setFishingMode(v as 'hold'|'click'));
    const audio=section('声音');const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=s.soundEnabled;enabled.setAttribute('aria-label','启用游戏声音');
    enabled.addEventListener('change',()=>{enabled.disabled=true;void a.setSound(enabled.checked).then(value=>enabled.checked=value).finally(()=>enabled.disabled=false);});row(audio,'启用游戏声音','海浪、天气、脚步、发动机与交互音效。',enabled);
    range(audio,'volume','总音量','所有游戏音效统一调整。',0,1);
    const footer=document.createElement('footer');footer.className='settings-footer';const reset=document.createElement('button');reset.textContent='恢复默认设置';reset.addEventListener('click',()=>{a.reset();this.render();this.element.querySelector<HTMLButtonElement>('.ui-close')!.focus();});const note=document.createElement('small');note.textContent='O / Esc 关闭 · 恢复默认仅调整偏好，保留所有游戏进度。';footer.append(reset,note);this.element.append(footer);
  }
  close(){if(!this.open)return;this.element.close();this.onClose();}
}
