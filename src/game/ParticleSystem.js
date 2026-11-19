import { colorByIndex } from '../config/colors.js';

const MAX_PARTICLES = 180;

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  burst(x, y, colorIndex, count = 22) {
    const color = colorByIndex(colorIndex);
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.35;
      const speed = 2.4 + Math.random() * 5.2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 0,
        maxLife: 480 + Math.random() * 320,
        size: 4 + Math.random() * 8,
        color: i % 3 === 0 ? color.light : color.hex,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.2
      });
    }
  }

  sparkle(x, y, colorIndex, count = 8) {
    this.burst(x, y, colorIndex, count);
  }

  update(dtMs) {
    const dt = Math.min(dtMs, 48) / 16.67;
    this.particles = this.particles.filter((p) => {
      p.life += dtMs;
      if (p.life >= p.maxLife) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.22 * dt;
      p.vx *= 0.985;
      p.rotation += p.spin * dt;
      return true;
    });
  }

  draw(ctx) {
    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.roundRect(-p.size / 2, -p.size / 2, p.size, p.size, p.size * 0.3);
      ctx.fill();
      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
  }
}
