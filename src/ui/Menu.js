export class Menu {
  constructor(callbacks = {}) {
    this.root = document.getElementById('menu-screen');
    this.best = document.getElementById('menu-best');
    this.score = document.getElementById('menu-score');
    this.soundButton = document.getElementById('btn-menu-sound');

    document.getElementById('btn-start').addEventListener('click', () => callbacks.onStart?.());
    this.soundButton.addEventListener('click', () => callbacks.onToggleSound?.());
    document.getElementById('btn-reset').addEventListener('click', () => callbacks.onReset?.());
  }

  show(save) {
    this.best.textContent = String(save.highestLevel);
    this.score.textContent = String(save.totalScore);
    this.setSound(save.sound);
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
  }

  setSound(enabled) {
    this.soundButton.textContent = `音效：${enabled ? '开' : '关'}`;
  }
}
