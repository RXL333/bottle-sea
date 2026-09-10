import './styles/main.css';
import { Game } from './core/Game';

try {
  new Game(document.querySelector<HTMLElement>('#app')!);
} catch (error) {
  document.querySelector('#app')!.innerHTML = '<div class="error"><h1>暂时无法启航</h1><p>请使用支持 WebGL 2 的浏览器，并开启硬件加速后刷新。</p></div>';
  console.error(error);
}
