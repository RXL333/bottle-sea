import { describe,expect,it,vi } from 'vitest';
import { GameClock,DAY_DURATION } from '../../core/GameClock';
import { CalendarSystem,calendarAt,normalizeCalendar,seasonalDayTime,seasonalWeather } from './CalendarSystem';
import { SEASONS,DAYS_PER_YEAR } from './SeasonRegistry';
import { GameplayFoundation } from '../GameplayFoundation';
import { defaultSave,migrateSave,SaveSystem } from '../../state/SaveSystem';
import { SeedingSystem } from '../farm/SeedingSystem';
import { ManualFarmingSystem } from '../farm/ManualFarmingSystem';
import { fishSeasonWeight } from '../FishingCatalog';
import { WeatherSystem } from '../../systems/WeatherSystem';
import { disposeWorld } from '../../worlds/disposeWorld';
import { mixAudio } from '../../systems/audio/AudioMixer';

describe('one global game calendar',()=>{
  it.each([[0,1,'spring',1,0],[27,1,'spring',28,6],[28,1,'summer',1,0],[56,1,'autumn',1,0],[84,1,'winter',1,0],[111,1,'winter',28,6],[112,2,'spring',1,0]] as const)('projects day index %i at the exact midnight boundary',(day,year,season,dayOfSeason,weekday)=>{
    expect(calendarAt(day*DAY_DURATION)).toMatchObject({totalDay:day+1,year,season,dayOfSeason,weekday});
    if(day)expect(calendarAt(day*DAY_DURATION-.001).dayIndex).toBe(day-1);
  });
  it('uses only GameClock for sleep, pause, speed, fast forward and multi-year jumps',()=>{
    const clock=new GameClock();clock.simulationTime=27.9*DAY_DURATION;const changed=vi.fn(),calendar=new CalendarSystem(clock,undefined,changed),notify=vi.fn();calendar.onSeasonChange=notify;
    clock.paused=true;clock.update(600);expect(calendar.date.season).toBe('spring');clock.advanceToNextDay();calendar.synchronize();
    expect(calendar.date).toMatchObject({season:'summer',dayOfSeason:1,totalDay:29});expect(clock.hour).toBe(6);expect(notify).toHaveBeenCalledOnce();
    calendar.synchronize();expect(notify).toHaveBeenCalledOnce();expect(changed).toHaveBeenCalledOnce();
    clock.advanceGameMinutes(1440*DAYS_PER_YEAR*3);calendar.synchronize();expect(calendar.date.year).toBe(4);expect(notify).toHaveBeenCalledTimes(2);
    clock.paused=false;clock.timeScale=12;clock.update(40);expect(calendar.date.totalDay).toBe(366);
  });
  it('blends presentation without accumulating calendar time or moving backward',()=>{
    const clock=new GameClock();clock.simulationTime=0;const calendar=new CalendarSystem(clock);clock.advanceGameMinutes(28*1440);
    expect(calendar.visual.weights).toEqual([1,0,0,0]);calendar.updatePresentation(.1);expect(calendar.visual.weights[1]).toBeGreaterThan(0);expect(calendar.visual.weights[1]).toBeLessThan(.1);
    const before=clock.simulationTime;for(let i=0;i<200;i++)calendar.updatePresentation(.2);expect(clock.simulationTime).toBe(before);expect(calendar.visual.weights.reduce((n,w)=>n+w,0)).toBeCloseTo(1);expect(calendar.visual.sunset).toBeGreaterThan(18.9);
    expect(seasonalDayTime(6/24,{sunrise:5,sunset:19})).toBeGreaterThan(.25);expect(seasonalDayTime(6/24,{sunrise:7,sunset:17})).toBeLessThan(.25);
  });
  it('sanitizes old/malformed calendars using the restored clock and suppresses duplicate notifications',()=>{
    const clock=new GameClock();clock.simulationTime=90*DAY_DURATION;
    for(const raw of [undefined,null,{version:99},{version:1,lastAnnouncedSeasonIndex:999},{version:1,lastAnnouncedSeasonIndex:-1}])expect(normalizeCalendar(raw,clock.simulationTime)).toEqual({version:1,lastAnnouncedSeasonIndex:3});
    const calendar=new CalendarSystem(clock),notify=vi.fn();calendar.onSeasonChange=notify;calendar.synchronize();expect(notify).not.toHaveBeenCalled();
    const restored=new CalendarSystem(clock,calendar.snapshot());restored.onSeasonChange=notify;restored.synchronize();expect(notify).not.toHaveBeenCalled();
  });
  it('restores a pre-season v2 farm in winter, preserves goods, and matures prior crops',()=>{
    const clock=new GameClock(),game=new GameplayFoundation(clock);clock.simulationTime=26*DAY_DURATION;const ref={fieldId:'field-central',column:0,row:0};
    game.inventory.add('seed.wheat',3);game.inventory.add('fish.red_snapper',2);game.farm.till([ref]);expect(game.farm.seed([ref],'wheat').ok).toBe(true);
    clock.advanceGameMinutes(60*1440);const raw:Record<string,unknown>={...defaultSave(),...game.snapshot(),gameTime:clock.snapshot()};delete raw.calendar;
    const loaded=migrateSave(JSON.parse(JSON.stringify(raw))),resumedClock=new GameClock();resumedClock.restore(loaded.gameTime);const resumed=new GameplayFoundation(resumedClock,loaded);
    expect(resumed.calendar.date.season).toBe('winter');expect(resumed.inventory.count('fish.red_snapper')).toBe(2);expect(resumed.farm.getCell(ref)?.landState).toBe('MATURE');expect(resumed.farm.harvest([ref]).ok).toBe(true);expect(resumed.inventory.count('crop.wheat')).toBe(3);
    const values=new Map<string,string>(),save=new SaveSystem({getItem:key=>values.get(key)??null,setItem:(key,value)=>{values.set(key,value);}});resumed.calendar.synchronize();
    expect(save.save({...loaded,...resumed.snapshot()})).toBe(true);const again=save.load();expect(again.farm.fields.find(f=>f.id===ref.fieldId)?.cells[0].landState).toBe('HARVESTED');expect(again.calendar).toEqual(resumed.calendar.snapshot());
  });
});

