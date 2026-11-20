import { colorByIndex } from '../config/colors.js';

export class ResultModal {
  constructor(callbacks = {}) {
    this.root = document.getElementById('result-screen');
    this.title = document.getElementById('result-title');
    this.stars = document.getElementById('result-stars');
    this.detail = document.getElementById('result-detail');
    this.efficiency = document.getElementById('result-efficiency');
    this.conflict = document.getElementById('result-conflict');
    this.hiddenBadge = document.getElementById('result-hidden');
    this.nextButton = document.getElementById('btn-next');

    this.nextButton.addEventListener('click', () => callbacks.onNext?.());
    document.getElementById('btn-retry').addEventListener('click', () => callbacks.onRetry?.());
    document.getElementById('btn-result-menu').addEventListener('click', () => callbacks.onMenu?.());
  }

  showWin({ score, stars, levelId, isLastLevel, efficiency = 0, bestDelta = 0, hiddenBadge = false }) {
    this.title.textContent = '恭喜通关！';
    this.stars.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    this.detail.textContent = `第 ${levelId} 关 · 本关得分 ${score}`;
    this.efficiency.textContent =
      `收集效率 ${efficiency} 沙/桶` + (bestDelta > 0 ? ` · 比最佳 +${bestDelta}` : bestDelta < 0 ? ` · 历史最佳 ${efficiency - bestDelta}` : ' · 新纪录');
    this.conflict.textContent = '';
    this.hiddenBadge.classList.toggle('hidden', !hiddenBadge);
    this.nextButton.textContent = isLastLevel ? '全部通关' : '下一关';
    this.nextButton.disabled = isLastLevel;
    this.root.classList.remove('hidden');
  }

  showLose({ levelId, score, reason, conflict = [] }) {
    const reasonText =
      reason === 'deadlock'
        ? '传送带已满且没有可吸的沙'
        : reason === 'budget-exhausted'
          ? '沙桶预算已用尽'
          : '沙画已无法继续';
    this.title.textContent = '挑战失败';
    this.stars.textContent = '☆☆☆';
    this.detail.textContent = `第 ${levelId} 关 · ${reasonText} · 得分 ${score}`;
    this.efficiency.textContent = '';
    const names = conflict.map((color) => colorByIndex(color).name);
    this.conflict.textContent = names.length ? `冲突颜色：${names.join(' / ')}` : '';
    this.hiddenBadge.classList.add('hidden');
    this.nextButton.textContent = '下一关';
    this.nextButton.disabled = true;
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
  }
}
