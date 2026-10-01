import { normalizeYaw } from './VehicleState';

export interface DrivingInput { throttle:number;steer:number;brake:boolean }
export interface MotionPose { x:number;z:number;yaw:number }
export const TRACTOR_WHEELBASE=.88;
// Ground-space dimensions of the existing tractor GLB at its farm scale (0.5).
export const TRACTOR_HULL={halfX:.58,halfZ:.85,centerZ:-.036,height:1.38} as const;
const approach=(value:number,target:number,amount:number)=>value+Math.max(-amount,Math.min(amount,target-value));

/** Real-time bicycle steering, independent of the simulation calendar and crops. */
export class VehicleMotion {
  speed=0;steering=0;
  constructor(readonly pose:MotionPose,private config={wheelbase:TRACTOR_WHEELBASE,forwardSpeed:3.2,reverseSpeed:1.5}){}
  stop(){this.speed=0;}
  update(delta:number,input:DrivingInput,accept:(pose:MotionPose)=>boolean,onMoved:(pose:MotionPose)=>void=()=>{}):number {
    const elapsed=Math.max(0,Math.min(.1,delta)),steps=Math.max(1,Math.ceil(elapsed*120)),dt=elapsed/steps;let distance=0;
    for(let i=0;i<steps;i++){
      const turnLimit=.55/(1+Math.abs(this.speed)*.18);
      this.steering+=(Math.max(-1,Math.min(1,input.steer))*turnLimit-this.steering)*(1-Math.exp(-dt*7));
      const throttle=Math.max(-1,Math.min(1,input.throttle));
      if(input.brake)this.speed=approach(this.speed,0,5.8*dt);
      else if(throttle&&this.speed*throttle<-.02)this.speed=approach(this.speed,0,3.8*dt);
      else if(throttle)this.speed=approach(this.speed,throttle>0?this.config.forwardSpeed:-this.config.reverseSpeed,1.65*dt);
      else this.speed=approach(this.speed,0,(.38+Math.abs(this.speed)*.12)*dt);
      const travel=this.speed*dt,turn=travel*Math.tan(this.steering)/this.config.wheelbase;
      if(Math.abs(travel)<1e-8)continue;
      const heading=this.pose.yaw+turn/2,next={x:this.pose.x+Math.sin(heading)*travel,z:this.pose.z+Math.cos(heading)*travel,yaw:normalizeYaw(this.pose.yaw+turn)};
      // Validate the rotated hull too, so turning cannot sweep through a wall.
      if(!accept(next)){this.speed=0;break;}
      Object.assign(this.pose,next);onMoved(next);distance+=travel;
    }
    return distance;
  }
}