describe('seasonal production and supply',()=>{
  const ref={fieldId:'field-central',column:5,row:0};
  it.each(['wheat','corn','potato'])('rejects winter sowing of %s before touching seed/land/save callbacks',id=>{
    const clock=new GameClock();clock.simulationTime=84*DAY_DURATION;const changed=vi.fn(),game=new GameplayFoundation(clock,undefined,undefined,changed);game.farm.till([ref]);game.inventory.add(`seed.${id}`,5);const before=game.snapshot();changed.mockClear();
    expect(game.farm.seed([ref],id)).toEqual({ok:false,reason:'wrong-season'});expect(game.snapshot()).toEqual(before);expect(changed).not.toHaveBeenCalled();
    game.hotbar.bind(0,`seed.${id}`);expect(new ManualFarmingSystem(game).inspect(ref).reason).toContain('适种季节');
    const seeder=new SeedingSystem(game.farm,game.inventory),commit=vi.fn();expect(seeder.sweep({x:0,z:-9,yaw:0},{x:0,z:-12,yaw:0},{minX:-1.1,maxX:1.1,minZ:-2.4,maxZ:-.4},id,commit)).toMatchObject({failed:true,changedCells:0});expect(commit).not.toHaveBeenCalled();expect(game.inventory.count(`seed.${id}`)).toBe(5);
  });
  it('allows summer corn, autumn wheat/potato; crops planted before a boundary still grow normally',()=>{
    const clock=new GameClock(),game=new GameplayFoundation(clock);clock.simulationTime=27*DAY_DURATION;game.farm.till([ref]);game.inventory.add('seed.wheat',1);expect(game.farm.seed([ref],'wheat').ok).toBe(true);clock.advanceGameMinutes(4320);
    expect(game.calendar.date.season).toBe('summer');expect(game.farm.getCell(ref)?.landState).toBe('MATURE');expect(game.crops.plantingReason('wheat')).toBeDefined();expect(game.crops.plantingReason('corn')).toBeUndefined();
    clock.advanceGameMinutes(28*1440);expect(game.crops.plantingReason('corn')).toBeDefined();expect(game.crops.plantingReason('potato')).toBeUndefined();expect(game.crops.plantingReason('wheat')).toBeUndefined();
  });
  it('uses the same seasonal supply for previews and commits; rejected purchases are resource-neutral',()=>{
    const clock=new GameClock();clock.simulationTime=84*DAY_DURATION;const game=new GameplayFoundation(clock),before=game.snapshot();
    expect(game.economy.check('buy','buy.seed.corn',1)).toEqual({ok:false,reason:'out-of-season'});expect(game.economy.trade('buy','buy.seed.corn',1,game.economy.nextRequest)).toEqual({ok:false,reason:'out-of-season'});expect(game.snapshot()).toEqual(before);
    expect(game.economy.trade('buy','buy.feed',1,game.economy.nextRequest).ok).toBe(true);game.inventory.add('fish.red_snapper',1);expect(game.economy.trade('sell','fish.red_snapper',1,game.economy.nextRequest).ok).toBe(true);
    clock.advanceGameMinutes(28*1440);expect(game.calendar.date).toMatchObject({season:'spring',year:2});expect(game.economy.trade('buy','buy.seed.corn',1,game.economy.nextRequest).ok).toBe(true);expect(game.inventory.count('seed.corn')).toBe(1);
  });
  it('changes fish weights without invalidating pending catch or a hooked fish across seasons',()=>{
    const clock=new GameClock(),game=new GameplayFoundation(clock);clock.simulationTime=28*DAY_DURATION;
    const tuna=game.items.get('fish.tuna')! as import('../ItemRegistry').FishDefinition;expect(fishSeasonWeight(tuna,'summer')).toBeGreaterThan(fishSeasonWeight(tuna,'winter'));
    expect(game.fishing.seasonalPool.some(f=>f.id==='fish.red_snapper')).toBe(true);expect(game.fishing.interact().status).toBe('success');clock.advanceGameMinutes(56*1440);expect(game.fishing.active).toBe(true);expect(game.fishing.seasonalPool.some(f=>f.id==='fish.red_snapper')).toBe(false);expect(game.fishing.seasonalPool.length).toBe(5);
    const pending=new GameplayFoundation(clock,{fishing:{pendingCatch:'fish.red_snapper',inputMode:'hold'}});expect(pending.fishing.interact().status).toBe('success');expect(pending.inventory.count('fish.red_snapper')).toBe(1);expect(pending.fishing.pendingCatch).toBeNull();
  });
});

