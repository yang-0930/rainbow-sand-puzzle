import { SETTINGS } from '../config/settings.js';

function defaultSave() {
  return {
    version: SETTINGS.saveVersion,
    unlockedLevel: 1,
    highestLevel: 1,
    totalScore: 0,
    stars: {},
    sound: SETTINGS.audio.defaultEnabled
  };
}

function safeInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

export class SaveManager {
  constructor(storage = null, levelCount = 30) {
    this.storage = storage ?? (typeof localStorage === 'undefined' ? null : localStorage);
    this.levelCount = levelCount;
    this.data = this.load();
  }

  load() {
    const fallback = defaultSave();
    if (!this.storage) return fallback;
    try {
      const raw = this.storage.getItem(SETTINGS.saveKey);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || parsed.version !== SETTINGS.saveVersion) {
        return fallback;
      }
      const stars = {};
      if (parsed.stars && typeof parsed.stars === 'object') {
        for (const [key, value] of Object.entries(parsed.stars)) {
          const levelId = safeInteger(key, 0, 1, this.levelCount);
          if (levelId > 0) stars[levelId] = safeInteger(value, 0, 0, 3);
        }
      }
      return {
        version: SETTINGS.saveVersion,
        unlockedLevel: safeInteger(parsed.unlockedLevel, 1, 1, this.levelCount),
        highestLevel: safeInteger(parsed.highestLevel, 1, 1, this.levelCount),
        totalScore: safeInteger(parsed.totalScore, 0, 0, Number.MAX_SAFE_INTEGER),
        stars,
        sound: parsed.sound !== false
      };
    } catch {
      return fallback;
    }
  }

  persist() {
    if (!this.storage) return;
    try {
      this.storage.setItem(SETTINGS.saveKey, JSON.stringify(this.data));
    } catch {
      /* 隐私模式或存储配额不足时静默降级为内存存档 */
    }
  }

  recordWin(levelId, stars, score) {
    const previous = this.data.stars[levelId] ?? 0;
    this.data.stars[levelId] = Math.max(previous, Math.max(0, Math.min(3, stars)));
    this.data.unlockedLevel = Math.min(this.levelCount, Math.max(this.data.unlockedLevel, levelId + 1));
    this.data.highestLevel = Math.min(this.levelCount, Math.max(this.data.highestLevel, levelId));
    this.data.totalScore += Math.max(0, Math.floor(score));
    this.persist();
  }

  setSound(enabled) {
    this.data.sound = Boolean(enabled);
    this.persist();
  }

  reset() {
    this.data = defaultSave();
    this.persist();
  }
}
