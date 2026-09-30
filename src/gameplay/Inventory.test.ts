import { expect, it, vi } from 'vitest';
import { Inventory, normalizeInventory, MAX_INVENTORY_CAPACITY } from './Inventory';
import { ItemRegistry } from './ItemRegistry';

const items = () => new ItemRegistry().register({ id: 'fish', name: '测试鱼', maxStack: 5,category:'fish',description:'测试鱼',icon:'sardine' })
  .register({ id: 'wood', name: '测试木材', maxStack: 10,category:'material',description:'测试木材',icon:'wood' });

it('fills existing stacks, splits counts, removes across stacks and reuses empty slots', () => {
  const changed = vi.fn(), bag = new Inventory(items(), 3, undefined, changed);
  expect(bag.add('fish', 7)).toEqual({ ok: true });
  expect(bag.snapshot().slots).toEqual([{ itemId: 'fish', quantity: 5 }, { itemId: 'fish', quantity: 2 }, null]);
  expect(bag.add('fish', 4).ok).toBe(true);
  expect(bag.count('fish')).toBe(11);
  expect(bag.has('fish', 11)).toBe(true);
  expect(bag.remove('fish', 6).ok).toBe(true);
  expect(bag.snapshot().slots).toEqual([null, { itemId: 'fish', quantity: 4 }, { itemId: 'fish', quantity: 1 }]);
  expect(bag.add('wood', 10).ok).toBe(true);
  expect(bag.snapshot().slots[0]).toEqual({ itemId: 'wood', quantity: 10 });
  expect(changed).toHaveBeenCalledTimes(4);
});

it('rejects capacity and availability failures without partial mutations or save callbacks', () => {
  const changed = vi.fn(), bag = new Inventory(items(), 1, undefined, changed);
  bag.add('fish', 4);changed.mockClear();
  const before = bag.snapshot();
  expect(bag.canAdd('fish', 2)).toBe(false);
  expect(bag.add('fish', 2)).toEqual({ ok: false, reason: 'full' });
  expect(bag.remove('fish', 5)).toEqual({ ok: false, reason: 'insufficient-items' });
  expect(bag.add('missing', 1)).toEqual({ ok: false, reason: 'unknown-item' });
  expect(bag.snapshot()).toEqual(before);
  expect(changed).not.toHaveBeenCalled();
});

it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects quantity %s for all operations', quantity => {
  const bag = new Inventory(items(), 2), box = new Inventory(items(), 2);
  bag.add('fish', 5);const before = bag.snapshot();
  expect(bag.add('fish', quantity)).toEqual({ ok: false, reason: 'invalid-quantity' });
  expect(bag.remove('fish', quantity)).toEqual({ ok: false, reason: 'invalid-quantity' });
  expect(bag.transferTo(box, 'fish', quantity)).toEqual({ ok: false, reason: 'invalid-quantity' });
  expect(bag.has('fish', quantity)).toBe(false);
  expect(bag.canAdd('fish', quantity)).toBe(false);
  expect(bag.snapshot()).toEqual(before);expect(box.count('fish')).toBe(0);
});

it('moves whole transfers atomically and exposes both commits to callbacks', () => {
  const registry = items(), observed: number[][] = [];
  const record = () => observed.push([bag.count('fish'), box.count('fish')]);
  const bag = new Inventory(registry, 3, undefined, record), box = new Inventory(registry, 1, undefined, record);
  bag.add('fish', 8);box.add('fish', 3);observed.length = 0;
  const before = [bag.snapshot(), box.snapshot()];
  expect(bag.transferTo(box, 'fish', 3)).toEqual({ ok: false, reason: 'full' });
  expect([bag.snapshot(), box.snapshot()]).toEqual(before);expect(observed).toEqual([]);
  expect(bag.transferTo(box, 'fish', 2).ok).toBe(true);
  expect(observed).toEqual([[6, 5], [6, 5]]);
  expect(box.transferTo(bag, 'fish', 5).ok).toBe(true);
  expect(bag.count('fish')).toBe(11);expect(box.count('fish')).toBe(0);
  expect(bag.transferTo(bag, 'fish')).toEqual({ ok: false, reason: 'same-inventory' });
  expect(box.transferTo(bag, 'fish')).toEqual({ ok: false, reason: 'insufficient-items' });
  const unknown = new Inventory(new ItemRegistry(), 1);
  expect(bag.transferTo(unknown, 'fish')).toEqual({ ok: false, reason: 'unknown-item' });
  expect(bag.count('fish')).toBe(11);
});

it('restores bounded JSON state, ignores unknown/invalid stacks and isolates snapshots', () => {
  const raw = { capacity: 999999, slots: [
    { itemId: 'fish', quantity: 999 }, { itemId: 'missing', quantity: 4 },
    { itemId: 'wood', quantity: -4 }, { itemId: 'wood', quantity: 1.2 },
    { itemId: 'wood', quantity: 2 }, { itemId: 'wood', quantity: Infinity },
  ] };
  const bag = new Inventory(items(), 6, raw);
  expect(bag.snapshot()).toEqual({ capacity: 6, slots: [{ itemId: 'fish', quantity: 5 }, null, null, null, { itemId: 'wood', quantity: 2 }, null],selectedSlot:null });
  raw.slots[0].quantity = 1;const saved = bag.snapshot();saved.slots[0]!.quantity = 1;
  expect(bag.count('fish')).toBe(5);
  const restored = new Inventory(items(), 6, JSON.parse(JSON.stringify(bag.snapshot())));
  expect(restored.snapshot()).toEqual(bag.snapshot());
  const change = vi.fn(), target = new Inventory(items(), 6, undefined, change);
  target.restore(restored.snapshot());target.restore(restored.snapshot());
  expect(change).toHaveBeenCalledOnce();
  expect(normalizeInventory({ slots: 'bad' }, items(), 1).slots).toEqual([null]);
  expect(() => new Inventory(items(), MAX_INVENTORY_CAPACITY + 1)).toThrow('capacity');
});
