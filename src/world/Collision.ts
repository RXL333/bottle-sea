type BoxObstacle={minX:number;maxX:number;minY:number;maxY:number;minZ:number;maxZ:number};
type RoundObstacle={x:number;z:number;radius:number;minY:number;maxY:number};

const boxes:BoxObstacle[]=[
  {minX:-2.17,maxX:-.83,minY:3.75,maxY:5.35,minZ:-.71,maxZ:.31},
  ...([.24,1.06].flatMap(x=>[.77,1.8].map(z=>({minX:x-.07,maxX:x+.07,minY:2.48,maxY:3.98,minZ:z-.07,maxZ:z+.07})))),
  {minX:-2.15,maxX:-1.45,minY:1.68,maxY:2.36,minZ:.85,maxZ:1.36},
  {minX:-4.32,maxX:-2.96,minY:1.74,maxY:3.24,minZ:.53,maxZ:.77},
  {minX:2.56,maxX:3.04,minY:1.68,maxY:2.9,minZ:.16,maxZ:.64},
  {minX:3.41,maxX:3.89,minY:1.68,maxY:2.9,minZ:.16,maxZ:.64},
  {minX:2.42,maxX:4.02,minY:2.84,maxY:3.04,minZ:.18,maxZ:.62},
  {minX:.4,maxX:2.08,minY:1.7,maxY:2.3,minZ:-1.34,maxZ:-.25},
];
const rounds:RoundObstacle[]=[
  {x:.35,z:-.28,radius:.32,minY:3.75,maxY:6.35},
  {x:-2.19,z:-.22,radius:.18,minY:3.75,maxY:5.35},
  {x:-1.78,z:-.64,radius:.18,minY:3.75,maxY:5.65},
  {x:-.37,z:-.78,radius:.18,minY:3.75,maxY:5.45},
];

export function hitsWorldObstacle(x:number,z:number,y:number,radius=.14){
  for(const b of boxes)if(x>b.minX-radius&&x<b.maxX+radius&&z>b.minZ-radius&&z<b.maxZ+radius&&y>b.minY-radius&&y<b.maxY+radius)return true;
  for(const obstacle of rounds)if(y>obstacle.minY-radius&&y<obstacle.maxY+radius&&Math.hypot(x-obstacle.x,z-obstacle.z)<obstacle.radius+radius)return true;
  return false;
}
