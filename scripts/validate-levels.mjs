import { LEVELS } from '../src/config/levels.js';
import { solveLevel } from '../src/game/solver.js';
import { GameLogic } from '../src/game/GameLogic.js';

let failures = 0;

for (const level of LEVELS) {
  const solution = solveLevel(level);
  if (!solution.solvable) {
    console.error(`关卡 ${level.levelId}: 无解`);
    failures += 1;
    continue;
  }

  const state = GameLogic.createLevelState(level);
  for (const color of solution.path) {
    if (state.status !== 'playing') break;
    GameLogic.placeBucket(state, color);
    let guard = 0;
    while (state.status === 'playing' && guard++ < 300) {
      const before = GameLogic.stateKey(state);
      GameLogic.tick(state);
      if (GameLogic.stateKey(state) === before) break;
    }
  }

  const valid =
    state.status === 'won' &&
    GameLogic.totalSand(state) === 0 &&
    state.slots.every((slot) => slot === null) &&
    state.score > 0;

  if (!valid) {
    failures += 1;
    console.error(`关卡 ${level.levelId}: 模拟失败`, {
      status: state.status,
      sand: GameLogic.totalSand(state),
      slots: state.slots,
      score: state.score
    });
  } else {
    console.log(
      `关卡 ${String(level.levelId).padStart(2, '0')} 通过 | ${level.shape} | ${level.colors.length} 色 | ${level.conveyorSlots} 槽 | 沙量 ${level.columns.reduce((sum, c) => sum + c.length, 0)} | 步数 ${solution.path.length} | 合成 ${state.merges} | 得分 ${state.score}`
    );
  }
}

if (failures > 0) {
  console.error(`关卡验证失败：${failures} 个`);
  process.exit(1);
}
console.log(`全部 ${LEVELS.length} 个沙画关卡均已通过自动模拟验证。`);
