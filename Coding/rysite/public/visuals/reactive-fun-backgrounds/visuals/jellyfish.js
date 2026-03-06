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
    this.scale = 1 + Math.floor(Math.random() * 2);
    this.colorIdx = Math.floor(Math.random() * FISH_COLORS.length);
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.cw = cw;
    this.ch = ch;
    this.panicMode = false;
    this.panicTimer = 0;
  }

  update(cw, ch, bpmFactor, sharks) {
    this.wobblePhase += 0.065;
    this.cw = cw;
    this.ch = ch;

    // Check for nearby sharks
    this.panicMode = false;
    for (const shark of sharks) {
      const dx = shark.x - this.x;
      const dy = shark.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 250) {
        this.panicMode = true;
        this.panicTimer = 60;
        // Reverse direction away from shark
        if (dx < 0) this.dir = 1;
        else this.dir = -1;
        break;
      }
    }

    if (this.panicMode && this.panicTimer > 0) {
      this.panicTimer--;
    } else {
      this.panicMode = false;
    }

    const speedMult = this.panicMode ? 2.2 : 1;
    this.x += this.dir * this.baseSpeed * bpmFactor * speedMult;
    this.y += Math.sin(this.wobblePhase * 0.5) * 0.25;

    if (this.dir > 0 && this.x > cw + 120) {
      this.x = -80;
      this.y = ch * (0.15 + Math.random() * 0.60);
    } else if (this.dir < 0 && this.x < -120) {
      this.x = cw + 80;
      this.y = ch * (0.15 + Math.random() * 0.60);
    }
  }

  draw(ctx) {
    const { px, x, y, dir, scale, panicMode } = this;
    const s = px * scale;
    const { body, fin } = FISH_COLORS[this.colorIdx];
    const wag = Math.sin(this.wobblePhase * 1.5) * 1.2;

    ctx.globalAlpha = panicMode ? 0.95 : 0.88;

    const B = (col, row, color) => {
      pxRect(ctx, x + col * s * dir - s / 2, y + row * s - s / 2, s, s, color);
    };

    // Body
    B(0, -2, body);
    B(-1, -1, body); B(0, -1, body); B(1, -1, body);
    B(-2, 0, body);  B(-1, 0, body); B(0, 0, body);  B(1, 0, body); B(2, 0, body);
    B(-1, 1, body);  B(0, 1, body);  B(1, 1, body);
    B(0, 2, body);

    // Tail
    B(-3 + wag,  -1, fin);
    B(-3,         0, fin);
    B(-3 - wag,   1, fin);
    B(-3 + wag * 0.5, -2, fin);
    B(-3 - wag * 0.5,  2, fin);

    // Dorsal fin
    B(0, -3, fin);
    B(1, -3, fin);

    ctx.globalAlpha = 1;
    pxRect(ctx, x + 2 * s * dir - s * 0.35, y - s * 0.35, Math.round(s * 0.55), Math.round(s * 0.55), '#0a0a18');
    ctx.globalAlpha = 1;
  }
}

// ── Shark ──────────────────────────────────────────────
class Shark {
  constructor(cw, ch, px) {
    this.px = px;
    this.x = Math.random() * cw;
    this.y = ch * (0.25 + Math.random() * 0.45);
    this.dir = Math.random() > 0.5 ? 1 : -1;
    this.speed = 0.4 + Math.random() * 0.6;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.cw = cw;
    this.ch = ch;
  }

  update(cw, ch) {
    this.wobblePhase += 0.04;
    this.x += this.dir * this.speed;
    this.y += Math.sin(this.wobblePhase * 0.3) * 0.15;
    this.cw = cw;
    this.ch = ch;

    if (this.dir > 0 && this.x > cw + 200) {
      this.x = -200;
      this.y = ch * (0.25 + Math.random() * 0.45);
    } else if (this.dir < 0 && this.x < -200) {
      this.x = cw + 200;
      this.y = ch * (0.25 + Math.random() * 0.45);
    }
  }

