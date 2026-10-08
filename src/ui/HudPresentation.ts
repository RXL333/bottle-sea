/** Presentation policy only: no gameplay or persistence state is copied into HUD. */
export interface HudContext {
  exploring:boolean;driving:boolean;fishing:boolean;sailing:boolean;transitioning:boolean;panel:boolean;dialogue:boolean;
}
export type HudMode='overview'|'explore'|'driving'|'fishing'|'sailing'|'transition'|'panel'|'dialogue';
export function hudMode(context:HudContext):HudMode {
  if(context.transitioning)return 'transition';
  if(context.dialogue)return 'dialogue';
  if(context.panel)return 'panel';
  if(context.sailing)return 'sailing';
  if(context.driving)return 'driving';
  if(context.fishing)return 'fishing';
  return context.exploring?'explore':'overview';
}
/** Repeated frame updates cannot reset the hint lifetime. Each context teaches once per session. */
export class HudHintLifetime {
  private seen=new Set<string>();private current='';private remaining=0;
  enter(context:string){if(context===this.current)return;this.current=context;if(!this.seen.has(context)){this.seen.add(context);this.remaining=7;}else this.remaining=0;}
  update(delta:number){this.remaining=Math.max(0,this.remaining-Math.max(0,delta));return this.remaining>0;}
}
