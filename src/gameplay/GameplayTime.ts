import type { GameClock, TimeAdvance } from '../core/GameClock';

/** Gameplay actions advance the calendar; animation and controls retain their clocks. */
export class GameplayTime {
  constructor(private clock: GameClock, private onChange: () => void = () => {}) {}
  get gameTime(): number { return this.clock.simulationTime; }
  get day(): number { return this.clock.day; }
  get hour(): number { return this.clock.hour; }
  get minute(): number { return this.clock.minute; }

  advanceMinutes(minutes: number): TimeAdvance {
    const result = this.clock.advanceGameMinutes(minutes);
    if (result.toGameTime !== result.fromGameTime) this.onChange();
    return result;
  }

  advanceToNextDay(hour = 6, minute = 0): TimeAdvance {
    const result = this.clock.advanceToNextDay(hour, minute);
    this.onChange();
    return result;
  }
}
