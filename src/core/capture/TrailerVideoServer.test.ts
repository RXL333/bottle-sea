import { expect,it } from 'vitest';
import { validVideoFrame,validVideoRequest } from './TrailerVideoServer';
import { landscapeShot } from './TrailerLandscapeShots';
import { TRAILER_SHOTS } from './TrailerShots';
import { validCapturePath } from './CameraPath';
const request={batch:'session',shot:'bottle-reveal',ordinal:1,frames:420,width:1920,height:1080,fps:30};
it('limits local export dimensions, frame counts and file identifiers',()=>{
  expect(validVideoRequest(request)).toBe(true);
  for(const change of [{shot:'../save.json'},{shot:'/absolute'},{ordinal:11},{frames:1},{frames:5401},{width:3840},{fps:60}])expect(validVideoRequest({...request,...change})).toBe(false);
});
it('rejects missing, wrong-size and non-PNG frame headers',()=>{
  const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.write('IHDR',12);png.writeUInt32BE(1920,16);png.writeUInt32BE(1080,20);
  expect(validVideoFrame(png,1920,1080)).toBe(true);expect(validVideoFrame(png,1080,1920)).toBe(false);expect(validVideoFrame(Buffer.alloc(0),1920,1080)).toBe(false);png[0]=0;expect(validVideoFrame(png,1920,1080)).toBe(false);
});
it('reframes landscape subjects without changing portrait presets or scene rules',()=>{
  const before=structuredClone(TRAILER_SHOTS);for(const source of TRAILER_SHOTS){const wide=landscapeShot(source);expect(validCapturePath(wide.path)).toBe(true);expect(wide.path.duration).toBe(source.path.duration);expect(wide.world).toBe(source.world);expect(wide.subject).toBe(source.subject);expect(wide.sequence).toBe(source.sequence);}
  expect(TRAILER_SHOTS).toEqual(before);
});
