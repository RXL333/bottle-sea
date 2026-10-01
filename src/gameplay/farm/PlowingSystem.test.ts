import { describe,expect,it,vi } from 'vitest';
import { GameClock } from '../../core/GameClock';
import { GameplayFoundation } from '../GameplayFoundation';
import { ManualFarmingSystem } from './ManualFarmingSystem';
import { PlowingSystem } from './PlowingSystem';
import { sweptWorkAreas } from './ImplementSweep';
import { farmAreaContains } from './FarmDefinition';
import type { MotionPose } from '../vehicles/VehicleMotion';
import { IMPLEMENTS } from '../vehicles/ImplementRegistry';

const modelBounds=IMPLEMENTS.find(i=>i.id==='farm.plow')!.work!.footprint;
const footprint={minX:modelBounds.minX*.5,maxX:modelBounds.maxX*.5,minZ:modelBounds.minZ*.5,maxZ:modelBounds.maxZ*.5};
const from={x:0,z:-9,yaw:Math.PI},to={x:0,z:-30,yaw:Math.PI};
const setup=()=>{const clock=new GameClock(),save=vi.fn(),game=new GameplayFoundation(clock,undefined,undefined,save);return {clock,game,save,work:new PlowingSystem(game.farm)};};
const central=(column:number,row:number)=>({fieldId:'field-central',column,row});

describe('shared tractor plowing data',()=>{
  it('covers every row at the actual width, without gaps across large steps or reverse',()=>{
    const a=setup(),b=setup(),inventory=a.game.inventory.snapshot();
    expect(a.work.sweep(from,to,footprint).changedCells).toBe(36);
    let previous=from;
    for(let step=1;step<=42;step++){const current={...from,z:from.z+(to.z-from.z)*step/42};b.work.sweep(previous,current,footprint);previous=current;}
    expect(b.game.farm.snapshot()).toEqual(a.game.farm.snapshot());
    for(let row=0;row<18;row++)for(let column=0;column<12;column++)expect(a.game.farm.getCell(central(column,row))!.landState).toBe(column===5||column===6?'TILLED':'UNTILLED');
    const revision=a.game.farm.revision,committed=vi.fn();expect(a.work.sweep(to,from,footprint,committed).changedCells).toBe(0);expect(committed).not.toHaveBeenCalled();
    expect(a.game.farm.revision).toBe(revision);expect(a.game.inventory.snapshot()).toEqual(inventory);
  });
  it('ignores roads and buildings, clips field edges and permits a full inventory',()=>{
    const f=setup();for(let i=0;i<f.game.inventory.capacity;i++)f.game.inventory.add('wood',99);const inventory=f.game.inventory.snapshot();f.save.mockClear();
    expect(f.work.sweep({x:12,z:-40,yaw:0},{x:12,z:8,yaw:0},footprint).changedCells).toBe(0);expect(f.save).not.toHaveBeenCalled();
    const r=f.work.sweep({x:5.8,z:-9,yaw:Math.PI},{x:5.8,z:-30,yaw:Math.PI},footprint);expect(r.changedCells).toBe(18);
    expect(f.game.farm.getField('field-central')!.stateCounts.TILLED).toBe(18);expect(f.game.farm.getField('field-east')!.stateCounts.TILLED).toBe(0);
    expect(f.game.inventory.snapshot()).toEqual(inventory);
  });
  it.each([0,900,4320])('protects seeded, growing and mature crops at game minute offset %i',minutes=>{
    const f=setup(),ref=central(5,8);f.game.inventory.add('seed.wheat',1);f.game.farm.till([ref]);expect(f.game.farm.seed([ref],'wheat').ok).toBe(true);f.clock.advanceGameMinutes(minutes);
    const before=f.game.farm.getCell(ref),inventory=f.game.inventory.snapshot(),r=f.work.sweep(from,to,footprint);
    expect(r.protectedCells).toBe(1);expect(r.changedCells).toBe(35);expect(f.game.farm.getCell(ref)).toEqual(before);expect(f.game.inventory.snapshot()).toEqual(inventory);
  });
  it('shares hand-work state and tills harvested land without repeating crop rewards',()=>{
    const f=setup(),manual=new ManualFarmingSystem(f.game),hand=central(5,0),harvested=central(6,10);
    expect(manual.work(hand).status).toBe('success');f.game.inventory.add('seed.potato',1);f.game.farm.till([harvested]);f.game.farm.seed([harvested],'potato');f.clock.advanceGameMinutes(2880);
    expect(f.game.farm.harvest([harvested]).ok).toBe(true);const items=f.game.inventory.snapshot(),beforeCommit=vi.fn();
    const result=f.work.sweep(from,to,footprint,beforeCommit);expect(result.changedCells).toBe(35);expect(result.alreadyTilledCells).toBe(1);expect(beforeCommit).toHaveBeenCalledOnce();
    expect(f.game.farm.getCell(harvested)!.landState).toBe('TILLED');expect(manual.inspect(harvested).action).toBe('SEED');expect(f.game.inventory.snapshot()).toEqual(items);
  });
  it('does not work while stationary and rejects nonfinite geometry',()=>{
    const f=setup(),before=f.game.farm.snapshot();expect(f.work.sweep(from,from,footprint).changedCells).toBe(0);
    expect(sweptWorkAreas(from,{...to,x:NaN},footprint)).toEqual([]);expect(sweptWorkAreas(from,to,{...footprint,maxX:Infinity})).toEqual([]);
    expect(f.game.farm.snapshot()).toEqual(before);expect(f.save).not.toHaveBeenCalled();
  });
  it('bridges diagonal movement and rotation through the yaw wrap with valid polygons',()=>{
    const start={x:-4.5,z:-25.5,yaw:-Math.PI*.75},end={x:4.5,z:-16.5,yaw:-Math.PI*.75};
    const areas=sweptWorkAreas(start,end,footprint);
    for(let n=1;n<9;n++)expect(areas.some(area=>farmAreaContains(area,{x:-4.5+n,z:-25.5+n}))).toBe(true);
    const a:MotionPose={x:0,z:-18,yaw:Math.PI-.01},b={x:.2,z:-18.2,yaw:-Math.PI+.01};
    const wrap=sweptWorkAreas(a,b,footprint);expect(wrap.length).toBeLessThan(4);
    // Dense positions inside the rotating blade must all lie within its sweep.
    for(let n=0;n<=100;n++){
      const t=n/100,p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,yaw:a.yaw+.02*t};
      for(const x of [footprint.minX,0,footprint.maxX])for(const z of [footprint.minZ,footprint.maxZ])expect(wrap.some(area=>farmAreaContains(area,{x:p.x+Math.cos(p.yaw)*x+Math.sin(p.yaw)*z,z:p.z-Math.sin(p.yaw)*x+Math.cos(p.yaw)*z}))).toBe(true);
    }
  });
});
