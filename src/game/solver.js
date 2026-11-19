import { GameLogic } from './GameLogic.js';

/**
 * 沙画关卡求解器：每一步选择一个颜色放置沙桶，随后自动吸沙直到稳定。
 * 返回一组可通关的放置序列，作为关卡可解性的证据。
 */
export function solveLevel(level, { maxNodes = 40000, maxActions = 160 } = {}) {
  let nodes = 0;
  const seen = new Set();

  function settle(state) {
    let guard = 0;
    while (state.status === 'playing' && guard < 300) {
      const before = GameLogic.stateKey(state);
      GameLogic.tick(state);
      if (GameLogic.stateKey(state) === before) break;
      guard += 1;
    }
  }

  function search(state, path) {
    if (state.status === 'won') return path;
    if (state.status !== 'playing' || path.length >= maxActions) return null;
    if (++nodes > maxNodes) return null;

    const key = GameLogic.stateKey(state);
    if (seen.has(key)) return null;
    seen.add(key);

    const exposed = new Set(GameLogic.exposedColors(state));
    const colors = level.colors.slice().sort((a, b) => {
      const aScore = exposed.has(a) ? 1 : 0;
      const bScore = exposed.has(b) ? 1 : 0;
      return bScore - aScore;
    });

    for (const color of colors) {
      const next = GameLogic.cloneState(state);
      const result = GameLogic.placeBucket(next, color);
      if (result.type !== 'place') continue;

      settle(next);
      const nextPath = path.concat(color);
      if (next.status === 'won') return nextPath;
      if (next.status !== 'playing') continue;

      const found = search(next, nextPath);
      if (found) return found;
    }
    return null;
  }

  const path = search(GameLogic.createLevelState(level), []);
  return { solvable: Boolean(path), path, nodes };
}
