export interface ItemDefinition {
  readonly id: string;
  readonly name: string;
  readonly maxStack: number;
}

export const MAX_STACK_SIZE = 9999;

/** Definitions are data only; instances and counts belong to inventories. */
export class ItemRegistry {
  private definitions = new Map<string, Readonly<ItemDefinition>>();

  register(item: ItemDefinition): this {
    if (!/^[a-z][a-z0-9_.-]*$/.test(item.id) || !item.name.trim()
      || !Number.isSafeInteger(item.maxStack) || item.maxStack < 1 || item.maxStack > MAX_STACK_SIZE) {
      throw new Error(`Invalid item definition: ${item.id}`);
    }
    if (this.definitions.has(item.id)) throw new Error(`Item already registered: ${item.id}`);
    this.definitions.set(item.id, Object.freeze({ id: item.id, name: item.name, maxStack: item.maxStack }));
    return this;
  }

  get(id: string): Readonly<ItemDefinition> | undefined { return this.definitions.get(id); }
  has(id: string): boolean { return this.definitions.has(id); }
  list(): readonly Readonly<ItemDefinition>[] { return [...this.definitions.values()]; }
}

export function createItemRegistry(): ItemRegistry {
  return new ItemRegistry()
    .register({ id: 'wood', name: '木材', maxStack: 99 })
    .register({ id: 'stone', name: '石料', maxStack: 99 });
}

export const ITEMS = createItemRegistry();
