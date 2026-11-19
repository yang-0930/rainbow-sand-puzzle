import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/config/levels.js';
import { GameLogic } from '../src/game/GameLogic.js';
import { SaveManager } from '../src/game/SaveManager.js';
import { solveLevel } from '../src/game/solver.js';

function makeLevel(overrides = {}) {
  return {
    levelId: 99,
    colors: [0, 1],
    shape: 'test',
    columns: [[0, 1], [1, 0], [0], [1]],
    cols: 4,
    rows: 3,
    conveyorSlots: 3,
    smallCapacity: 2,
    tickMs: 100,
    scoreThresholds: [0, 100, 200],
    ...overrides
  };
}

function settle(state) {
  let guard = 0;
  while (state.status === 'playing' && guard++ < 200) {
    const before = GameLogic.stateKey(state);
    GameLogic.tick(state);
    if (GameLogic.stateKey(state) === before) break;
  }
}

test('沙桶按空槽顺序放置，非法颜色与满传送带被拒绝', () => {
  const state = GameLogic.createLevelState(makeLevel());
  assert.equal(GameLogic.placeBucket(state, 0).slot, 0);
  assert.equal(GameLogic.placeBucket(state, 1).slot, 1);
  assert.equal(GameLogic.placeBucket(state, 2).reason, 'unavailable');
  assert.equal(GameLogic.placeBucket(state, 0).slot, 2);
  assert.equal(GameLogic.placeBucket(state, 0).reason, 'full');
});

test('自动吸沙只取同色底沙，并触发重力下移', () => {
  const state = GameLogic.createLevelState(makeLevel({ columns: [[0, 1], [1]] }));
  GameLogic.placeBucket(state, 0);
  const result = GameLogic.tick(state);
  assert.equal(result.events[0].type, 'absorb');
  assert.deepEqual(state.columns[0], [1]);
  assert.equal(state.lastShift[0], 1);
  assert.equal(state.score, 10);
  const before = state.score;
  GameLogic.tick(state);
  assert.equal(state.score, before);
});

test('桶吸满后自动消失并计分', () => {
  const state = GameLogic.createLevelState(makeLevel({ columns: [[0, 0, 0]] }));
  GameLogic.placeBucket(state, 0);
  GameLogic.tick(state);
  GameLogic.tick(state);
  assert.equal(state.slots[0], null);
  assert.equal(state.clearedBuckets, 1);
  assert.equal(state.score, 70);
});

test('三个相邻同色小桶合成容量更大的桶', () => {
  const state = GameLogic.createLevelState(makeLevel({ columns: [[0, 0], [0], [1]] }));
  GameLogic.placeBucket(state, 0);
  GameLogic.placeBucket(state, 0);
  const result = GameLogic.placeBucket(state, 0);
  assert.equal(result.merged, true);
  assert.equal(state.merges, 1);
  assert.equal(state.slots[0], null);
  assert.equal(state.slots[2], null);
  assert.equal(state.slots[1].size, 'big');
  assert.equal(state.slots[1].capacity, 6);
  assert.equal(state.score, 80);
});

test('传送带被无效桶占满且无同色底沙时失败', () => {
  const state = GameLogic.createLevelState(makeLevel({ columns: [[2]] }));
  GameLogic.placeBucket(state, 1);
  GameLogic.placeBucket(state, 1);
  GameLogic.placeBucket(state, 0);
  assert.equal(state.status, 'lost');
  assert.equal(state.reason, 'deadlock');
});

test('沙画清空后剩余桶自动结算且不重复计分', () => {
  const state = GameLogic.createLevelState(makeLevel({ columns: [[0]] }));
  GameLogic.placeBucket(state, 0);
  GameLogic.tick(state);
  assert.equal(state.status, 'won');
  const score = state.score;
  assert.equal(GameLogic.placeBucket(state, 0).type, 'ignored');
  assert.equal(GameLogic.tick(state).type, 'ignored');
  assert.equal(state.score, score);
  assert.equal(score, 170);
});

test('星级按关卡阈值判定', () => {
  const level = makeLevel();
  assert.equal(GameLogic.starsForScore(level, 0), 1);
  assert.equal(GameLogic.starsForScore(level, 100), 2);
  assert.equal(GameLogic.starsForScore(level, 200), 3);
});

test('存档可处理损坏数据、版本升级并正确记录通关', () => {
  const map = new Map();
  const storage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value)
  };
  map.set('rainbow-bucket.save.v1', '{bad json');
  const save = new SaveManager(storage, 30);
  assert.equal(save.data.unlockedLevel, 1);

  save.recordWin(3, 2, 500);
  assert.equal(save.data.unlockedLevel, 4);
  assert.equal(save.data.stars[3], 2);
  assert.equal(save.data.totalScore, 500);
  save.recordWin(3, 1, 100);
  assert.equal(save.data.stars[3], 2);

  const reloaded = new SaveManager(storage, 30);
  assert.equal(reloaded.data.unlockedLevel, 4);
  assert.equal(reloaded.data.stars[3], 2);

  map.set('rainbow-bucket.save.v1', JSON.stringify({ version: 0, unlockedLevel: 20 }));
  assert.equal(new SaveManager(storage, 30).data.unlockedLevel, 1);
});

test('全部 30 个沙画关卡可解且可用真实逻辑通关', () => {
  for (const level of LEVELS) {
    const solution = solveLevel(level);
    assert.equal(solution.solvable, true, `关卡 ${level.levelId} 无解`);
    const state = GameLogic.createLevelState(level);
    for (const color of solution.path) {
      if (state.status !== 'playing') break;
      GameLogic.placeBucket(state, color);
      settle(state);
    }
    assert.equal(state.status, 'won', `关卡 ${level.levelId} 无法通关`);
  }
});
