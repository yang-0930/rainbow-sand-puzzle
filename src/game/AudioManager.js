export class AudioManager {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
  }

  unlock() {
    if (!this.enabled) return;
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      try {
        this.context = new AudioContextClass();
      } catch {
        this.context = null;
      }
    }
    if (this.context?.state === 'suspended') {
      this.context.resume().catch(() => {});
    }
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    if (this.enabled) this.unlock();
  }

  tone(frequency, duration, { type = 'sine', gain = 0.08, slide = 0, delay = 0 } = {}) {
    if (!this.enabled || !this.context) return;
    const ctx = this.context;
    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const volume = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + slide), start + duration);
    volume.gain.setValueAtTime(0.0001, start);
    volume.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(volume);
    volume.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  click() {
    this.tone(520, 0.07, { type: 'triangle', gain: 0.05, slide: 120 });
  }

  collect() {
    this.tone(660, 0.1, { type: 'sine', gain: 0.06, slide: 180 });
  }

  clear(combo = 1) {
    const base = 520 + Math.min(combo, 5) * 55;
    this.tone(base, 0.14, { type: 'triangle', gain: 0.07, slide: 160 });
    this.tone(base * 1.5, 0.2, { type: 'sine', gain: 0.05, slide: 120, delay: 0.06 });
  }

  merge() {
    this.tone(440, 0.18, { type: 'triangle', gain: 0.06, slide: 240 });
    this.tone(660, 0.24, { type: 'sine', gain: 0.05, slide: 180, delay: 0.07 });
  }

  warn() {
    this.tone(240, 0.16, { type: 'sine', gain: 0.035, slide: -60 });
  }

  error() {
    this.tone(190, 0.16, { type: 'sawtooth', gain: 0.045, slide: -70 });
  }

  win() {
    [523, 659, 784, 1047].forEach((note, i) => {
      this.tone(note, 0.28, { type: 'sine', gain: 0.06, delay: i * 0.11 });
    });
  }

  lose() {
    [392, 330, 262].forEach((note, i) => {
      this.tone(note, 0.3, { type: 'triangle', gain: 0.055, delay: i * 0.13, slide: -30 });
    });
  }
}
