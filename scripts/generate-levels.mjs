import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { solveLevel } from '../src/game/solver.js';

const here = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(here, '../src/config/levels.js');

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SHAPES = {
  heart: (x, y) => {
    const a = x * x + y * y - 0.55;
    return a * a * a - x * x * y * y * y <= 0;
  },
  circle: (x, y) => x * x + y * y <= 0.95,
  diamond: (x, y) => Math.abs(x) + Math.abs(y) <= 1.05,
  star: (x, y) => {
    const r = Math.hypot(x, y);
    const a = Math.atan2(y, x);
    return r <= 0.52 + 0.32 * Math.cos(5 * a) || (y > 0.62 && Math.abs(x) < 0.5);
  },
  flower: (x, y) => {
    const r = Math.hypot(x, y);
    const a = Math.atan2(y, x);
    return r <= 0.48 + 0.3 * Math.cos(6 * a);
  },
  tree: (x, y) =>
    (y < 0.15 && Math.abs(x) <= 0.85 + y * 0.7) ||
    (y >= 0.15 && Math.abs(x) <= 0.16),
  rainbow: (x, y) => {
    const r = Math.hypot(x, y * 1.15);
    return r >= 0.5 && r <= 1.0 && y <= 0.15;
  },
  wave: (x, y) => y >= -0.15 + 0.32 * Math.sin(x * 3.6) && y <= 0.8,
  cloud: (x, y) =>
    Math.hypot(x + 0.5, y + 0.12) < 0.45 ||
    Math.hypot(x, y + 0.34) < 0.58 ||
    Math.hypot(x - 0.5, y + 0.12) < 0.45,
  moon: (x, y) => Math.hypot(x, y) <= 0.95 && Math.hypot(x - 0.38, y + 0.18) > 0.78,
  house: (x, y) =>
    (Math.abs(x) <= 0.68 && y >= -0.15 && y <= 0.9) ||
    (y < -0.15 && Math.abs(x) <= (0.85 + y) * 1.15),
  cat: (x, y) =>
    Math.hypot(x, y + 0.08) <= 0.82 ||
    (y < -0.35 && Math.abs(x) > 0.3 && Math.abs(x) < 0.78 && y > -0.95),
  fish: (x, y) =>
    (x / 0.9) ** 2 + ((y + 0.05) / 0.58) ** 2 <= 1 ||
    (x < -0.7 && x > -1.05 && Math.abs(y + 0.05) < (-x - 0.55) * 0.6),
  butterfly: (x, y) =>
    Math.hypot((x - 0.46) / 0.55, (y + 0.12) / 0.5) <= 1 ||
    Math.hypot((x + 0.46) / 0.55, (y + 0.12) / 0.5) <= 1,
  rocket: (x, y) =>
    (Math.abs(x) <= 0.26 && y >= -0.95 && y <= 0.55) ||
    (y > 0.3 && y <= 0.9 && Math.abs(x) <= (0.9 - y) * 0.55) ||
    (y > 0.35 && (Math.abs(x) <= 0.55 && Math.abs(x) >= 0.26))
};

const SHAPE_NAMES = Object.keys(SHAPES);

function planFor(levelId) {
  if (levelId <= 5) {
    return { colors: 2, cols: 9, rows: 7, slots: 5, capacity: 3, tickMs: 420, difficulty: 'easy' };
  }
  if (levelId <= 10) {
    return { colors: 3, cols: 10, rows: 8, slots: 5, capacity: 3, tickMs: 390, difficulty: 'normal' };
  }
  if (levelId <= 20) {
    return {
      colors: levelId <= 14 ? 3 : 4,
      cols: 11,
      rows: 9,
      slots: 6,
      capacity: levelId >= 17 ? 4 : 3,
      tickMs: 360,
      difficulty: 'hard'
    };
  }
  return {
    colors: 4,
    cols: 12,
    rows: 10,
    slots: levelId >= 27 ? 7 : 6,
    capacity: 4,
    tickMs: 330,
    difficulty: 'expert'
  };
}

