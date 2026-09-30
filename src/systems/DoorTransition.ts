/** Hold full cover while asynchronous scene loading finishes. No timers race input. */
export class DoorTransition {
  state:'IDLE'|'OUT'|'LOADING'|'IN'='IDLE';opacity=0;private elapsed=0;
  private switchWorld=async()=>{};private finish=()=>{};private failed=(error:unknown)=>{void error;};
  get active(){return this.state!=='IDLE';}
  start(switchWorld:()=>Promise<void>,finish:()=>void,failed:(error:unknown)=>void){
    if(this.active)return false;
    this.switchWorld=switchWorld;this.finish=finish;this.failed=failed;this.elapsed=0;this.opacity=0;this.state='OUT';return true;
  }
  update(delta:number){
    if(this.state==='OUT'){
      this.elapsed+=Math.max(0,delta);const p=Math.min(1,this.elapsed/.45);this.opacity=p*p*(3-2*p);
      if(p===1){this.state='LOADING';void this.swap();}
    }else if(this.state==='IN'){
      this.elapsed+=Math.max(0,delta);const p=Math.min(1,this.elapsed/.60);this.opacity=1-p*p*(3-2*p);
      if(p===1){this.state='IDLE';this.finish();}
    }
  }
  private async swap(){try{await this.switchWorld();}catch(error){this.failed(error);}finally{this.elapsed=0;this.state='IN';}}
}
