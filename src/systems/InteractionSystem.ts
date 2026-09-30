import { discoveryIds } from '../state/PlayerState';
import { LANDMARKS } from '../world/underwater/Landmarks';
import type { GameplayServices } from '../gameplay/GameplayFoundation';
import type { WorldId } from '../worlds/types';

export interface InteractionPosition { readonly x: number; readonly y: number; readonly z: number }
export interface InteractionContext {
  readonly position: InteractionPosition;
  readonly worldId: WorldId;
  readonly gameplay: GameplayServices;
}
export interface InteractionOutcome {
  status: 'success' | 'unavailable';
  message?: string;
  changed?: boolean;
}
export type InteractionHandler = (context: InteractionContext, target: InteractionTarget) => InteractionOutcome | Promise<InteractionOutcome>;
export interface InteractionTarget {
  id: string;
  name: string;
  x: number; y: number; z: number;
  action: string;
  range?: number;
  prompt?: string;
  /** Return a player-facing reason to block the action, or undefined to allow it. */
  unavailable?: (context: InteractionContext) => string | undefined;
  /** Local world behavior; global actions can instead use the shared registry. */
  onInteract?: InteractionHandler;
}
export interface InteractionResult {
  status: InteractionOutcome['status'] | 'no-target' | 'busy' | 'error';
  target?: InteractionTarget;
  message?: string;
  changed?: boolean;
  discovery?: { id: string; count: number; isNew: boolean };
  error?: unknown;
}

/** Global actions are registered once; world-specific actions stay with their targets. */
export class InteractionActions {
  private handlers = new Map<string, InteractionHandler>();
  register(action: string, handler: InteractionHandler): this {
    if (!action.trim() || action === 'DISCOVER' || this.handlers.has(action)) throw new Error(`Invalid or duplicate interaction action: ${action}`);
    this.handlers.set(action, handler);
    return this;
  }
  get(action: string): InteractionHandler | undefined { return this.handlers.get(action); }
}

export const discoveryTargets: readonly InteractionTarget[] = LANDMARKS.map(target => ({
  ...target, action: 'DISCOVER', prompt: `观察：${target.name}`,
}));

export class InteractionSystem {
  readonly discovered = new Set<string>();
  nearest: InteractionTarget | undefined;
  private running = false;
  get busy(): boolean { return this.running; }

  constructor(private targets: readonly InteractionTarget[] = discoveryTargets) {}
  setTargets(targets: readonly InteractionTarget[]): void { this.targets = targets; this.nearest = undefined; }
  restore(ids: unknown): void {
    this.discovered.clear();
    for (const id of discoveryIds(ids)) this.discovered.add(id);
    this.nearest = undefined;
  }

  update(position: InteractionPosition): void {
    this.nearest = undefined;
    let best = Infinity;
    for (const target of this.targets) {
      const range = target.range ?? .85;
      if (!Number.isFinite(range) || range <= 0) continue;
      const distance = Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z);
      if (distance < range && distance < best) { best = distance; this.nearest = target; }
    }
  }

  getPrompt(context: InteractionContext, actions?: InteractionActions): { text: string; available: boolean } | undefined {
    this.update(context.position);
    const target = this.nearest;
    if (!target) return;
    if (this.busy) return { text: '交互进行中……', available: false };
    try {
      const reason = this.blockReason(target, context, actions);
      return { text: `[ E ] ${reason ?? target.prompt ?? target.name}`, available: reason === undefined };
    } catch { return { text: '暂时无法交互，请重试。', available: false }; }
  }

  /** The only execution path for E: recheck distance, availability and async ownership. */
  async interact(context: InteractionContext, actions?: InteractionActions): Promise<InteractionResult> {
    if (this.busy) return { status: 'busy' };
    this.update(context.position);
    const target = this.nearest;
    if (!target) return { status: 'no-target', message: '靠近可交互物件后，按 E 交互。' };
    this.running = true;
    try {
      const reason = this.blockReason(target, context, actions);
      if (reason !== undefined) return { status: 'unavailable', target, message: reason };
      if (target.action === 'DISCOVER') {
        const isNew = !this.discovered.has(target.id);
        this.discovered.add(target.id);
        return {
          status: 'success', target, changed: isNew,
          message: `${isNew ? '发现' : '再次来到'}：${target.name}${this.discovered.size === LANDMARKS.length ? ' · 航海手记已完成' : ''}`,
          discovery: { id: target.id, count: this.discovered.size, isNew },
        };
      }
      const handler = target.onInteract ?? actions!.get(target.action)!;
      return { ...await handler(context, target), target };
    } catch (error) {
      return { status: 'error', target, message: '暂时无法交互，请重试。', error };
    } finally { this.running = false; }
  }

  private blockReason(target: InteractionTarget, context: InteractionContext, actions?: InteractionActions): string | undefined {
    if (target.action === 'DISCOVER' && !discoveryIds([target.id]).length) return '未知的发现点';
    if (target.action !== 'DISCOVER' && !target.onInteract && !actions?.get(target.action)) return '此交互尚未开放';
    return target.unavailable?.(context);
  }
}
