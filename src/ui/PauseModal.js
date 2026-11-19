export class PauseModal {
  constructor(callbacks = {}) {
    this.root = document.getElementById('pause-screen');
    this.soundButton = document.getElementById('btn-pause-sound');

    document.getElementById('btn-resume').addEventListener('click', () => callbacks.onResume?.());
    document.getElementById('btn-pause-restart').addEventListener('click', () => callbacks.onRestart?.());
    document.getElementById('btn-pause-menu').addEventListener('click', () => callbacks.onMenu?.());
    this.soundButton.addEventListener('click', () => callbacks.onToggleSound?.());
  }

  show(soundEnabled) {
    this.setSound(soundEnabled);
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
  }

  setSound(enabled) {
    this.soundButton.textContent = `音效：${enabled ? '开' : '关'}`;
  }
}
