import { SETTINGS } from '../config/settings.js';

export const FROZEN_OFFSET = 10;

export const cellColor = (value) => (value >= FROZEN_OFFSET ? value - FROZEN_OFFSET : value);
export const isFrozen = (value) => value >= FROZEN_OFFSET;

export function createLevelState(level) {
  return {
    level,
    columns: level.columns.map((column) => column.slice()),
    slots: new Array(level.conveyorSlots).fill(null),
    blocked: new Set((level.blockedSlots ?? []).map((item) => item.index)),
    score: 0,
    placed: 0,
    absorbed: 0,
    absorbedTotal: 0,
    clearedBuckets: 0,
    merges: 0,
    hiddenCompleted: false,
    status: 'playing',
    reason: null,
    lastShift: new Array(level.columns.length).fill(0)
  };
}

export function totalSand(state) {
  return state.columns.reduce((sum, column) => sum + column.length, 0);
}

export function exposedColors(state) {
  const set = new Set();
  for (const column of state.columns) {
    if (column.length) set.add(cellColor(column[0]));
  }
  return [...set].sort();
}

export function canAbsorbAny(state) {
  const exposed = exposedColors(state);
  return state.slots.some(
    (bucket) =>
      bucket &&
      bucket.count < bucket.capacity &&
      exposed.includes(bucket.color)
  );
}

export function isDanger(state) {
  if (!state || state.status !== 'playing') return false;
  const free = state.slots.filter((bucket, index) => !bucket && !state.blocked.has(index)).length;
  return free <= 1 && !canAbsorbAny(state);
}

export function findFirstEmptySlot(state) {
  return state.slots.findIndex((bucket, index) => bucket === null && !state.blocked.has(index));
}

export function cloneState(state) {
  return {
    ...state,
    columns: state.columns.map((column) => column.slice()),
    slots: state.slots.map((bucket) => (bucket ? { ...bucket } : null)),
    blocked: new Set(state.blocked),
    lastShift: state.lastShift.slice()
  };
}

export function stateKey(state) {
  const board = state.columns.map((column) => column.join('')).join('|');
  const slots = state.slots
    .map((bucket) => (bucket ? `${bucket.color}${bucket.count}${bucket.size === 'big' ? 'B' : 's'}` : '.'))
    .join(',');
  return `${board}#${slots}#${[...state.blocked].sort().join('')}`;
}

function resolveMerges(state, events) {
  let merged = false;
  let index = 0;
  while (index <= state.slots.length - 3) {
    const a = state.slots[index];
    const b = state.slots[index + 1];
    const c = state.slots[index + 2];
    if (
      a && b && c &&
      a.size === 'small' && b.size === 'small' && c.size === 'small' &&
      a.color === b.color && b.color === c.color
    ) {
      state.slots[index] = null;
      state.slots[index + 2] = null;
      state.slots[index + 1] = {
        color: a.color,
        count: a.count + b.count + c.count,
        capacity: a.capacity * 3,
        size: 'big'
      };
      state.merges += 1;
      state.score += SETTINGS.score.mergeBonus;
      events.push({ type: 'merge', slot: index + 1, color: a.color });
      merged = true;
      index = 0;
    } else {
      index += 1;
    }
  }
  return merged;
}

function checkEnd(state, events) {
  if (state.status !== 'playing') return;

  if (totalSand(state) === 0) {
    state.slots.forEach((bucket, slot) => {
      if (!bucket) return;
      state.score +=
        (bucket.capacity - bucket.count) * SETTINGS.score.perSand + SETTINGS.score.perBucket;
      events.push({ type: 'finalClear', slot, color: bucket.color });
      state.slots[slot] = null;
    });
    state.status = 'won';
    state.score += SETTINGS.score.levelBonus;
    state.hiddenCompleted = state.level.hiddenGoal === 'noMerge' && state.merges === 0;
    events.push({ type: 'win' });
    return;
  }

  if (canAbsorbAny(state)) return;

  const free = state.slots.findIndex((bucket, index) => bucket === null && !state.blocked.has(index));
  if (free >= 0) {
    const budget = state.level.bucketBudget;
    if (budget !== undefined && state.placed >= budget) {
      state.status = 'lost';
      state.reason = 'budget-exhausted';
      events.push({ type: 'lose', reason: 'budget-exhausted' });
    }
    return;
  }

  state.status = 'lost';
  state.reason = 'deadlock';
  events.push({ type: 'lose', reason: 'deadlock' });
}

