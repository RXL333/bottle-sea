export interface PlayerProgressState { energy: number; maxEnergy: number; money: number }
export const defaultPlayerProgressState = (): PlayerProgressState => ({ energy: 100, maxEnergy: 100, money: 0 });

export function normalizePlayerProgress(value: unknown): PlayerProgressState {
  const input = value && typeof value === 'object' ? value as Partial<PlayerProgressState> : {};
  const maxEnergy = Number.isSafeInteger(input.maxEnergy) && input.maxEnergy! > 0 && input.maxEnergy! <= 10000
    ? input.maxEnergy! : 100;
  return {
    maxEnergy,
    energy: typeof input.energy === 'number' && Number.isFinite(input.energy) ? Math.max(0, Math.min(maxEnergy, input.energy)) : maxEnergy,
    money: Number.isSafeInteger(input.money) && input.money! >= 0 ? input.money! : 0,
  };
}

/** No passive drain, recovery or economy rules; features explicitly request changes. */
export class PlayerProgress {
  private state: PlayerProgressState;
  constructor(saved?: unknown, private onChange: () => void = () => {}) { this.state = normalizePlayerProgress(saved); }
  get energy(): number { return this.state.energy; }
  get maxEnergy(): number { return this.state.maxEnergy; }
  get money(): number { return this.state.money; }
  snapshot(): PlayerProgressState { return { ...this.state }; }

  spendEnergy(amount: number): boolean {
    if (!Number.isFinite(amount) || amount < 0 || this.energy < amount) return false;
    if (amount > 0) { this.state.energy -= amount; this.onChange(); }
    return true;
  }

  restoreEnergy(amount: number): number {
    if (!Number.isFinite(amount) || amount < 0) return 0;
    const recovered = Math.min(amount, this.maxEnergy - this.energy);
    if (recovered > 0) { this.state.energy += recovered; this.onChange(); }
    return recovered;
  }

  earnMoney(amount: number): boolean {
    if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(this.money + amount)) return false;
    if (amount > 0) { this.state.money += amount; this.onChange(); }
    return true;
  }

  spendMoney(amount: number): boolean {
    if (!Number.isSafeInteger(amount) || amount < 0 || this.money < amount) return false;
    if (amount > 0) { this.state.money -= amount; this.onChange(); }
    return true;
  }
}
