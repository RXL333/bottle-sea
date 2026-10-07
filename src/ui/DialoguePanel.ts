import type { DialogueSystem } from '../gameplay/npc/DialogueSystem';
import type { DialogueAction,DialogueFacts } from '../gameplay/npc/DialogueRegistry';
/** Scene-first conversation overlay; branches and history remain in DialogueSystem. */
export class DialoguePanel {
  readonly element=document.createElement('dialog');private system?:DialogueSystem;
  private onClose=()=>{};private onAction:(action:DialogueAction)=>void=()=>{};private facts?:()=>DialogueFacts;
  constructor(root:HTMLElement){
    this.element.className='dialogue-panel';this.element.setAttribute('aria-label','岛民对话');root.append(this.element);
    this.element.addEventListener('cancel',e=>{e.preventDefault();this.close();});
    this.element.addEventListener('keydown',e=>{
      e.stopPropagation();if(e.repeat)return;
      if(this.system?.current?.menu&&/^Digit[1-9]$/.test(e.code)){const b=this.element.querySelectorAll<HTMLButtonElement>('.dialogue-choices button')[Number(e.code.slice(5))-1];if(b){e.preventDefault();b.click();}return;}
      if((e.code==='KeyE'||e.code==='Space')&&e.target===this.element&&!this.system?.current?.menu){e.preventDefault();this.next();}
    });
  }
  get open(){return this.element.open;}
  show(system:DialogueSystem,facts:()=>DialogueFacts,close:()=>void,action:(action:DialogueAction)=>void){
    if(!system.current||this.open)return;this.system=system;this.facts=facts;this.onClose=close;this.onAction=action;this.render();this.element.showModal();document.body.classList.add('npc-dialogue');this.element.tabIndex=-1;this.element.focus();
  }
  private button(label:string,action:()=>void){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',action);return b;}
  private render(){
    const s=this.system?.current;if(!s)return;const npc=s.npc;this.element.replaceChildren();this.element.dataset.menu=String(s.menu);
    const close=this.button('结束对话 ×',()=>this.close());close.className='dialogue-close';close.setAttribute('aria-label',`关闭${npc.name}`);this.element.append(close);
    const subtitle=document.createElement('section');subtitle.className='dialogue-subtitle';subtitle.setAttribute('aria-label',`${npc.name}对话内容`);
    const speaker=document.createElement('header');speaker.className='dialogue-speaker';
    const image=document.createElement('img');image.src=import.meta.env.BASE_URL+npc.portrait;image.alt=`${npc.name}头像`;image.width=56;image.height=56;
    const identity=document.createElement('div'),name=document.createElement('h2'),role=document.createElement('small');name.textContent=npc.name;role.textContent=npc.role;identity.append(name,role);speaker.append(image,identity);subtitle.append(speaker);
    const text=document.createElement('p');text.className='dialogue-line';text.setAttribute('aria-live','polite');text.textContent=s.menu?'还想聊些什么？':s.line;subtitle.append(text);
    subtitle.addEventListener('click',()=>{if(!this.system?.current?.menu)this.next();});
    const footer=document.createElement('div');footer.className='dialogue-footer';const note=document.createElement('small'),hint=document.createElement('small');note.className='dialogue-note';note.textContent=s.menu?'选择一个想聊的话题':`${s.topic.label} · ${s.index+1} / ${s.total}`;hint.textContent=s.menu?'数字键选择 · Esc 结束对话':'点击台词 / E / Space 继续 · Esc 结束对话';footer.append(note,hint);subtitle.append(footer);this.element.append(subtitle);
    const choices=document.createElement('nav');choices.className='dialogue-choices';choices.setAttribute('aria-label','对话选项');
    if(s.menu){
      for(const [index,t] of s.choices.entries()){const b=this.button(t.label,()=>{if(this.system!.choose(t.id,this.facts!()))this.render();});b.className='dialogue-choice';b.dataset.heard=String(this.system!.heard(npc.id,t.id));const badge=document.createElement('span');badge.className='dialogue-choice-number';badge.textContent=String(index+1);b.prepend(badge);if(this.system!.heard(npc.id,t.id)){const tag=document.createElement('small');tag.textContent='已聊过';b.append(tag);}choices.append(b);}
      const bye=this.button('下次再聊',()=>this.close());bye.className='dialogue-choice dialogue-bye';const badge=document.createElement('span');badge.className='dialogue-choice-number';badge.textContent=String(s.choices.length+1);bye.prepend(badge);choices.append(bye);
    }else{
      const next=this.button(s.index<s.total-1?'下一句':s.topic.action==='trade'?'打开交易':s.topic.action==='progression'?'查看成长手记':s.topic.action==='calendar'?'打开日历':s.topic.action==='collections'?'打开航海手记':s.topic.action==='commissions'?'打开委托':'聊点别的',()=>this.next());next.className='dialogue-next';choices.append(next);
      if(s.topic.id!=='hello'){const back=this.button('返回话题',()=>{this.system!.menu();this.render();});back.className='dialogue-back';choices.append(back);}
    }
    this.element.append(choices);if(this.open)this.element.focus();
  }
  private next(){const action=this.system?.advance();if(action){this.close();this.onAction(action);}else this.render();}
  close(){if(!this.open)return;this.element.close();document.body.classList.remove('npc-dialogue');this.system?.close();this.onClose();}
}
