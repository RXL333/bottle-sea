import { expect,it } from 'vitest';
import { DAY_DURATION,GameClock } from '../../core/GameClock';
import { sampleMerchantRoute,HOME_MERCHANT_BERTH } from './MerchantRoute';
import { obbIntersectsAabb } from '../../world/ship/ShipPath';
import { TERRAIN_CELLS } from '../../world/island/TerrainData';
import { bottleRadiusAt } from '../../world/bottle/Bounds';
import { GameplayFoundation } from '../../gameplay/GameplayFoundation';
it('docks for twelve hours and restores schedule after sleeping, fast-forward and loading',()=>{
  for(const hour of [8,12,19.99])expect(sampleMerchantRoute(hour/24*DAY_DURATION)).toMatchObject({phase:'DOCKED',pose:HOME_MERCHANT_BERTH,available:true});
  for(const [hour,phase] of [[6,'SAILING'],[7.5,'ARRIVING'],[20.5,'DEPARTING'],[21,'SAILING']] as const)expect(sampleMerchantRoute(hour/24*DAY_DURATION).phase).toBe(phase);
  const clock=new GameClock();clock.advanceToNextDay(8);const saved=clock.snapshot(),restored=new GameClock();restored.restore(saved);expect(sampleMerchantRoute(restored.simulationTime)).toEqual(sampleMerchantRoute(clock.simulationTime));restored.advanceGameMinutes(720);expect(sampleMerchantRoute(restored.simulationTime).available).toBe(false);
});
it('keeps the full route clear of land and the transport berth',()=>{
  for(let minute=0;minute<1440;minute+=.25){const {pose:p}=sampleMerchantRoute(minute/1440*DAY_DURATION);
    expect(TERRAIN_CELLS.some(c=>obbIntersectsAabb(p.x,p.z,.27,.75,p.yaw,c.minX,c.maxX,c.minZ,c.maxZ,.02)),`land at ${minute}`).toBe(false);
    expect(obbIntersectsAabb(p.x,p.z,.27,.75,p.yaw,-.13,1.43,1.85,2.85,.05),`transport at ${minute}`).toBe(false);
    expect(Math.abs(p.z)+Math.abs(Math.sin(p.yaw))*.27+Math.abs(Math.cos(p.yaw))*.75,`bottle at ${minute}`).toBeLessThan(bottleRadiusAt(p.x)-.04);
  }
});
it('rejects away-ship transactions without changing coins, goods or request sequence',()=>{
  const game=new GameplayFoundation(new GameClock());game.inventory.add('fish.sardine',2);const before=game.snapshot();
  for(const mode of ['buy','sell'] as const)expect(game.economy.trade(mode,mode==='buy'?'buy.feed':'fish.sardine',1,game.economy.nextRequest,{farm:false,available:()=>false})).toEqual({ok:false,reason:'merchant-away'});
  expect(game.snapshot()).toEqual(before);
});
