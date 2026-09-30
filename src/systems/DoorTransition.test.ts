import { expect,it,vi } from 'vitest';
import { DoorTransition } from './DoorTransition';
it('holds black until loaded, rejects duplicate triggers and unlocks after fade in',async()=>{
 const t=new DoorTransition(),done=vi.fn(),swap=vi.fn();let resolve!:()=>void;
 const pending=new Promise<void>(r=>resolve=r);t.start(()=>{swap();return pending;},done,vi.fn());
 expect(t.start(async()=>{},done,vi.fn())).toBe(false);t.update(.45);expect(t.opacity).toBe(1);expect(swap).toHaveBeenCalledOnce();
 t.update(20);expect(t.state).toBe('LOADING');expect(done).not.toHaveBeenCalled();resolve();await pending;await Promise.resolve();
 t.update(.3);expect(t.opacity).toBeCloseTo(.5);t.update(.3);expect(t.active).toBe(false);expect(done).toHaveBeenCalledOnce();
});
it('fades back and restores controls after failure',async()=>{const t=new DoorTransition(),failed=vi.fn(),done=vi.fn();t.start(async()=>{throw Error('missing asset');},done,failed);t.update(.45);await Promise.resolve();await Promise.resolve();expect(failed).toHaveBeenCalledOnce();t.update(.6);expect(t.active).toBe(false);expect(done).toHaveBeenCalledOnce();});
