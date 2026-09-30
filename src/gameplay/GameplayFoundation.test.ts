import { afterEach, expect, it, vi } from 'vitest';
import { Group, Scene } from 'three';
import { GameClock } from '../core/GameClock';
import { SaveSystem, SAVE_KEY, defaultSave } from '../state/SaveSystem';
import { WorldStateRegistry } from '../state/WorldStateRegistry';
import { WorldManager } from '../worlds/WorldManager';
import { WorldRegistry } from '../worlds/WorldRegistry';
import type { GameWorld, WorldId } from '../worlds/types';
import { GameplayFoundation } from './GameplayFoundation';
import type { GameplayServices } from './GameplayFoundation';

afterEach(() => vi.useRealTimers());

it('keeps one gameplay instance through all world lifecycles and error recovery', async () => {
  const clock = new GameClock(), gameplay = new GameplayFoundation(clock), services: GameplayServices[] = [];
  const registry = new WorldRegistry(), states = new WorldStateRegistry();
  const world = (id: WorldId): GameWorld => ({
    id, root: new Group(), load() {}, enter(context) { services.push(context.gameplay); },
    update() {}, leave: ({ gameTime }) => ({ lastSimulatedGameTime: gameTime, discoveries: [] }),
    dispose() { this.root.clear(); }, applyQuality() {},
    getSpawnPoint: () => ({ id: 'test', position: [0, 1, 0], lookAt: [0, 1, -1] }),
  });
  let fail = false;
  for (const id of ['HOME', 'FARM', 'COTTAGE', 'TRAVEL'] as const) registry.register(id, () => {
    const created = world(id);
    if (id === 'FARM' && fail) created.load = () => { throw Error('test failure'); };
    return created;
  });
  const manager = new WorldManager(new Scene(), registry, states, () => {}, gameplay);
  gameplay.inventory.add('wood', 7);gameplay.progress.spendEnergy(20);gameplay.progress.earnMoney(8);
  const before = gameplay.snapshot();
  for (const id of ['HOME', 'COTTAGE', 'HOME', 'TRAVEL', 'FARM', 'HOME'] as const) {
    await manager.switchTo(id, clock.simulationTime);
    expect(services.at(-1)).toBe(gameplay);expect(gameplay.snapshot()).toEqual(before);
  }
  fail = true;
  await expect(manager.switchTo('FARM', clock.simulationTime)).rejects.toThrow('test failure');
  expect(services.at(-1)).toBe(gameplay);expect(gameplay.snapshot()).toEqual(before);
  await manager.switchTo('HOME', clock.simulationTime);
  expect(gameplay.snapshot()).toEqual(before);manager.currentWorld?.dispose();
});

it('coalesces successful mutations into a fresh save and restores all gameplay services', () => {
  vi.useFakeTimers();const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: vi.fn((key: string, value: string) => { values.set(key, value); }) };
  const save = new SaveSystem(storage), clock = new GameClock();
  const capture = () => ({ ...defaultSave(), ...gameplay.snapshot(), gameTime: clock.snapshot() });
  const gameplay = new GameplayFoundation(clock, undefined, undefined, () => save.schedule(capture));
  gameplay.inventory.add('wood', 8);gameplay.progress.spendEnergy(10);gameplay.progress.earnMoney(25);gameplay.time.advanceMinutes(20);
  expect(storage.setItem).not.toHaveBeenCalled();vi.advanceTimersByTime(250);
  expect(storage.setItem).toHaveBeenCalledOnce();expect(values.has(SAVE_KEY)).toBe(true);
  const loaded = save.load(), restoredClock = new GameClock();restoredClock.restore(loaded.gameTime);
  const restored = new GameplayFoundation(restoredClock, loaded);
  expect(restored.snapshot()).toEqual(gameplay.snapshot());expect(restored.time.gameTime).toBe(gameplay.time.gameTime);
  const detached = gameplay.snapshot();detached.inventory.slots[0]!.quantity = 1;detached.progress.money = 1000;
  expect(gameplay.inventory.count('wood')).toBe(8);expect(gameplay.progress.money).toBe(25);
  gameplay.inventory.remove('wood', 9);gameplay.progress.spendEnergy(1000);gameplay.progress.earnMoney(-1);
  vi.advanceTimersByTime(1000);expect(storage.setItem).toHaveBeenCalledOnce();
  gameplay.inventory.add('stone', 2);save.flush(capture);vi.runAllTimers();expect(storage.setItem).toHaveBeenCalledTimes(2);
});
