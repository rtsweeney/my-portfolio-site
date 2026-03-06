/**
 * Pixelated Jellyfish Aquarium
 * ─────────────────────────────
 * Vibrant, retro-pixel jellyfish that drift and pulse.
 * When the mic is active they bounce to the beat.
 */

import { sample, isEnabled } from '../js/audio.js';

// ── Pixel helpers ──────────────────────────────────────
const PX = 4;  // base pixel size (scales with canvas)

function pxRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// ── Color palettes for jellyfish ───────────────────────
const PALETTES = [
  { body: '#ff6ec7', glow: '#ff9fe2', tentacle: '#c74b9b', highlight: '#ffb8e6' },
  { body: '#7873f5', glow: '#a8a4ff', tentacle: '#5550c7', highlight: '#c8c5ff' },
  { body: '#00e5ff', glow: '#66f0ff', tentacle: '#009db3', highlight: '#b3f7ff' },
  { body: '#ff9f43', glow: '#ffbe76', tentacle: '#c76f20', highlight: '#ffd9a8' },
  { body: '#ee5a24', glow: '#f0836a', tentacle: '#b33a0a', highlight: '#f5a898' },
  { body: '#a29bfe', glow: '#c4bfff', tentacle: '#7570d4', highlight: '#dddaff' },
  { body: '#55efc4', glow: '#88f5d8', tentacle: '#2ecc9a', highlight: '#bbfae9' },
  { body: '#fd79a8', glow: '#fea5c2', tentacle: '#d35882', highlight: '#ffc9db' },
];

// ── Jellyfish class ────────────────────────────────────
class Jellyfish {
  constructor(cw, ch, px) {
    this.px = px;
    this.palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    this.baseSize = (3 + Math.random() * 4) * px;  // bell radius in pixels
    this.x = Math.random() * cw;
    this.y = Math.random() * ch;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = -0.15 - Math.random() * 0.25;  // drift upward
    this.phase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.02 + Math.random() * 0.015;
    this.tentacleCount = 3 + Math.floor(Math.random() * 3);
    this.tentacleLength = 4 + Math.floor(Math.random() * 4);
    this.beatScale = 0;
    this.opacity = 0.7 + Math.random() * 0.3;
  }

  update(cw, ch, beat) {
    this.phase += this.pulseSpeed;

    // Beat reaction
    if (beat.kick) this.beatScale = 1;
    this.beatScale *= 0.9;

    const beatBoost = isEnabled() ? beat.energy * 1.5 : 0;

    // Gentle drift
    this.x += this.vx + Math.sin(this.phase * 0.7) * 0.3;
    this.y += this.vy - beatBoost * 0.5;

    // Wrap around
    if (this.y < -this.baseSize * 6) this.y = ch + this.baseSize * 4;
    if (this.y > ch + this.baseSize * 6) this.y = -this.baseSize * 4;
    if (this.x < -this.baseSize * 4) this.x = cw + this.baseSize * 2;
    if (this.x > cw + this.baseSize * 4) this.x = -this.baseSize * 2;
  }

  draw(ctx) {
    const px = this.px;
    const pulse = Math.sin(this.phase) * 0.25 + 0.75;  // 0.5 - 1.0
    const beatPulse = 1 + this.beatScale * 0.4;
    const sz = this.baseSize * pulse * beatPulse;
    const { body, glow, tentacle, highlight } = this.palette;

    ctx.globalAlpha = this.opacity;

    // ── Glow behind ──
    ctx.globalAlpha = this.opacity * 0.15 * (1 + this.beatScale);
    const glowR = sz * 3;
    pxRect(ctx, this.x - glowR / 2, this.y - glowR / 2, glowR, glowR * 0.7, glow);
    ctx.globalAlpha = this.opacity;

    // ── Bell (dome) – built from pixel rows ──
    const bellW = Math.round(sz * 2 / px);  // width in pixel blocks
    const bellH = Math.round(sz * 1.2 / px);

    for (let row = 0; row < bellH; row++) {
      // Dome shape: wider at bottom, narrow at top
      const t = row / bellH;
      const rowW = Math.round(bellW * Math.sin(t * Math.PI * 0.9 + 0.1));
      for (let col = -rowW; col <= rowW; col++) {
        const bx = this.x + col * px - px / 2;
        const by = this.y + row * px - bellH * px / 2;
        // Highlight on top rows
        const c = (row < 2) ? highlight : (row < bellH * 0.4) ? glow : body;
        pxRect(ctx, bx, by, px, px, c);
      }
    }

    // ── Frilly edge at bottom of bell ──
    const edgeY = this.y + bellH * px / 2 - px;
    const edgeW = Math.round(bellW * 0.95);
    for (let col = -edgeW; col <= edgeW; col++) {
      if ((col + 100) % 2 === 0) {
        pxRect(ctx, this.x + col * px - px / 2, edgeY + px, px, px, glow);
      }
    }

    // ── Tentacles ──
    const tentStartY = edgeY + px * 2;
    const tentSpacing = (bellW * 2 * px) / (this.tentacleCount + 1);
    const tentStartX = this.x - bellW * px + tentSpacing;

    for (let t = 0; t < this.tentacleCount; t++) {
      let tx = tentStartX + t * tentSpacing;
      let ty = tentStartY;

      for (let seg = 0; seg < this.tentacleLength; seg++) {
        const wave = Math.sin(this.phase * 1.5 + t * 1.2 + seg * 0.8) * px * 1.5;
        tx += wave * 0.3;
        ty += px;
        const alpha = 1 - (seg / this.tentacleLength) * 0.6;
        ctx.globalAlpha = this.opacity * alpha;
        pxRect(ctx, tx, ty, px, px, tentacle);
      }
    }

    ctx.globalAlpha = 1;
  }
}

