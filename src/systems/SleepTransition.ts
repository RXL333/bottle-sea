export const SLEEP_DURATION = 6;

/** One render-loop timeline drives the picture, calendar commit and input ownership. */
export class SleepTransition {
  state:'IDLE'|'PLAYING'='IDLE';
  private elapsed=0;private startedAt=0;private committed=false;
  private commit=()=>{};private finish=()=>{};private failed=(error:unknown)=>{void error;};
  constructor(private now:()=>number=()=>performance.now()){}
  get active(){return this.state==='PLAYING';}
  get progress(){return Math.min(1,this.elapsed/SLEEP_DURATION);}
  start(commit:()=>void,finish:()=>void,failed:(error:unknown)=>void){
    if(this.active)return false;
    this.commit=commit;this.finish=finish;this.failed=failed;this.elapsed=0;this.startedAt=this.now();this.committed=false;this.state='PLAYING';return true;
  }
  update(_delta:number){
    if(!this.active)return;
    // Wall time, independent of game speed and the movement loop's clamped delta.
    this.elapsed=Math.min(SLEEP_DURATION,Math.max(0,(this.now()-this.startedAt)/1000));
    if(!this.committed&&this.progress>=.82){
      this.committed=true;try{this.commit();}catch(error){this.failed(error);}
    }
    if(this.elapsed===SLEEP_DURATION){this.state='IDLE';this.finish();}
  }
}
