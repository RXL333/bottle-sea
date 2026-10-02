import { seasonWeatherLabel } from '../gameplay/calendar/SeasonRegistry';
import type { SeasonId } from '../gameplay/calendar/SeasonRegistry';
import { calendarAt,dateLabel } from '../gameplay/calendar/CalendarSystem';
import type { CalendarDate } from '../gameplay/calendar/CalendarSystem';
import type { GameClock } from '../core/GameClock';
import { JOURNAL_TEXT,LANDMARKS } from '../world/underwater/Landmarks';
import { icons } from './icons';
import { FOCUS_LABELS } from '../systems/SceneFocusSystem';
import type { PlayerProgress } from '../gameplay/PlayerProgressState';
import type { GameplayServices } from '../gameplay/GameplayFoundation';
import type { FishingSystem } from '../gameplay/FishingSystem';
import { WEATHER_LABELS } from '../systems/WeatherState';
import type { WeatherKind } from '../systems/WeatherState';
export class HUD {
  readonly element = document.createElement('div');
  private noticeTimeout=0;
  private cardTimeout=0;
  constructor(root: HTMLElement) {
    this.element.className = 'hud';
    this.element.innerHTML = `
      <header class="identity"><p class="eyebrow">THE MARINER’S KEEPSAKE <span>/</span> No. 01</p><h1>瓶中沧海</h1><p class="tagline">一座孤岛，一段未完的航程。</p></header>
      <aside class="weather"><button id="day" class="calendar-link" data-action="calendar" aria-label="打开海岛日历" title="日历 [L]">第 1 年 · 春 8 日</button><time id="clock">17:41</time><div id="forecast">微风 · 平静的海</div><div class="home-stats" hidden></div></aside>
      <div class="bottom"><p class="hint" id="hint"><span>ⓘ</span> 点击拖动 · 移动视角 · 探索细节</p><nav class="toolbar" aria-label="世界控制">
        <button data-action="pause" aria-label="暂停时间" title="暂停时间">Ⅱ</button>
        <button data-speed="1" class="selected" aria-pressed="true">x1</button><button data-speed="4" aria-pressed="false">x4</button><button data-speed="12" aria-pressed="false">x12</button>
        <i></i><button data-action="storm" aria-pressed="false"><span class="icon">♧</span><span>风暴</span></button><button data-action="sound" aria-pressed="false"><span class="icon">♫</span><span>声音</span></button><button data-action="explore" aria-pressed="false"><span class="icon">⌖</span><span>探索模式</span></button><button data-action="progression">成长 [P]</button><button data-action="inventory">背包 [B]</button><button data-action="food">食物 [F]</button><button data-action="fishing-mode">钓鱼：长按 [R]</button>
      </nav></div><footer class="edition">✧ A SMALL WORLD IN TIME<br><span>VOXEL STORIES / 2026</span></footer><div class="voyage">◆ VOYAGE 01 <span id="fps">· — FPS</span></div>
      <section class="explore-panel" hidden><h2>航 海 手 记 <span id="progress">0 / 4</span></h2><ul id="quests"></ul><div class="key-help"><p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动</p><p>鼠标 观察 · <kbd>E</kbd> 交互</p><p><kbd>Space</kbd> 跳跃 / 上升</p><p><kbd>C</kbd> 下潜 · <kbd>Shift</kbd> 加速</p><p><kbd>Esc</kbd> 释放鼠标</p></div></section>
      <div id="depth" hidden></div><div id="crosshair" hidden>+</div><div class="interaction-prompt" hidden role="status" aria-live="polite"><kbd>E</kbd><div><small>交互</small><strong></strong></div></div><div id="notice" role="status" aria-live="polite"></div>
      <div class="production-stats" hidden></div>
      <section class="fishing-status" hidden aria-label="钓鱼"><strong aria-live="polite"></strong><small></small><div class="fishing-meter"><span></span></div><div class="fishing-fight" hidden><div class="tension-track" role="meter" aria-label="鱼线张力" aria-valuemin="0" aria-valuemax="100"><div class="tension-zone"></div><div class="tension-cursor"></div></div><div class="catch-progress" role="progressbar" aria-label="钓鱼进度" aria-valuemin="0" aria-valuemax="100"><svg viewBox="0 0 40 40" aria-hidden="true"><circle class="catch-track" cx="20" cy="20" r="16"/><circle class="catch-fill" cx="20" cy="20" r="16" pathLength="100"/></svg><b></b></div><p class="tension-feedback"></p></div></section>
      <section class="discovery-card" hidden aria-live="polite"><button aria-label="关闭航海手记">×</button><p class="eyebrow">航海手记</p><h2></h2><p class="journal-text"></p><small></small></section>
      <details class="focus-menu"><summary>⌖ 观察点</summary><nav class="ui-sidebar" aria-label="观察点">${Object.entries(FOCUS_LABELS).map(([id,label])=>`<button data-focus="${id}" aria-pressed="${id==='overview'}">${label}</button>`).join('')}</nav></details>
      <button class="quality" title="切换像素精度" aria-label="切换像素精度">PIXEL / MEDIUM</button>`;
    root.append(this.element);
    for(const action of ['storm','sound','explore'] as const)this.element.querySelector(`[data-action="${action}"] .icon`)!.innerHTML=icons[action];
    for(const action of ['progression','inventory','food'] as const){
      const button=this.element.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;
      const label=button.textContent!;const image=document.createElement('span');image.className='icon';image.innerHTML=icons[action];
      const text=document.createElement('span');text.textContent=label;button.replaceChildren(image,text);
    }
    this.updateQuests(new Set());
    this.element.querySelector('.discovery-card button')!.addEventListener('click',()=>this.closeDiscovery());
    window.addEventListener('keydown',event=>{if(event.code==='Escape')this.closeDiscovery();});
  }
  setSpeed(speed:number,paused:boolean) {
    this.element.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(button=>{const selected=Number(button.dataset.speed)===speed;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
    const pause=this.element.querySelector<HTMLButtonElement>('[data-action="pause"]')!;pause.textContent=paused?'▷':'Ⅱ';pause.setAttribute('aria-label',paused?'继续时间':'暂停时间');pause.title=paused?'继续时间':'暂停时间';pause.classList.toggle('engaged',paused);
  }
  setActive(action:string,active:boolean){const button=this.element.querySelector(`[data-action="${action}"]`)!;button.classList.toggle('engaged',active);button.setAttribute('aria-pressed',String(active));}
  setHint(text:string){this.element.querySelector('#hint')!.textContent=text;}
  setTransition(active:boolean){this.element.classList.toggle('transitioning',active);this.element.querySelector<HTMLButtonElement>('[data-action="explore"]')!.disabled=active;}
  setExplore(active:boolean){
    this.setActive('explore',active);document.body.classList.toggle('exploring',active);
    this.element.querySelector<HTMLElement>('.explore-panel')!.hidden=!active;
    this.element.querySelector<HTMLElement>('#crosshair')!.hidden=!active;
    this.element.querySelector('[data-action="explore"] span:last-child')!.textContent=active?'返回瓶外':'探索模式';
    this.setHint(active?'WASD 移动 · 拖动观察 · E 交互':'ⓘ 点击拖动 · 移动视角 · 探索细节');
    if(!active){this.closeDiscovery();this.setInteractable(false);this.setInteractionPrompt();}
  }
  updateDepth(underwater:boolean,depthWorld:number){const depth=this.element.querySelector<HTMLElement>('#depth')!;depth.hidden=!underwater;depth.textContent=`水下深度：${Math.max(0,depthWorld*5).toFixed(1)} m`;}
  updateQuests(discovered:Set<string>){this.element.querySelector('#quests')!.innerHTML=LANDMARKS.map(target=>`<li class="${discovered.has(target.id)?'found':''}">${discovered.has(target.id)?'▣':'□'} ${target.hint}</li>`).join('');this.element.querySelector('#progress')!.textContent=`${discovered.size} / 4`;}
  notify(text:string){const notice=this.element.querySelector('#notice')!;notice.textContent=text;notice.classList.add('visible');window.clearTimeout(this.noticeTimeout);this.noticeTimeout=window.setTimeout(()=>notice.classList.remove('visible'),3500);}
  showDiscovery(id:string,count:number){
    const target=LANDMARKS.find(item=>item.id===id);if(!target)return;const card=this.element.querySelector<HTMLElement>('.discovery-card')!;
    card.querySelector('h2')!.textContent=target.name;card.querySelector('.journal-text')!.textContent=JOURNAL_TEXT[id];card.querySelector('small')!.textContent=`已发现 ${count} / ${LANDMARKS.length}`;card.hidden=false;
    window.clearTimeout(this.cardTimeout);this.cardTimeout=window.setTimeout(()=>card.hidden=true,7000);
  }
  closeDiscovery(){const card=this.element.querySelector<HTMLElement>('.discovery-card')!;card.hidden=true;window.clearTimeout(this.cardTimeout);this.cardTimeout=0;}
  setInteractable(active:boolean){this.element.querySelector('#crosshair')!.textContent=active?'◇':'+';this.element.querySelector('#crosshair')!.classList.toggle('ready',active);}
  setInteractionPrompt(prompt?:{text:string;available:boolean}){
    const card=this.element.querySelector<HTMLElement>('.interaction-prompt')!;card.hidden=!prompt;
    if(!prompt)return;card.classList.toggle('blocked',!prompt.available);
    const label=prompt.text.replace(/^\[\s*E\s*\]\s*/,''),text=card.querySelector('strong')!,status=card.querySelector('small')!;
    if(text.textContent!==label)text.textContent=label;
    const state=prompt.available?'按键交互':'暂不可用';if(status.textContent!==state)status.textContent=state;
  }
  setWeather(kind:WeatherKind,season?:SeasonId){this.setActive('storm',kind!=='CLEAR');const button=this.element.querySelector<HTMLButtonElement>('[data-action="storm"]')!;button.querySelector('span:last-child')!.textContent=`天气：${season?seasonWeatherLabel(kind,season):WEATHER_LABELS[kind]}`;button.title='切换晴天 / 阴天 / 雨天 / 风暴';}
  updateClock(clock:GameClock,weather:boolean|WeatherKind,date:CalendarDate=calendarAt(clock.simulationTime)) {
    const kind=typeof weather==='boolean'?weather?'STORM':'CLEAR':weather;this.setWeather(kind,date.season);
    this.element.querySelector('#clock')!.textContent=clock.formatted;
    this.element.querySelector('#day')!.textContent=`${dateLabel(date)} · ${seasonWeatherLabel(kind,date.season)}`;
    this.element.querySelector('#forecast')!.textContent=date.season==='winter'&&(kind==='RAIN'||kind==='STORM')?(kind==='RAIN'?'轻雪 · 霜色田野':'风雪 · 屋中灯火'):{CLEAR:'微风 · 晴朗的海',OVERCAST:'云聚 · 柔和天光',RAIN:'细雨 · 湿润的田野',STORM:'强风 · 远处雷鸣'}[kind];
  }
  updateHomeStats(progress:PlayerProgress,inside:boolean){const stats=this.element.querySelector<HTMLElement>('.home-stats')!;stats.hidden=!inside;stats.textContent=`体力 ${Math.round(progress.energy)} / ${progress.maxEnergy}`;}
  updateProductionStats(game:GameplayServices,exploring:boolean){
    const stats=this.element.querySelector<HTMLElement>('.production-stats')!;stats.hidden=!exploring;
    stats.textContent=`体力 ${Math.round(game.progress.energy)} / ${game.progress.maxEnergy} · 鱼 ${game.items.fish().reduce((n,f)=>n+game.inventory.count(f.id),0)} · 料理 ${game.items.food().reduce((n,f)=>n+game.inventory.count(f.id),0)}`;
  }
  updateFishing(fishing:FishingSystem){
    const card=this.element.querySelector<HTMLElement>('.fishing-status')!,fighting=fishing.state==='FIGHTING';card.hidden=!fishing.active;
    document.body.classList.toggle('fishing-active',fishing.active);
    const mode=this.element.querySelector<HTMLButtonElement>('[data-action="fishing-mode"]')!;mode.textContent=`钓鱼：${fishing.inputMode==='hold'?'长按':'点击'} [R]`;
    if(!fishing.active)return;
    card.classList.toggle('bite',fishing.state==='BITE');card.classList.toggle('fierce',fishing.fierce);card.classList.toggle('danger',fishing.danger);
    const title=fighting?(fishing.danger?'鱼即将逃脱！':fishing.fierce?'鱼正在猛烈挣扎！':'控制鱼线张力'):fishing.prompt;
    const heading=card.querySelector('strong')!;if(heading.textContent!==title)heading.textContent=title;
    card.querySelector('small')!.textContent=fighting?(fishing.inputMode==='hold'?'按住左键向右 · 松开向左 · R 切换点击模式':'点击左键向右 · 停止点击向左 · R 切换长按模式'):'咬钩后按 E 提钩 · Esc 收起鱼竿';
    const meter=card.querySelector<HTMLElement>('.fishing-meter')!;meter.hidden=fighting;meter.querySelector<HTMLElement>('span')!.style.width=`${(fishing.state==='BITE'?1-fishing.phaseProgress:fishing.phaseProgress)*100}%`;
    card.querySelector<HTMLElement>('.fishing-fight')!.hidden=!fighting;if(!fighting)return;
    const track=card.querySelector<HTMLElement>('.tension-track')!,zone=card.querySelector<HTMLElement>('.tension-zone')!;
    track.setAttribute('aria-valuenow',String(Math.round(fishing.tension*100)));zone.style.left=`${fishing.zoneStart*100}%`;zone.style.width=`${fishing.zoneWidth*100}%`;
    card.querySelector<HTMLElement>('.tension-cursor')!.style.left=`${fishing.tension*100}%`;track.classList.toggle('inside',fishing.inZone);
    const progress=card.querySelector<HTMLElement>('.catch-progress')!,percentage=Math.round(fishing.catchProgress*100);
    progress.setAttribute('aria-valuenow',String(percentage));progress.querySelector('b')!.textContent=`${percentage}%`;
    (progress.querySelector('.catch-fill') as SVGCircleElement).style.strokeDashoffset=String(100-fishing.catchProgress*100);
    card.querySelector('.tension-feedback')!.textContent=fishing.danger?'对准张力区，挽回进度！':fishing.inZone?'张力合适 · 进度增加':'张力偏离 · 进度减少';
  }
}
