const PROFILE=[[-6.3,1.3],[-6.2,1.9],[-5.95,2.3],[-5.6,2.5],[-5.2,2.55],[3.85,2.55],[4.35,2.48],[4.8,2.25],[5.2,1.7],[5.6,1.1],[6,.83],[7.05,.83]];
export function bottleRadiusAt(x:number){for(let i=1;i<PROFILE.length;i++){if(x<=PROFILE[i][0]){const a=PROFILE[i-1],b=PROFILE[i],t=Math.max(0,(x-a[0])/(b[0]-a[0]));return a[1]+(b[1]-a[1])*t;}}return .83;}
export function insideBottle(x:number,y:number,z:number,margin=.08){return x>-6.25&&x<7&&Math.hypot(y-3.72,z)<bottleRadiusAt(x)-margin;}
