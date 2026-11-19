import './styles/main.css';
import { Game } from './game/Game.js';
import { PlatformAdapter } from './platform/PlatformAdapter.js';

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
