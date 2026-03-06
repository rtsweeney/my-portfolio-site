/**
 * Jellyfish direct-launch controller
 * ───────────────────────────────────
 * Auto-starts the jellyfish visual without a selection screen.
 */

import { startMic, stopMic, isEnabled } from './audio.js';
import * as jellyfish from '../visuals/jellyfish.js';

// ── DOM refs ───────────────────────────────────────────
const viewport = document.getElementById('visual-viewport');
const canvas = document.getElementById('visual-canvas');
const hud = document.getElementById('hud');
const btnMic = document.getElementById('btn-mic');
const btnFullscreen = document.getElementById('btn-fullscreen');

let ctx = null;
let rafId = null;

// ── Auto-launch ─────────────────────────────────────────
ctx = jellyfish.init(canvas);
jellyfish.resize(canvas);

function loop() {
  jellyfish.draw(ctx, canvas);
  rafId = requestAnimationFrame(loop);
}
rafId = requestAnimationFrame(loop);
showHud();

// ── Resize handling ────────────────────────────────────
window.addEventListener('resize', () => {
  jellyfish.resize(canvas);
});

// ── Fullscreen ─────────────────────────────────────────
btnFullscreen.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!document.fullscreenElement) {
    // Try document.documentElement for broader browser support inside iframes
    (viewport || document.documentElement).requestFullscreen().catch(() => {
      // Fallback: try webkit
      const el = viewport || document.documentElement;
      if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    });
  } else {
    document.exitFullscreen();
  }
});

// ── Mic toggle ─────────────────────────────────────────
btnMic.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (isEnabled()) {
    stopMic();
  } else {
    await startMic();
  }
  updateMicButton();
});

function updateMicButton() {
  const on = isEnabled();
  btnMic.textContent = on ? 'Mic: ON' : 'Mic: OFF';
  btnMic.classList.toggle('active', on);
}

// ── HUD auto-hide on mouse inactivity ──────────────────
let hudTimer = null;

function showHud() {
  hud.classList.remove('fade');
  clearTimeout(hudTimer);
  hudTimer = setTimeout(() => hud.classList.add('fade'), 3000);
}

viewport.addEventListener('mousemove', e => {
  showHud();
  if (jellyfish.registerMouseMove) {
    const rect = canvas.getBoundingClientRect();
    jellyfish.registerMouseMove(e.clientX - rect.left, e.clientY - rect.top);
  }
});
viewport.addEventListener('touchstart', showHud);

// ── Mouse/touch click as beat (when mic is off) ────────────
canvas.addEventListener('click', (e) => {
  // Don't trigger if it came from a button
  if (e.target !== canvas) return;
  jellyfish.registerMouseClick();
});
canvas.addEventListener('touchend', (e) => {
  if (e.target !== canvas) return;
  jellyfish.registerMouseClick();
});

// ── Keyboard shortcuts ─────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'f' || e.key === 'F') btnFullscreen.click();
  if (e.key === 'm' || e.key === 'M') btnMic.click();
});
