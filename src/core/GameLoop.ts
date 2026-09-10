export interface Updatable { update(deltaTime: number): void }

export class GameLoop {
  private last = 0;
  private frame = 0;
  constructor(private readonly update: (delta: number) => void) {}
  start() { this.last = performance.now(); this.frame = requestAnimationFrame(this.tick); }
  stop() { cancelAnimationFrame(this.frame); }
  private tick = (now: number) => {
    const delta = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.update(delta);
    this.frame = requestAnimationFrame(this.tick);
  };
}