describe('weather season continuity',()=>{
  it('turns winter precipitation into bounded slow snow with softer sound and indoor shelter',()=>{
    const weather=new WeatherSystem(),winter={weights:[0,0,0,1],sunrise:7,sunset:17};weather.configure(true);weather.setWeather('RAIN');
    for(let t=0;t<8;t+=.1)weather.update(.1,t,winter);
    expect(weather.frame.snow).toBeGreaterThan(.99);expect(weather.frame.rain).toBeCloseTo(.74*.65);expect(weather.rain.diagnostics).toMatchObject({farm:true,visible:true,snow:weather.frame.snow});
    const mix={ocean:0,wind:0,stormWind:0,rain:0,underwater:0,cutoff:0};mixAudio('ISLAND',0,mix,weather.frame);const snowVolume=mix.rain;mixAudio('ISLAND',0,mix,{...weather.frame,snow:0});expect(snowVolume).toBeLessThan(mix.rain*.2);
    weather.shelter(true);expect(weather.rain.visible).toBe(false);weather.update(.1,9,winter);expect(weather.rain.visible).toBe(false);weather.shelter(false);expect(weather.rain.visible).toBe(true);disposeWorld(weather);
  });
  it('has spring rain / summer sun tendencies and deterministic forecasts across years',()=>{
    const counts=SEASONS.map((season,index)=>{const kinds=Array.from({length:2800},(_,n)=>seasonalWeather(calendarAt((Math.floor(n/28)*112+index*28+n%28)*DAY_DURATION)));return {season:season.id,rain:kinds.filter(k=>k==='RAIN').length,clear:kinds.filter(k=>k==='CLEAR').length};});
    expect(counts[0].rain).toBeGreaterThan(counts[1].rain*2);expect(counts[1].clear).toBeGreaterThan(counts[0].clear*1.5);expect(counts[3].clear).toBeLessThan(counts[1].clear);expect(seasonalWeather(calendarAt(500*DAY_DURATION))).toBe(seasonalWeather(calendarAt(500*DAY_DURATION)));
  });
  it('retains manual/weather blend across world configuration and reload, changes only on new game day',()=>{
    const weather=new WeatherSystem(),date=calendarAt(84*DAY_DURATION);weather.synchronizeCalendar(date);weather.setWeather('RAIN');weather.update(.1,1);const snapshot=weather.snapshot(),restored=new WeatherSystem();restored.restore(snapshot);restored.configure(true);restored.synchronizeCalendar(date);expect(restored.snapshot()).toEqual(snapshot);
    restored.configure(false);restored.shelter(true);restored.synchronizeCalendar(date);expect(restored.kind).toBe('RAIN');restored.synchronizeCalendar(calendarAt(112*DAY_DURATION));expect(restored.kind).toBe(seasonalWeather(calendarAt(112*DAY_DURATION)));expect(restored.frame.rain).toBe(snapshot.rain);
    const legacy=new WeatherSystem();legacy.restore(undefined,true,.7,date.dayIndex);legacy.synchronizeCalendar(date);expect(legacy.kind).toBe('STORM');for(const w of [weather,restored,legacy])disposeWorld(w);
  });
});
