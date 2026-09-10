import { describe,it,expect } from 'vitest';
import { WeatherSystem } from './WeatherSystem';
import { insideBottle } from '../world/bottle/Bounds';
import { PerspectiveCamera } from 'three';
describe('weather transitions',()=>{
  it('smoothly builds a storm and clears rain again',()=>{const weather=new WeatherSystem();weather.storm=true;weather.update(.1,.1);expect(weather.intensity).toBeGreaterThan(0);expect(weather.intensity).toBeLessThan(.5);for(let t=0;t<4;t+=.1)weather.update(.1,t);expect(weather.intensity).toBeGreaterThan(.99);expect(weather.rain.visible).toBe(true);weather.storm=false;for(let t=4;t<9;t+=.1)weather.update(.1,t);expect(weather.rain.visible).toBe(false);expect(weather.lightning.flash).toBe(0);});
  it('flashes within the storm and respects frozen time',()=>{const weather=new WeatherSystem();weather.storm=true;weather.intensity=1;weather.update(0,3);expect(weather.lightning.flash).toBe(1);weather.update(0,3);expect(weather.lightning.flash).toBe(1);weather.update(.2,3.2);expect(weather.lightning.flash).toBe(0);});
  it('recognizes narrowing bottle shoulders',()=>{const camera=new PerspectiveCamera();camera.position.set(5.2,2,1.5);expect(insideBottle(camera.position.x,camera.position.y,camera.position.z)).toBe(false);expect(insideBottle(0,3.3,1.8)).toBe(true);});
});
