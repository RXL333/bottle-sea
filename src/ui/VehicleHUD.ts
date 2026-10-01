import type { VehicleController } from '../controls/VehicleController';

export class VehicleHUD {
  readonly element=document.createElement('div');
  private speed=document.createElement('strong');private gear=document.createElement('span');
  private hitch=document.createElement('p');
  private work=document.createElement('p');
  private cargo=document.createElement('p');private name=document.createElement('span');private controls=document.createElement('small');
  private seeds=document.createElement('div');private seedButtons=new Map<string,HTMLButtonElement>();
  constructor(){
    this.element.className='vehicle-hud';this.element.hidden=true;this.element.setAttribute('aria-label','车辆驾驶状态');
    this.name.className='vehicle-name';this.cargo.className='vehicle-cargo-hint';this.cargo.setAttribute('role','status');
    this.hitch.className='vehicle-hitch-hint';this.hitch.setAttribute('role','status');
    this.work.className='vehicle-work-hint';this.work.setAttribute('role','status');this.work.setAttribute('aria-live','polite');
    this.seeds.className='vehicle-seed-choices';this.seeds.setAttribute('role','group');this.seeds.setAttribute('aria-label','播种机种子选择');
    this.element.append(this.name,this.gear,this.speed,this.hitch,this.work,this.cargo,this.seeds,this.controls);
  }
  update(controller:VehicleController){
    this.element.hidden=!controller.active;const vehicle=controller.vehicle;if(!vehicle)return;
    this.name.textContent=vehicle.name;this.controls.textContent=vehicle.machineControls??'W / S 前进后退　A / D 转向　Space 刹车　H 挂接　J 抬落　K 换种　E 下车';
    this.cargo.hidden=!vehicle.cargoHint;this.cargo.textContent=vehicle.cargoHint??'';
    this.speed.textContent=`${(Math.abs(vehicle.speed)*3.6).toFixed(1)} km/h`;
    this.hitch.textContent=vehicle.hitchHint??'H 挂接 / 分离农具';
    const workHint=vehicle.workHint;this.work.hidden=!workHint;if(workHint&&this.work.textContent!==workHint)this.work.textContent=workHint;
    const choices=vehicle.seedChoices??[];this.seeds.hidden=!choices.length;
    for(const [id,button] of this.seedButtons)if(!choices.some(c=>c.id===id)){button.remove();this.seedButtons.delete(id);}
    for(const choice of choices){
      let button=this.seedButtons.get(choice.id);
      if(!button){button=document.createElement('button');button.type='button';button.addEventListener('click',()=>controller.selectSeed(choice.id));this.seedButtons.set(choice.id,button);this.seeds.append(button);}
      const text=`${choice.name} × ${choice.count}`;if(button.textContent!==text)button.textContent=text;
      button.setAttribute('aria-label',`选择${choice.name}种子`);button.setAttribute('aria-pressed',String(choice.selected));button.disabled=controller.phase!=='DRIVING';
    }
    this.gear.textContent=controller.phase==='BOARDING'?'正在上车':controller.phase==='EXITING'?'正在下车':controller.braking?'刹车':vehicle.speed>.02?'前进 D':vehicle.speed<-.02?'倒车 R':'停放 N';
  }
}