  draw(ctx) {
    const { px, x, y, dir } = this;
    const s = px * 2;
    ctx.globalAlpha = 0.75;

    const B = (col, row, color) => {
      pxRect(ctx, x + col * s * dir - s / 2, y + row * s - s / 2, s, s, color);
    };

    // Shark body (pointed snout, dorsal fin, tail)
    // Snout
    B(2, 0, '#404050');
    B(3, -1, '#303040');
    B(3, 1, '#303040');

    // Body
    B(0, -1, '#505060');
    B(0, 0, '#505060');
    B(0, 1, '#505060');
    B(-1, -1, '#505060');
    B(-1, 0, '#505060');
    B(-1, 1, '#505060');
    B(-2, -1, '#505060');
    B(-2, 0, '#505060');
    B(-2, 1, '#505060');

    // Dorsal fin
    B(-1, -2, '#606070');
    B(-1, -3, '#606070');

    // Tail (pointed)
    B(-3, -2, '#303040');
    B(-3, -1, '#303040');
    B(-3, 0, '#303040');
    B(-3, 1, '#303040');
    B(-3, 2, '#303040');

    // Eye
    ctx.globalAlpha = 1;
    pxRect(ctx, x + 1 * s * dir - s * 0.3, y - s * 0.3, Math.round(s * 0.5), Math.round(s * 0.5), '#ffff00');

    ctx.globalAlpha = 1;
  }
}

// ── Crab ───────────────────────────────────────────────
class Crab {
  constructor(cw, ch, px) {
    this.px = px;
    this.x = Math.random() * cw;
    this.floorY = ch - px * 3.5;
    this.y = this.floorY;
    this.dir = Math.random() > 0.5 ? 1 : -1;
    this.speed = 0.12 + Math.random() * 0.08;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.cw = cw;
    this.ch = ch;
  }

  update(cw, ch) {
    this.walkPhase += 0.035;
    this.x += this.dir * this.speed;
    this.cw = cw;
    this.ch = ch;

    // Wrap around
    if (this.dir > 0 && this.x > cw + 40) {
      this.x = -40;
      this.dir = Math.random() > 0.5 ? 1 : -1;
    } else if (this.dir < 0 && this.x < -40) {
      this.x = cw + 40;
      this.dir = Math.random() > 0.5 ? 1 : -1;
    }
  }

  draw(ctx) {
    const { px, x, walkPhase, dir, floorY } = this;
    const s = px;
    const wiggle = Math.sin(walkPhase) * s * 0.4;

    ctx.globalAlpha = 0.78;

    // Body (brownish shell)
    const bx = x - s * 1.5;
    const by = floorY;
    pxRect(ctx, bx - s / 2, by - s / 2, s * 2, s, '#8b6f47');
    pxRect(ctx, bx, by - s * 1.5, s, s, '#a0826d');

    // Legs (3 on each side, wave up/down)
    const legPositions = [-1, 0, 1];
    for (const legIdx of legPositions) {
      const legX = bx + legIdx * s;
      const legWave = Math.sin(walkPhase + legIdx * Math.PI / 3) * s * 0.6;

      // Left side legs
      pxRect(ctx, legX - s * 1.5 * dir - s / 2, by + legWave + s * 0.2, s, s, '#6b5437');
      // Right side legs
      pxRect(ctx, legX + s * 1.5 * dir - s / 2, by + legWave + s * 0.2, s, s, '#6b5437');
    }

    // Claws (pinchers)
    const clawY = by - s * 0.5;
    pxRect(ctx, x - s * 2.2 * dir - s / 2, clawY - s / 2, s, s, '#9b7f57');
    pxRect(ctx, x + s * 2.2 * dir - s / 2, clawY - s / 2, s, s, '#9b7f57');
    pxRect(ctx, x - s * 2.8 * dir - s / 2, clawY - s * 0.8, s * 0.8, s * 0.8, '#8b6f47');
    pxRect(ctx, x + s * 2.8 * dir - s / 2, clawY - s * 0.8, s * 0.8, s * 0.8, '#8b6f47');

    // Eyes
    pxRect(ctx, x - s * 0.5 * dir - s * 0.25, by - s, s * 0.5, s * 0.5, '#000000');
    pxRect(ctx, x + s * 0.5 * dir - s * 0.25, by - s, s * 0.5, s * 0.5, '#000000');

    ctx.globalAlpha = 1;
  }
}

