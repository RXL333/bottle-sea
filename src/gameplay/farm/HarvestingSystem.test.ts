import { describe,expect,it,vi } from 'vitest';
import { GameClock,DAY_DURATION } from '../../core/GameClock';
import { GameplayFoundation } from '../GameplayFoundation';
import { Inventory } from '../Inventory';
import { ITEMS } from '../ItemRegistry';
import { GrainTank,normalizeGrainTank } from '../vehicles/GrainTank';
import { COMBINE_HEADER } from '../vehicles/VehicleDefinition';
import { HarvestingSystem } from './HarvestingSystem';

const from={x:0,z:-9,yaw:Math.PI},to={x:0,z:-30,yaw:Math.PI};
const ref=(column:number,row:number)=>({fieldId:'field-central',column,row});
function setup(){const clock=new GameClock(),game=new GameplayFoundation(clock),tank=new GrainTank(),harvester=new HarvestingSystem(game.farm,tank);return {clock,game,tank,harvester};}
function plant(f:ReturnType<typeof setup>,id:string,refs:ReturnType<typeof ref>[],mature=true){
  const crop=f.game.crops.registry.get(id)!,now=f.clock.simulationTime;
  if(mature)f.clock.simulationTime=now-crop.growthGameMinutes*DAY_DURATION/1440;
  f.game.farm.till(refs);f.game.inventory.add(crop.seedItemId,refs.length);expect(f.game.farm.seed(refs,id).ok).toBe(true);f.clock.simulationTime=now;
}
describe('combine harvesting and grain transactions',()=>{
  it('harvests mature wheat and corn into the tank, protecting potato and immature crops',()=>{
    const f=setup();plant(f,'wheat',[ref(5,17)]);plant(f,'corn',[ref(6,17)]);plant(f,'potato',[ref(5,16)]);plant(f,'wheat',[ref(6,16)],false);
    const bag=f.game.inventory.snapshot(),potato=f.game.farm.getCell(ref(5,16)),seedling=f.game.farm.getCell(ref(6,16));
    expect(f.harvester.sweep(from,to,COMBINE_HEADER)).toEqual({changedCells:2,protectedCells:1,unsupportedCells:1,blocked:false});
    expect(f.tank.contents).toEqual(expect.arrayContaining([{itemId:'crop.wheat',quantity:3},{itemId:'crop.corn',quantity:2}]));expect(f.tank.used).toBe(5);
    expect(f.game.farm.getCell(ref(5,17))!.landState).toBe('HARVESTED');expect(f.game.farm.getCell(ref(5,16))).toEqual(potato);expect(f.game.farm.getCell(ref(6,16))).toEqual(seedling);expect(f.game.inventory.snapshot()).toEqual(bag);
    expect(f.harvester.sweep(to,from,COMBINE_HEADER).changedCells).toBe(0);expect(f.tank.used).toBe(5);
    expect(f.game.farm.harvest([ref(5,16)]).ok).toBe(true);expect(f.game.inventory.count('crop.potato')).toBe(4);
  });
  it('requires the complete yield to fit, commits available cells and stops before destroying the next crop',()=>{
    const f=setup();plant(f,'wheat',[ref(5,17),ref(6,17)]);f.tank.exchange([],[{itemId:'crop.wheat',quantity:56}]);const stopped=vi.fn();
    expect(f.harvester.sweep(from,to,COMBINE_HEADER,stopped)).toMatchObject({changedCells:1,blocked:true});expect(f.tank.used).toBe(59);
    expect(f.game.farm.getCell(ref(6,17))!.landState).toBe('MATURE');expect(stopped).toHaveBeenCalledExactlyOnceWith(false);
    const before=f.game.snapshot();expect(f.harvester.sweep(to,from,COMBINE_HEADER).changedCells).toBe(0);expect(f.game.snapshot()).toEqual(before);expect(f.tank.used).toBe(59);
  });
  it('marks the machine stopped before callbacks can observe an exactly full grain tank',()=>{
    const f=setup();plant(f,'corn',[ref(5,17)]);let stopped=false;const observed:boolean[]=[];
    const tank=new GrainTank(ITEMS,{slots:[{itemId:'crop.corn',quantity:58},null]},()=>{observed.push(stopped);expect(f.game.farm.getCell(ref(5,17))!.landState).toBe('HARVESTED');});
    const result=new HarvestingSystem(f.game.farm,tank).sweep(from,to,COMBINE_HEADER,full=>{stopped=full;});expect(result).toMatchObject({changedCells:1,blocked:true});expect(observed).toEqual([true]);expect(tank.used).toBe(60);
  });
  it('bridges long and reverse sweeps without gaps and never operates on roads or stationary poses',()=>{
    const a=setup(),b=setup(),refs=Array.from({length:12},(_,row)=>ref(5,row));for(const f of [a,b])plant(f,'corn',refs);
    expect(a.harvester.sweep(from,to,COMBINE_HEADER).changedCells).toBe(12);let p=from;
    for(let n=1;n<=100;n++){const next={...from,z:from.z+(to.z-from.z)*n/100};b.harvester.sweep(p,next,COMBINE_HEADER);p=next;}
    expect(b.game.farm.snapshot()).toEqual(a.game.farm.snapshot());expect(b.tank.snapshot()).toEqual(a.tank.snapshot());
    for(const [start,end] of [[from,from],[{...from,x:12},{...to,x:12}],[from,{...to,z:NaN}]])expect(a.harvester.sweep(start,end,COMBINE_HEADER).changedCells).toBe(0);
  });
  it('rolls farmland back if an externally supplied harvest receiver rejects its commit',()=>{
    const f=setup();plant(f,'wheat',[ref(5,17)]);const before=f.game.farm.snapshot();
    expect(f.game.farm.harvest([ref(5,17)],{canExchange:()=>({ok:true}),exchange:()=>({ok:false,reason:'full'})})).toEqual({ok:false,reason:'full'});expect(f.game.farm.snapshot()).toEqual(before);expect(f.tank.used).toBe(0);
  });
  it('unloads mixed grain atomically, retaining everything if warehouse capacity is insufficient',()=>{
    let tank:GrainTank;const barn=new Inventory(ITEMS,2,undefined,()=>{expect(tank.used).toBe(0);expect(barn.count('crop.wheat')).toBe(3);expect(barn.count('crop.corn')).toBe(2);});
    tank=new GrainTank();tank.exchange([],[{itemId:'crop.wheat',quantity:3},{itemId:'crop.corn',quantity:2}]);const tiny=new Inventory(ITEMS,1);tiny.add('wood',99);const before=tank.snapshot();
    expect(tank.unloadTo(tiny)).toEqual({ok:false,reason:'full'});expect(tank.snapshot()).toEqual(before);expect(tiny.count('wood')).toBe(99);
    expect(tank.unloadTo(barn).ok).toBe(true);expect(tank.used).toBe(0);expect(barn.count('crop.wheat')).toBe(3);expect(barn.count('crop.corn')).toBe(2);
    expect(tank.unloadTo(barn).ok).toBe(true);expect(barn.count('crop.wheat')).toBe(3);
  });
  it('normalizes legacy and corrupt tank payloads and rejects unsupported produce',()=>{
    expect(normalizeGrainTank(undefined).slots).toEqual([null,null]);
    expect(normalizeGrainTank({slots:[{itemId:'crop.wheat',quantity:99},{itemId:'crop.corn',quantity:50}]}).slots).toEqual([{itemId:'crop.wheat',quantity:60},null]);
    const tank=new GrainTank(ITEMS,{slots:[{itemId:'crop.potato',quantity:8},{itemId:'unknown',quantity:4}]});expect(tank.used).toBe(0);
    expect(tank.exchange([],[{itemId:'crop.potato',quantity:4}]).ok).toBe(false);expect(tank.exchange([],[{itemId:'crop.wheat',quantity:61}]).ok).toBe(false);
  });
});
