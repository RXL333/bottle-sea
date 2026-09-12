import type { DestinationId,PlayerState,PlayableWorldId } from '../state/PlayerState';
import { canTravelTo,destination } from './DestinationRegistry';
export type TravelState='IDLE'|'BOARDING'|'DEPARTING'|'SAILING_OUT'|'WORLD_SWITCH'|'SAILING_IN'|'ARRIVING'|'DISEMBARKING'|'ERROR';
export interface TravelHooks {
  board():void;
  switchToTravel():Promise<void>;
  prepareDestination(id:PlayableWorldId):Promise<void>;
  switchToDestination(id:PlayableWorldId):Promise<void>;
  arrive(id:PlayableWorldId,minutes:number):void;
  recoverHome(error:unknown):Promise<void>;
  fatal(error:unknown):void;
}
export const TRAVEL_DURATIONS={BOARDING:.45,DEPARTING:1.65,SAILING_OUT:1.1,SAILING_IN:1.7,ARRIVING:1.5,DISEMBARKING:.45} as const;
export class TravelSystem {
  state:TravelState='IDLE';elapsed=0;target:PlayableWorldId|null=null;
  private pending:Promise<void>|null=null;
  constructor(private player:PlayerState,private hooks:TravelHooks){}
  get active(){return this.state!=='IDLE'&&this.state!=='ERROR';}
  get progress(){return this.state in TRAVEL_DURATIONS?Math.min(1,this.elapsed/TRAVEL_DURATIONS[this.state as keyof typeof TRAVEL_DURATIONS]):0;}
  begin(id:DestinationId){if(this.state!=='IDLE'||!canTravelTo(id,this.player))return false;this.target=id;this.setState('BOARDING');this.hooks.board();return true;}
  private setState(state:TravelState){this.state=state;this.elapsed=0;}
  update(delta:number){
    if(!this.active||this.pending)return;
    this.elapsed+=Math.max(0,Math.min(.1,delta));if(this.progress<1)return;
    switch(this.state){
      case 'BOARDING':this.setState('DEPARTING');break;
      case 'DEPARTING':this.setState('SAILING_OUT');break;
      case 'SAILING_OUT':this.setState('WORLD_SWITCH');this.run(async()=>{await this.hooks.switchToTravel();await this.hooks.prepareDestination(this.target!);this.setState('SAILING_IN');});break;
      case 'SAILING_IN':this.setState('WORLD_SWITCH');this.run(async()=>{await this.hooks.switchToDestination(this.target!);this.setState('ARRIVING');});break;
      case 'ARRIVING':this.setState('DISEMBARKING');break;
      case 'DISEMBARKING':this.hooks.arrive(this.target!,destination(this.target!).travelGameMinutes);this.target=null;this.setState('IDLE');break;
    }
  }
  private run(action:()=>Promise<void>){this.pending=action().catch(async error=>{this.setState('WORLD_SWITCH');try{await this.hooks.recoverHome(error);this.target=null;this.setState('IDLE');}catch(fatal){this.setState('ERROR');this.hooks.fatal(fatal);}}).finally(()=>{this.pending=null;});}
  /** Async lifecycle boundary for tests/diagnostics, not a second update loop. */
  async settled(){await this.pending;}
}
