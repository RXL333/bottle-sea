import { expect,it,vi } from 'vitest';
import { defaultPlayerState } from '../state/PlayerState';
import { GameClock,DAY_DURATION } from '../core/GameClock';
import { TravelSystem } from './TravelSystem';
import type { TravelHooks } from './TravelSystem';
function fixture(overrides:Partial<TravelHooks>={}){const player=defaultPlayerState(),clock=new GameClock(),hooks:TravelHooks={board:vi.fn(),switchToTravel:vi.fn(async()=>{}),prepareDestination:vi.fn(async()=>{}),switchToDestination:vi.fn(async()=>{}),arrive:vi.fn((id,minutes)=>{clock.advanceGameMinutes(minutes);player.currentWorldId=id;}),recoverHome:vi.fn(async()=>{}),fatal:vi.fn(),...overrides};return {player,clock,hooks,travel:new TravelSystem(player,hooks)};}
async function voyage(f:ReturnType<typeof fixture>){const states=new Set([f.travel.state]);for(let frame=0;frame<700&&f.travel.active;frame++){f.clock.updateAnimation(1/60);f.travel.update(1/60);await f.travel.settled();states.add(f.travel.state);}return [...states];}
it('runs every travel phase in both directions and advances exactly twenty minutes',async()=>{const f=fixture(),before=f.clock.simulationTime;expect(f.travel.begin('FARM')).toBe(true);expect(f.travel.begin('FARM')).toBe(false);expect(await voyage(f)).toEqual(['BOARDING','DEPARTING','SAILING_OUT','SAILING_IN','ARRIVING','DISEMBARKING','IDLE']);expect(f.hooks.switchToTravel).toHaveBeenCalledOnce();expect(f.hooks.prepareDestination).toHaveBeenCalledWith('FARM');expect(f.player.currentWorldId).toBe('FARM');expect(f.clock.simulationTime-before).toBeCloseTo(DAY_DURATION*20/1440);expect(f.travel.begin('HOME')).toBe(true);await voyage(f);expect(f.player.currentWorldId).toBe('HOME');expect(f.clock.simulationTime-before).toBeCloseTo(DAY_DURATION*40/1440);});
it('rejects locked, unavailable and current destinations',()=>{const f=fixture();for(const id of ['HOME','DEEP_SEA','RUINS'] as const)expect(f.travel.begin(id)).toBe(false);expect(f.hooks.board).not.toHaveBeenCalled();});
it('waits in covered WORLD_SWITCH until loading resolves',async()=>{let release!:()=>void;const f=fixture({prepareDestination:()=>new Promise<void>(resolve=>{release=resolve;})});f.travel.begin('FARM');for(let i=0;i<200;i++)f.travel.update(1/60);await Promise.resolve();await Promise.resolve();expect(f.travel.state).toBe('WORLD_SWITCH');for(let i=0;i<300;i++)f.travel.update(1/60);expect(f.travel.state).toBe('WORLD_SWITCH');release();await f.travel.settled();expect(f.travel.state).toBe('SAILING_IN');});
it('recovers HOME after target load fails without charging travel time',async()=>{const f=fixture({prepareDestination:async()=>{throw Error('farm unavailable');}}),before=f.clock.simulationTime;f.travel.begin('FARM');await voyage(f);expect(f.travel.state).toBe('IDLE');expect(f.hooks.recoverHome).toHaveBeenCalledOnce();expect(f.hooks.arrive).not.toHaveBeenCalled();expect(f.clock.simulationTime).toBe(before);});
it('ends in explicit ERROR when HOME fallback fails',async()=>{const f=fixture({switchToDestination:async()=>{throw Error('target');},recoverHome:async()=>{throw Error('home');}});f.travel.begin('FARM');await voyage(f);expect(f.travel.state).toBe('ERROR');expect(f.hooks.fatal).toHaveBeenCalledOnce();});
it('stops sailing coordinates before destination activation can expose its boat in the same frame',async()=>{
  let release!:()=>void;
  let stateAtActivation='';
  const f=fixture({switchToDestination:()=>{
    // WorldManager can attach a prepared FARM synchronously before its Promise resolves.
    stateAtActivation=f.travel.state;
    return new Promise<void>(resolve=>{release=resolve;});
  }});
  f.travel.begin('FARM');
  for(let frame=0;frame<500&&!stateAtActivation;frame++){
    f.travel.update(1/60);
    await Promise.resolve();await Promise.resolve();await Promise.resolve();
  }
  expect(stateAtActivation).toBe('WORLD_SWITCH');
  for(let frame=0;frame<60;frame++)f.travel.update(1/60);
  expect(f.travel.state).toBe('WORLD_SWITCH');
  release();await f.travel.settled();expect(f.travel.state).toBe('ARRIVING');
});