function buildColumns(shapeName, plan, colors, scheme, rng) {
  const { cols, rows } = plan;
  const columns = Array.from({ length: cols }, () => []);
  const blocks = new Map();
  const blockColor = (bx, by) => {
    const key = `${bx},${by}`;
    if (!blocks.has(key)) blocks.set(key, Math.floor(rng() * colors));
    return blocks.get(key);
  };

  const shape = SHAPES[shapeName];
  for (let x = 0; x < cols; x += 1) {
    const nx = (x - (cols - 1) / 2) / (cols / 2);
    for (let y = rows - 1; y >= 0; y -= 1) {
      const ny = (y - (rows - 1) / 2) / (rows / 2);
      if (!shape(nx, ny)) continue;
      let color;
      if (scheme === 0) color = Math.floor((x / cols) * colors) % colors;
      else if (scheme === 1) color = Math.floor(((rows - 1 - y) / rows) * colors) % colors;
      else if (scheme === 2) color = (Math.floor(x / 2) + Math.floor(y / 2)) % colors;
      else if (scheme === 3) {
        color = Math.floor((Math.hypot(nx, ny) / 1.1) * colors) % colors;
      } else color = blockColor(Math.floor(x / 2), Math.floor(y / 2));
      columns[x].push(color);
    }
  }
  return columns;
}

function makeLevel(levelId) {
  const plan = planFor(levelId);
  const colors = Array.from({ length: plan.colors }, (_, index) => index);
  const shapeName = SHAPE_NAMES[(levelId - 1) % SHAPE_NAMES.length];

  for (let attempt = 0; attempt < 160; attempt += 1) {
    const rng = mulberry32(levelId * 100003 + attempt * 4177 + 29);
    const scheme = (levelId + attempt * 2) % 5;
    const columns = buildColumns(shapeName, plan, plan.colors, scheme, rng);
    const sandCount = columns.reduce((sum, column) => sum + column.length, 0);
    const bottomColors = new Set(columns.filter((column) => column.length).map((column) => column[0]));
    const usedColors = new Set(columns.flat());
    if (
      sandCount < (levelId <= 5 ? 14 : levelId <= 10 ? 18 : 24) ||
      (bottomColors.size < 2 && attempt < 100) ||
      (usedColors.size < plan.colors && attempt < 120)
    ) continue;

    const level = {
      levelId,
      name: `第 ${levelId} 关`,
      difficulty: plan.difficulty,
      colors,
      shape: shapeName,
      columns,
      cols: plan.cols,
      rows: plan.rows,
      conveyorSlots: plan.slots,
      smallCapacity: plan.capacity,
      tickMs: plan.tickMs,
      scoreThresholds: [0, 0, 0]
    };

    const solution = solveLevel(level, { maxNodes: 25000 });
    if (!solution.solvable) continue;

    const expectedScore =
      sandCount * 10 +
      Math.ceil(sandCount / plan.capacity) * 50 +
      100 +
      Math.min(4, Math.floor(sandCount / (plan.capacity * 4))) * 20;
    level.scoreThresholds = [
      0,
      Math.round((expectedScore * 0.78) / 10) * 10,
      Math.round((expectedScore * 0.94) / 10) * 10
    ];
    return level;
  }

  // 兜底：规则化棋盘（每列同色分段），必然可解。
  const columns = Array.from({ length: plan.cols }, (_, x) =>
    Array.from({ length: plan.rows }, (_, y) => (x + y) % plan.colors)
  );
  const sandCount = columns.reduce((sum, column) => sum + column.length, 0);
  const expectedScore =
    sandCount * 10 +
    Math.ceil(sandCount / plan.capacity) * 50 +
    100 +
    Math.min(4, Math.floor(sandCount / (plan.capacity * 4))) * 20;
  return {
    levelId,
    name: `第 ${levelId} 关`,
    difficulty: plan.difficulty,
    colors,
    shape: 'fallback',
    columns,
    cols: plan.cols,
    rows: plan.rows,
    conveyorSlots: plan.slots,
    smallCapacity: plan.capacity,
    tickMs: plan.tickMs,
    scoreThresholds: [
      0,
      Math.round((expectedScore * 0.78) / 10) * 10,
      Math.round((expectedScore * 0.94) / 10) * 10
    ]
  };
}

const levels = Array.from({ length: 30 }, (_, index) => makeLevel(index + 1));
const body = levels.map((level) => JSON.stringify(level)).join(',\n  ');
writeFileSync(outFile, `// 由 scripts/generate-levels.mjs 生成，请勿手工编辑。\nexport const LEVELS = [\n  ${body}\n];\n`, 'utf8');

for (const level of levels) {
  if (!solveLevel(level).solvable) throw new Error(`关卡 ${level.levelId} 无解`);
}
console.log(`已生成并验证 ${levels.length} 个沙画关卡 -> ${outFile}`);
