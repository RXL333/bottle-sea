import { describe,expect,it } from 'vitest';
import { hudMode,HudHintLifetime } from './HudPresentation';
import type { HudContext } from './HudPresentation';
const base:HudContext={exploring:true,driving:false,fishing:false,sailing:false,transitioning:false,panel:false,dialogue:false};
describe('contextual HUD',()=>{
  it('prioritizes transitions and modal input over gameplay overlays',()=>{
    expect(hudMode({...base,driving:true,fishing:true})).toBe('driving');
    expect(hudMode({...base,driving:true,panel:true})).toBe('panel');
    expect(hudMode({...base,panel:true,dialogue:true})).toBe('dialogue');
    expect(hudMode({...base,dialogue:true,transitioning:true})).toBe('transition');
    expect(hudMode({...base,sailing:true})).toBe('sailing');
    expect(hudMode({...base,fishing:true})).toBe('fishing');
    expect(hudMode({...base,exploring:false})).toBe('overview');
  });
  it('lets tutorial hints expire despite continuous frame refreshes',()=>{
    const hints=new HudHintLifetime();hints.enter('farm');
    for(let i=0;i<27;i++){hints.enter('farm');expect(hints.update(.25)).toBe(true);}
    expect(hints.update(.25)).toBe(false);hints.enter('farm');expect(hints.update(0)).toBe(false);
    hints.enter('cottage');expect(hints.update(.1)).toBe(true);
    hints.enter('farm');expect(hints.update(0)).toBe(false);
  });
});
