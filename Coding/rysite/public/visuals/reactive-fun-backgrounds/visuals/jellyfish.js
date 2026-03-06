/**
 * Pixelated Jellyfish Aquarium
 * ─────────────────────────────
 * Vibrant, retro-pixel jellyfish that drift and pulse.
 * Mic active → jellyfish pulse speed and drift speed track the average BPM.
 * Kelp sways along the seafloor. Pixel fish swim through mid-water.
 */

import { sample, isEnabled, getBPM } from '../js/audio.js';

// ── Pixel helpers ──────────────────────────────────────
const PX = 4;  // base pixel size (scales with canvas)

function pxRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// ── Jellyfish palettes ─────────────────────────────────
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

// ── Fish palettes ──────────────────────────────────────
const FISH_COLORS = [
  { body: '#ff7c35', fin: '#c44a10' },   // clownfish orange
  { body: '#ffe135', fin: '#c8a000' },   // canary yellow
  { body: '#00b4d8', fin: '#0077a8' },   // blue
  { body: '#ff69b4', fin: '#cc2277' },   // pink
  { body: '#7ee840', fin: '#52a820' },   // lime green
  { body: '#ff4e50', fin: '#bb2020' },   // red
  { body: '#40e0d0', fin: '#20a090' },   // turquoise
  { body: '#ffaa00', fin: '#c87000' },   // amber
];

// ── Kelp colors ────────────────────────────────────────
const KELP_COLORS = ['#1a6e38', '#237a42', '#2c8b50', '#1e5c30', '#34995c'];

// ── Jellyfish ──────────────────────────────────────────
class Jellyfish {
  constructor(cw, ch, px) {
    this.px = px;
    this.palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    this.baseSize = (3 + Math.random() * 4) * px;
    this.x = Math.random() * cw;
    this.y = Math.random() * ch;
    this.baseVx = (Math.random() - 0.5) * 0.3;
    this.baseVy = -0.15 - Math.random() * 0.25;  // drift upward
    this.phase = Math.random() * Math.PI * 2;
    this.basePulseSpeed = 0.022 + Math.random() * 0.014;
    this.pulseSpeed = this.basePulseSpeed;
    this.tentacleCount = 3 + Math.floor(Math.random() * 3);
    this.tentacleLength = 4 + Math.floor(Math.random() * 4);
    this.beatScale = 0;
    this.opacity = 0.7 + Math.random() * 0.3;
  }

  update(cw, ch, beat) {
    // Smooth pulse speed toward BPM target when mic is active
    const bpm = getBPM();
    if (isEnabled() && bpm > 40) {
      // 1 full pulse cycle = 2π. Target: sync to beat rate.
      // bpm beats/min → bpm/60 beats/sec → bpm/60 * 2π / 60fps = bpm * π / 1800
      const targetSpeed = bpm * Math.PI / 1800;
      this.pulseSpeed += (targetSpeed - this.pulseSpeed) * 0.02;
    } else {
      this.pulseSpeed += (this.basePulseSpeed - this.pulseSpeed) * 0.02;
    }

    this.phase += this.pulseSpeed;

    // Beat reaction
    if (beat.kick) this.beatScale = 1;
    this.beatScale *= 0.9;

    const beatBoost = isEnabled() ? beat.energy * 1.5 : 0;

    // BPM-driven drift speed: faster music → livelier jellyfish
    const bpmFactor = (isEnabled() && bpm > 40) ? Math.sqrt(bpm / 80) : 1;

    this.x += (this.baseVx + Math.sin(this.phase * 0.7) * 0.3) * bpmFactor;
    this.y += (this.baseVy - beatBoost * 0.5) * bpmFactor;

    // Wrap around
    if (this.y < -this.baseSize * 6) this.y = ch + this.baseSize * 4;
    if (this.y > ch + this.baseSize * 6) this.y = -this.baseSize * 4;
    if (this.x < -this.baseSize * 4) this.x = cw + this.baseSize * 2;
    if (this.x > cw + this.baseSize * 4) this.x = -this.baseSize * 2;
  }

