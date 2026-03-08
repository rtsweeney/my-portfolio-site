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

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

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

// ── Resize handling ────────────────────────────────────
window.addEventListener('resize', () => {
  jellyfish.resize(canvas);
});

// ── Fullscreen ─────────────────────────────────────────
function tryFullscreen() {
  const el = document.documentElement;
  const rfs = el.requestFullscreen
    || el.webkitRequestFullscreen
    || el.mozRequestFullScreen
    || el.msRequestFullscreen;
  if (rfs) {
    rfs.call(el).catch(() => {});
  }
}

btnFullscreen.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    tryFullscreen();
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
  }
});

// ── Mic toggle ─────────────────────────────────────────
btnMic.addEventListener('click', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (isEnabled()) {
    stopMic();
  } else {
    await startMic();
  }
  updateMicButton();
});

// Also listen for touchend on buttons (more reliable on mobile)
btnMic.addEventListener('touchend', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (isEnabled()) {
    stopMic();
  } else {
    await startMic();
  }
  updateMicButton();
});

btnFullscreen.addEventListener('touchend', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    tryFullscreen();
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
  }
});

function updateMicButton() {
  const on = isEnabled();
  btnMic.textContent = on ? 'Mic: ON' : 'Mic: OFF';
  btnMic.classList.toggle('active', on);
}

// ── HUD visibility ────────────────────────────────────
// On touch devices the HUD stays visible always (CSS handles this).
// On desktop it auto-hides after mouse inactivity.
let hudTimer = null;

function showHud() {
  hud.classList.remove('fade');
  clearTimeout(hudTimer);
  if (!isTouchDevice) {
    hudTimer = setTimeout(() => hud.classList.add('fade'), 3000);
  }
}

showHud();

// Desktop: mouse tracking
viewport.addEventListener('mousemove', e => {
  showHud();
  if (jellyfish.registerMouseMove) {
    const rect = canvas.getBoundingClientRect();
    jellyfish.registerMouseMove(e.clientX - rect.left, e.clientY - rect.top);
  }
});

// ── Beat on click/tap (canvas only) ────────────────────
canvas.addEventListener('click', () => {
  jellyfish.registerMouseClick();
});

canvas.addEventListener('touchstart', (e) => {
  // Only fire beat if the touch is on the canvas (not a button)
  if (e.target === canvas) {
    jellyfish.registerMouseClick();
  }
}, { passive: true });

// ── Keyboard shortcuts ─────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'f' || e.key === 'F') btnFullscreen.click();
  if (e.key === 'm' || e.key === 'M') btnMic.click();
});
