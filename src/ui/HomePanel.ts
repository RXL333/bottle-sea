import type { GameplayServices } from '../gameplay/GameplayFoundation';
import type { Inventory } from '../gameplay/Inventory';

/** Only the two furniture workflows; no general equipment or inventory UI. */
export class HomePanel {
  readonly element = document.createElement('dialog');
  private onClose = () => {};
  constructor(root: HTMLElement) {
    this.element.className = 'home-panel';root.append(this.element);
    this.element.addEventListener('cancel', event => { event.preventDefault();this.close(); });
  }
  get open(): boolean { return this.element.open; }
  private begin(label: string, close: () => void): void {
    this.onClose = close;this.element.setAttribute('aria-label', label);this.element.replaceChildren();
  }
  private heading(title: string, description: string): void {
    const h = document.createElement('h2'), p = document.createElement('p');
    h.textContent = title;p.textContent = description;this.element.append(h, p);
  }
  private button(label: string, action: () => void): HTMLButtonElement {
    const button = document.createElement('button');button.type = 'button';button.textContent = label;
    button.addEventListener('click', action);return button;
  }
  showSleep(gameplay: GameplayServices, confirm: () => void, close: () => void): void {
    this.begin('床 · 睡觉', close);
    this.heading('今晚好好休息', `睡到第 ${gameplay.time.day + 1} 天 06:00，恢复全部体力。`);
    const status = document.createElement('p');status.textContent = `体力 ${gameplay.progress.energy} / ${gameplay.progress.maxEnergy}`;
    const actions = document.createElement('div');actions.className = 'home-actions';
    actions.append(this.button('睡到明天', () => {
      // Do not resume exploration between closing this panel and starting the fade.
      this.element.close();confirm();
    }), this.button('暂时不睡', () => this.close()));
    this.element.append(status, actions);this.element.showModal();
  }
  showStorage(gameplay: GameplayServices, close: () => void): void {
    this.begin('小屋储物箱', close);
    this.heading('小屋储物箱', '随身背包与储物箱之间存取物品。');
    const columns = document.createElement('div');columns.className = 'storage-columns';
    const status = document.createElement('p');status.className = 'storage-status';status.setAttribute('role', 'status');status.setAttribute('aria-live', 'polite');
    const render = (focus?: string) => {
      columns.replaceChildren();
      for (const [title, source, target, verb] of [
        ['随身背包', gameplay.inventory, gameplay.home.chest, '存入'],
        ['储物箱', gameplay.home.chest, gameplay.inventory, '取出'],
      ] as const) {
        const section = document.createElement('section'), heading = document.createElement('h3');
        const snapshot = source.snapshot();heading.textContent = `${title} · ${snapshot.slots.filter(Boolean).length}/${source.capacity} 格`;
        section.append(heading);
        const totals = new Map<string, number>();
        for (const stack of snapshot.slots) if (stack) totals.set(stack.itemId, (totals.get(stack.itemId) ?? 0) + stack.quantity);
        if (!totals.size) { const empty = document.createElement('p');empty.className = 'storage-empty';empty.textContent = '暂时没有物品';section.append(empty); }
        for (const [itemId, quantity] of totals) {
          const row = document.createElement('div');row.className = 'storage-row';
          const name = document.createElement('p');name.textContent = `${gameplay.items.get(itemId)!.name} × ${quantity}`;row.append(name);
          const actions = document.createElement('div');actions.className = 'home-actions';
          for (const [label, amount, suffix] of [[`${verb} 1 个`, 1, 'one'], [`${verb}全部`, quantity, 'all']] as const) {
            const key = `${verb}-${itemId}-${suffix}`;
            const button = this.button(label, () => transfer(source, target, itemId, amount, verb, key));
            button.dataset.transfer = key;button.setAttribute('aria-label', `${label} ${gameplay.items.get(itemId)!.name}`);actions.append(button);
          }
          row.append(actions);section.append(row);
        }
        columns.append(section);
      }
      if (focus) (Array.from(columns.querySelectorAll<HTMLButtonElement>('button')).find(b => b.dataset.transfer === focus) ?? back).focus();
    };
    const transfer = (source: Inventory, target: Inventory, itemId: string, amount: number, verb: string, focus: string) => {
      const result = source.transferTo(target, itemId, amount);
      status.textContent = result.ok ? `已${verb} ${gameplay.items.get(itemId)!.name} × ${amount}`
        : result.reason === 'full' ? '空间不足，请先腾出空位。' : '物品数量已变化，请重试。';
      if (result.ok) render(focus);
    };
    const back = this.button('关闭储物箱', () => this.close());back.className = 'home-back';
    render();this.element.append(columns, status, back);this.element.showModal();
  }
  close(): void { if (!this.open) return;this.element.close();this.onClose(); }
}
