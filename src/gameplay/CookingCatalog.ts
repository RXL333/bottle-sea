import type { ItemStack } from './Inventory';
import { ITEMS } from './ItemRegistry';
export const FOODS=ITEMS.food();
export interface RecipeDefinition {
  readonly id:string;readonly name:string;readonly description:string;
  readonly fishQuantity:number;readonly specificFish?:string;
  readonly materials:readonly ItemStack[];readonly outputId:string;readonly energyCost:number;
}
const recipeRules:readonly Omit<RecipeDefinition,'name'>[]=[
  {id:'grill',description:'炉火烤出焦香的鱼皮。',fishQuantity:1,materials:[],outputId:'food.grilled_fish',energyCost:2},
  {id:'soup',description:'用两条鲜鱼煮一碗暖汤。',fishQuantity:2,materials:[],outputId:'food.seafood_soup',energyCost:3},
  {id:'pan_bass',description:'海鲈鱼的专属料理。',fishQuantity:1,specificFish:'fish.sea_bass',materials:[],outputId:'food.pan_sea_bass',energyCost:2},
  {id:'smoke',description:'添一块木材，让鱼肉带上烟香。',fishQuantity:1,materials:[{itemId:'wood',quantity:1}],outputId:'food.smoked_fish',energyCost:2},
];
export const RECIPES:readonly RecipeDefinition[]=recipeRules.map(recipe=>({...recipe,name:ITEMS.get(recipe.outputId)!.name}));
export const foodDefinition=(id:string)=>ITEMS.food().find(food=>food.id===id);
