import type { Updatable } from './GameLoop';
export const DAY_DURATION=480;
export class GameClock implements Updatable {
  simulationTime=DAY_DURATION*(7+(17+41/60)/24);
  elapsed=0;timeScale=1;paused=false;
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
