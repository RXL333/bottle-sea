import { expect, it, vi } from 'vitest';
import { GameClock } from '../core/GameClock';
import { GameplayFoundation } from '../gameplay/GameplayFoundation';
import { InteractionActions, InteractionSystem } from './InteractionSystem';
import type { InteractionContext, InteractionTarget } from './InteractionSystem';

const context = (x = 0): InteractionContext => ({ position: { x, y: 0, z: 0 }, worldId: 'HOME', gameplay: new GameplayFoundation(new GameClock()) });
const target = (overrides: Partial<InteractionTarget> = {}): InteractionTarget => ({ id: 'test', name: '测试物件', action: 'TEST', x: 0, y: 0, z: 0, ...overrides });

it('selects the closest target and rechecks distance when E is pressed', async () => {
  const handler = vi.fn(() => ({ status: 'success' as const })), actions = new InteractionActions().register('TEST', handler);
  const system = new InteractionSystem([target({ id: 'far', x: .5 }), target({ id: 'near', x: .2 })]);
  expect(system.getPrompt(context(), actions)).toEqual({ text: '[ E ] 测试物件', available: true });
  expect(system.nearest?.id).toBe('near');
  expect((await system.interact(context(10), actions)).status).toBe('no-target');
  expect(handler).not.toHaveBeenCalled();
  expect((await system.interact(context(), actions)).target?.id).toBe('near');
  expect(handler).toHaveBeenCalledOnce();
  system.setTargets([target({ range: -1 }), target({ range: NaN }), target({ range: Infinity })]);
  expect(system.getPrompt(context(), actions)).toBeUndefined();
});

it('checks availability for both prompt and execution without invoking blocked actions', async () => {
  const handler = vi.fn(() => ({ status: 'success' as const }));
  const system = new InteractionSystem([target({ unavailable: () => '体力不足', onInteract: handler })]);
  expect(system.getPrompt(context())).toEqual({ text: '[ E ] 体力不足', available: false });
  expect((await system.interact(context())).status).toBe('unavailable');expect(handler).not.toHaveBeenCalled();
  system.setTargets([target()]);
  expect(system.getPrompt(context())?.available).toBe(false);
  expect((await system.interact(context())).message).toBe('此交互尚未开放');
});

it('dispatches local actions with the shared gameplay interfaces and structured feedback', async () => {
  const state = context(), requested = vi.spyOn(state.gameplay, 'requestSave');
  const system = new InteractionSystem([target({ prompt: '领取测试物品', onInteract: ({ gameplay }) => {
    const received = gameplay.inventory.add('wood', 2);
    if (!received.ok) return { status: 'unavailable', message: '背包已满' };
    gameplay.progress.spendEnergy(3);gameplay.time.advanceMinutes(5);
    return { status: 'success', message: '获得木材 × 2', changed: true };
  } })]);
  expect(system.getPrompt(state)).toEqual({ text: '[ E ] 领取测试物品', available: true });
  expect(await system.interact(state)).toMatchObject({ status: 'success', changed: true, message: '获得木材 × 2' });
  expect(state.gameplay.inventory.count('wood')).toBe(2);expect(state.gameplay.progress.energy).toBe(97);
  expect(requested).toHaveBeenCalledTimes(3);expect(system.discovered.size).toBe(0);
});

it('owns an asynchronous action until it settles and rejects duplicate E presses', async () => {
  let release!: () => void;
  const handler = vi.fn(async () => { await new Promise<void>(resolve => { release = resolve; });return { status: 'success' as const }; });
  const system = new InteractionSystem([target({ onInteract: handler })]), state = context();
  const first = system.interact(state);
  expect(system.busy).toBe(true);expect(system.getPrompt(state)?.available).toBe(false);
  expect((await system.interact(state)).status).toBe('busy');expect(handler).toHaveBeenCalledOnce();
  release();expect((await first).status).toBe('success');expect(system.busy).toBe(false);
});

it('returns errors and releases ownership after handler or availability failures', async () => {
  const system = new InteractionSystem([target({ onInteract: async () => { throw Error('failed'); } })]);
  expect(await system.interact(context())).toMatchObject({ status: 'error', message: '暂时无法交互，请重试。' });
  expect(system.busy).toBe(false);
  system.setTargets([target({ onInteract: () => ({ status: 'success' }), unavailable: () => { throw Error('check'); } })]);
  expect(system.getPrompt(context())?.available).toBe(false);
  expect((await system.interact(context())).status).toBe('error');expect(system.busy).toBe(false);
  system.setTargets([target({ onInteract: () => ({ status: 'success' }) })]);
  expect((await system.interact(context())).status).toBe('success');
});

it('preserves discovery idempotency and keeps custom actions out of discovery progress', async () => {
  const system = new InteractionSystem();
  const state = { ...context(), position: { x: -1.8, y: 1.95, z: 1.1 } };
  const first = await system.interact(state), again = await system.interact(state);
  expect(first.discovery).toEqual({ id: 'chest', count: 1, isNew: true });expect(first.changed).toBe(true);
  expect(again.discovery).toEqual({ id: 'chest', count: 1, isNew: false });expect(again.changed).toBe(false);
  system.restore(['anchor', 'unknown', 'anchor']);expect([...system.discovered]).toEqual(['anchor']);
  system.setTargets([target({ action: 'DISCOVER' })]);
  expect((await system.interact(context())).status).toBe('unavailable');expect(system.discovered.size).toBe(1);
});

it('registers global travel/door actions once and reserves the built-in discovery action', async () => {
  const actions = new InteractionActions(), handler = vi.fn(() => ({ status: 'success' as const }));
  for (const action of ['TRAVEL', 'ENTER_COTTAGE', 'EXIT_COTTAGE']) actions.register(action, handler);
  const system = new InteractionSystem();
  for (const action of ['TRAVEL', 'ENTER_COTTAGE', 'EXIT_COTTAGE']) {
    system.setTargets([target({ action })]);expect((await system.interact(context(), actions)).status).toBe('success');
  }
  expect(handler).toHaveBeenCalledTimes(3);expect(system.discovered.size).toBe(0);
  expect(() => actions.register('TRAVEL', handler)).toThrow();expect(() => actions.register('DISCOVER', handler)).toThrow();
});
