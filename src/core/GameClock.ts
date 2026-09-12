import type { Updatable } from './GameLoop';
export const DAY_DURATION=480;
export interface ClockSnapshot { simulationTime: number; elapsed: number; timeScale: number; paused: boolean }
export class GameClock implements Updatable {
  simulationTime=DAY_DURATION*(7+(17+41/60)/24);
  elapsed=0;timeScale=1;paused=false;
  snapshot():ClockSnapshot {return {simulationTime:this.simulationTime,elapsed:this.elapsed,timeScale:this.timeScale,paused:this.paused};}
  restore(state:Partial<ClockSnapshot>) {
    if(typeof state.simulationTime==='number'&&Number.isFinite(state.simulationTime)&&state.simulationTime>=0)this.simulationTime=state.simulationTime;
    if(typeof state.elapsed==='number'&&Number.isFinite(state.elapsed)&&state.elapsed>=0)this.elapsed=state.elapsed;
    if(state.timeScale!==undefined&&[1,4,12].includes(state.timeScale))this.timeScale=state.timeScale;
    if(typeof state.paused==='boolean')this.paused=state.paused;
  }
  advanceGameMinutes(minutes:number) {
    if(!Number.isFinite(minutes)||minutes<0)throw new Error('Travel minutes must be finite and nonnegative');
    // Calendar advance does not jump wave/ship animation phases.
    this.simulationTime+=minutes*DAY_DURATION/1440;
  }
  update(deltaTime:number) {
    if(this.paused)return;
    const delta=Math.max(0,deltaTime)*this.timeScale;
    this.simulationTime+=delta;this.elapsed+=delta;
  }
  get normalizedDayTime(){return ((this.simulationTime%DAY_DURATION)+DAY_DURATION)%DAY_DURATION/DAY_DURATION;}
  get hour(){return Math.floor(this.normalizedDayTime*24);}
  get minute(){return Math.floor(this.normalizedDayTime*1440)%60;}
  get day(){return Math.floor(this.simulationTime/DAY_DURATION)+1;}
  get formatted(){return `${String(this.hour).padStart(2,'0')}:${String(this.minute).padStart(2,'0')}`;}
}
