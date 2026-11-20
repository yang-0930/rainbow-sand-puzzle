export class Menu {
  constructor(callbacks = {}, totalLevels = 36) {
    this.root = document.getElementById('menu-screen');
    this.best = document.getElementById('menu-best');
    this.score = document.getElementById('menu-score');
    this.soundButton = document.getElementById('btn-menu-sound');
    this.totalLevels = totalLevels;

    document.getElementById('btn-start').addEventListener('click', () => callbacks.onStart?.());
    this.soundButton.addEventListener('click', () => callbacks.onToggleSound?.());
    document.getElementById('btn-reset').addEventListener('click', () => callbacks.onReset?.());
  }

  show(save) {
    this.best.textContent = String(save.highestLevel);
    this.score.textContent = String(save.totalScore);

    const values = Object.values(save.stars ?? {});
    const cleared = values.filter((value) => value >= 1).length;
    const threeStars = values.filter((value) => value >= 3).length;
    const starSum = values.reduce((sum, value) => sum + value, 0);
    const percent = Math.round((starSum / (this.totalLevels * 3)) * 100);
    document.getElementById('growth-cleared').textContent = String(cleared);
    document.getElementById('growth-three').textContent = String(threeStars);
    document.getElementById('growth-score').textContent = String(save.totalScore);
    document.getElementById('growth-pct').textContent = `${percent}%`;
    document.getElementById('growth-fill').style.width = `${percent}%`;

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
