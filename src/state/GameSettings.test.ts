import { expect,it,vi } from 'vitest';
import { DEFAULT_SETTINGS,normalizeSettings,SettingsState } from './GameSettings';
import { defaultSave,migrateSave,SaveSystem } from './SaveSystem';
it('defaults old saves and rejects malformed preferences without losing gameplay',()=>{
  const old=defaultSave();old.inventory.slots[0]={itemId:'crop.wheat',quantity:12};old.progress.money=350;old.global.quality='HIGH';
  const {settings,...legacy}=old;void settings;const restored=migrateSave(legacy);
  expect(restored.settings).toEqual(DEFAULT_SETTINGS);expect(restored.inventory).toEqual(old.inventory);expect(restored.progress.money).toBe(350);expect(restored.global.quality).toBe('HIGH');
  expect(normalizeSettings({vehicleSteering:'spaceship',lookSensitivity:NaN,volume:Infinity,invertLookY:'true',renderScale:-5,vehicleSensitivity:999})).toEqual({...DEFAULT_SETTINGS,renderScale:.5,vehicleSensitivity:2});
});
it('round trips control, graphics and audio preferences through the existing save',()=>{
  let json:string|null=null;const save=new SaveSystem({getItem:()=>json,setItem:(_,value)=>json=value}),data=defaultSave();
  data.settings={...DEFAULT_SETTINGS,vehicleSteering:'mouse',vehicleSensitivity:.35,lookSensitivity:1.5,invertLookY:true,orbitSensitivity:.7,vehicleCameraDistance:1.4,renderScale:.7,volume:.25,soundEnabled:true,showFps:false};
  expect(save.save(data)).toBe(true);expect(save.load().settings).toEqual(data.settings);expect(save.load().inventory).toEqual(data.inventory);
});
it('notifies on actual changes, isolates snapshots and restores defaults',()=>{
  const changed=vi.fn(),state=new SettingsState(undefined,changed);state.set({vehicleSteering:'keyboard',vehicleSensitivity:.5});expect(changed).toHaveBeenCalledOnce();state.set({vehicleSensitivity:.5});expect(changed).toHaveBeenCalledOnce();
  const copy=state.snapshot();copy.vehicleSteering='mouse';expect(state.snapshot().vehicleSteering).toBe('keyboard');state.reset();expect(state.snapshot()).toEqual(DEFAULT_SETTINGS);expect(changed).toHaveBeenCalledTimes(2);
});
