import './styles/main.css';
import { Game } from './game/Game.js';
import { PlatformAdapter } from './platform/PlatformAdapter.js';

const preventZoom = (event) => event.preventDefault();
document.addEventListener('dblclick', preventZoom, { passive: false });
document.addEventListener('gesturestart', preventZoom, { passive: false });
document.addEventListener('gesturechange', preventZoom, { passive: false });
let lastTouchEnd = 0;
document.addEventListener(
  'touchend',
  (event) => {
    if (event.target instanceof Element && event.target.closest('button')) return;
    const now = Date.now();
    if (now - lastTouchEnd <= 350) event.preventDefault();
    lastTouchEnd = now;
  },
  { passive: false }
);

const platform = new PlatformAdapter();
platform.init();

const game = new Game();
platform.on((type) => {
  if (type === 'pause') game.pause();
  if (type === 'resume') game.resume();
});

if (import.meta.env?.DEV) {
  window.__rainbowBucket = { game, platform };
}
