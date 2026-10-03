import catalog from './farmTreeCatalog.json';

/** Authoring-generated metadata: one source for species, GLB paths and trunk colliders. */
export const FARM_TREES=Object.freeze(catalog);
export type FarmTreeId=keyof typeof FARM_TREES;
export const FARM_TREE_FILES=Object.fromEntries(Object.entries(FARM_TREES).map(([id,tree])=>[id,tree.file])) as {[K in FarmTreeId]:string};
export function isFarmTree(id:string):id is FarmTreeId{return Object.hasOwn(FARM_TREES,id);}

// Existing perimeter centres stay clear of fields/headlands and machinery roads.
// Species are intentionally grouped: pine/poplar at the windbreak, fruit trees
// around the living area, willow at the shore, ornamental flowers near the entrance.
const perimeter:readonly [number,number,FarmTreeId][]=[
  [-33,2,'tree_broadleaf'],[-32.5,-10,'tree_poplar'],[-33,-24,'tree_broadleaf'],
  [-33.5,-40,'tree_pine'],[-32,-55,'tree_pine'],[-28,-61,'tree_poplar'],
  [-20,-62,'tree_pine'],[-10,-63,'tree_broadleaf'],[0,-63,'tree_poplar'],
  [10,-63,'tree_pine'],[25,-62,'tree_broadleaf'],[33,-5,'tree_willow'],
  [33,-17,'tree_poplar'],[33,-30,'tree_broadleaf'],[33,-44,'tree_poplar'],
  [32,-54,'tree_pine'],[-12,7.8,'tree_apple'],[11.5,7.6,'tree_blossom'],
  [31,8,'tree_pear'],[-31,7,'tree_willow'],
];
export const FARM_TREE_PLACEMENTS=[
  ...perimeter.map(([x,z,asset],i)=>({id:`tree-${i}`,asset,x,z,scale:.76+(i%3)*.06,yaw:(i*.73)%6.28})),
  {id:'tree-apple-garden',asset:'tree_apple' as const,x:-15.6,z:7.9,scale:.74,yaw:.2},
  {id:'tree-pear-garden',asset:'tree_pear' as const,x:15,z:8.4,scale:.74,yaw:-.4},
  {id:'tree-sapling-west',asset:'tree_sapling' as const,x:-18.7,z:8.6,scale:.82,yaw:.3},
  {id:'tree-sapling-east',asset:'tree_sapling' as const,x:9,z:8.4,scale:.8,yaw:-.5},
  {id:'tree-blossom-west',asset:'tree_blossom' as const,x:-22,z:8.5,scale:.74,yaw:.6},
];