  draw(ctx) {
    const px = this.px;
    const pulse = Math.sin(this.phase) * 0.25 + 0.75;
    const beatPulse = 1 + this.beatScale * 0.4;
    const sz = this.baseSize * pulse * beatPulse;
    const { body, glow, tentacle, highlight } = this.palette;

    ctx.globalAlpha = this.opacity;

    // Glow
    ctx.globalAlpha = this.opacity * 0.18 * (1 + this.beatScale);
    const glowR = sz * 3;
    pxRect(ctx, this.x - glowR / 2, this.y - glowR / 2, glowR, glowR * 0.7, glow);
    ctx.globalAlpha = this.opacity;

    // Bell
    const bellW = Math.round(sz * 2 / px);
    const bellH = Math.round(sz * 1.2 / px);
    for (let row = 0; row < bellH; row++) {
      const t = row / bellH;
      const rowW = Math.round(bellW * Math.sin(t * Math.PI * 0.9 + 0.1));
      for (let col = -rowW; col <= rowW; col++) {
        const bx = this.x + col * px - px / 2;
        const by = this.y + row * px - bellH * px / 2;
        const c = (row < 2) ? highlight : (row < bellH * 0.4) ? glow : body;
        pxRect(ctx, bx, by, px, px, c);
      }
    }

    // Frilly edge
    const edgeY = this.y + bellH * px / 2 - px;
    const edgeW = Math.round(bellW * 0.95);
    for (let col = -edgeW; col <= edgeW; col++) {
      if ((col + 100) % 2 === 0) {
        pxRect(ctx, this.x + col * px - px / 2, edgeY + px, px, px, glow);
      }
    }

    // Tentacles
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

// ── Fish ───────────────────────────────────────────────
class Fish {
  constructor(cw, ch, px) {
    this.px = px;
    this.dir = Math.random() > 0.5 ? 1 : -1;
    this.x = this.dir > 0 ? -80 : cw + 80;
    this.y = ch * (0.15 + Math.random() * 0.60);
    this.baseSpeed = 0.7 + Math.random() * 1.2;
    this.scale = 1 + Math.floor(Math.random() * 2);  // 1x or 2x
    this.colorIdx = Math.floor(Math.random() * FISH_COLORS.length);
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.cw = cw;
    this.ch = ch;
  }

  update(cw, ch, bpmFactor) {
    this.wobblePhase += 0.065;
    this.x += this.dir * this.baseSpeed * bpmFactor;
    this.y += Math.sin(this.wobblePhase * 0.5) * 0.25;
    this.cw = cw;
    this.ch = ch;

    if (this.dir > 0 && this.x > cw + 120) {
      this.x = -80;
      this.y = ch * (0.15 + Math.random() * 0.60);
    } else if (this.dir < 0 && this.x < -120) {
      this.x = cw + 80;
      this.y = ch * (0.15 + Math.random() * 0.60);
    }
  }

  draw(ctx) {
    const { px, x, y, dir, scale } = this;
    const s = px * scale;
    const { body, fin } = FISH_COLORS[this.colorIdx];
    // tail wag: ±1.2 pixels at scale
    const wag = Math.sin(this.wobblePhase * 1.5) * 1.2;

    ctx.globalAlpha = 0.88;

    // Helper: place a pixel block at (col, row) offsets from center, facing right.
    // dir flips the x axis for left-swimming fish.
    const B = (col, row, color) => {
      pxRect(ctx, x + col * s * dir - s / 2, y + row * s - s / 2, s, s, color);
    };

    // Body — diamond/oval shape
    B(0, -2, body);
    B(-1, -1, body); B(0, -1, body); B(1, -1, body);
    B(-2, 0, body);  B(-1, 0, body); B(0, 0, body);  B(1, 0, body); B(2, 0, body);
    B(-1, 1, body);  B(0, 1, body);  B(1, 1, body);
    B(0, 2, body);

    // Tail (V-shape, wags)
    B(-3 + wag,  -1, fin);
    B(-3,         0, fin);
    B(-3 - wag,   1, fin);
    B(-3 + wag * 0.5, -2, fin);
    B(-3 - wag * 0.5,  2, fin);

    // Dorsal fin
    B(0, -3, fin);
    B(1, -3, fin);

    // Eye (solid dark, no globalAlpha adjustment)
    ctx.globalAlpha = 1;
    pxRect(ctx, x + 2 * s * dir - s * 0.35, y - s * 0.35, Math.round(s * 0.55), Math.round(s * 0.55), '#0a0a18');

    ctx.globalAlpha = 1;
  }
}

// ── Kelp ───────────────────────────────────────────────
class Kelp {
  constructor(cw, ch, px) {
    this.px = px;
    this.x = 40 + Math.random() * (cw - 80);
    this.baseY = ch;
    this.height = 10 + Math.floor(Math.random() * 14);  // segments
    this.phase = Math.random() * Math.PI * 2;
    this.swaySpeed = 0.008 + Math.random() * 0.007;
    this.color = KELP_COLORS[Math.floor(Math.random() * KELP_COLORS.length)];
    this.width = 1 + Math.floor(Math.random() * 2);     // 1 or 2 px wide
  }

  update() {
    this.phase += this.swaySpeed;
  }

  draw(ctx) {
    const { px, x, baseY, height, phase, color, width } = this;
    ctx.globalAlpha = 0.72;
    for (let seg = 0; seg < height; seg++) {
      const t = seg / height;  // 0 = bottom, 1 = top
      const sway = Math.sin(phase + t * 2.8) * px * 2.8 * t;
      const by = baseY - seg * px * 1.7;
      pxRect(ctx, x + sway - (px * width) / 2, by, px * width, px * 1.7, color);
    }
    ctx.globalAlpha = 1;
  }
}

// ── Bubbles ────────────────────────────────────────────
class Bubble {
  constructor(cw, ch, px) {
    this.px = px;
    this.x = Math.random() * cw;
    this.y = ch + Math.random() * 40;
    this.speed = 0.3 + Math.random() * 0.5;
    this.size = px * (1 + Math.floor(Math.random() * 2));
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.alpha = 0.18 + Math.random() * 0.2;
  }

  update(ch) {
    this.y -= this.speed;
    this.wobblePhase += 0.03;
    this.x += Math.sin(this.wobblePhase) * 0.4;
    if (this.y < -20) {
      this.y = ch + 10;
      this.x = Math.random() * 1000;
    }
  }

  draw(ctx) {
    ctx.globalAlpha = this.alpha;
    pxRect(ctx, this.x, this.y, this.size, this.size, '#cceeff');
    ctx.globalAlpha = 1;
  }
}

// ── Caustics ───────────────────────────────────────────
function drawCaustics(ctx, cw, ch, time, px) {
  ctx.globalAlpha = 0.06;
  const count = 8;
  for (let i = 0; i < count; i++) {
    const x = (cw / count) * i + Math.sin(time * 0.3 + i) * 60;
    const w = 30 + Math.sin(time * 0.5 + i * 2) * 20;
    const h = ch * 0.4;
    const y = ch - h;
    pxRect(ctx, x, y, w, h, '#60c0f0');
  }
  ctx.globalAlpha = 1;
}

// ── Sand floor ─────────────────────────────────────────
function drawFloor(ctx, cw, ch, px) {
  ctx.globalAlpha = 0.35;
  pxRect(ctx, 0, ch - px * 3, cw, px * 3, '#c8a84a');
  ctx.globalAlpha = 0.2;
  pxRect(ctx, 0, ch - px * 2, cw, px * 2, '#e0c06a');
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
let kelps = [];
let fish = [];
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

  px = Math.max(3, Math.round(Math.min(canvas.width, canvas.height) / 220));

  const jellyCount = Math.floor(6 + (canvas.width * canvas.height) / 300000);

  jellies = [];
  for (let i = 0; i < jellyCount; i++) {
    jellies.push(new Jellyfish(canvas.width, canvas.height, px));
  }

  bubbles = [];
  const bubbleCount = Math.floor(jellyCount * 2.5);
  for (let i = 0; i < bubbleCount; i++) {
    bubbles.push(new Bubble(canvas.width, canvas.height, px));
  }

  kelps = [];
  const kelpCount = Math.floor(5 + canvas.width / 160);
  for (let i = 0; i < kelpCount; i++) {
    kelps.push(new Kelp(canvas.width, canvas.height, px));
  }

  fish = [];
  const fishCount = Math.floor(4 + canvas.width / 300);
  for (let i = 0; i < fishCount; i++) {
    fish.push(new Fish(canvas.width, canvas.height, px));
  }
}

export function draw(ctx, canvas) {
  const cw = canvas.width;
  const ch = canvas.height;
  time += 0.016;

  const beat = sample();
  const bpm = getBPM();
  const bpmFactor = (isEnabled() && bpm > 40) ? Math.sqrt(bpm / 80) : 1;

  // Background — bright shallow aquarium
  const grad = ctx.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0,   '#1a90cc');
  grad.addColorStop(0.5, '#0d6590');
  grad.addColorStop(1,   '#0a4568');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cw, ch);

