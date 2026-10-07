import type { ProgressionSystem } from '../gameplay/progression/ProgressionSystem';
import { DAY_DURATION } from '../core/GameClock';
import { panelHeader,progressMeter } from './UIChrome';
/** Read-only presentation: progress and unlock checks stay in the shared service. */
export class ProgressionPanel {
  readonly element=document.createElement('dialog');private onClose=()=>{};
  constructor(root:HTMLElement){
    this.element.className='progression-panel ui-panel';this.element.setAttribute('aria-label','成长手记');root.append(this.element);
    this.element.addEventListener('cancel',e=>{e.preventDefault();this.close();});
    this.element.addEventListener('keydown',e=>{if(e.code==='KeyP'&&!e.repeat){e.preventDefault();e.stopPropagation();this.close();}});
  }
  get open(){return this.element.open;}
  show(progress:ProgressionSystem,close:()=>void){
    this.onClose=close;this.element.replaceChildren();
    const header=panelHeader('成长手记','A LIFE TAKING ROOT · 生活的航程',()=>this.close());
    const back=header.querySelector('button')!;
    const intro=document.createElement('p');intro.className='progression-intro';intro.textContent='按自己的节奏生活。先做过的事情也会被记住，无需按顺序完成。';
    const objective=document.createElement('section');objective.className='progression-main';objective.setAttribute('aria-label','当前主要目标');
    const next=progress.currentObjective;const label=document.createElement('small');label.textContent='当前主要目标';
    const heading=document.createElement('h3');heading.textContent=next?.name??'家园已经生根';const hint=document.createElement('p');hint.textContent=next?.hint??'继续探索、生产和照顾家园。新的成长方向将随后续内容加入。';objective.append(label,heading,hint);
    const counts=document.createElement('p');counts.className='progression-count';counts.textContent=`已完成 ${progress.completedCount} / ${progress.registry.listMilestones().length} 个里程碑`;
    const body=document.createElement('div');body.className='progression-columns';
    const route=document.createElement('section');const rh=document.createElement('h3');rh.textContent='生活的足迹';const list=document.createElement('ol');list.className='progression-route';
    for(const d of progress.registry.listMilestones()){
      const li=document.createElement('li'),done=progress.completed(d.id);li.className=`ui-card ${done?'complete':d.id===next?.id?'current':''}`;
      const name=document.createElement('strong');name.textContent=`${done?'✓':d.id===next?.id?'◇':'○'} ${d.name}`;
      const description=document.createElement('p');description.textContent=d.description;
      const note=document.createElement('small');note.textContent=done?`第 ${Math.floor(progress.completedAt(d.id)!/DAY_DURATION)+1} 天完成`:d.hint;
      li.append(name,description,note);list.append(li);
    }
    route.append(rh,list);
    const content=document.createElement('section');const ch=document.createElement('h3');ch.textContent='下一步的发展';content.append(ch);
    const grants=new Set(progress.snapshot().grants);
    for(const d of progress.registry.listUnlocks()){
      const card=document.createElement('article');card.className='progression-unlock ui-card';
      const ready=progress.isUnlocked(d.id),name=document.createElement('strong');name.textContent=d.name;
      const state=document.createElement('small');state.className=ready?'ready':'';state.textContent=d.implemented?(ready?'已解锁':'待解锁'):(ready?'接入条件已达成 · 后续内容':'后续内容预留');
      const description=document.createElement('p');description.textContent=d.description;
      const requirements=document.createElement('p');requirements.className='unlock-requirements';requirements.textContent=ready?(grants.has(d.id)?'已获得内容访问权限（委托奖励 / 旧存档保留）。':'对应里程碑已完成。'):`需要：${d.requires.filter(id=>!progress.completed(id)).map(id=>progress.registry.getMilestone(id)!.name).join('、')}`;
      card.append(name,state,description,requirements);content.append(card);
    }
    body.append(route,content);this.element.append(header,intro,objective,counts,progressMeter(progress.completedCount,progress.registry.listMilestones().length,'里程碑完成进度'),body);this.element.showModal();back.focus();
  }
  close(){if(!this.open)return;this.element.close();this.onClose();}
}
