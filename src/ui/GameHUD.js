import { colorByIndex } from '../config/colors.js';

export class GameHUD {
  constructor(callbacks = {}) {
    this.root = document.getElementById('hud');
    this.level = document.getElementById('hud-level');
    this.score = document.getElementById('hud-score');
    this.soundButton = document.getElementById('btn-sound');
    this.toastElement = document.getElementById('toast');
    this.tray = document.getElementById('bucket-tray');
    this.toastTimer = 0;
    this.choiceButtons = new Map();

    document.getElementById('btn-pause').addEventListener('click', () => callbacks.onPause?.());
    document.getElementById('btn-restart').addEventListener('click', () => callbacks.onRestart?.());
    this.soundButton.addEventListener('click', () => callbacks.onToggleSound?.());
  }

  show() {
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
    this.toastElement.classList.remove('show');
  }

  setColors(colors, onSelect) {
    this.tray.replaceChildren();
    this.choiceButtons.clear();
    colors.forEach((color, index) => {
      const button = document.createElement('button');
      button.className = 'bucket-choice';
      button.style.setProperty('--c', colorByIndex(color).hex);
      button.style.setProperty('--dark', colorByIndex(color).dark);
      button.innerHTML = `<i></i><span>${index + 1}</span>`;
      button.setAttribute('aria-label', `${colorByIndex(color).name}沙桶`);
      button.addEventListener('click', () => onSelect(color));
      this.tray.appendChild(button);
      this.choiceButtons.set(color, button);
    });
  }

  update(state) {
    if (!state) return;
    this.level.textContent = String(state.level.levelId);
    this.score.textContent = String(state.score);
    const exposed = new Set(state.columns.filter((column) => column.length).map((column) => column[0]));
    for (const [color, button] of this.choiceButtons) {
      button.classList.toggle('active', exposed.has(color));
      button.disabled = state.status !== 'playing';
    }
  }

  setSound(enabled) {
    this.soundButton.textContent = enabled ? '♪' : '♪̸';
    this.soundButton.classList.toggle('muted', !enabled);
  }

  toast(message, duration = 900) {
    window.clearTimeout(this.toastTimer);
    this.toastElement.textContent = message;
    this.toastElement.classList.add('show');
    this.toastTimer = window.setTimeout(() => {
      this.toastElement.classList.remove('show');
    }, duration);
  }

  trayButtonCenter(color) {
    const button = this.choiceButtons.get(color);
    if (!button) return { x: 360, y: 1150 };
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }
}
