import type { GameplayServices } from '../gameplay/GameplayFoundation';


/** Sleep confirmation; storage uses the shared InventoryPanel. */
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
  close(): void { if (!this.open) return;this.element.close();this.onClose(); }
}
