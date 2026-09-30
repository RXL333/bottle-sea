import { expect, it } from 'vitest';
import { createItemRegistry, ItemRegistry, MAX_STACK_SIZE } from './ItemRegistry';
import { FISH } from './FishingCatalog';
import { FOODS } from './CookingCatalog';

it('registers stable immutable definitions without sharing returned lists', () => {
  const registry = new ItemRegistry(), item = { id: 'fish.test', name: '测试鱼', maxStack: 5,category:'fish' as const,description:'测试鱼描述',icon:'sardine' };
  expect(registry.register(item)).toBe(registry);
  item.name = 'changed';
  expect(registry.get('fish.test')).toEqual({ ...item,name:'测试鱼' });
  expect(Object.isFrozen(registry.get('fish.test'))).toBe(true);
  expect(registry.has('missing')).toBe(false);
  expect(registry.get('missing')).toBeUndefined();
  const list = registry.list() as unknown[];
  list.pop();
  expect(registry.list()).toHaveLength(1);
  expect(() => registry.register({ ...item,name:'duplicate' })).toThrow('already registered');
  expect(createItemRegistry().list().map(item => item.id)).toEqual(['wood', 'stone',...FISH.map(f=>f.id),...FOODS.map(f=>f.id)]);
});

it.each([
  { id: '', name: '鱼', maxStack: 1 }, { id: 'bad id', name: '鱼', maxStack: 1 },
  { id: 'fish', name: ' ', maxStack: 1 }, { id: 'fish', name: '鱼', maxStack: 0 },
  { id: 'fish', name: '鱼', maxStack: 1.5 }, { id: 'fish', name: '鱼', maxStack: Infinity },
  { id: 'fish', name: '鱼', maxStack: MAX_STACK_SIZE + 1 },
])('rejects invalid definitions without registering them: %j', item => {
  const registry = new ItemRegistry();
  expect(() => registry.register({...item,category:'fish',description:'测试描述',icon:'sardine'})).toThrow('Invalid item');
  expect(registry.list()).toHaveLength(0);
});
