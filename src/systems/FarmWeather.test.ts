import { expect,it } from 'vitest';
import { BoxGeometry,Group,Mesh,MeshStandardMaterial,Vector3 } from 'three';
import { WeatherSystem } from './WeatherSystem';
import { WEATHER_PROFILES } from './WeatherState';
import { FarmAtmosphere,farmFogRange } from './FarmAtmosphere';
import { defaultSave,migrateSave } from '../state/SaveSystem';
import { FarmWetness,farmSheltered } from '../worlds/farm/FarmWeatherResponse';
import { COTTAGE } from '../worlds/farm/FarmLayout';
import { mixAudio } from './audio/AudioMixer';
import { disposeWorld } from '../worlds/disposeWorld';
import { FarmTerrain } from '../worlds/farm/FarmTerrain';
import { cubeGeometry,voxelMaterial } from '../utils/voxel';

it('smoothly separates cloud, rain and storm without coupling rain to violent seas',()=>{
  const weather=new WeatherSystem();weather.setWeather('OVERCAST');weather.update(.1,.1);expect(weather.frame.cloud).toBeGreaterThan(.24);expect(weather.frame.cloud).toBeLessThan(.85);expect(weather.intensity).toBe(0);expect(weather.frame.rain).toBe(0);
  weather.setWeather('RAIN');for(let t=.2;t<8;t+=.1)weather.update(.1,t);expect(weather.rain.visible).toBe(true);expect(weather.frame.rain).toBeCloseTo(.74);expect(weather.intensity).toBe(0);expect(weather.lightning.flash).toBe(0);
  const wet=weather.frame.wetness;expect(wet).toBeGreaterThan(.2);weather.setWeather('CLEAR');for(let t=8;t<12;t+=.1)weather.update(.1,t);expect(weather.rain.visible).toBe(false);expect(weather.frame.wetness).toBeGreaterThan(wet*.8);
  const paused=weather.snapshot();weather.update(0,weather.frame.windPhase);expect(weather.frame.cloud).toBe(paused.cloud);expect(weather.frame.wetness).toBe(paused.wetness);disposeWorld(weather);
});
it('round trips a partially transitioned weather and wetness without changing existing goods or farm state',()=>{
  const weather=new WeatherSystem();weather.setWeather('STORM');for(let t=0;t<2;t+=.1)weather.update(.1,t);
  const save=defaultSave(),before=structuredClone(save.farm);save.global.weather=weather.snapshot();save.global.storm=true;save.global.intensity=weather.intensity;
  const loaded=migrateSave(JSON.parse(JSON.stringify(save))),restored=new WeatherSystem();restored.restore(loaded.global.weather,loaded.global.storm,loaded.global.intensity);
  expect(restored.snapshot()).toEqual(weather.snapshot());expect(loaded.farm).toEqual(before);expect(loaded.inventory).toEqual(save.inventory);
  const windPhase=restored.frame.windPhase;restored.update(0,1200);expect(restored.frame.windPhase).toBe(windPhase);restored.update(.1,1200.1);expect(restored.frame.windPhase-windPhase).toBeLessThan(.15);
  const old=new WeatherSystem();old.restore(undefined,true,.7);expect(old.kind).toBe('STORM');expect(old.intensity).toBe(.7);expect(old.frame.rain).toBe(.7);
  for(const w of [weather,restored,old])disposeWorld(w);
});
it('suppresses rain below farm roofs and restores it outside without resetting weather',()=>{
  const weather=new WeatherSystem();weather.configure(true);weather.restore({kind:'RAIN',...WEATHER_PROFILES.RAIN});weather.update(.1,2);expect(weather.rain.visible).toBe(true);
  expect(farmSheltered({x:COTTAGE.x,y:COTTAGE.floor+.44,z:COTTAGE.z})).toBe(true);expect(farmSheltered({x:0,y:4.44,z:-15})).toBe(false);
  const state=weather.snapshot();weather.shelter(true);expect(weather.rain.visible).toBe(false);expect(weather.snapshot()).toEqual(state);weather.shelter(false);expect(weather.rain.visible).toBe(true);disposeWorld(weather);
});
it('keeps work areas free of dense fog and limits clouds and stars by quality',()=>{
  const view=new FarmAtmosphere(),weather=new WeatherSystem();
  for(const kind of ['CLEAR','OVERCAST','RAIN','STORM'] as const)for(const hour of [6,12,18,23]){
    const frame={...WEATHER_PROFILES[kind],wetness:1,windPhase:20},fog=farmFogRange(hour/24,frame);expect(fog.near).toBeGreaterThanOrEqual(28);expect(fog.far).toBeGreaterThan(115);view.update(hour/24,frame,new Vector3(8,5,-2),.1);expect(view.position.toArray()).toEqual([8,5,-2]);
  }
  view.applyQuality('LOW');expect(view.diagnostics.clouds).toBe(12);expect(view.diagnostics.stars).toBe(0);view.applyQuality('HIGH');expect(view.diagnostics.clouds).toBe(36);expect(view.diagnostics.stars).toBe(160);disposeWorld(view);disposeWorld(weather);
});
it('wet material response restores dry colors instead of accumulating darkening',()=>{
  const root=new Group(),mat=new MeshStandardMaterial({color:'#986c41',roughness:.9}),mesh=new Mesh(new BoxGeometry(),mat),response=new FarmWetness();root.add(mesh);response.register(root);const dry=mat.color.clone();
  response.update(1);const wet=mat.color.clone();expect(wet.r).toBeLessThan(dry.r);expect(mat.roughness).toBeLessThan(.9);for(let i=0;i<100;i++)response.update(1);expect(mat.color.equals(wet)).toBe(true);response.update(0);expect(mat.color.equals(dry)).toBe(true);expect(mat.roughness).toBe(.9);disposeWorld(root);
});
it('keeps farm wind and wetness isolated from shared voxel resources in other worlds',()=>{
  const color=voxelMaterial.color.clone(),roughness=voxelMaterial.roughness,compile=voxelMaterial.onBeforeCompile,terrain=new FarmTerrain(),wetness=new FarmWetness();
  wetness.register(terrain);wetness.update(1);terrain.applyWeather({...WEATHER_PROFILES.STORM,wetness:1,windPhase:120});
  expect(cubeGeometry.getAttribute('farmSwayWeight')).toBeUndefined();expect(voxelMaterial.onBeforeCompile).toBe(compile);expect(voxelMaterial.color.equals(color)).toBe(true);expect(voxelMaterial.roughness).toBe(roughness);
  disposeWorld(terrain);expect(cubeGeometry.attributes.position.count).toBe(24);
});
it('rain audio exists without lightning, and indoor mix attenuates external weather',()=>{
  const mix={ocean:0,wind:0,stormWind:0,rain:0,underwater:0,cutoff:0};mixAudio('ISLAND',0,mix,{rain:.74,wind:.48});const outdoors={...mix};expect(mix.rain).toBeGreaterThan(0);expect(mix.stormWind).toBe(0);mixAudio('INDOOR',0,mix,{rain:.74,wind:.48});expect(mix.rain).toBeLessThan(outdoors.rain*.3);expect(mix.cutoff).toBeLessThan(outdoors.cutoff);
});
it('bounds lightning frequency during a sustained storm',()=>{
  const weather=new WeatherSystem();weather.restore({kind:'STORM',...WEATHER_PROFILES.STORM});let flashes=0,lit=false;
  for(let time=0;time<120;time+=.05){weather.update(.05,time);if(weather.lightning.flash&&!lit)flashes++;lit=weather.lightning.flash>0;}
  expect(flashes).toBeGreaterThan(2);expect(flashes).toBeLessThanOrEqual(10);disposeWorld(weather);
});
