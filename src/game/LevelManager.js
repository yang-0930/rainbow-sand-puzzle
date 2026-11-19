import { LEVELS } from '../config/levels.js';

export class LevelManager {
  constructor(levels = LEVELS) {
    this.levels = levels;
  }

  get count() {
    return this.levels.length;
  }

  get(index) {
    return this.levels[index] ?? null;
  }

  indexOfLevel(levelId) {
    const index = this.levels.findIndex((level) => level.levelId === levelId);
    return index < 0 ? 0 : index;
  }

  nextIndex(index) {
    return Math.min(this.levels.length - 1, index + 1);
  }
}
