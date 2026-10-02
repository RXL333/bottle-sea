/** Shared presentation only. Gameplay, inventories and panel lifecycle stay with their owners. */
export function panelHeader(title: string, caption: string, onClose: () => void): HTMLElement {
  const header=document.createElement('header');header.className='ui-panel-header';
  const heading=document.createElement('div');
  const eyebrow=document.createElement('small');eyebrow.className='ui-eyebrow';eyebrow.textContent=caption;
  const name=document.createElement('h2');name.textContent=title;heading.append(eyebrow,name);
  const close=document.createElement('button');close.type='button';close.className='ui-close';close.textContent='关闭 ×';
  close.setAttribute('aria-label',`关闭${title}`);close.addEventListener('click',onClose);
  header.append(heading,close);return header;
}

/** Accessible progress meter; no progression state is stored here. */
export function progressMeter(value: number, total: number, label: string): HTMLElement {
  const meter=document.createElement('div');meter.className='ui-progress';meter.setAttribute('role','progressbar');
  meter.setAttribute('aria-label',label);meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax',String(total));
  meter.setAttribute('aria-valuenow',String(value));
  const fill=document.createElement('span');fill.style.width=`${total>0?Math.min(100,Math.max(0,value/total*100)):0}%`;meter.append(fill);return meter;
}