export function placeBucket(state, color) {
  if (state.status !== 'playing') return { type: 'ignored' };
  if (!state.level.colors.includes(color)) return { type: 'invalid', reason: 'unavailable' };
  if (state.level.bucketBudget !== undefined && state.placed >= state.level.bucketBudget) {
    return { type: 'invalid', reason: 'budget' };
  }

  const slot = findFirstEmptySlot(state);
  if (slot < 0) return { type: 'invalid', reason: 'full' };

  const events = [];
  state.slots[slot] = {
    color,
    count: 0,
    capacity: state.level.smallCapacity ?? SETTINGS.levels.defaultCapacity,
    size: 'small'
  };
  state.placed += 1;
  events.push({ type: 'place', slot, color });
  const merged = resolveMerges(state, events);
  checkEnd(state, events);
  return { type: 'place', slot, color, merged, events };
}

export function tick(state) {
  if (state.status !== 'playing') return { type: 'ignored' };

  const events = [];
  const shifts = new Array(state.columns.length).fill(0);

  state.slots.forEach((bucket, slot) => {
    if (!bucket || bucket.count >= bucket.capacity) return;

    let bestColumn = -1;
    let bestScore = -Infinity;
    state.columns.forEach((column, columnIndex) => {
      if (!column.length || cellColor(column[0]) !== bucket.color) return;
      let run = 0;
      while (run < column.length && cellColor(column[run]) === bucket.color) run += 1;
      const distance = Math.abs(
        (columnIndex + 0.5) / state.columns.length - (slot + 0.5) / state.slots.length
      );
      const score = run * 10 - distance;
      if (score > bestScore) {
        bestScore = score;
        bestColumn = columnIndex;
      }
    });

    if (bestColumn < 0) return;

    const frozen = isFrozen(state.columns[bestColumn][0]);
    if (frozen) {
      state.columns[bestColumn][0] = bucket.color;
    } else {
      state.columns[bestColumn].shift();
      shifts[bestColumn] += 1;
    }
    bucket.count += 1;
    state.absorbed += 1;
    state.absorbedTotal += 1;
    state.score += SETTINGS.score.perSand;
    events.push({ type: 'absorb', slot, column: bestColumn, color: bucket.color, frozen });

    if (bucket.count >= bucket.capacity) {
      state.slots[slot] = null;
      state.clearedBuckets += 1;
      state.score += SETTINGS.score.perBucket;
      events.push({ type: 'bucketFull', slot, color: bucket.color });
    }
  });

  for (const item of state.level.blockedSlots ?? []) {
    if (state.blocked.has(item.index) && state.absorbedTotal >= item.unlockAfter) {
      state.blocked.delete(item.index);
      events.push({ type: 'unlock', slot: item.index });
    }
  }

  state.lastShift = shifts;
  resolveMerges(state, events);
  checkEnd(state, events);
  return { type: 'tick', events };
}

export function starsForScore(level, score) {
  const [one, two, three] = level.scoreThresholds;
  if (score >= three) return 3;
  if (score >= two) return 2;
  if (score >= one) return 1;
  return 0;
}

export const GameLogic = {
  cellColor,
  isFrozen,
  createLevelState,
  totalSand,
  exposedColors,
  canAbsorbAny,
  isDanger,
  findFirstEmptySlot,
  cloneState,
  stateKey,
  placeBucket,
  tick,
  starsForScore
};
