import { expect, it, vi } from 'vitest';
import { defaultPlayerProgressState, normalizePlayerProgress, PlayerProgress } from './PlayerProgressState';

it('spends and restores energy within bounds without passive changes', () => {
  const changed = vi.fn(), progress = new PlayerProgress(undefined, changed);
  expect(progress.snapshot()).toEqual(defaultPlayerProgressState());
  expect(progress.spendEnergy(30)).toBe(true);
  expect(progress.spendEnergy(71)).toBe(false);
  expect(progress.restoreEnergy(100)).toBe(30);
  expect(progress.restoreEnergy(1)).toBe(0);
  for (const bad of [-1, NaN, Infinity]) {
    expect(progress.spendEnergy(bad)).toBe(false);expect(progress.restoreEnergy(bad)).toBe(0);
  }
  expect(progress.spendEnergy(0)).toBe(true);
  expect(changed).toHaveBeenCalledTimes(2);expect(progress.energy).toBe(100);
});

it('keeps currency integer, nonnegative and safe from arithmetic overflow', () => {
  const changed = vi.fn(), progress = new PlayerProgress(undefined, changed);
  expect(progress.earnMoney(20)).toBe(true);expect(progress.spendMoney(21)).toBe(false);
  expect(progress.spendMoney(15)).toBe(true);expect(progress.money).toBe(5);
  for (const bad of [-1, .5, NaN, Infinity]) {
    expect(progress.earnMoney(bad)).toBe(false);expect(progress.spendMoney(bad)).toBe(false);
  }
  expect(progress.earnMoney(Number.MAX_SAFE_INTEGER)).toBe(false);
  expect(progress.earnMoney(0)).toBe(true);expect(progress.spendMoney(0)).toBe(true);
  const snapshot = progress.snapshot();snapshot.money = 999;
  expect(progress.money).toBe(5);expect(changed).toHaveBeenCalledTimes(2);
});

it('normalizes corrupt progress and preserves valid custom energy limits', () => {
  expect(normalizePlayerProgress({ maxEnergy: -10, energy: Infinity, money: .5 })).toEqual(defaultPlayerProgressState());
  expect(normalizePlayerProgress({ maxEnergy: 50, energy: 100, money: -5 })).toEqual({ maxEnergy: 50, energy: 50, money: 0 });
  expect(normalizePlayerProgress({ maxEnergy: 150, energy: -1, money: 25 })).toEqual({ maxEnergy: 150, energy: 0, money: 25 });
  expect(new PlayerProgress(JSON.parse(JSON.stringify({ maxEnergy: 150, energy: 70, money: 25 }))).snapshot()).toEqual({ maxEnergy: 150, energy: 70, money: 25 });
});
