import { COMMISSIONS } from './CommissionRegistry';
import type { CommissionRegistry } from './CommissionRegistry';
export interface CommissionRecord {acceptedAt:number;completedAt:number|null;production:number[]}
export interface CommissionSnapshot {version:1;records:Record<string,CommissionRecord>}
export function normalizeCommissions(value:unknown,now:number,registry:CommissionRegistry=COMMISSIONS):CommissionSnapshot {
  const state:CommissionSnapshot={version:1,records:{}};
  if(!value||typeof value!=='object'||Array.isArray(value))return state;
  const raw=value as Partial<CommissionSnapshot>;if(raw.version!==1||!raw.records||typeof raw.records!=='object'||Array.isArray(raw.records))return state;
  for(const d of registry.list()){
    if(!Object.hasOwn(raw.records,d.id))continue;
    const r=raw.records[d.id];if(!r||typeof r!=='object'||!Number.isFinite(r.acceptedAt)||r.acceptedAt<0||r.acceptedAt>now)continue;
    // Retain a valid claimed marker even if its cached clock was ahead: never reissue a reward.
    const completedAt=typeof r.completedAt==='number'&&Number.isFinite(r.completedAt)&&r.completedAt>=r.acceptedAt?Math.min(now,r.completedAt):null;
    state.records[d.id]={acceptedAt:r.acceptedAt,completedAt,production:d.objectives.map((o,i)=>o.kind==='production'&&Array.isArray(r.production)&&Number.isSafeInteger(r.production[i])?Math.max(0,Math.min(o.quantity,r.production[i])):0)};
  }
  return state;
}
