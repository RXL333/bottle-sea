import { expect,it } from 'vitest';
import { BoxGeometry,Group,Mesh,MeshStandardMaterial } from 'three';
import { DiscoveryPulse } from './DiscoveryPulse';
it('pulses only the target and restores its original material values',()=>{
  const world=new Group(),shared=new MeshStandardMaterial({color:'#78502b'}),chest=new Mesh(new BoxGeometry(),shared),other=new Mesh(new BoxGeometry(),shared);chest.name='chest';world.add(chest,other);
  const pulse=new DiscoveryPulse(world),before=chest.material.emissive.clone();pulse.trigger('chest');pulse.update(.175);expect(chest.material.emissive.equals(before)).toBe(false);expect(other.material).toBe(shared);expect(shared.emissive.getHex()).toBe(0);
  pulse.update(.2);expect(chest.material.emissive.equals(before)).toBe(true);expect(chest.material.emissiveIntensity).toBe(shared.emissiveIntensity);
});
