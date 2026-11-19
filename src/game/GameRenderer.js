import { colorByIndex } from '../config/colors.js';
import { SETTINGS } from '../config/settings.js';

if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    this.closePath();
    return this;
  };
}

const VIRTUAL_WIDTH = 720;
const VIRTUAL_HEIGHT = 1280;

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export class GameRenderer {
  constructor(canvas, animation, particles) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animation = animation;
    this.particles = particles;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.fallProgress = 1;
    this.slotRects = [];
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.scale = Math.min(width / VIRTUAL_WIDTH, height / VIRTUAL_HEIGHT);
    this.offsetX = (width - VIRTUAL_WIDTH * this.scale) / 2;
    this.offsetY = (height - VIRTUAL_HEIGHT * this.scale) / 2;
  }

  toLogical(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) * (this.canvas.width / rect.width) - this.offsetX) / this.scale,
      y: ((clientY - rect.top) * (this.canvas.height / rect.height) - this.offsetY) / this.scale
    };
  }

  computeSlotRects(state) {
    const slots = state?.slots?.length ?? 5;
    const width = SETTINGS.conveyor.bucketWidth;
    const gap = Math.max(10, Math.min(16, (680 - slots * width) / (slots - 1 || 1)));
    const total = slots * width + (slots - 1) * gap;
    const startX = (VIRTUAL_WIDTH - total) / 2;
    this.slotRects = Array.from({ length: slots }, (_, i) => ({
      x: startX + i * (width + gap),
      y: SETTINGS.conveyor.y,
      width,
      height: SETTINGS.conveyor.bucketHeight,
      centerX: startX + i * (width + gap) + width / 2,
      centerY: SETTINGS.conveyor.y + SETTINGS.conveyor.bucketHeight / 2
    }));
    return this.slotRects;
  }

  render(state) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);

    this.drawBackground(ctx);
    if (!state) {
      this.drawSandPreview(ctx);
      this.drawConveyor(ctx, null);
      return;
    }
    this.drawBoard(ctx, state);
    this.drawConveyor(ctx, state);
    this.drawFlights(ctx);
    this.particles.draw(ctx);
    this.drawGround(ctx);
  }

  drawBackground(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, VIRTUAL_HEIGHT);
    sky.addColorStop(0, '#8fd8ff');
    sky.addColorStop(0.48, '#d8f3ff');
    sky.addColorStop(0.72, '#fff3d6');
    sky.addColorStop(1, '#ffd9a8');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    const t = this.animation.time / 1000;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.beginPath();
    ctx.arc(608, 128, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,246,190,0.9)';
    ctx.beginPath();
    ctx.arc(608, 128, 38, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 4; i += 1) {
      const x = ((i * 230 + t * 11) % 900) - 90;
      const y = 90 + i * 62;
      ctx.globalAlpha = 0.62;
      ctx.beginPath();
      ctx.arc(x, y, 34, 0, Math.PI * 2);
      ctx.arc(x + 38, y - 10, 42, 0, Math.PI * 2);
      ctx.arc(x + 82, y + 4, 30, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawSandPreview(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    const colors = [0, 1, 2, 3];
    for (let c = 0; c < 9; c += 1) {
      for (let r = 0; r < 5; r += 1) {
        this.drawSandCell(ctx, 360 + (c - 4) * 48, 600 - (r + 1) * 48, 44, colors[(c + r) % 4], 1);
      }
    }
    ctx.restore();
  }

  drawSandCell(ctx, cx, y, size, colorIndex, alpha = 1) {
    const color = colorByIndex(colorIndex);
    ctx.save();
    ctx.globalAlpha = alpha;
    roundedRect(ctx, cx - size / 2, y, size, size, 9);
    const gradient = ctx.createLinearGradient(cx - size / 2, y, cx + size / 2, y + size);
    gradient.addColorStop(0, color.light);
    gradient.addColorStop(1, color.hex);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    roundedRect(ctx, cx - size / 2 + 5, y + 5, size - 10, 6, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(cx - 10 + i * 10, y + size - 10, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBoard(ctx, state) {
    const cell = SETTINGS.board.cellSize;
    const bottomY = SETTINGS.board.bottomY;
    const cols = state.columns.length;
    const startX = SETTINGS.board.originX - (cols * cell) / 2;
    const progress = this.fallProgress;

    ctx.save();
    roundedRect(ctx, startX - 26, bottomY - state.level.rows * cell - 26, cols * cell + 52, state.level.rows * cell + 62, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.34)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 3;
    ctx.stroke();

    state.columns.forEach((column, c) => {
      const shift = state.lastShift[c] ?? 0;
      column.forEach((color, i) => {
        const y = bottomY - (i + 1 + shift * (1 - progress)) * cell;
        this.drawSandCell(ctx, startX + c * cell + cell / 2, y, cell - 3, color);
      });
    });
    ctx.restore();
  }

  drawConveyor(ctx, state) {
    const slots = state?.slots?.length ?? 5;
    const rects = this.computeSlotRects(state);
    const beltTop = SETTINGS.conveyor.y - 26;
    const beltHeight = SETTINGS.conveyor.bucketHeight + 52;

    ctx.save();
    roundedRect(ctx, 24, beltTop, VIRTUAL_WIDTH - 48, beltHeight, 42);
    const belt = ctx.createLinearGradient(0, beltTop, 0, beltTop + beltHeight);
    belt.addColorStop(0, '#7a6bb8');
    belt.addColorStop(1, '#4b3f86');
    ctx.fillStyle = belt;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.34)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffffff';
    const offset = (this.animation.time / 34) % 42;
    for (let x = -80 + offset; x < VIRTUAL_WIDTH + 80; x += 42) {
      ctx.save();
      ctx.translate(x, 0);
      ctx.rotate(-0.2);
      ctx.fillRect(0, beltTop - 60, 14, beltHeight + 120);
      ctx.restore();
    }
    ctx.restore();

    rects.forEach((rect, index) => {
      ctx.save();
      roundedRect(ctx, rect.x + 4, rect.y + 8, rect.width - 8, rect.height - 8, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fill();
      ctx.setLineDash([8, 7]);
      ctx.strokeStyle = 'rgba(255,255,255,0.42)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      const bucket = state?.slots[index];
      if (bucket) {
        this.drawBucket(
          ctx,
          rect.centerX,
          rect.centerY,
          bucket,
          state,
          this.animation.bounceScale(`slot-${index}`)
        );
      }
    });
  }

  drawBucket(ctx, cx, cy, bucket, state, scale = 1) {
    const color = colorByIndex(bucket.color);
    const big = bucket.size === 'big';
    const w = big ? 92 : 68;
    const h = big ? 122 : 100;
    const x = cx - w / 2;
    const y = cy - h / 2;
    const shake = this.animation.shakeOffset(`slot-${state.slots.indexOf(bucket)}`);

    ctx.save();
    ctx.translate(cx + shake, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.34)';
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 12);
    ctx.lineTo(x + w - 6, y + 12);
    ctx.lineTo(x + w - 16, y + h - 6);
    ctx.lineTo(x + 16, y + h - 6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 14);
    ctx.lineTo(x + w - 8, y + 14);
    ctx.lineTo(x + w - 18, y + h - 8);
    ctx.lineTo(x + 18, y + h - 8);
    ctx.closePath();
    ctx.clip();
    const ratio = Math.min(1, bucket.count / bucket.capacity);
    if (ratio > 0) {
      const fillHeight = (h - 26) * ratio;
      const fillY = y + h - 10 - fillHeight;
      const sand = ctx.createLinearGradient(0, fillY, 0, y + h);
      sand.addColorStop(0, color.light);
      sand.addColorStop(1, color.hex);
      ctx.fillStyle = sand;
      ctx.fillRect(x, fillY, w, fillHeight);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.moveTo(x, fillY + 2);
      for (let px = x; px <= x + w; px += 10) {
        ctx.lineTo(px, fillY + 2 + Math.sin((px + this.animation.time / 120) * 0.15) * 3);
      }
      ctx.lineTo(x + w, fillY + 10);
      ctx.lineTo(x, fillY + 10);
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 14);
    ctx.lineTo(x + w - 8, y + 14);
    ctx.lineTo(x + w - 18, y + h - 8);
    ctx.lineTo(x + 18, y + h - 8);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = color.hex;
    ctx.beginPath();
    ctx.ellipse(cx, y + 14, w / 2 - 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, y + 11, w / 2 - 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.font = `800 ${big ? 26 : 22}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 5;
    ctx.fillText(`${bucket.count}/${bucket.capacity}`, cx, y + h - 20);
    ctx.shadowBlur = 0;

    if (big) {
      ctx.fillStyle = '#ffe28a';
      ctx.font = '800 19px system-ui, sans-serif';
      ctx.fillText('大桶', cx, y + 48);
    }
    ctx.restore();
  }

  drawFlights(ctx) {
    for (const flight of this.animation.flights) {
      const fakeState = { slots: [null] };
      this.drawBucket(ctx, flight.x, flight.y, {
        color: flight.color,
        count: 0,
        capacity: 3,
        size: flight.size ?? 'small'
      }, fakeState, 0.85);
    }
  }

  drawGround(ctx) {
    ctx.save();
    const sand = ctx.createLinearGradient(0, 970, 0, VIRTUAL_HEIGHT);
    sand.addColorStop(0, 'rgba(255,222,160,0)');
    sand.addColorStop(0.35, 'rgba(255,214,139,0.75)');
    sand.addColorStop(1, '#f4bf73');
    ctx.fillStyle = sand;
    ctx.beginPath();
    ctx.moveTo(0, 1020);
    ctx.quadraticCurveTo(180, 980, 360, 1016);
    ctx.quadraticCurveTo(540, 1052, 720, 1004);
    ctx.lineTo(720, VIRTUAL_HEIGHT);
    ctx.lineTo(0, VIRTUAL_HEIGHT);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
