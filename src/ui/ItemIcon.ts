import type { ItemDefinition } from '../gameplay/ItemRegistry';
export function itemIcon(item:ItemDefinition){
  const image=document.createElement('img');image.className='item-icon';image.src=`${import.meta.env.BASE_URL}icons/items/${encodeURIComponent(item.icon)}.svg`;
  image.alt='';image.width=64;image.height=64;image.draggable=false;return image;
}
