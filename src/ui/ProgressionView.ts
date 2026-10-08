import type { ProgressionSystem,ProgressionCompletion } from '../gameplay/progression/ProgressionSystem';
export class ProgressionView {
  readonly element=document.createElement('button');readonly notice=document.createElement('aside');
  private revision=-1;private elapsed=0;private queue:string[]=[];
  constructor(root:HTMLElement,onOpen:()=>void){
    this.element.className='progression-objective';this.element.setAttribute('aria-label','查看成长手记');this.element.addEventListener('click',onOpen);
    this.element.innerHTML='<small>当前目标 <kbd>P</kbd></small><strong></strong><span></span>';
    this.notice.className='progression-notice';this.notice.hidden=true;this.notice.setAttribute('role','status');this.notice.setAttribute('aria-live','polite');root.append(this.element,this.notice);
  }
  completed(completion:ProgressionCompletion,progress:ProgressionSystem){
    for(const d of completion.milestones)this.queue.push(`里程碑完成 · ${d.name}`);
    const unlocked=completion.unlocked.map(id=>progress.registry.getUnlock(id)!).filter(d=>d.implemented);
    if(unlocked.length)this.queue.push(`新内容解锁 · ${unlocked.map(d=>d.name).join('、')}`);
  }
  update(delta:number,progress:ProgressionSystem,visible:boolean,notify:boolean){
    this.element.hidden=!visible;
    if(this.revision!==progress.revision){
      this.revision=progress.revision;const d=progress.currentObjective;
      this.element.querySelector('strong')!.textContent=d?.name??'家园已经生根';this.element.querySelector('span')!.textContent=d?.description??'继续经营喜欢的海岛生活。';
      this.element.title=d?.hint??'查看已完成里程碑和后续发展方向';
    }
    if(!notify){this.notice.hidden=true;return;}
    if(this.elapsed>0)this.elapsed=Math.max(0,this.elapsed-delta);
    if(!this.elapsed&&this.queue.length){this.notice.textContent=this.queue.shift()!;this.elapsed=4.5;}
    this.notice.hidden=this.elapsed===0;
  }
}
