/** Mouse displacement acts as a steering wheel; keyboard steering takes priority. */
export class VehicleMouseSteering {
  private value=0;
  private idle=0;
  move(dx:number){if(Number.isFinite(dx)){this.value=Math.max(-1,Math.min(1,this.value-dx*.008));this.idle=0;}}
  update(delta:number){this.idle+=delta;if(this.idle>.25)this.value*=Math.exp(-delta*3);return this.value;}
  reset(){this.value=0;this.idle=0;}
}