// ── Bubble particles ───────────────────────────────────
class Bubble {
  constructor(cw, ch, px) {
    this.px = px;
    this.x = Math.random() * cw;
    this.y = ch + Math.random() * 40;
    this.speed = 0.3 + Math.random() * 0.5;
    this.size = px * (1 + Math.floor(Math.random() * 2));
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.alpha = 0.15 + Math.random() * 0.2;
  }

  update(ch) {
    this.y -= this.speed;
    this.wobblePhase += 0.03;
    this.x += Math.sin(this.wobblePhase) * 0.4;
    if (this.y < -20) {
      this.y = ch + 10;
      this.x = Math.random() * 1000; // will be re-bound next frame
    }
  }

  draw(ctx) {
    ctx.globalAlpha = this.alpha;
    pxRect(ctx, this.x, this.y, this.size, this.size, '#88ccff');
    ctx.globalAlpha = 1;
  }
}

// ── Caustic light rays on the "floor" ──────────────────
function drawCaustics(ctx, cw, ch, time, px) {
  ctx.globalAlpha = 0.04;
  const count = 8;
  for (let i = 0; i < count; i++) {
    const x = (cw / count) * i + Math.sin(time * 0.3 + i) * 60;
    const w = 30 + Math.sin(time * 0.5 + i * 2) * 20;
    const h = ch * 0.4;
    const y = ch - h;
    pxRect(ctx, x, y, w, h, '#225588');
  }
  ctx.globalAlpha = 1;
}

// ── Main export: visual lifecycle ──────────────────────
export const meta = {
  id: 'jellyfish-aquarium',
  name: 'Jellyfish Aquarium',
  badge: 'Mic Reactive',
};

let jellies = [];
let bubbles = [];
let time = 0;
let px = PX;

export function init(canvas) {
  const ctx = canvas.getContext('2d');
  resize(canvas);
  return ctx;
}

export function resize(canvas) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Scale pixel size to screen
  px = Math.max(3, Math.round(Math.min(canvas.width, canvas.height) / 220));

  // Create jellyfish
  const count = Math.floor(6 + (canvas.width * canvas.height) / 300000);
  jellies = [];
  for (let i = 0; i < count; i++) {
    jellies.push(new Jellyfish(canvas.width, canvas.height, px));
  }

  // Create bubbles
  bubbles = [];
  const bubbleCount = Math.floor(count * 2.5);
  for (let i = 0; i < bubbleCount; i++) {
    bubbles.push(new Bubble(canvas.width, canvas.height, px));
  }
}

export function draw(ctx, canvas) {
  const cw = canvas.width;
  const ch = canvas.height;
  time += 0.016;

  const beat = sample();

  // ── Background gradient (deep ocean) ──
  const grad = ctx.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0, '#040418');
  grad.addColorStop(0.5, '#0a1628');
  grad.addColorStop(1, '#0d2137');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cw, ch);

  // Caustic light
  drawCaustics(ctx, cw, ch, time, px);

  // Bubbles
  for (const b of bubbles) {
    b.update(ch);
    b.draw(ctx);
  }

  // Jellyfish
  for (const j of jellies) {
    j.update(cw, ch, beat);
    j.draw(ctx);
  }
}

/** Preview: draw a single small jellyfish for the card thumbnail */
export function preview(ctx, w, h) {
  const prevPx = Math.max(2, Math.round(Math.min(w, h) / 60));
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#040418');
  grad.addColorStop(1, '#0d2137');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // A couple of static jellyfish for the thumbnail
  const thumbJellies = [
    { x: w * 0.35, y: h * 0.38, palette: PALETTES[0], size: prevPx * 4 },
    { x: w * 0.7, y: h * 0.55, palette: PALETTES[2], size: prevPx * 3 },
    { x: w * 0.2, y: h * 0.7, palette: PALETTES[1], size: prevPx * 2.5 },
  ];

  for (const tj of thumbJellies) {
    const bellW = Math.round(tj.size / prevPx);
    const bellH = Math.round(tj.size * 0.6 / prevPx);
    for (let row = 0; row < bellH; row++) {
      const t = row / bellH;
      const rowW = Math.round(bellW * Math.sin(t * Math.PI * 0.9 + 0.1));
      for (let col = -rowW; col <= rowW; col++) {
        ctx.fillStyle = row < 1 ? tj.palette.highlight : row < bellH * 0.4 ? tj.palette.glow : tj.palette.body;
        ctx.fillRect(tj.x + col * prevPx, tj.y + row * prevPx, prevPx, prevPx);
      }
    }
    // Simple tentacles
    for (let t = 0; t < 3; t++) {
      const tx = tj.x + (t - 1) * prevPx * 2;
      for (let s = 0; s < 3; s++) {
        ctx.globalAlpha = 0.7 - s * 0.2;
        ctx.fillStyle = tj.palette.tentacle;
        ctx.fillRect(tx + Math.sin(s + t) * prevPx, tj.y + bellH * prevPx + s * prevPx + prevPx, prevPx, prevPx);
      }
    }
    ctx.globalAlpha = 1;
  }

  // A few bubbles
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#88ccff';
  ctx.fillRect(w * 0.5, h * 0.2, prevPx, prevPx);
  ctx.fillRect(w * 0.8, h * 0.35, prevPx, prevPx);
  ctx.fillRect(w * 0.15, h * 0.5, prevPx, prevPx);
  ctx.globalAlpha = 1;
}
