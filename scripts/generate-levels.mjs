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
    (y > 0.35 && Math.abs(x) <= 0.55 && Math.abs(x) >= 0.26)
};

const SHAPE_NAMES = Object.keys(SHAPES);
const TIER_NAMES = ['', 'tutorial', 'practice', 'strategy', 'pressure', 'master'];
const cellColor = (value) => (value >= 10 ? value - 10 : value);

function planFor(levelId) {
  if (levelId <= 6) {
    return {
      tier: 1,
      colors: levelId <= 2 ? 2 : 3,
      cols: levelId <= 4 ? 9 : 10,
      rows: levelId <= 4 ? 7 : 8,
      slots: levelId <= 3 ? 7 : 6,
      capacity: 3,
      tickMs: 480 - (levelId - 1) * 10,
      mechanics: []
    };
  }
  if (levelId <= 12) {
    return {
      tier: 2,
      colors: 3,
      cols: levelId <= 9 ? 10 : 11,
      rows: 8,
      slots: 6,
      capacity: 3,
      tickMs: 410 - (levelId - 7) * 5,
      mechanics: ['frozen'],
      frozenRate: 0.18
    };
  }
  if (levelId <= 20) {
    return {
      tier: 3,
      colors: 4,
      cols: levelId <= 16 ? 12 : 13,
      rows: 10,
      slots: 5,
      capacity: 4,
      tickMs: 370,
      mechanics: ['holes']
    };
  }
  if (levelId <= 28) {
    const mechanics =
      levelId <= 22 ? ['blocked'] : levelId <= 24 ? ['budget'] : ['blocked', 'budget'];
    return {
      tier: 4,
      colors: 4,
      cols: 13,
      rows: 11,
      slots: 6,
      capacity: 4,
      tickMs: 340,
      mechanics,
      unlockAfter: 6 + Math.floor((levelId - 21) / 2)
    };
  }
  return {
    tier: 5,
    colors: 4,
    cols: 13,
    rows: 11,
    slots: 5,
    capacity: 4,
    tickMs: 310,
    mechanics: ['frozen', 'blocked', 'budget'],
    frozenRate: 0.2,
    unlockAfter: 10,
    hiddenGoal: levelId >= 33 ? 'noMerge' : null
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
  const frozenRate = plan.frozenRate ?? 0;
  for (let x = 0; x < cols; x += 1) {
    const nx = (x - (cols - 1) / 2) / (cols / 2);
    for (let y = rows - 1; y >= 0; y -= 1) {
      const ny = (y - (rows - 1) / 2) / (rows / 2);
      if (!shape(nx, ny)) continue;
      let color;
      if (scheme === 0) color = Math.floor((x / cols) * colors) % colors;
      else if (scheme === 1) color = Math.floor(((rows - 1 - y) / rows) * colors) % colors;
      else if (scheme === 2) color = (Math.floor(x / 2) + Math.floor(y / 2)) % colors;
      else if (scheme === 3) color = Math.floor((Math.hypot(nx, ny) / 1.1) * colors) % colors;
      else color = blockColor(Math.floor(x / 2), Math.floor(y / 2));
      columns[x].push(rng() < frozenRate ? 10 + color : color);
    }
  }
  return columns;
}

function makeLevel(levelId) {
  const plan = planFor(levelId);
  const colors = Array.from({ length: plan.colors }, (_, index) => index);
  const shapeName = SHAPE_NAMES[(levelId - 1) % SHAPE_NAMES.length];

  for (let attempt = 0; attempt < 220; attempt += 1) {
    const rng = mulberry32(levelId * 100003 + attempt * 4177 + 29);
    const scheme = (levelId + attempt * 2) % 5;
    const columns = buildColumns(shapeName, plan, plan.colors, scheme, rng);
    const sandCount = columns.reduce((sum, column) => sum + column.length, 0);
    const bottomColors = new Set(
      columns.filter((column) => column.length).map((column) => cellColor(column[0]))
    );
    const usedColors = new Set(columns.flat().map(cellColor));
    if (
      sandCount < (plan.tier === 1 ? 14 : plan.tier === 2 ? 26 : plan.tier === 3 ? 32 : plan.tier === 4 ? 40 : 36) ||
      (bottomColors.size < 2 && attempt < 120) ||
      (usedColors.size < plan.colors && attempt < 150)
    ) continue;

    const blockedSlots = plan.mechanics.includes('blocked')
      ? [{ index: (levelId - 1) % plan.slots, unlockAfter: plan.unlockAfter }]
      : [];
    const bucketBudget =
      plan.mechanics.includes('budget')
        ? Math.ceil(sandCount / plan.capacity) + (plan.tier === 5 ? 5 : 7)
        : undefined;

    const level = {
      levelId,
      name: `第 ${levelId} 关`,
      difficulty: TIER_NAMES[plan.tier],
      tier: plan.tier,
      mechanics: plan.mechanics,
      colors,
      shape: shapeName,
      columns,
      cols: plan.cols,
      rows: plan.rows,
      conveyorSlots: plan.slots,
      smallCapacity: plan.capacity,
      tickMs: plan.tickMs,
      blockedSlots,
      bucketBudget,
      hiddenGoal: plan.hiddenGoal ?? null,
      scoreThresholds: [0, 0, 0]
    };

    const solution = solveLevel(level, { maxNodes: 50000 });
    if (!solution.solvable) continue;

    const expectedScore =
      sandCount * 10 +
      Math.ceil(sandCount / plan.capacity) * 50 +
      100 +
      Math.min(6, Math.floor(sandCount / (plan.capacity * 4))) * 20;
    level.scoreThresholds = [
      0,
      Math.round((expectedScore * 0.76) / 10) * 10,
      Math.round((expectedScore * 0.92) / 10) * 10
    ];
    return level;
  }

  const columns = Array.from({ length: plan.cols }, (_, x) =>
    Array.from({ length: plan.rows }, (_, y) => (x + y) % plan.colors)
  );
  const sandCount = columns.reduce((sum, column) => sum + column.length, 0);
  return {
    levelId,
    name: `第 ${levelId} 关`,
    difficulty: TIER_NAMES[plan.tier],
    tier: plan.tier,
    mechanics: [],
    colors,
    shape: 'fallback',
    columns,
    cols: plan.cols,
    rows: plan.rows,
    conveyorSlots: plan.slots,
    smallCapacity: plan.capacity,
    tickMs: plan.tickMs,
    blockedSlots: [],
    bucketBudget: undefined,
    hiddenGoal: null,
    scoreThresholds: [0, expectedScore(sandCount) * 0.76, expectedScore(sandCount) * 0.92].map(
      (v, i) => (i === 0 ? 0 : Math.round(v / 10) * 10)
    )
  };
}

function expectedScore(sandCount) {
  return sandCount * 10 + Math.ceil(sandCount / 3) * 50 + 100;
}

const levels = Array.from({ length: 36 }, (_, index) => makeLevel(index + 1));
const body = levels.map((level) => JSON.stringify(level)).join(',\n  ');
writeFileSync(outFile, `// 由 scripts/generate-levels.mjs 生成，请勿手工编辑。\nexport const LEVELS = [\n  ${body}\n];\n`, 'utf8');

for (const level of levels) {
  if (!solveLevel(level).solvable) throw new Error(`关卡 ${level.levelId} 无解`);
}
console.log(`已生成并验证 ${levels.length} 个分层沙画关卡 -> ${outFile}`);
