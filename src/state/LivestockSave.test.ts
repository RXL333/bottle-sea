import { expect,it } from 'vitest';
import { GameClock } from '../core/GameClock';
import { GameplayFoundation } from '../gameplay/GameplayFoundation';
import { SaveSystem,defaultSave,migrateSave } from './SaveSystem';
it('round trips feed, animals, pending products and collection alongside the other systems',()=>{
  let value:string|null=null;const save=new SaveSystem({getItem:()=>value,setItem:(_key,next)=>{value=next;}}),clock=new GameClock(),game=new GameplayFoundation(clock);
  game.inventory.add('crop.corn',15);game.livestock.feed('chicken');game.livestock.feed('cow');game.livestock.feed('sheep');game.home.chest.add('wood',5);game.inventory.add('fish.sardine',2);const storedWood=game.home.chest.count('wood');
  expect(save.save({...defaultSave(),...game.snapshot(),gameTime:clock.snapshot()})).toBe(true);clock.advanceGameMinutes(2880);
  const old=JSON.parse(value!),projected=migrateSave({...old,gameTime:clock.snapshot()}),restored=new GameplayFoundation(clock,projected);expect(restored.livestock.getAnimals().reduce((n,a)=>n+a.pending,0)).toBe(12);expect(restored.inventory.count('fish.sardine')).toBe(2);expect(restored.home.chest.count('wood')).toBe(storedWood);
  expect(restored.livestock.collect('cow-0').ok).toBe(true);const state=restored.snapshot();expect(save.save({...projected,...state,gameTime:clock.snapshot()})).toBe(true);
  const again=new GameplayFoundation(clock,save.load());expect(again.snapshot()).toEqual(state);expect(again.inventory.count('livestock.milk')).toBe(2);expect(again.livestock.collect('cow-0').ok).toBe(false);
  expect(value).not.toContain('Object3D');expect(value).not.toContain('uuid');
});
it.each([1,2])('adds safe livestock defaults to old v%i saves without losing existing resources',version=>{
  const raw={...defaultSave(),version,livestock:undefined};raw.inventory.slots[0]={itemId:'wood',quantity:12};const loaded=migrateSave(raw);expect(loaded.livestock.animals).toHaveLength(8);expect(loaded.livestock.pens.every(p=>p.feed===0)).toBe(true);expect(loaded.livestock.animals.every(a=>a.pending===0&&a.nextProductAtGameTime===null)).toBe(true);if(version===2)expect(loaded.inventory.slots[0]?.quantity).toBe(12);
});
