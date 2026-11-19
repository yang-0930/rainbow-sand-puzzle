import { SETTINGS } from '../config/settings.js';
import { AnimationManager } from './AnimationManager.js';
import { AudioManager } from './AudioManager.js';
import { GameLogic } from './GameLogic.js';
import { GameRenderer } from './GameRenderer.js';
import { LevelManager } from './LevelManager.js';
import { ParticleSystem } from './ParticleSystem.js';
import { SaveManager } from './SaveManager.js';
import { Menu } from '../ui/Menu.js';
import { GameHUD } from '../ui/GameHUD.js';
import { PauseModal } from '../ui/PauseModal.js';
import { ResultModal } from '../ui/ResultModal.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.levelManager = new LevelManager();
    this.save = new SaveManager(null, this.levelManager.count);
    this.animation = new AnimationManager();
    this.particles = new ParticleSystem();
    this.renderer = new GameRenderer(this.canvas, this.animation, this.particles);
    this.audio = new AudioManager(this.save.data.sound);

    this.state = null;
    this.levelIndex = 0;
    this.resultShown = false;
    this.resultTimer = 0;
    this.lastTime = performance.now();

    this.menu = new Menu({
      onStart: () => {
        this.audio.unlock();
        this.audio.click();
        this.startLevel(this.save.data.unlockedLevel - 1);
      },
      onToggleSound: () => this.toggleSound(),
      onReset: () => {
        if (window.confirm('确定要清空全部关卡进度吗？')) {
          this.save.reset();
          this.menu.show(this.save.data);
        }
      }
    });
    this.hud = new GameHUD({
      onPause: () => this.pause(),
      onRestart: () => this.restart(),
      onToggleSound: () => this.toggleSound()
    });
    this.pauseModal = new PauseModal({
      onResume: () => this.resume(),
      onRestart: () => this.restart(),
      onMenu: () => this.showMenu(),
      onToggleSound: () => this.toggleSound()
    });
    this.resultModal = new ResultModal({
      onNext: () => this.startLevel(this.levelManager.nextIndex(this.levelIndex)),
      onRetry: () => this.restart(),
      onMenu: () => this.showMenu()
    });

    this.bindEvents();
    this.showMenu();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.renderer.resize());
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (this.state?.status === 'playing') this.pause();
        else if (this.state?.status === 'paused') this.resume();
        return;
      }
      if (/^[1-9]$/.test(event.key) && this.state?.status === 'playing') {
        const color = this.state.level.colors[Number(event.key) - 1];
        if (color !== undefined) this.place(color);
      }
      if (event.key === 'Enter' && !this.state) {
        this.audio.unlock();
        this.startLevel(this.save.data.unlockedLevel - 1);
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state?.status === 'playing') this.pause();
    });
  }

  startLevel(index) {
    window.clearTimeout(this.resultTimer);
    const safeIndex = Math.min(this.levelManager.count - 1, Math.max(0, index));
    this.levelIndex = safeIndex;
    const level = this.levelManager.get(safeIndex);
    this.state = GameLogic.createLevelState(level);
    this.animation.reset();
    this.particles.clear();
    this.renderer.fallProgress = 1;
    this.renderer.computeSlotRects(this.state);
    this.resultShown = false;

    this.menu.hide();
    this.pauseModal.hide();
    this.resultModal.hide();
    this.hud.show();
    this.hud.setColors(level.colors, (color) => this.place(color));
    this.hud.update(this.state);
    this.audio.unlock();
    this.hud.toast(`${level.name} · 清空沙画`, 1000);
  }

  restart() {
    this.startLevel(this.levelIndex);
  }

  showMenu() {
    window.clearTimeout(this.resultTimer);
    this.state = null;
    this.resultShown = false;
    this.animation.reset();
    this.particles.clear();
    this.hud.hide();
    this.pauseModal.hide();
    this.resultModal.hide();
    this.menu.show(this.save.data);
  }

  pause() {
    if (!this.state || this.state.status !== 'playing') return;
    this.state.status = 'paused';
    this.pauseModal.show(this.save.data.sound);
  }

  resume() {
    if (!this.state || this.state.status !== 'paused') return;
    this.state.status = 'playing';
    this.pauseModal.hide();
  }

  toggleSound() {
    const enabled = !this.save.data.sound;
    this.save.setSound(enabled);
    this.audio.setEnabled(enabled);
    this.menu.setSound(enabled);
    this.hud.setSound(enabled);
    this.pauseModal.setSound(enabled);
    if (enabled) this.audio.click();
  }

  place(color) {
    const result = GameLogic.placeBucket(this.state, color);
    if (result.type === 'ignored') return;
    if (result.type === 'invalid') {
      this.audio.error();
      this.hud.toast(result.reason === 'full' ? '传送带已满，等桶吸满沙' : '该颜色不在本关');
      return;
    }

    this.audio.click();
    const rect = this.renderer.computeSlotRects(this.state)[result.slot];
    const origin = this.hud.trayButtonCenter(color);
    const from = this.renderer.toLogical(origin.x, origin.y);
    this.animation.addFlight({
      fromX: from.x,
      fromY: from.y,
      toX: rect.centerX,
      toY: rect.centerY,
      color,
      duration: SETTINGS.conveyor.placeMs
    });

    for (const event of result.events ?? []) this.handleEvent(event);
    this.hud.update(this.state);
  }

  sandCellCenter(columnIndex) {
    const cell = SETTINGS.board.cellSize;
    const startX = SETTINGS.board.originX - (this.state.columns.length * cell) / 2;
    return {
      x: startX + columnIndex * cell + cell / 2,
      y: SETTINGS.board.bottomY - cell / 2
    };
  }

  doTick() {
    const result = GameLogic.tick(this.state);
    if (result.type !== 'tick') return;

    const absorbed = result.events.filter((event) => event.type === 'absorb');
    if (absorbed.length) {
      this.renderer.fallProgress = 0;
      this.animation.addTween({
        duration: SETTINGS.board.fallMs,
        onUpdate: (value) => {
          this.renderer.fallProgress = value;
        },
        onComplete: () => {
          this.renderer.fallProgress = 1;
        }
      });
      for (const event of absorbed) {
        const point = this.sandCellCenter(event.column);
        this.particles.sparkle(point.x, point.y, event.color, 6);
      }
      this.audio.collect();
    }

    for (const event of result.events) this.handleEvent(event);
    this.hud.update(this.state);
  }

  handleEvent(event) {
    if (event.type === 'bucketFull' || event.type === 'finalClear') {
      const rect = this.renderer.computeSlotRects(this.state)[event.slot];
      if (rect) {
        this.animation.bounce(`slot-${event.slot}`);
        this.particles.burst(rect.centerX, rect.centerY, event.color, 22);
      }
      this.audio.clear();
    }
    if (event.type === 'merge') {
      const rect = this.renderer.computeSlotRects(this.state)[event.slot];
      this.animation.bounce(`slot-${event.slot}`);
      this.particles.burst(rect.centerX, rect.centerY, event.color, 30);
      this.audio.merge();
      this.hud.toast('三个小桶合成大桶！', 1100);
    }
    if (event.type === 'win' || event.type === 'lose') this.finish(event);
  }

  finish(event) {
    if (this.resultShown) return;
    this.resultShown = true;
    const level = this.state.level;
    const score = this.state.score;

    if (event.type === 'win') {
      const stars = GameLogic.starsForScore(level, score);
      this.save.recordWin(level.levelId, stars, score);
      this.audio.win();
      this.particles.burst(360, 420, 1, 44);
      this.resultTimer = window.setTimeout(() => {
        this.hud.hide();
        this.resultModal.showWin({
          score,
          stars,
          levelId: level.levelId,
          isLastLevel: this.levelIndex >= this.levelManager.count - 1
        });
      }, 820);
    } else {
      this.audio.lose();
      this.resultTimer = window.setTimeout(() => {
        this.hud.hide();
        this.resultModal.showLose({
          levelId: level.levelId,
          score,
          reason: event.reason
        });
      }, 620);
    }
  }

  loop(timestamp) {
    const dt = Math.min(50, Math.max(0, timestamp - this.lastTime));
    this.lastTime = timestamp;

    if (this.state?.status === 'paused') {
      this.renderer.render(this.state);
      requestAnimationFrame(this.loop);
      return;
    }

    this.animation.update(dt);
    this.particles.update(dt);

    if (this.state?.status === 'playing') {
      this.state.tickAccumulator = (this.state.tickAccumulator ?? 0) + dt;
      let guard = 0;
      while (
        this.state.status === 'playing' &&
        this.state.tickAccumulator >= this.state.level.tickMs &&
        guard++ < 4
      ) {
        this.state.tickAccumulator -= this.state.level.tickMs;
        this.doTick();
      }
    }

    this.renderer.render(this.state);
    requestAnimationFrame(this.loop);
  }
}
