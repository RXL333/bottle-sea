import { Group, Scene } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { WorldStateRegistry } from '../state/WorldStateRegistry';
import { WorldRegistry } from './WorldRegistry';
import { WorldManager } from './WorldManager';
import type { GameWorld, WorldId } from './types';
function fixture(){
  const order:string[]=[],registry=new WorldRegistry(),scene=new Scene(),states=new WorldStateRegistry();
  const create=(id:WorldId,fail=false):GameWorld=>({id,root:new Group(),load:vi.fn(async()=>{order.push(`${id}:load`);if(fail)throw Error('load failed');}),enter:vi.fn(()=>{order.push(`${id}:enter`);}),leave:vi.fn(({gameTime})=>{order.push(`${id}:leave`);return {lastSimulatedGameTime:gameTime,discoveries:id==='HOME'?['anchor','lighthouse']:[]};}),dispose:vi.fn(()=>{order.push(`${id}:dispose`);}),update:vi.fn(),getSpawnPoint:()=>({id:`${id}:dock`,position:[0,1,0],lookAt:[0,1,-1]}),applyQuality:vi.fn(()=>{order.push(`${id}:quality`);})});
  const place=vi.fn(()=>{order.push('spawn');});return {order,registry,scene,states,create,place,manager:new WorldManager(scene,registry,states,place)};
}
describe('lazy world lifecycle',()=>{
  it('preloads a detached destination and activates it without loading twice',async()=>{
    const f=fixture(),home=f.create('HOME'),farm=f.create('FARM');
    f.registry.register('HOME',()=>home).register('FARM',()=>farm);
    await f.manager.switchTo('HOME',0);
    const prepared=await f.manager.prepare('FARM',10);
    expect(f.manager.currentWorld).toBe(home);
    expect(f.scene.children).toEqual([home.root]);
    expect(farm.enter).not.toHaveBeenCalled();
    f.manager.applyQuality('LOW');
    await f.manager.switchTo('FARM',20,undefined,prepared);
    expect(farm.load).toHaveBeenCalledOnce();
    expect(farm.applyQuality).toHaveBeenLastCalledWith('LOW');
    expect(f.scene.children).toEqual([farm.root]);
    expect(home.dispose).toHaveBeenCalledOnce();
  });
  it('cleans a failed preload without disturbing the active travel world',async()=>{
    const f=fixture(),travel=f.create('TRAVEL'),farm=f.create('FARM',true);
    f.registry.register('TRAVEL',()=>travel).register('FARM',()=>farm);
    await f.manager.switchTo('TRAVEL',0);
    await expect(f.manager.prepare('FARM',10)).rejects.toThrow('load failed');
    expect(farm.dispose).toHaveBeenCalledOnce();
    expect(travel.leave).not.toHaveBeenCalled();
    expect(f.manager.state).toBe('READY');
    expect(f.scene.children).toEqual([travel.root]);
  });
  it('restores the visible world when a prepared destination fails to enter',async()=>{
    const f=fixture(),travel=f.create('TRAVEL'),farm=f.create('FARM');
    farm.enter=vi.fn(()=>{throw Error('entry failed');});
    f.registry.register('TRAVEL',()=>travel).register('FARM',()=>farm);
    await f.manager.switchTo('TRAVEL',0);
    const prepared=await f.manager.prepare('FARM',10);
    await expect(f.manager.switchTo('FARM',20,undefined,prepared)).rejects.toThrow('entry failed');
    expect(farm.dispose).toHaveBeenCalledOnce();
    expect(travel.dispose).not.toHaveBeenCalled();
    expect(f.manager.currentWorld).toBe(travel);
    expect(f.scene.children).toEqual([travel.root]);
    expect(f.manager.state).toBe('ERROR');
  });
  it('constructs only requested worlds, preserves state and applies current quality',async()=>{const f=fixture(),home=f.create('HOME'),farm=f.create('FARM'),homeFactory=vi.fn(()=>home),farmFactory=vi.fn(()=>farm);f.registry.register('HOME',homeFactory).register('FARM',farmFactory);expect(homeFactory).not.toHaveBeenCalled();f.manager.applyQuality('HIGH');await f.manager.switchTo('HOME',1);expect(farmFactory).not.toHaveBeenCalled();f.order.length=0;await f.manager.switchTo('FARM',20);expect(f.order).toEqual(['HOME:leave','FARM:load','FARM:enter','FARM:quality','spawn','HOME:dispose']);expect(f.scene.children).toEqual([farm.root]);expect(f.manager.state).toBe('READY');expect(f.states.get('HOME').discoveries).toEqual(['anchor','lighthouse']);expect(farm.applyQuality).toHaveBeenLastCalledWith('HIGH');});
  it('restores saved world state on return',async()=>{const f=fixture(),homes:GameWorld[]=[];f.registry.register('HOME',()=>{const h=f.create('HOME');homes.push(h);return h;}).register('FARM',()=>f.create('FARM'));await f.manager.switchTo('HOME',0);await f.manager.switchTo('FARM',10);await f.manager.switchTo('HOME',30);expect(homes[1].enter).toHaveBeenCalledWith(expect.objectContaining({state:{lastSimulatedGameTime:10,discoveries:['anchor','lighthouse']}}));});
  it('disposes partial loads, retains a visible root and permits recovery HOME',async()=>{const f=fixture(),travel=f.create('TRAVEL'),broken=f.create('FARM',true);f.registry.register('TRAVEL',()=>travel).register('FARM',()=>broken).register('HOME',()=>f.create('HOME'));await f.manager.switchTo('TRAVEL',0);await expect(f.manager.switchTo('FARM',1)).rejects.toThrow('load failed');expect(broken.dispose).toHaveBeenCalledOnce();expect(f.manager.state).toBe('ERROR');expect(f.scene.children).toEqual([travel.root]);await f.manager.switchTo('HOME',2);expect(f.manager.currentWorldId).toBe('HOME');expect(f.manager.state).toBe('READY');});
  it('fails explicitly if initial HOME also cannot load',async()=>{const f=fixture();f.registry.register('HOME',()=>f.create('HOME',true));await expect(f.manager.switchTo('HOME',0)).rejects.toThrow();expect(f.manager.state).toBe('ERROR');expect(f.manager.currentWorld).toBeNull();});
  it('does not recreate a READY current world and rejects overlapping requests',async()=>{const f=fixture(),home=f.create('HOME');let finish!:()=>void;home.load=()=>new Promise<void>(resolve=>{finish=resolve;});f.registry.register('HOME',()=>home);const loading=f.manager.switchTo('HOME',0);await expect(f.manager.switchTo('HOME',0)).rejects.toThrow('in progress');await Promise.resolve();finish();await loading;await f.manager.switchTo('HOME',0);expect(home.enter).toHaveBeenCalledOnce();});
});
