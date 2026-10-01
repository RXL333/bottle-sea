import { describe,expect,it,vi } from 'vitest';
import { GameClock } from '../../core/GameClock';
import { GameplayFoundation } from '../GameplayFoundation';
import { IMPLEMENTS } from '../vehicles/ImplementRegistry';
import { ManualFarmingSystem } from './ManualFarmingSystem';
import { SeedingSystem } from './SeedingSystem';

const b=IMPLEMENTS.find(i=>i.id==='farm.seeder')!.work!.footprint;
const footprint={minX:b.minX*.5,maxX:b.maxX*.5,minZ:b.minZ*.5,maxZ:b.maxZ*.5};
const from={x:0,z:-10,yaw:Math.PI},to={x:0,z:-31,yaw:Math.PI};
const setup=()=>{const clock=new GameClock(),game=new GameplayFoundation(clock),seeder=new SeedingSystem(game.farm,game.inventory);return {clock,game,seeder};};
const ref=(column:number,row:number)=>({fieldId:'field-central',column,row});
function prepare(f:ReturnType<typeof setup>){f.game.farm.till(f.game.farm.cellsInArea({kind:'bounds',minX:-6,maxX:6,minZ:-30,maxZ:-10}));}
describe('shared machine seeding',()=>{
  it.each(['wheat','corn','potato'])('uses registered %s definitions, shared timestamps and exactly one seed per planted cell',id=>{
    const f=setup();prepare(f);const crop=f.game.crops.registry.get(id)!;f.clock.advanceGameMinutes(125);f.game.inventory.add(crop.seedItemId,40);
    const output=f.game.inventory.count(crop.harvestItemId),result=f.seeder.sweep(from,to,footprint,id);
    expect(result.changedCells).toBe(36);expect(result.exhausted).toBe(false);expect(f.game.inventory.count(crop.seedItemId)).toBe(4);expect(f.game.inventory.count(crop.harvestItemId)).toBe(output);
    for(let row=0;row<18;row++)for(const column of [5,6])expect(f.game.farm.getCell(ref(column,row))).toMatchObject({landState:'SEEDED',crop:{cropId:id,plantedAtGameTime:f.clock.simulationTime,currentStage:'seed'}});
    const before=f.game.snapshot(),callback=vi.fn();expect(f.seeder.sweep(to,from,footprint,id,callback).changedCells).toBe(0);expect(callback).not.toHaveBeenCalled();expect(f.game.snapshot()).toEqual(before);
    f.clock.advanceGameMinutes(crop.growthGameMinutes);expect(f.game.farm.getCell(ref(5,0))!.landState).toBe('MATURE');
  });
  it('plants available seeds on a partial sweep, leaves the rest tilled and never removes crops',()=>{
    const f=setup();prepare(f);f.game.inventory.add('seed.wheat',1);f.game.farm.seed([ref(5,0)],'wheat');f.clock.advanceGameMinutes(4320);
    const protectedCrop=f.game.farm.getCell(ref(5,0));f.game.inventory.add('seed.corn',3);const cb=vi.fn();const result=f.seeder.sweep(from,to,footprint,'corn',cb);
    expect(result).toMatchObject({changedCells:3,protectedCells:1,eligibleCells:35,exhausted:true});expect(cb).toHaveBeenCalledExactlyOnceWith(true);expect(f.game.inventory.count('seed.corn')).toBe(0);
    expect(f.game.farm.getCell(ref(5,0))).toEqual(protectedCrop);expect(f.game.farm.getField('field-central')!.stateCounts.TILLED).toBe(212);
    const before=f.game.snapshot();expect(f.seeder.sweep(to,from,footprint,'corn').changedCells).toBe(0);expect(f.game.snapshot()).toEqual(before);
  });
  it('matches short sweeps, supports manual sowing into the same land and protects all planted stages',()=>{
    const a=setup(),c=setup();for(const f of [a,c]){prepare(f);f.game.inventory.add('seed.potato',40);}
    a.seeder.sweep(from,to,footprint,'potato');let p=from;
    for(let n=1;n<=84;n++){const next={...from,z:from.z+(to.z-from.z)*n/84};c.seeder.sweep(p,next,footprint,'potato');p=next;}
    expect(c.game.snapshot()).toEqual(a.game.snapshot());
    const manual=new ManualFarmingSystem(c.game);c.game.hotbar.bind(0,'seed.potato');expect(manual.work(ref(4,0)).status).toBe('success');
    for(const minutes of [0,720,1440,2880]){c.clock.advanceGameMinutes(minutes);const before=c.game.farm.getCell(ref(5,0));c.seeder.sweep(to,from,footprint,'potato');expect(c.game.farm.getCell(ref(5,0))).toEqual(before);}
  });
  it('does not modify roads, unworked or harvested land, and stationary / invalid sweeps consume nothing',()=>{
    const f=setup();f.game.inventory.add('seed.wheat',3);f.game.farm.till([ref(5,0)]);f.game.farm.seed([ref(5,0)],'wheat');f.clock.advanceGameMinutes(4320);f.game.farm.harvest([ref(5,0)]);
    const before=f.game.snapshot();for(const [start,end] of [[from,to],[from,from],[{...from,x:12},{...to,x:12}],[from,{...to,x:NaN}]])expect(f.seeder.sweep(start,end,footprint,'wheat').changedCells).toBe(0);
    expect(f.seeder.sweep(from,to,footprint,'missing').failed).toBe(true);expect(f.game.snapshot()).toEqual(before);
  });
});
