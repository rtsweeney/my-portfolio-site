/**
 * App controller
 * ──────────────
 * - Builds the selection grid from the visual registry
 * - Handles launching a visual, fullscreen, mic toggle, HUD auto-hide
 */

import { startMic, stopMic, isEnabled } from './audio.js';
import * as jellyfish from '../visuals/jellyfish.js';

// ── Visual registry (add new visuals here) ─────────────
const visuals = [jellyfish];

// ── DOM refs ───────────────────────────────────────────
const selectionScreen = document.getElementById('selection-screen');
const viewport = document.getElementById('visual-viewport');
const canvas = document.getElementById('visual-canvas');
const hud = document.getElementById('hud');
const btnBack = document.getElementById('btn-back');
const btnMic = document.getElementById('btn-mic');
const btnFullscreen = document.getElementById('btn-fullscreen');
const grid = document.getElementById('visual-grid');

let activeVisual = null;
let ctx = null;
let rafId = null;

// ── Build selection cards ──────────────────────────────
for (const vis of visuals) {
  const card = document.createElement('div');
  card.className = 'visual-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');

  // Mini canvas for the preview thumbnail
  const previewCanvas = document.createElement('canvas');
  previewCanvas.className = 'preview';
  previewCanvas.width = 520;
  previewCanvas.height = 325;
  card.appendChild(previewCanvas);

  // Draw the static preview
  if (vis.preview) {
    const pCtx = previewCanvas.getContext('2d');
    vis.preview(pCtx, previewCanvas.width, previewCanvas.height);
  }

  // Label
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = vis.meta.name;
  card.appendChild(label);

  // Badge
  if (vis.meta.badge) {
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = vis.meta.badge;
    card.appendChild(badge);
  }

  card.addEventListener('click', () => launchVisual(vis));
  card.addEventListener('keydown', e => { if (e.key === 'Enter') launchVisual(vis); });
  grid.appendChild(card);
}

// ── Launch / teardown ──────────────────────────────────
function launchVisual(vis) {
  activeVisual = vis;
  selectionScreen.style.display = 'none';
  viewport.classList.remove('hidden');

  ctx = vis.init(canvas);
  vis.resize(canvas);

  // Start render loop
  function loop() {
    vis.draw(ctx, canvas);
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);

  showHud();
}

function exitVisual() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
  activeVisual = null;
  stopMic();
  updateMicButton();

  viewport.classList.add('hidden');
  selectionScreen.style.display = '';

  // Exit fullscreen if active
  if (document.fullscreenElement) document.exitFullscreen();
}

// ── Resize handling ────────────────────────────────────
window.addEventListener('resize', () => {
  if (activeVisual) {
    activeVisual.resize(canvas);
  }
});

// ── Fullscreen ─────────────────────────────────────────
btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    viewport.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
});

// ── Mic toggle ─────────────────────────────────────────
btnMic.addEventListener('click', async () => {
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

// ── Back button ────────────────────────────────────────
btnBack.addEventListener('click', exitVisual);

// ── HUD auto-hide on mouse inactivity ──────────────────
let hudTimer = null;

function showHud() {
  hud.classList.remove('fade');
  clearTimeout(hudTimer);
  hudTimer = setTimeout(() => hud.classList.add('fade'), 3000);
}

viewport.addEventListener('mousemove', e => {
  showHud();
  if (activeVisual && activeVisual.registerMouseMove) {
    const rect = canvas.getBoundingClientRect();
    activeVisual.registerMouseMove(e.clientX - rect.left, e.clientY - rect.top);
  }
});
viewport.addEventListener('touchstart', showHud);

// ── Mouse click as beat (when mic is off) ────────────
canvas.addEventListener('click', () => {
  if (activeVisual && activeVisual.registerMouseClick) {
    activeVisual.registerMouseClick();
  }
});

// ── Keyboard shortcuts ─────────────────────────────────
document.addEventListener('keydown', e => {
  if (!activeVisual) return;
  if (e.key === 'Escape') exitVisual();
  if (e.key === 'f' || e.key === 'F') btnFullscreen.click();
  if (e.key === 'm' || e.key === 'M') btnMic.click();
});
