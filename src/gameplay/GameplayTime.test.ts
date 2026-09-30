import { expect, it, vi } from 'vitest';
import { DAY_DURATION, GameClock } from '../core/GameClock';
import { GameplayTime } from './GameplayTime';

it('advances a paused calendar once, reports crossed days and requests persistence', () => {
  const clock = new GameClock(), save = vi.fn(), time = new GameplayTime(clock, save);
  clock.simulationTime = DAY_DURATION * (7 + 23 / 24);clock.elapsed = 123;clock.timeScale = 12;clock.paused = true;
  const before = clock.snapshot(), result = time.advanceMinutes(120);
  expect(result.fromGameTime).toBe(before.simulationTime);
  expect(result.gameMinutes).toBeCloseTo(120);expect(result.daysPassed).toBe(1);
  expect(time.day).toBe(9);expect(time.hour).toBe(1);expect(time.minute).toBe(0);
  expect(time.gameTime).toBe(clock.simulationTime);
  expect(clock.snapshot()).toEqual({ ...before, simulationTime: result.toGameTime });
  time.advanceMinutes(0);expect(save).toHaveBeenCalledOnce();
});

it.each([[2, 0], [6, 0], [6, 37], [23, 59]])('always reaches the following day at %i:%i', (hour, minute) => {
  const clock = new GameClock(), save = vi.fn(), time = new GameplayTime(clock, save);
  clock.paused = true;clock.timeScale = 4;clock.elapsed = 10;
  const before = clock.snapshot(), day = clock.day, result = time.advanceToNextDay(hour, minute);
  expect(clock.day).toBe(day + 1);expect(clock.hour).toBe(hour);expect(clock.minute).toBe(minute);
  expect(result.daysPassed).toBe(1);expect(result.gameMinutes).toBeGreaterThan(0);
  expect(clock.snapshot()).toEqual({ ...before, simulationTime: result.toGameTime });
  expect(save).toHaveBeenCalledOnce();
});

it('rejects invalid and overflowing advances before changing or saving time', () => {
  const clock = new GameClock(), save = vi.fn(), time = new GameplayTime(clock, save), before = clock.snapshot();
  for (const amount of [-1, Infinity, NaN, Number.MAX_VALUE]) expect(() => time.advanceMinutes(amount)).toThrow();
  for (const [hour, minute] of [[-1, 0], [24, 0], [1.5, 0], [6, 60], [6, -1], [6, .5]]) {
    expect(() => time.advanceToNextDay(hour, minute)).toThrow();
  }
  expect(clock.snapshot()).toEqual(before);expect(save).not.toHaveBeenCalled();
  clock.restore({simulationTime:Number.MAX_VALUE});expect(clock.snapshot()).toEqual(before);
});
