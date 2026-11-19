export class ResultModal {
  constructor(callbacks = {}) {
    this.root = document.getElementById('result-screen');
    this.title = document.getElementById('result-title');
    this.stars = document.getElementById('result-stars');
    this.detail = document.getElementById('result-detail');
    this.nextButton = document.getElementById('btn-next');

    this.nextButton.addEventListener('click', () => callbacks.onNext?.());
    document.getElementById('btn-retry').addEventListener('click', () => callbacks.onRetry?.());
    document.getElementById('btn-result-menu').addEventListener('click', () => callbacks.onMenu?.());
  }

  showWin({ score, stars, levelId, isLastLevel }) {
    this.title.textContent = '恭喜通关！';
    this.stars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    this.detail.textContent = `第 ${levelId} 关 · 本关得分 ${score}`;
    this.nextButton.textContent = isLastLevel ? '全部通关' : '下一关';
    this.nextButton.disabled = isLastLevel;
    this.root.classList.remove('hidden');
  }

  showLose({ levelId, score, reason }) {
    const reasonText = reason === 'deadlock' ? '传送带已满且没有可吸的沙' : '沙画已无法继续';
    this.title.textContent = '挑战失败';
    this.stars.textContent = '☆☆☆';
    this.detail.textContent = `第 ${levelId} 关 · ${reasonText} · 得分 ${score}`;
    this.nextButton.textContent = '下一关';
    this.nextButton.disabled = true;
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
  }
}
