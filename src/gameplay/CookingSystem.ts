import type { ActivitySink } from './progression/ProgressionRegistry';
import { RECIPES } from './CookingCatalog';
import type { RecipeDefinition } from './CookingCatalog';
import type { Inventory,ItemStack } from './Inventory';
import type { PlayerProgress } from './PlayerProgressState';

export const COOKING_DURATION=3;
export interface CookingCheck { ok:boolean;reason?:string;ingredients:ItemStack[];recipe?:RecipeDefinition }
export interface CookingResult { ok:boolean;message:string;kind:'cooked'|'ate'|'failed' }
export class CookingSystem {
  private job?:{recipeId:string;preferredFish?:string;elapsed:number};
  onResult:(result:CookingResult)=>void=()=>{};
  constructor(private inventory:Inventory,private progress:PlayerProgress,private onActivity:ActivitySink=()=>{},private recipeLock:(id:string)=>string|undefined=()=>undefined){}
  get active(){return this.job!==undefined;}
  get cookingRecipe(){return RECIPES.find(recipe=>recipe.id===this.job?.recipeId);}
  get phaseProgress(){return this.job?Math.min(1,this.job.elapsed/COOKING_DURATION):0;}
  check(recipeId:string,preferredFish?:string):CookingCheck {
    const recipe=RECIPES.find(item=>item.id===recipeId),ingredients:ItemStack[]=[];
    if(!recipe)return {ok:false,reason:'未知食谱。',ingredients};
    const locked=this.recipeLock(recipeId);if(locked)return {ok:false,reason:locked,ingredients,recipe};
    let remaining=recipe.fishQuantity;
    const fish=this.inventory.items.fish();
    const pool=recipe.specificFish?fish.filter(f=>f.id===recipe.specificFish)
      :[...fish.filter(f=>f.id===preferredFish),...fish.filter(f=>f.id!==preferredFish)];
    for(const fish of pool){const quantity=Math.min(remaining,this.inventory.count(fish.id));if(quantity){ingredients.push({itemId:fish.id,quantity});remaining-=quantity;}if(!remaining)break;}
    ingredients.push(...recipe.materials.map(item=>({...item})));
    if(remaining)return {ok:false,reason:recipe.specificFish?'需要海鲈鱼 × 1。':`需要随身背包中有 ${recipe.fishQuantity} 条鱼。`,ingredients,recipe};
    for(const material of recipe.materials)if(!this.inventory.has(material.itemId,material.quantity))return {ok:false,reason:`缺少 ${this.inventory.items.get(material.itemId)?.name??material.itemId} × ${material.quantity}。`,ingredients,recipe};
    if(this.progress.energy<recipe.energyCost)return {ok:false,reason:`需要 ${recipe.energyCost} 点体力，先吃点食物或休息。`,ingredients,recipe};
    const exchanged=this.inventory.canExchange(ingredients,[{itemId:recipe.outputId,quantity:1}]);
    if(!exchanged.ok)return {ok:false,reason:exchanged.reason==='full'?'背包空间不足，无法放入料理。':'当前物品无法制作此料理。',ingredients,recipe};
    return {ok:true,ingredients,recipe};
  }
  start(recipeId:string,preferredFish?:string):CookingCheck {
    if(this.active)return {ok:false,reason:'炉灶正在使用中。',ingredients:[]};
    const checked=this.check(recipeId,preferredFish);if(checked.ok)this.job={recipeId,preferredFish,elapsed:0};return checked;
  }
  update(delta:number){
    if(!this.job)return;this.job.elapsed+=Number.isFinite(delta)?Math.max(0,delta):0;if(this.job.elapsed<COOKING_DURATION)return;
    const job=this.job;this.job=undefined;const checked=this.check(job.recipeId,job.preferredFish);
    if(!checked.ok||!checked.recipe){this.onResult({ok:false,kind:'failed',message:checked.reason??'暂时无法制作。'});return;}
    const recipe=checked.recipe,result=this.inventory.exchange(checked.ingredients,[{itemId:recipe.outputId,quantity:1}]);
    if(!result.ok){this.onResult({ok:false,kind:'failed',message:'材料或背包空间已变化，本次没有扣除材料。'});return;}
    this.progress.spendEnergy(recipe.energyCost);this.onActivity('cook.complete',[{itemId:recipe.outputId,quantity:1}]);
    this.onResult({ok:true,kind:'cooked',message:`做好了 ${recipe.name} × 1 · 已放入背包`});
  }
  cancel(){this.job=undefined;}
  eat(foodId:string,slotIndex?:number):CookingResult {
    const food=this.inventory.items.get(foodId);
    const fail=(message:string):CookingResult=>({ok:false,kind:'failed',message});
    if(this.active)return fail('正在烹饪，请完成或取消后再食用。');
    if(!food||food.category!=='food'||food.energyRestore===undefined||food.energyRestore<=0)return fail('这件物品不能直接食用。');
    if(this.progress.energy>=this.progress.maxEnergy)return fail('体力已经充足，食物已保留。');
    if(slotIndex!==undefined&&this.inventory.getSlot(slotIndex)?.itemId!==food.id)return fail('所选槽位的食物已变化。');
    const removed=slotIndex===undefined?this.inventory.remove(food.id):this.inventory.removeFromSlot(slotIndex);
    if(!removed.ok)return fail('背包中没有这份食物。');
    const energy=this.progress.restoreEnergy(food.energyRestore),result:CookingResult={ok:true,kind:'ate',message:`吃了 ${food.name} · 恢复 ${energy} 点体力`};
    this.onResult(result);return result;
  }
}