  drawCaustics(ctx, cw, ch, time, px);
  drawFloor(ctx, cw, ch, px);

  // Kelp (behind everything else)
  for (const k of kelps) {
    k.update();
    k.draw(ctx);
  }

  // Bubbles
  for (const b of bubbles) {
    b.update(ch);
    b.draw(ctx);
  }

  // Fish
  for (const f of fish) {
    f.update(cw, ch, bpmFactor);
    f.draw(ctx);
  }

  // Jellyfish (on top)
  for (const j of jellies) {
    j.update(cw, ch, beat);
    j.draw(ctx);
  }
}

/** Preview thumbnail */
export function preview(ctx, w, h) {
  const prevPx = Math.max(2, Math.round(Math.min(w, h) / 60));

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1a90cc');
  grad.addColorStop(1, '#0a4568');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Floor strip
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#c8a84a';
  ctx.fillRect(0, h - prevPx * 2, w, prevPx * 2);
  ctx.globalAlpha = 1;

  // Simple kelp
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = '#237a42';
  for (let i = 0; i < 4; i++) {
    const kx = w * (0.12 + i * 0.25);
    for (let s = 0; s < 6; s++) {
      const sway = Math.sin(s * 0.6 + i) * prevPx * 0.8 * (s / 6);
      ctx.fillRect(Math.round(kx + sway), h - s * prevPx * 1.4 - prevPx * 2, prevPx, prevPx);
    }
  }
  ctx.globalAlpha = 1;

  // Jellyfish thumbnails
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

  // Fish thumbnail
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#ff7c35';
  ctx.fillRect(w * 0.55, h * 0.28, prevPx * 4, prevPx * 2);
  ctx.fillStyle = '#c44a10';
  ctx.fillRect(w * 0.55 - prevPx, h * 0.28, prevPx, prevPx * 2);
  ctx.globalAlpha = 1;

  // Bubbles
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#cceeff';
  ctx.fillRect(w * 0.5, h * 0.2, prevPx, prevPx);
  ctx.fillRect(w * 0.8, h * 0.35, prevPx, prevPx);
  ctx.fillRect(w * 0.15, h * 0.5, prevPx, prevPx);
  ctx.globalAlpha = 1;
}
