export const TRACTOR_ID='farm.tractor';
export const COMBINE_ID='farm.combine';
export const PURCHASED_COMBINE_ID='farm.combine.purchased';
export const isCombineId=(id:string)=>id===COMBINE_ID||id===PURCHASED_COMBINE_ID;
