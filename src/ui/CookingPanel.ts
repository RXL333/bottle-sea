import type { GameplayServices } from '../gameplay/GameplayFoundation';
import { RECIPES } from '../gameplay/CookingCatalog';
import { panelHeader } from './UIChrome';
import { itemIcon } from './ItemIcon';

/** A stove menu and a small food-only pouch; no equipment/general bag UI. */
export class CookingPanel {
  readonly element=document.createElement('dialog');
  private gameplay?:GameplayServices;private onClose=()=>{};private mode:'stove'|'food'='stove';private preferredFish='';
  private message='';private renderedBusy=false;
  constructor(root:HTMLElement){
    this.element.className='home-panel cooking-panel ui-panel';root.append(this.element);
    this.element.addEventListener('cancel',event=>{event.preventDefault();this.close();});
  }
  get open(){return this.element.open;}
  show(gameplay:GameplayServices,mode:'stove'|'food',close:()=>void){
    this.gameplay=gameplay;this.mode=mode;this.onClose=close;this.message='';
    this.preferredFish=gameplay.items.fish().find(f=>gameplay.inventory.has(f.id))?.id??'';
    this.element.setAttribute('aria-label',mode==='stove'?'炉灶烹饪':'随身食物');this.render();this.element.showModal();
  }
  refresh(message=''){if(!this.open)return;this.message=message;this.render();}
  update(){
    if(!this.open||!this.gameplay)return;
    const cooking=this.gameplay.cooking;
    if(this.renderedBusy!==cooking.active)this.render();
    const bar=this.element.querySelector<HTMLElement>('.cooking-progress-fill');if(bar)bar.style.width=`${cooking.phaseProgress*100}%`;
    const progress=this.element.querySelector<HTMLElement>('[role="progressbar"]');if(progress)progress.setAttribute('aria-valuenow',String(Math.round(cooking.phaseProgress*100)));
  }
  close(){if(!this.open)return;this.gameplay?.cooking.cancel();this.element.close();this.onClose();}
  private button(label:string,action:()=>void){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',action);return b;}
  private render(){
    const game=this.gameplay!;this.renderedBusy=game.cooking.active;this.element.replaceChildren();
    const header=panelHeader(this.mode==='stove'?'炉火与晚餐':'随身食物','ISLAND KITCHEN · 一餐温暖',()=>this.close());
    const subtitle=document.createElement('p');subtitle.textContent=`体力 ${game.progress.energy} / ${game.progress.maxEnergy} · ${this.mode==='stove'?'食材取自随身背包，箱内物品请先取出。':'带着做好的料理，继续今天的探索。'}`;
    this.element.append(header,subtitle);
    if(this.mode==='stove')this.recipes();
    this.foods();
    const status=document.createElement('p');status.className='cooking-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent=this.message;
    const close=this.button(game.cooking.active?'取消烹饪并关闭':this.mode==='stove'?'离开炉灶':'收起食物',()=>this.close());close.className='home-back';
    this.element.append(status,close);
  }
  private recipes(){
    const game=this.gameplay!,cooking=game.cooking;
    const label=document.createElement('label');label.className='fish-select';label.textContent='鱼材优先使用 ';
    const select=document.createElement('select');select.setAttribute('aria-label','选择优先使用的鱼');select.disabled=cooking.active;
    const option=document.createElement('option');option.value='';option.textContent='自动选择（常见鱼优先）';select.append(option);
    for(const fish of game.items.fish()){const count=game.inventory.count(fish.id);if(!count)continue;const choice=document.createElement('option');choice.value=fish.id;choice.textContent=`${fish.name} × ${count}`;select.append(choice);}
    select.value=this.preferredFish;if(select.selectedIndex<0){this.preferredFish='';select.value='';}
    select.addEventListener('change',()=>{this.preferredFish=select.value;this.render();});label.append(select);this.element.append(label);
    if(cooking.active){
      const visual=document.createElement('div');visual.className='cooking-process';
      visual.innerHTML='<div class="cooking-pot" aria-hidden="true"><i></i><i></i><i></i><b></b></div><div class="cooking-progress" role="progressbar" aria-label="烹饪进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="cooking-progress-fill"></div></div>';
      const text=document.createElement('p');text.textContent=`正在制作 ${cooking.cookingRecipe?.name??'料理'}……`;visual.append(text);this.element.append(visual);
    }
    const grid=document.createElement('div');grid.className='recipe-grid';
    for(const recipe of RECIPES){
      const check=cooking.check(recipe.id,this.preferredFish),food=game.items.get(recipe.outputId)!;
      const card=document.createElement('section');card.className='recipe-card ui-card';
      const heading=document.createElement('h3');heading.textContent=recipe.name;
      const description=document.createElement('p');description.textContent=recipe.description;
      const needed=document.createElement('p');needed.className='recipe-materials';
      needed.textContent=check.ok?`将使用：${check.ingredients.map(i=>`${game.items.get(i.itemId)!.name} × ${i.quantity}`).join(' + ')}`
        :`${recipe.specificFish?'海鲈鱼':'任意鱼'} × ${recipe.fishQuantity}${recipe.materials.map(i=>` + ${game.items.get(i.itemId)!.name} × ${i.quantity}`).join('')}`;
      const effect=document.createElement('p');effect.textContent=`恢复体力 ${food.energyRestore??0} · 制作消耗 ${recipe.energyCost}`;
      const button=this.button(cooking.active?'炉灶使用中':check.ok?'制作一份':check.reason??'暂不可制作',()=>{
        const result=cooking.start(recipe.id,this.preferredFish);this.message=result.ok?'炉火正暖，稍候就能开饭。取消不会消耗食材。':result.reason??'暂时无法制作。';this.render();
      });button.disabled=cooking.active||!check.ok;
      card.append(itemIcon(food),heading,description,needed,effect,button);grid.append(card);
    }
    this.element.append(grid);
  }
  private foods(){
    const game=this.gameplay!,section=document.createElement('section'),title=document.createElement('h3');
    section.className='prepared-foods';title.textContent='做好的料理';section.append(title);
    let count=0;
    for(const food of game.items.food()){
      const quantity=game.inventory.count(food.id);if(!quantity)continue;count++;
      const row=document.createElement('div');row.className='food-row';const text=document.createElement('p');text.textContent=`${food.name} × ${quantity} · 恢复 ${food.energyRestore}`;
      const eat=this.button(game.progress.energy>=game.progress.maxEnergy?'体力已满':'吃一份',()=>{
        const result=game.cooking.eat(food.id);this.message=result.message;this.render();
      });eat.disabled=game.cooking.active||game.progress.energy>=game.progress.maxEnergy;row.append(text,eat);section.append(row);
    }
    if(!count){const empty=document.createElement('p');empty.className='storage-empty';empty.textContent='还没有做好的料理。带鱼回小屋，在炉灶旁按 E 做饭。';section.append(empty);}
    this.element.append(section);
  }
}
