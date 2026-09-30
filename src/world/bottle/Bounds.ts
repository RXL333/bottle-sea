export const BOTTLE_PROFILE=[[-6.3,1.3],[-6.2,1.9],[-5.95,2.76],[-5.6,3.0],[-5.2,3.05],[3.85,3.05],[4.35,2.96],[4.8,2.68],[5.2,1.7],[5.6,1.1],[6,.83],[7.05,.83]];
export function bottleRadiusAt(x:number){for(let i=1;i<BOTTLE_PROFILE.length;i++){if(x<=BOTTLE_PROFILE[i][0]){const a=BOTTLE_PROFILE[i-1],b=BOTTLE_PROFILE[i],t=Math.max(0,(x-a[0])/(b[0]-a[0]));return a[1]+(b[1]-a[1])*t;}}return .83;}
export function insideBottle(x:number,y:number,z:number,margin=.08){return x>-6.25&&x<7&&Math.hypot(y-3.72,z)<bottleRadiusAt(x)-margin;}
