import type { Updatable } from './GameLoop';
export const DAY_DURATION=480;
export interface ClockSnapshot { simulationTime: number; elapsed: number; timeScale: number; paused: boolean }
export interface TimeAdvance { fromGameTime: number; toGameTime: number; gameMinutes: number; daysPassed: number }
export class GameClock implements Updatable {
  simulationTime=DAY_DURATION*(7+(17+41/60)/24);
  elapsed=0;timeScale=1;paused=false;
  snapshot():ClockSnapshot {return {simulationTime:this.simulationTime,elapsed:this.elapsed,timeScale:this.timeScale,paused:this.paused};}
  restore(state:Partial<ClockSnapshot>) {
    if(typeof state.simulationTime==='number'&&Number.isFinite(state.simulationTime)&&state.simulationTime>=0&&state.simulationTime/DAY_DURATION*1440<=Number.MAX_SAFE_INTEGER)this.simulationTime=state.simulationTime;
    if(typeof state.elapsed==='number'&&Number.isFinite(state.elapsed)&&state.elapsed>=0)this.elapsed=state.elapsed;
    if(state.timeScale!==undefined&&[1,4,12].includes(state.timeScale))this.timeScale=state.timeScale;
    if(typeof state.paused==='boolean')this.paused=state.paused;
  }
  advanceGameMinutes(minutes:number):TimeAdvance {
    if(!Number.isFinite(minutes)||minutes<0)throw new Error('Game minutes must be finite and nonnegative');
    return this.advanceCalendarTo(this.simulationTime+minutes*DAY_DURATION/1440);
  }
  advanceToNextDay(hour=6,minute=0):TimeAdvance {
    if(!Number.isInteger(hour)||hour<0||hour>23||!Number.isInteger(minute)||minute<0||minute>59)throw new Error('Invalid next-day time');
    return this.advanceCalendarTo((Math.floor(this.simulationTime/DAY_DURATION)+1+(hour*60+minute)/1440)*DAY_DURATION);
  }
  private advanceCalendarTo(toGameTime:number):TimeAdvance {
    if(!Number.isFinite(toGameTime)||toGameTime<this.simulationTime||toGameTime/DAY_DURATION*1440>Number.MAX_SAFE_INTEGER)throw new Error('Game time out of range');
    const fromGameTime=this.simulationTime;
    // Explicit calendar jumps preserve waves, pause and speed, even while paused.
    this.simulationTime=toGameTime;
    return {fromGameTime,toGameTime,gameMinutes:(toGameTime-fromGameTime)*1440/DAY_DURATION,daysPassed:Math.floor(toGameTime/DAY_DURATION)-Math.floor(fromGameTime/DAY_DURATION)};
  }
  updateAnimation(deltaTime:number){if(!this.paused)this.elapsed+=Math.max(0,deltaTime)*this.timeScale;}
  update(deltaTime:number) {
    if(this.paused)return;
    const delta=Math.max(0,deltaTime)*this.timeScale;
    this.simulationTime+=delta;this.elapsed+=delta;
  }
  get normalizedDayTime(){return ((this.simulationTime%DAY_DURATION)+DAY_DURATION)%DAY_DURATION/DAY_DURATION;}
  private get minuteOfDay(){return Math.floor(this.normalizedDayTime*1440+1e-9)%1440;}
  get hour(){return Math.floor(this.minuteOfDay/60);}
  get minute(){return this.minuteOfDay%60;}
  get day(){return Math.floor(this.simulationTime/DAY_DURATION)+1;}
  get formatted(){return `${String(this.hour).padStart(2,'0')}:${String(this.minute).padStart(2,'0')}`;}
}