// ── Kelp ───────────────────────────────────────────────
class Kelp {
  constructor(cw, ch, px, scale = 1) {
    this.px = px;
    this.x = 40 + Math.random() * (cw - 80);
    this.baseY = ch - px * 3.5;
    this.height = (10 + Math.floor(Math.random() * 14)) * scale;
    this.phase = Math.random() * Math.PI * 2;
    this.swaySpeed = (0.008 + Math.random() * 0.007) * (1 / scale);
    this.color = KELP_COLORS[Math.floor(Math.random() * KELP_COLORS.length)];
    this.width = (1 + Math.floor(Math.random() * 2)) * scale;
    this.scale = scale;
  }

  update() {
    this.phase += this.swaySpeed;
  }

  draw(ctx) {
    const { px, x, baseY, height, phase, color, width, scale } = this;
    ctx.globalAlpha = scale > 1 ? 0.85 : 0.72;
    for (let seg = 0; seg < height; seg++) {
      const t = seg / height;
      const sway = Math.sin(phase + t * 2.8) * px * 2.8 * t * scale;
      const by = baseY - seg * px * 1.7 * scale;
      pxRect(ctx, x + sway - (px * width) / 2, by, px * width, px * 1.7 * scale, color);
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
  const floorTop = ch - px * 3.5;
  ctx.globalAlpha = 0.35;
  pxRect(ctx, 0, floorTop, cw, px * 3.5, '#c8a84a');
  ctx.globalAlpha = 0.2;
  pxRect(ctx, 0, floorTop + px, cw, px * 2.5, '#e0c06a');
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
let kelpsBackground = [];
let fish = [];
let sharks = [];
let crab = null;
let time = 0;
let px = PX;
let mouseClickedThisFrame = false;

export function init(canvas) {
  const ctx = canvas.getContext('2d');
  resize(canvas);
  return ctx;
}

export function registerMouseClick() {
  if (!isEnabled()) {
    mouseClickedThisFrame = true;
  }
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

  // Regular kelp (background)
  kelps = [];
  const kelpCount = Math.floor(5 + canvas.width / 160);
  for (let i = 0; i < kelpCount; i++) {
    kelps.push(new Kelp(canvas.width, canvas.height, px, 1));
  }

  // Bigger foreground kelp
  kelpsBackground = [];
  const bgKelpCount = Math.floor(2 + canvas.width / 300);
  for (let i = 0; i < bgKelpCount; i++) {
    kelpsBackground.push(new Kelp(canvas.width, canvas.height, px, 2.5));
  }

  fish = [];
  const fishCount = Math.floor(4 + canvas.width / 300);
  for (let i = 0; i < fishCount; i++) {
    fish.push(new Fish(canvas.width, canvas.height, px));
  }

  // Occasional sharks
  sharks = [];
  if (Math.random() > 0.5) {
    sharks.push(new Shark(canvas.width, canvas.height, px));
  }

  // Single crab
  crab = new Crab(canvas.width, canvas.height, px);
}

export function draw(ctx, canvas) {
  const cw = canvas.width;
  const ch = canvas.height;
  time += 0.016;

  const beat = sample();
  const bpm = getBPM();
  const bpmFactor = (isEnabled() && bpm > 40) ? Math.sqrt(bpm / 80) : 1;

  // Apply mouse click as beat when mic is off
  let effectiveBeat = beat;
  if (!isEnabled() && mouseClickedThisFrame) {
    effectiveBeat = { ...beat, kick: true };
    mouseClickedThisFrame = false;
  }

  // Background — bright shallow aquarium
  const grad = ctx.createLinearGradient(0, 0, 0, ch);
  grad.addColorStop(0,   '#1a90cc');
  grad.addColorStop(0.5, '#0d6590');
  grad.addColorStop(1,   '#0a4568');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cw, ch);

  drawCaustics(ctx, cw, ch, time, px);
  drawFloor(ctx, cw, ch, px);

  // Background kelp (behind fish)
  for (const k of kelpsBackground) {
    k.update();
    k.draw(ctx);
  }

  // Regular kelp (behind fish)
  for (const k of kelps) {
    k.update();
    k.draw(ctx);
  }

  // Bubbles
  for (const b of bubbles) {
    b.update(ch);
    b.draw(ctx);
  }

  // Sharks
  for (const s of sharks) {
    s.update(cw, ch);
    s.draw(ctx);
  }

  // Fish (they react to sharks)
  for (const f of fish) {
    f.update(cw, ch, bpmFactor, sharks);
    f.draw(ctx);
  }

  // Crab (crawls on floor)
  if (crab) {
    crab.update(cw, ch);
    crab.draw(ctx);
  }

  // Jellyfish (on top)
  for (const j of jellies) {
    j.update(cw, ch, effectiveBeat);
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

  // Shark thumbnail (top)
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#505060';
  ctx.fillRect(w * 0.8, h * 0.12, prevPx * 5, prevPx * 2);
  ctx.fillStyle = '#606070';
  ctx.fillRect(w * 0.8 + prevPx, h * 0.05, prevPx, prevPx);
  ctx.fillStyle = '#ffff00';
  ctx.fillRect(w * 0.85, h * 0.13, prevPx * 0.6, prevPx * 0.6);
  ctx.globalAlpha = 1;

  // Fish thumbnail (middle)
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#ff7c35';
  ctx.fillRect(w * 0.1, h * 0.4, prevPx * 4, prevPx * 2);
  ctx.fillStyle = '#c44a10';
  ctx.fillRect(w * 0.1 - prevPx, h * 0.4, prevPx, prevPx * 2);
  ctx.globalAlpha = 1;

  // Crab thumbnail (floor)
  ctx.globalAlpha = 0.75;
  const crabX = w * 0.75;
  const crabY = h - prevPx * 4;
  ctx.fillStyle = '#8b6f47';
  ctx.fillRect(crabX, crabY - prevPx, prevPx * 2, prevPx);
  ctx.fillStyle = '#a0826d';
  ctx.fillRect(crabX + prevPx * 0.5, crabY - prevPx * 2, prevPx, prevPx);
  ctx.fillStyle = '#9b7f57';
  ctx.fillRect(crabX - prevPx * 0.8, crabY, prevPx * 0.7, prevPx * 0.7);
  ctx.fillRect(crabX + prevPx * 2, crabY, prevPx * 0.7, prevPx * 0.7);
  ctx.fillStyle = '#6b5437';
  ctx.fillRect(crabX - prevPx * 0.2, crabY + prevPx * 0.3, prevPx * 0.5, prevPx * 0.5);
  ctx.fillStyle = '#000000';
  ctx.fillRect(crabX + prevPx * 0.2, crabY - prevPx * 0.3, prevPx * 0.4, prevPx * 0.4);
  ctx.globalAlpha = 1;

  // Bubbles
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#cceeff';
  ctx.fillRect(w * 0.5, h * 0.2, prevPx, prevPx);
  ctx.fillRect(w * 0.3, h * 0.6, prevPx, prevPx);
  ctx.fillRect(w * 0.9, h * 0.75, prevPx, prevPx);
  ctx.globalAlpha = 1;
}
