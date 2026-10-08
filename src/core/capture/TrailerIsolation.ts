import type { SaveStorage } from '../../state/SaveSystem';

export function trailerEnabled(dev:boolean,query:URLSearchParams){return dev&&query.get('trailer')==='1';}
/** Lazy normal provider: capture never even opens localStorage, including persist=1. */
export function sessionStorageForTrailer(capture:boolean,normal:()=>SaveStorage):SaveStorage {
  if(!capture)return normal();
  const memory=new Map<string,string>();
  return {getItem:key=>memory.get(key)??null,setItem:(key,value)=>{memory.set(key,value);}};
}
