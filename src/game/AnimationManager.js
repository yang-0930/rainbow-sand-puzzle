export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export class AnimationManager {
  constructor() {
    this.time = 0;
    this.tweens = [];
    this.flights = [];
    this.shakes = new Map();
    this.bounces = new Map();
    this.beltShift = null;
  }

  addTween({ duration = 300, easing = easeOutCubic, onUpdate, onComplete } = {}) {
    const tween = { start: this.time, duration, easing, onUpdate, onComplete };
    this.tweens.push(tween);
    return tween;
  }

  addFlight({ fromX, fromY, toX, toY, color, duration = 360, onComplete }) {
    this.flights.push({
      start: this.time,
      duration,
      fromX,
      fromY,
      toX,
      toY,
      color,
      progress: 0,
      x: fromX,
      y: fromY,
      onComplete
    });
  }

  shake(key, intensity = 9, duration = 280) {
    this.shakes.set(key, { start: this.time, duration, intensity });
  }

  bounce(key, duration = 340) {
    this.bounces.set(key, { start: this.time, duration });
  }

  shiftBelt(duration = 240) {
    this.beltShift = { start: this.time, duration, progress: 0 };
  }

  shakeOffset(key) {
    const shake = this.shakes.get(key);
    if (!shake) return 0;
    const t = Math.min(1, (this.time - shake.start) / shake.duration);
    return Math.sin(t * Math.PI * 6) * shake.intensity * (1 - t);
  }

  bounceScale(key) {
    const bounce = this.bounces.get(key);
    if (!bounce) return 1;
    const t = Math.min(1, (this.time - bounce.start) / bounce.duration);
    return 1 + Math.sin(t * Math.PI) * 0.12;
  }

  beltProgress() {
    return this.beltShift ? this.beltShift.progress : 0;
  }

  update(dtMs) {
    this.time += dtMs;

    this.tweens = this.tweens.filter((tween) => {
      const raw = Math.min(1, (this.time - tween.start) / tween.duration);
      tween.onUpdate?.(tween.easing(raw));
      if (raw >= 1) {
        tween.onComplete?.();
        return false;
      }
      return true;
    });

    this.flights = this.flights.filter((flight) => {
      const raw = Math.min(1, (this.time - flight.start) / flight.duration);
      const p = easeOutCubic(raw);
      flight.progress = p;
      flight.x = flight.fromX + (flight.toX - flight.fromX) * p;
      flight.y =
        flight.fromY +
        (flight.toY - flight.fromY) * p -
        Math.sin(raw * Math.PI) * 120;
      if (raw >= 1) {
        flight.onComplete?.();
        return false;
      }
      return true;
    });

    for (const [key, shake] of this.shakes) {
      if (this.time - shake.start >= shake.duration) this.shakes.delete(key);
    }
    for (const [key, bounce] of this.bounces) {
      if (this.time - bounce.start >= bounce.duration) this.bounces.delete(key);
    }
    if (this.beltShift) {
      const raw = Math.min(1, (this.time - this.beltShift.start) / this.beltShift.duration);
      this.beltShift.progress = easeOutCubic(raw);
      if (raw >= 1) this.beltShift = null;
    }
  }

  reset() {
    this.time = 0;
    this.tweens = [];
    this.flights = [];
    this.shakes.clear();
    this.bounces.clear();
    this.beltShift = null;
  }
}
