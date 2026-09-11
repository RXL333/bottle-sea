import type { GameClock } from '../core/GameClock';
import { JOURNAL_TEXT,LANDMARKS } from '../world/underwater/Landmarks';
import { icons } from './icons';
import { FOCUS_LABELS } from '../systems/SceneFocusSystem';
export class HUD {
  readonly element = document.createElement('div');
  private noticeTimeout=0;
  private cardTimeout=0;
  constructor(root: HTMLElement) {
    this.element.className = 'hud';
    this.element.innerHTML = `
      <header class="identity"><p class="eyebrow">THE MARINER’S KEEPSAKE <span>/</span> No. 01</p><h1>瓶中沧海</h1><p class="tagline">一座孤岛，一段未完的航程。</p></header>
      <aside class="weather"><div id="day">第 8 天 · 晴天</div><time id="clock">17:41</time><div id="forecast">微风 · 平静的海</div></aside>
      <div class="bottom"><p class="hint" id="hint"><span>ⓘ</span> 点击拖动 · 移动视角 · 探索细节</p><nav class="toolbar" aria-label="世界控制">
        <button data-action="pause" aria-label="暂停时间" title="暂停时间">Ⅱ</button>
        <button data-speed="1" class="selected" aria-pressed="true">x1</button><button data-speed="4" aria-pressed="false">x4</button><button data-speed="12" aria-pressed="false">x12</button>
        <i></i><button data-action="storm" aria-pressed="false"><span class="icon">♧</span><span>风暴</span></button><button data-action="sound" aria-pressed="false"><span class="icon">♫</span><span>声音</span></button><button data-action="explore" aria-pressed="false"><span class="icon">⌖</span><span>探索模式</span></button>
      </nav></div><footer class="edition">✧ A SMALL WORLD IN TIME<br><span>VOXEL STORIES / 2026</span></footer><div class="voyage">◆ VOYAGE 01 <span id="fps">· — FPS</span></div>
      <section class="explore-panel" hidden><h2>航 海 手 记 <span id="progress">0 / 4</span></h2><ul id="quests"></ul><div class="key-help"><p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动</p><p>鼠标 观察 · <kbd>E</kbd> 交互</p><p><kbd>Space</kbd> 跳跃 / 上升</p><p><kbd>C</kbd> 下潜 · <kbd>Shift</kbd> 加速</p><p><kbd>Esc</kbd> 释放鼠标</p></div></section>
      <div id="depth" hidden></div><div id="crosshair" hidden>+</div><div id="notice" role="status" aria-live="polite"></div>
      <section class="discovery-card" hidden aria-live="polite"><button aria-label="关闭航海手记">×</button><p class="eyebrow">航海手记</p><h2></h2><p class="journal-text"></p><small></small></section>
      <details class="focus-menu"><summary>⌖ 观察点</summary><nav aria-label="观察点">${Object.entries(FOCUS_LABELS).map(([id,label])=>`<button data-focus="${id}" aria-pressed="${id==='overview'}">${label}</button>`).join('')}</nav></details>
      <button class="quality" title="切换像素精度" aria-label="切换像素精度">PIXEL / MEDIUM</button>`;
    root.append(this.element);
    for(const action of ['storm','sound','explore'] as const)this.element.querySelector(`[data-action="${action}"] .icon`)!.innerHTML=icons[action];
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
    if(!active){this.closeDiscovery();this.setInteractable(false);}
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
  updateClock(clock:GameClock,storm:boolean) {
    this.element.querySelector('#clock')!.textContent=clock.formatted;
    this.element.querySelector('#day')!.textContent=`第 ${clock.day} 天 · ${storm?'暴风':clock.hour>=19||clock.hour<6?'星夜':'晴天'}`;
    this.element.querySelector('#forecast')!.textContent=storm?'狂风 · 雷鸣的海':'微风 · 平静的海';
  }
}
