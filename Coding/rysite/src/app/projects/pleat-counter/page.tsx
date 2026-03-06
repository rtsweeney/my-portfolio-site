'use client';

import { useState, useRef, useCallback, useEffect, type CSSProperties, type ChangeEvent, type DragEvent, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

type AreaUnit = 'ft²' | 'm²' | 'in²';
interface Rect { x: number; y: number; w: number; h: number }
type Pt = [number, number]; // [x, y]
type Quad = [Pt, Pt, Pt, Pt]; // TL, TR, BR, BL — clockwise

interface PleatResult {
  count: number;
  positions: number[];
  direction: 'h' | 'v';
  ridgeLines: number[][];
  ridgeOffsets: number[][];
  gratingBars: number[];
  period: number;
  gratingDetected: boolean;
  confidence: number;
}

const MAX_DIM = 1000;

// ── Image Processing Utilities ────────────────────────────────────────────────

function toGrayscale(data: Uint8ClampedArray): Float32Array {
  const n = data.length >> 2;
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const j = i << 2;
    g[i] = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
  }
  return g;
}

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r <= 0) return Float32Array.from(src);
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const rowPs = new Float32Array(w + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    rowPs[0] = 0;
    for (let x = 0; x < w; x++) rowPs[x + 1] = rowPs[x] + src[row + x];
    for (let x = 0; x < w; x++) {
      const lo = Math.max(0, x - r), hi = Math.min(w - 1, x + r);
      tmp[row + x] = (rowPs[hi + 1] - rowPs[lo]) / (hi - lo + 1);
    }
  }
  const colPs = new Float32Array(h + 1);
  for (let x = 0; x < w; x++) {
    colPs[0] = 0;
    for (let y = 0; y < h; y++) colPs[y + 1] = colPs[y] + tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      const lo = Math.max(0, y - r), hi = Math.min(h - 1, y + r);
      out[y * w + x] = (colPs[hi + 1] - colPs[lo]) / (hi - lo + 1);
    }
  }
  return out;
}

function otsuThreshold(gray: Float32Array): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[Math.min(255, Math.max(0, gray[i] | 0))]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let wB = 0, sumB = 0, maxVar = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > maxVar) { maxVar = v; threshold = t; }
  }
  return threshold;
}

// ── Quad Helpers ──────────────────────────────────────────────────────────────

function quadBounds(q: Quad): Rect {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of q) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  const x = Math.floor(minX), y = Math.floor(minY);
  return { x, y, w: Math.ceil(maxX) - x, h: Math.ceil(maxY) - y };
}

/** Scanline-fill mask: 1 = inside quad, 0 = outside. */
function createQuadMask(q: Quad, w: number, h: number): Uint8Array {
  const mask = new Uint8Array(w * h);
  const edges: [Pt, Pt][] = [[q[0], q[1]], [q[1], q[2]], [q[2], q[3]], [q[3], q[0]]];
  let minY = h, maxY = 0;
  for (const [, y] of q) { minY = Math.min(minY, Math.floor(y)); maxY = Math.max(maxY, Math.ceil(y)); }
  minY = Math.max(0, minY); maxY = Math.min(h - 1, maxY);

  for (let row = minY; row <= maxY; row++) {
    const xs: number[] = [];
    for (const [p1, p2] of edges) {
      if ((p1[1] <= row && p2[1] > row) || (p2[1] <= row && p1[1] > row)) {
        const t = (row - p1[1]) / (p2[1] - p1[1]);
        xs.push(p1[0] + t * (p2[0] - p1[0]));
      }
    }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    const left = Math.max(0, Math.floor(xs[0]));
    const right = Math.min(w - 1, Math.ceil(xs[xs.length - 1]));
    for (let x = left; x <= right; x++) mask[row * w + x] = 1;
  }
  return mask;
}

/** Shrink a quad toward its centroid by a fraction (0-1). */
function insetQuad(q: Quad, frac: number): Quad {
  const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4;
  const cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
  return q.map(([x, y]) => [x + (cx - x) * frac, y + (cy - y) * frac] as Pt) as Quad;
}

// ── Theil-Sen Robust Line Fitting ────────────────────────────────────────────
// Fits y = slope*x + intercept (or x = slope*y + intercept) using median of
// pairwise slopes — robust to up to ~29% outliers.

function theilSenFit(points: Pt[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: points[0][1] };

  const slopes: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = points[j][0] - points[i][0];
      if (Math.abs(dx) > 0.5) slopes.push((points[j][1] - points[i][1]) / dx);
    }
  }
  if (slopes.length === 0) return { slope: 0, intercept: points[0][1] };

  slopes.sort((a, b) => a - b);
  const slope = slopes[Math.floor(slopes.length / 2)];
  const intercepts = points.map(([x, y]) => y - slope * x).sort((a, b) => a - b);
  const intercept = intercepts[Math.floor(intercepts.length / 2)];
  return { slope, intercept };
}

/** Intersect two lines.
 *  lineH: y = sH*x + bH  (roughly horizontal edges — top/bottom)
 *  lineV: x = sV*y + bV  (roughly vertical edges — left/right)
 */
function intersectHV(
  lineH: { slope: number; intercept: number },
  lineV: { slope: number; intercept: number },
): Pt {
  // y = sH*x + bH  and  x = sV*y + bV
  // Substitute x into y equation:  y = sH*(sV*y + bV) + bH
  //   y = sH*sV*y + sH*bV + bH
  //   y*(1 - sH*sV) = sH*bV + bH
  const denom = 1 - lineH.slope * lineV.slope;
  if (Math.abs(denom) < 1e-12) {
    // Parallel or degenerate — fallback
    const y = lineH.intercept;
    return [lineV.slope * y + lineV.intercept, y];
  }
  const y = (lineH.slope * lineV.intercept + lineH.intercept) / denom;
  const x = lineV.slope * y + lineV.intercept;
  return [x, y];
}

// ── Perspective-Aware Filter Boundary Detection ──────────────────────────────
// Detects the pleated filter *media* as a quadrilateral (handles perspective &
// tilt).  Uses a two-pass "media-first" strategy:
//   Pass 1 – find the overall textured region (filter + frame)
//   Pass 2 – within that region, isolate the dense pleated media core by
//            applying morphological opening (erode → dilate) to strip away thin
//            high-variance edges from the frame, then re-scan for boundaries.
// This targets the inner media boundary rather than the outer filter edge.

function detectFilterQuad(gray: Float32Array, w: number, h: number): Quad {
  // 1. Compute local variance map (high variance = textured filter media)
  const varR = Math.max(4, Math.round(Math.min(w, h) * 0.015));
  const gray2 = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) gray2[i] = gray[i] * gray[i];
  const meanImg = boxBlur(gray, w, h, varR);
  const meanSqImg = boxBlur(gray2, w, h, varR);
  const variance = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) variance[i] = Math.max(0, meanSqImg[i] - meanImg[i] * meanImg[i]);

  // Smooth variance for more stable boundaries
  const smoothVar = boxBlur(variance, w, h, Math.max(2, Math.round(Math.min(w, h) * 0.01)));

  // 2. Scale to 0-255 and compute initial Otsu threshold
  let maxVar = 0;
  for (let i = 0; i < w * h; i++) maxVar = Math.max(maxVar, smoothVar[i]);
  const sqrtScale = maxVar > 0 ? 255 / Math.sqrt(maxVar) : 1;
  const varScaled = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) varScaled[i] = Math.sqrt(smoothVar[i]) * sqrtScale;

  // 3. Media-first: morphological opening to keep only bulk media texture.
  //    Erode (min-filter via negated boxBlur trick) then dilate.  We approximate
  //    an erode by thresholding after a box-blur of the binary mask — pixels
  //    that survive are far from the boundary (= media core).
  const otsuT = otsuThreshold(varScaled);
  // Binary mask: 1 where variance exceeds Otsu, 0 otherwise
  const binaryMask = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) binaryMask[i] = varScaled[i] > otsuT ? 1 : 0;

  // Erode: blur the binary mask and threshold at a high fraction (0.85) —
  // only pixels surrounded by other "on" pixels survive.
  const erodeR = Math.max(3, Math.round(Math.min(w, h) * 0.025));
  const eroded = boxBlur(binaryMask, w, h, erodeR);
  const erodedBin = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) erodedBin[i] = eroded[i] > 0.85 ? 1 : 0;

  // Dilate: blur the eroded mask and threshold at a low fraction (0.15) —
  // expands back to roughly original size but without thin frame edges.
  const dilated = boxBlur(erodedBin, w, h, erodeR);
  const mediaMask = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) mediaMask[i] = dilated[i] > 0.15 ? varScaled[i] : 0;

  // Re-threshold on the cleaned media mask.  Use a raised threshold (Otsu on
  // the surviving pixels) to tightly hug the media boundary.
  const mediaThresh = otsuThreshold(mediaMask);
  // Blend: use the higher of original Otsu and media-specific threshold so we
  // don't accidentally expand beyond the outer edge.
  const varThresh = Math.max(otsuT, mediaThresh * 0.9);

  // Build the final scan target — zero out pixels outside the media core so
  // edge scanning only locks on to the media, not the frame.
  const scanMap = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) scanMap[i] = mediaMask[i] > 0 ? varScaled[i] : 0;

  // 4. Scan from each side to find boundary points (on the media scanMap)
  const N = 30; // sample positions per edge
  const windowSize = Math.max(3, Math.round(Math.min(w, h) * 0.02));

  // Top edge: for each x, scan downward to find where media texture begins
  const topPts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const x = Math.floor((i + 0.5) * w / N);
    for (let y = 0; y <= h - windowSize; y++) {
      let avg = 0;
      for (let dy = 0; dy < windowSize; dy++) avg += scanMap[(y + dy) * w + x];
      avg /= windowSize;
      if (avg > varThresh) { topPts.push([x, y]); break; }
    }
  }

  // Bottom edge: scan upward
  const bottomPts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const x = Math.floor((i + 0.5) * w / N);
    for (let y = h - 1; y >= windowSize - 1; y--) {
      let avg = 0;
      for (let dy = 0; dy < windowSize; dy++) avg += scanMap[(y - dy) * w + x];
      avg /= windowSize;
      if (avg > varThresh) { bottomPts.push([x, y]); break; }
    }
  }

  // Left edge: for each y, scan rightward
  const leftPts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const y = Math.floor((i + 0.5) * h / N);
    for (let x = 0; x <= w - windowSize; x++) {
      let avg = 0;
      for (let dx = 0; dx < windowSize; dx++) avg += scanMap[y * w + x + dx];
      avg /= windowSize;
      if (avg > varThresh) { leftPts.push([y, x]); break; } // note: [y, x] for fitting x = f(y)
    }
  }

  // Right edge: scan leftward
  const rightPts: Pt[] = [];
  for (let i = 0; i < N; i++) {
    const y = Math.floor((i + 0.5) * h / N);
    for (let x = w - 1; x >= windowSize - 1; x--) {
      let avg = 0;
      for (let dx = 0; dx < windowSize; dx++) avg += scanMap[y * w + x - dx];
      avg /= windowSize;
      if (avg > varThresh) { rightPts.push([y, x]); break; } // [y, x]
    }
  }

  // 5. Fit lines using Theil-Sen
  // Top/bottom: y = slope*x + intercept  (points are [x, y])
  // Left/right: x = slope*y + intercept  (points are [y, x])
  const minPtsForLine = 4;

  const defaultMargin = Math.round(Math.min(w, h) * 0.05);
  const topLine = topPts.length >= minPtsForLine
    ? theilSenFit(topPts) : { slope: 0, intercept: defaultMargin };
  const bottomLine = bottomPts.length >= minPtsForLine
    ? theilSenFit(bottomPts) : { slope: 0, intercept: h - defaultMargin };
  const leftLine = leftPts.length >= minPtsForLine
    ? theilSenFit(leftPts) : { slope: 0, intercept: defaultMargin };
  const rightLine = rightPts.length >= minPtsForLine
    ? theilSenFit(rightPts) : { slope: 0, intercept: w - defaultMargin };

  // 6. Intersect the 4 lines to get corners
  const tl = intersectHV(topLine, leftLine);
  const tr = intersectHV(topLine, rightLine);
  const br = intersectHV(bottomLine, rightLine);
  const bl = intersectHV(bottomLine, leftLine);

  // 7. Clamp corners to image bounds with margin
  const clampPt = ([x, y]: Pt): Pt => [
    Math.max(0, Math.min(w - 1, x)),
    Math.max(0, Math.min(h - 1, y)),
  ];
  let quad: Quad = [clampPt(tl), clampPt(tr), clampPt(br), clampPt(bl)];

  // 8. Validate — if quad is too small or degenerate, fall back to full image with margin
  const qb = quadBounds(quad);
  if (qb.w < w * 0.15 || qb.h < h * 0.15) {
    const m = defaultMargin;
    quad = [[m, m], [w - m, m], [w - m, h - m], [m, h - m]];
  }

  // 9. Small inset to ensure we're inside the media, not on the frame edge
  return insetQuad(quad, 0.01);
}

// ── Profile Utilities ─────────────────────────────────────────────────────────

function smoothProfile(p: Float32Array, r: number): Float32Array {
  const n = p.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - r), hi = Math.min(n - 1, i + r);
    let s = 0;
    for (let j = lo; j <= hi; j++) s += p[j];
    out[i] = s / (hi - lo + 1);
  }
  return out;
}

function detrend(p: Float32Array): Float32Array {
  const trend = smoothProfile(p, Math.max(1, Math.round(p.length / 8)));
  const out = new Float32Array(p.length);
  for (let i = 0; i < p.length; i++) out[i] = p[i] - trend[i];
  return out;
}

function stdDev(arr: Float32Array): number {
  const n = arr.length;
  if (!n) return 0;
  let s = 0, s2 = 0;
  for (let i = 0; i < n; i++) { s += arr[i]; s2 += arr[i] * arr[i]; }
  const m = s / n;
  return Math.sqrt(Math.max(0, s2 / n - m * m));
}

function findPeaks(profile: Float32Array, minProm: number): number[] {
  const n = profile.length;
  const peaks: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (profile[i] > profile[i - 1] && profile[i] >= profile[i + 1]) {
      let lMin = profile[i], rMin = profile[i];
      for (let j = i - 1; j >= 0; j--) {
        lMin = Math.min(lMin, profile[j]);
        if (profile[j] > profile[i]) break;
      }
      for (let j = i + 1; j < n; j++) {
        rMin = Math.min(rMin, profile[j]);
        if (profile[j] > profile[i]) break;
      }
      if (profile[i] - Math.max(lMin, rMin) >= minProm) peaks.push(i);
    }
  }
  return peaks;
}

// ── Autocorrelation Period Estimation ─────────────────────────────────────────

function estimatePeriodAutocorr(profile: Float32Array, minPeriod: number, maxPeriod: number): { period: number; strength: number } {
  const n = profile.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += profile[i];
  mean /= n;
  const centered = new Float32Array(n);
  let energy = 0;
  for (let i = 0; i < n; i++) {
    centered[i] = profile[i] - mean;
    energy += centered[i] * centered[i];
  }
  if (energy < 1e-10) return { period: 0, strength: 0 };

  const minLag = Math.max(2, Math.floor(minPeriod));
  const maxLag = Math.min(Math.floor(n / 2), Math.ceil(maxPeriod));
  const acf = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) sum += centered[i] * centered[i + lag];
    acf[lag] = sum / energy;
  }

  let bestLag = 0, bestVal = -Infinity;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (acf[lag] > acf[lag - 1] && acf[lag] >= acf[lag + 1] && acf[lag] > bestVal) {
      bestVal = acf[lag];
      bestLag = lag;
      break;
    }
  }

  if (bestLag === 0) {
    for (let lag = minLag; lag <= maxLag; lag++) {
      if (acf[lag] > bestVal) { bestVal = acf[lag]; bestLag = lag; }
    }
  }

  if (bestLag > minLag && bestLag < maxLag) {
    const a = acf[bestLag - 1], b = acf[bestLag], c = acf[bestLag + 1];
    const denom = 2 * (2 * b - a - c);
    if (Math.abs(denom) > 1e-10) {
      const delta = (a - c) / denom;
      return { period: bestLag + delta, strength: Math.max(0, bestVal) };
    }
  }

  return { period: bestLag, strength: Math.max(0, bestVal) };
}

// ── Grating Detection (mask-aware) ───────────────────────────────────────────

function detectGrating(
  gray: Float32Array, imgW: number, bounds: Rect, mask: Uint8Array, pleatDir: 'h' | 'v'
): { bars: number[]; gaps: Array<[number, number]>; detected: boolean } {
  const perpLen = pleatDir === 'h' ? bounds.h : bounds.w;
  const paraLen = pleatDir === 'h' ? bounds.w : bounds.h;

  const profile = new Float32Array(perpLen);
  const margin = 0.1;
  const paraStart = Math.floor(paraLen * margin);
  const paraEnd = Math.floor(paraLen * (1 - margin));
  if (paraEnd <= paraStart) return { bars: [], gaps: [], detected: false };

  for (let perp = 0; perp < perpLen; perp++) {
    let sum = 0, cnt = 0;
    for (let para = paraStart; para < paraEnd; para++) {
      const x = pleatDir === 'h' ? bounds.x + para : bounds.x + perp;
      const y = pleatDir === 'h' ? bounds.y + perp : bounds.y + para;
      if (x >= 0 && y >= 0 && x < imgW && mask[y * imgW + x]) {
        sum += gray[y * imgW + x];
        cnt++;
      }
    }
    profile[perp] = cnt > 0 ? sum / cnt : 0;
  }

  const smoothR = Math.max(1, Math.round(perpLen * 0.005));
  const smoothed = smoothProfile(profile, smoothR);
  const det = detrend(smoothed);

  const minGratingPeriod = Math.max(5, perpLen * 0.03);
  const maxGratingPeriod = perpLen * 0.25;
  const { period: gratingPeriod, strength } = estimatePeriodAutocorr(det, minGratingPeriod, maxGratingPeriod);

  if (strength < 0.15 || gratingPeriod < minGratingPeriod) {
    return { bars: [], gaps: [], detected: false };
  }

  const sd = stdDev(det);
  const barThreshold = -sd * 0.3;
  const bars: number[] = [];

  for (let i = 1; i < perpLen - 1; i++) {
    if (det[i] < det[i - 1] && det[i] <= det[i + 1] && det[i] < barThreshold) {
      if (bars.length === 0 || Math.abs((i - bars[bars.length - 1]) - gratingPeriod) < gratingPeriod * 0.5) {
        bars.push(i);
      }
    }
  }

  const barHalfWidth = Math.max(2, Math.round(gratingPeriod * 0.12));
  const gaps: Array<[number, number]> = [];
  if (bars.length > 0) {
    if (bars[0] > barHalfWidth * 2) gaps.push([0, bars[0] - barHalfWidth]);
    for (let i = 0; i < bars.length - 1; i++) {
      const gS = bars[i] + barHalfWidth, gE = bars[i + 1] - barHalfWidth;
      if (gE > gS + 2) gaps.push([gS, gE]);
    }
    if (bars[bars.length - 1] + barHalfWidth * 2 < perpLen) {
      gaps.push([bars[bars.length - 1] + barHalfWidth, perpLen - 1]);
    }
  }

  return { bars, gaps, detected: bars.length >= 2 };
}

// ── Multi-Strip Profile Extraction (mask-aware) ──────────────────────────────

function extractStripProfiles(
  gray: Float32Array, imgW: number, bounds: Rect, mask: Uint8Array, dir: 'h' | 'v',
  gaps: Array<[number, number]> | null, numStrips: number
): Float32Array[] {
  const paraLen = dir === 'h' ? bounds.w : bounds.h;
  const perpLen = dir === 'h' ? bounds.h : bounds.w;
  const profiles: Float32Array[] = [];

  let stripRanges: Array<[number, number]>;
  if (gaps && gaps.length > 0) {
    stripRanges = [];
    for (const [gStart, gEnd] of gaps) {
      const gapSize = gEnd - gStart;
      if (gapSize < 3) continue;
      const margin = Math.max(1, Math.floor(gapSize * 0.15));
      stripRanges.push([gStart + margin, gEnd - margin]);
    }
  } else {
    const stripH = Math.max(3, Math.floor(perpLen / numStrips));
    stripRanges = [];
    for (let s = 0; s < numStrips; s++) {
      const start = Math.floor(s * perpLen / numStrips);
      const end = Math.min(perpLen - 1, start + stripH);
      if (end > start + 1) stripRanges.push([start, end]);
    }
  }

  for (const [stripStart, stripEnd] of stripRanges) {
    const prof = new Float32Array(paraLen);
    const counts = new Float32Array(paraLen);
    for (let perp = stripStart; perp < stripEnd; perp++) {
      for (let para = 0; para < paraLen; para++) {
        const x = dir === 'h' ? bounds.x + para : bounds.x + perp;
        const y = dir === 'h' ? bounds.y + perp : bounds.y + para;
        if (x >= 0 && y >= 0 && x < imgW && mask[y * imgW + x]) {
          prof[para] += gray[y * imgW + x];
          counts[para]++;
        }
      }
    }
    let anyData = false;
    for (let i = 0; i < paraLen; i++) {
      if (counts[i] > 0) { prof[i] /= counts[i]; anyData = true; }
    }
    if (anyData) profiles.push(prof);
  }

  return profiles;
}

// ── Consensus Peak Voting ────────────────────────────────────────────────────

function consensusPeaks(
  allPeaks: number[][], profileLen: number, expectedPeriod: number
): number[] {
  if (allPeaks.length === 0) return [];

  const tolerance = Math.max(2, Math.round(expectedPeriod * 0.15));
  const votes = new Float32Array(profileLen);

  for (const peaks of allPeaks) {
    for (const p of peaks) {
      for (let d = -tolerance; d <= tolerance; d++) {
        const idx = p + d;
        if (idx >= 0 && idx < profileLen) {
          votes[idx] += Math.exp(-(d * d) / (2 * (tolerance / 2) ** 2));
        }
      }
    }
  }

  const smoothedVotes = smoothProfile(votes, Math.max(1, Math.round(tolerance * 0.3)));
  const minVotes = Math.max(1, allPeaks.length * 0.15);
  const consensusPositions: number[] = [];
  for (let i = 1; i < profileLen - 1; i++) {
    if (smoothedVotes[i] > smoothedVotes[i - 1] && smoothedVotes[i] >= smoothedVotes[i + 1]
        && smoothedVotes[i] >= minVotes) {
      if (consensusPositions.length > 0 && i - consensusPositions[consensusPositions.length - 1] < expectedPeriod * 0.4) {
        const prev = consensusPositions[consensusPositions.length - 1];
        if (smoothedVotes[i] > smoothedVotes[prev]) {
          consensusPositions[consensusPositions.length - 1] = i;
        }
      } else {
        consensusPositions.push(i);
      }
    }
  }

  return consensusPositions;
}

// ── Ridge Tracking (consensus-based uniform lean) ────────────────────────────
// All pleat ridges follow the same global lean trajectory. Individual ridges
// are NOT allowed to wander independently (which lets grating hijack them).
// Instead: sample each pleat at its original position, compute median offset
// across all pleats at each perpendicular step, smooth, and apply uniformly.

function trackRidges(
  gray: Float32Array, imgW: number, bounds: Rect, mask: Uint8Array, dir: 'h' | 'v',
  pleatPositions: number[], period: number, findBright = true
): { ridgeLines: number[][]; ridgeOffsets: number[][] } {
  const perpLen = dir === 'h' ? bounds.h : bounds.w;
  const paraLen = dir === 'h' ? bounds.w : bounds.h;
  const searchRadius = Math.max(2, Math.round(period * 0.15));
  const step = Math.max(1, Math.round(perpLen / 80));
  const numSteps = Math.ceil(perpLen / step);

  if (pleatPositions.length === 0 || numSteps === 0) {
    return { ridgeLines: [], ridgeOffsets: [] };
  }

  // Phase 1: For each pleat, sample offset at each perp step WITHOUT drift.
  // Each pleat searches near its ORIGINAL position only — no accumulation.
  const rawOffsets: Float32Array[] = [];
  for (const pleatPos of pleatPositions) {
    const offsets = new Float32Array(numSteps);
    for (let si = 0; si < numSteps; si++) {
      const perp = Math.min(si * step, perpLen - 1);
      let bestOff = 0;
      let bestVal = -Infinity;

      for (let d = -searchRadius; d <= searchRadius; d++) {
        const para = pleatPos + d;
        if (para < 0 || para >= paraLen) continue;
        const x = dir === 'h' ? bounds.x + para : bounds.x + perp;
        const y = dir === 'h' ? bounds.y + perp : bounds.y + para;
        if (x >= 0 && y >= 0 && x < imgW && mask[y * imgW + x]) {
          const val = gray[y * imgW + x];
          // findBright=true → track brightest pixel (pleat tip facing camera)
          // findBright=false → track darkest pixel (pleat valley)
          if (findBright ? val > bestVal : val < bestVal) { bestVal = val; bestOff = d; }
        }
      }
      offsets[si] = bestOff;
    }
    rawOffsets.push(offsets);
  }

  // Phase 2: Compute median offset at each step across ALL pleats.
  // This gives the consensus "lean" — the direction all ridges tilt together.
  const medianLean = new Float32Array(numSteps);
  const sortBuf: number[] = new Array(pleatPositions.length);
  for (let si = 0; si < numSteps; si++) {
    for (let p = 0; p < pleatPositions.length; p++) sortBuf[p] = rawOffsets[p][si];
    sortBuf.sort((a, b) => a - b);
    medianLean[si] = sortBuf[Math.floor(pleatPositions.length / 2)];
  }

  // Phase 3: Smooth the lean to remove noise — the lean should be gentle.
  const smoothR = Math.max(2, Math.round(numSteps * 0.12));
  const smoothedLean = smoothProfile(medianLean, smoothR);

  // Phase 4: Apply the same smoothed lean to every pleat.
  const ridgeLines: number[][] = [];
  const ridgeOffsets: number[][] = [];
  for (let p = 0; p < pleatPositions.length; p++) {
    const line: number[] = [];
    const offsets: number[] = [];
    for (let si = 0; si < numSteps; si++) {
      const perp = Math.min(si * step, perpLen - 1);
      line.push(perp);
      offsets.push(smoothedLean[si]);
    }
    ridgeLines.push(line);
    ridgeOffsets.push(offsets);
  }

  return { ridgeLines, ridgeOffsets };
}

// ── Grid Extrapolation ───────────────────────────────────────────────────────

function extrapolateGrid(
  detectedPositions: number[], period: number, regionLen: number
): { gridPositions: number[]; count: number } {
  if (period <= 0 || detectedPositions.length === 0) {
    return { gridPositions: detectedPositions, count: detectedPositions.length };
  }

  // Constrain grid to the range where pleats were actually detected, with a
  // small margin (half a period) to allow filling small gaps at the edges —
  // but never extrapolate far beyond observed evidence.
  const sorted = [...detectedPositions].sort((a, b) => a - b);
  const rangeMin = Math.max(0, sorted[0] - period * 0.5);
  const rangeMax = Math.min(regionLen, sorted[sorted.length - 1] + period * 0.5);

  const phaseBins = Math.max(10, Math.round(period));
  const phaseVotes = new Float32Array(phaseBins);
  for (const pos of detectedPositions) {
    const phase = ((pos % period) + period) % period;
    const bin = Math.round((phase / period) * phaseBins) % phaseBins;
    phaseVotes[bin]++;
  }

  let bestPhase = 0, bestVotes = 0;
  for (let i = 0; i < phaseBins; i++) {
    if (phaseVotes[i] > bestVotes) { bestVotes = phaseVotes[i]; bestPhase = i; }
  }
  const phaseOffset = (bestPhase / phaseBins) * period;

  // Build grid only within the detected pleat range
  const gridPositions: number[] = [];
  let pos = phaseOffset;
  while (pos - period >= rangeMin) pos -= period;
  while (pos < rangeMax) {
    if (pos >= rangeMin) gridPositions.push(Math.round(pos));
    pos += period;
  }

  let matches = 0;
  const matchTolerance = period * 0.3;
  for (const gp of gridPositions) {
    for (const dp of detectedPositions) {
      if (Math.abs(gp - dp) < matchTolerance) { matches++; break; }
    }
  }

  const matchRatio = detectedPositions.length > 0 ? matches / detectedPositions.length : 0;
  if (matchRatio >= 0.5 && gridPositions.length > 0) {
    return { gridPositions, count: gridPositions.length };
  }

  return { gridPositions: detectedPositions, count: detectedPositions.length };
}

// ── Edge-Zone Multi-Line Max Counting ─────────────────────────────────────────
// Pleats near the filter frame edges are often partially hidden by the border.
// Instead of averaging, scan multiple individual lines in the top and bottom
// thirds and take the UNION of all detected peaks (if ANY line sees a pleat at
// position X, it counts). This maximises recall at the edges where some pleats
// are only visible on certain scan lines.

function edgeZoneMaxPeaks(
  gray: Float32Array, imgW: number, bounds: Rect, mask: Uint8Array,
  dir: 'h' | 'v', smoothR: number, pFactor: number, detectBright: boolean,
  expectedPeriod: number
): number[] {
  const paraLen = dir === 'h' ? bounds.w : bounds.h;
  const perpLen = dir === 'h' ? bounds.h : bounds.w;
  const thirdSize = Math.floor(perpLen / 3);
  const numLines = Math.max(3, Math.min(8, Math.floor(thirdSize / 2)));

  // Define zones: top third and bottom third of the perpendicular axis
  const zones: Array<[number, number]> = [
    [0, thirdSize],                          // top third
    [perpLen - thirdSize, perpLen],           // bottom third
  ];

  const tolerance = Math.max(2, Math.round(expectedPeriod * 0.25));
  // Collect all peak positions from all scan lines in both edge zones
  const seenPositions = new Uint8Array(paraLen);

  for (const [zStart, zEnd] of zones) {
    const zoneSpan = zEnd - zStart;
    const step = Math.max(1, Math.floor(zoneSpan / numLines));

    for (let lineIdx = 0; lineIdx < numLines; lineIdx++) {
      const perp = zStart + Math.min(Math.floor(lineIdx * step + step / 2), zoneSpan - 1);
      // Extract a single scan line (with a narrow 3-pixel band for noise reduction)
      const bandHalf = 1;
      const prof = new Float32Array(paraLen);
      const counts = new Float32Array(paraLen);
      for (let dp = -bandHalf; dp <= bandHalf; dp++) {
        const p = perp + dp;
        if (p < 0 || p >= perpLen) continue;
        for (let para = 0; para < paraLen; para++) {
          const x = dir === 'h' ? bounds.x + para : bounds.x + p;
          const y = dir === 'h' ? bounds.y + p : bounds.y + para;
          if (x >= 0 && y >= 0 && x < imgW && mask[y * imgW + x]) {
            prof[para] += gray[y * imgW + x];
            counts[para]++;
          }
        }
      }
      let anyData = false;
      for (let i = 0; i < paraLen; i++) {
        if (counts[i] > 0) { prof[i] /= counts[i]; anyData = true; }
      }
      if (!anyData) continue;

      const smooth = smoothProfile(prof, smoothR);
      const det = detrend(smooth);
      const oriented = detectBright ? det : det.map(v => -v) as Float32Array;
      const sd = stdDev(oriented);
      const peaks = findPeaks(oriented, sd * pFactor);
      for (const pk of peaks) {
        // Mark the position and a small tolerance window
        for (let d = -tolerance; d <= tolerance; d++) {
          const idx = pk + d;
          if (idx >= 0 && idx < paraLen) seenPositions[idx] = 1;
        }
      }
    }
  }

  // Convert the seen-positions bitmap back to peak positions: find cluster centers
  const edgePeaks: number[] = [];
  let i = 0;
  while (i < paraLen) {
    if (seenPositions[i]) {
      let sum = 0, count = 0;
      while (i < paraLen && seenPositions[i]) { sum += i; count++; i++; }
      edgePeaks.push(Math.round(sum / count));
    } else {
      i++;
    }
  }
  return edgePeaks;
}

// Merge edge-zone peaks into existing positions: add only peaks that are
// consistent with the detected period (near a grid line) but were missed
// by the main consensus pipeline.
function mergeEdgePeaks(
  mainPositions: number[], edgePeaks: number[], period: number, regionLen: number
): number[] {
  if (period <= 0 || edgePeaks.length === 0) return mainPositions;

  const merged = [...mainPositions];
  const minSep = period * 0.4;  // must be at least this far from existing peaks

  for (const ep of edgePeaks) {
    // Check it doesn't duplicate an existing position
    let tooClose = false;
    for (const mp of merged) {
      if (Math.abs(ep - mp) < minSep) { tooClose = true; break; }
    }
    if (tooClose) continue;

    // Check it aligns with the grid: distance to nearest grid multiple should
    // be within 30% of the period
    if (mainPositions.length >= 2) {
      let bestDist = Infinity;
      for (const mp of mainPositions) {
        const dist = Math.abs(ep - mp);
        const gridDist = dist % period;
        bestDist = Math.min(bestDist, Math.min(gridDist, period - gridDist));
      }
      if (bestDist > period * 0.3) continue;
    }

    if (ep >= 0 && ep < regionLen) merged.push(ep);
  }

  merged.sort((a, b) => a - b);
  return merged;
}

// ── Main Analysis Pipeline ───────────────────────────────────────────────────

function analyzePleats(
  gray: Float32Array, imgW: number, imgH: number, bounds: Rect, mask: Uint8Array,
  sensitivity: number, detectBright = true
): PleatResult {
  // pFactor controls peak prominence threshold: lower = more sensitive.
  // Range: ~0.57 at 5% sensitivity down to ~0.02 at 95% sensitivity.
  const pFactor = 0.60 - (sensitivity / 100) * 0.58;
  // Adaptive smoothing: use smaller radius so high-density pleats aren't blurred
  const smoothR = Math.max(1, Math.round(Math.max(bounds.w, bounds.h) * 0.002));
  const numStrips = 12;

  function analyzeDirection(dir: 'h' | 'v'): PleatResult {
    const paraLen = dir === 'h' ? bounds.w : bounds.h;

    const grating = detectGrating(gray, imgW, bounds, mask, dir);

    const profiles = extractStripProfiles(
      gray, imgW, bounds, mask, dir,
      grating.detected ? grating.gaps : null,
      numStrips
    );

    if (profiles.length === 0) {
      return { count: 0, positions: [], direction: dir, ridgeLines: [], ridgeOffsets: [],
               gratingBars: [], period: 0, gratingDetected: false, confidence: 0 };
    }

    const allPeaks: number[][] = [];
    let bestPeriodSum = 0, periodCount = 0;

    for (const rawProfile of profiles) {
      const smooth = smoothProfile(rawProfile, smoothR);
      // Optionally invert so findPeaks (which finds maxima) targets dark valleys
      const det = detrend(smooth);
      const oriented = detectBright ? det : det.map(v => -v) as Float32Array;
      const sd = stdDev(oriented);
      const peaks = findPeaks(oriented, sd * pFactor);
      if (peaks.length >= 2) allPeaks.push(peaks);

      // Wider period range: lower min for high-density (~8ppi), higher max for low-density
      const minPeriod = Math.max(2, paraLen * 0.005);
      const maxPeriod = paraLen * 0.25;
      const { period, strength } = estimatePeriodAutocorr(oriented, minPeriod, maxPeriod);
      if (strength > 0.1 && period > 0) {
        bestPeriodSum += period;
        periodCount++;
      }
    }

    const combinedProfile = new Float32Array(paraLen);
    for (const p of profiles) for (let i = 0; i < paraLen; i++) combinedProfile[i] += p[i];
    for (let i = 0; i < paraLen; i++) combinedProfile[i] /= profiles.length;
    const combinedSmooth = smoothProfile(combinedProfile, smoothR);
    const combinedDet = detrend(combinedSmooth);
    const combinedOriented = detectBright ? combinedDet : combinedDet.map(v => -v) as Float32Array;

    const minPeriod = Math.max(2, paraLen * 0.005);
    const maxPeriod = paraLen * 0.25;
    const globalPeriod = estimatePeriodAutocorr(combinedOriented, minPeriod, maxPeriod);

    const estPeriod = periodCount > 0 ? bestPeriodSum / periodCount : globalPeriod.period;

    let positions: number[];
    if (allPeaks.length >= 2 && estPeriod > 0) {
      positions = consensusPeaks(allPeaks, paraLen, estPeriod);
    } else {
      const sd = stdDev(combinedOriented);
      positions = findPeaks(combinedOriented, sd * pFactor);
    }

    const { gridPositions, count: gridCount } = extrapolateGrid(positions, estPeriod, paraLen);

    // Edge-zone multi-line max counting: scan top & bottom thirds to catch
    // pleats that are hidden by the filter frame on some scan lines.
    const edgePeaks = estPeriod > 0 ? edgeZoneMaxPeaks(
      gray, imgW, bounds, mask, dir, smoothR, pFactor, detectBright, estPeriod
    ) : [];
    const finalPositions = mergeEdgePeaks(gridPositions, edgePeaks, estPeriod, paraLen);
    const count = finalPositions.length;

    const { ridgeLines, ridgeOffsets } = trackRidges(
      gray, imgW, bounds, mask, dir, finalPositions, estPeriod, detectBright
    );

    const periodConfidence = globalPeriod.strength;
    const stripAgreement = allPeaks.length / Math.max(1, profiles.length);
    const confidence = Math.min(1, periodConfidence * 0.5 + stripAgreement * 0.5);

    return {
      count, positions: finalPositions, direction: dir,
      ridgeLines, ridgeOffsets, gratingBars: grating.bars,
      period: estPeriod, gratingDetected: grating.detected, confidence,
    };
  }

  const hResult = analyzeDirection('h');
  const vResult = analyzeDirection('v');

  const hScore = hResult.confidence * hResult.count * (hResult.gratingDetected ? 1.2 : 1);
  const vScore = vResult.confidence * vResult.count * (vResult.gratingDetected ? 1.2 : 1);

  if (hScore >= vScore && hResult.count > 0) return hResult;
  if (vResult.count > 0) return vResult;
  if (hResult.count > 0) return hResult;
  return vResult.count > 0 ? vResult : { ...hResult, count: 0, positions: [], direction: 'h' };
}

// ── Canvas Overlay ────────────────────────────────────────────────────────────

function drawOverlay(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  quad: Quad,
  bounds: Rect,
  result: PleatResult,
  showOverlay = true
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: cw, height: ch } = canvas;
  const { positions, direction: dir, ridgeLines, ridgeOffsets, gratingBars, gratingDetected } = result;

  ctx.drawImage(img, 0, 0, cw, ch);

  // When overlay is hidden, still show corner handles so the quad is draggable
  if (!showOverlay) {
    drawCornerHandles(ctx, quad, cw);
    return;
  }

  // Darken area outside the quad using evenodd fill
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath();
  ctx.rect(0, 0, cw, ch);
  // Inner path counter-clockwise to punch hole via evenodd
  ctx.moveTo(quad[3][0], quad[3][1]);
  ctx.lineTo(quad[2][0], quad[2][1]);
  ctx.lineTo(quad[1][0], quad[1][1]);
  ctx.lineTo(quad[0][0], quad[0][1]);
  ctx.closePath();
  ctx.fill('evenodd');

  // Quad outline
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = Math.max(1.5, cw / 400);
  ctx.setLineDash([8, 5]);
  ctx.beginPath();
  ctx.moveTo(quad[0][0], quad[0][1]);
  ctx.lineTo(quad[1][0], quad[1][1]);
  ctx.lineTo(quad[2][0], quad[2][1]);
  ctx.lineTo(quad[3][0], quad[3][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner accents at each quad vertex
  const cl = 18;
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = Math.max(2, cw / 300);
  for (let i = 0; i < 4; i++) {
    const curr = quad[i];
    const prev = quad[(i + 3) % 4];
    const next = quad[(i + 1) % 4];

    // Direction vectors toward adjacent corners
    let dpx = prev[0] - curr[0], dpy = prev[1] - curr[1];
    let dnx = next[0] - curr[0], dny = next[1] - curr[1];
    const dpLen = Math.sqrt(dpx * dpx + dpy * dpy) || 1;
    const dnLen = Math.sqrt(dnx * dnx + dny * dny) || 1;
    dpx = dpx / dpLen * cl; dpy = dpy / dpLen * cl;
    dnx = dnx / dnLen * cl; dny = dny / dnLen * cl;

    ctx.beginPath();
    ctx.moveTo(curr[0] + dpx, curr[1] + dpy);
    ctx.lineTo(curr[0], curr[1]);
    ctx.lineTo(curr[0] + dnx, curr[1] + dny);
    ctx.stroke();
  }

  if (positions.length === 0) return;

  // Grating bar indicators
  if (gratingDetected && gratingBars.length > 0) {
    ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)';
    ctx.lineWidth = Math.max(1, cw / 500);
    ctx.setLineDash([4, 4]);
    for (const barPos of gratingBars) {
      ctx.beginPath();
      if (dir === 'h') {
        const y = bounds.y + barPos;
        ctx.moveTo(bounds.x, y);
        ctx.lineTo(bounds.x + bounds.w, y);
      } else {
        const x = bounds.x + barPos;
        ctx.moveTo(x, bounds.y);
        ctx.lineTo(x, bounds.y + bounds.h);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // Ridge lines
  if (ridgeLines.length > 0 && ridgeOffsets.length > 0) {
    ctx.lineWidth = Math.max(1, cw / 600);
    for (let p = 0; p < positions.length; p++) {
      if (p >= ridgeLines.length || p >= ridgeOffsets.length) break;
      const rLine = ridgeLines[p];
      const rOff = ridgeOffsets[p];
      if (rLine.length < 2) continue;

      ctx.strokeStyle = 'rgba(0, 191, 255, 0.45)';
      ctx.beginPath();
      for (let k = 0; k < rLine.length; k++) {
        const para = positions[p] + rOff[k];
        const perp = rLine[k];
        const x = dir === 'h' ? bounds.x + para : bounds.x + perp;
        const y = dir === 'h' ? bounds.y + perp : bounds.y + para;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // Counting line — follows perspective by connecting midpoints of opposite quad sides
  ctx.strokeStyle = 'rgba(255, 214, 10, 0.85)';
  ctx.lineWidth = Math.max(2, cw / 350);
  ctx.setLineDash([]);
  let lineStart: Pt, lineEnd: Pt;
  if (dir === 'h') {
    // Connect midpoints of left side (TL-BL) and right side (TR-BR)
    lineStart = [(quad[0][0] + quad[3][0]) / 2, (quad[0][1] + quad[3][1]) / 2];
    lineEnd = [(quad[1][0] + quad[2][0]) / 2, (quad[1][1] + quad[2][1]) / 2];
  } else {
    // Connect midpoints of top side (TL-TR) and bottom side (BL-BR)
    lineStart = [(quad[0][0] + quad[1][0]) / 2, (quad[0][1] + quad[1][1]) / 2];
    lineEnd = [(quad[3][0] + quad[2][0]) / 2, (quad[3][1] + quad[2][1]) / 2];
  }
  ctx.beginPath();
  ctx.moveTo(lineStart[0], lineStart[1]);
  ctx.lineTo(lineEnd[0], lineEnd[1]);
  ctx.stroke();

  // Tick marks at pleat positions along the counting line
  ctx.strokeStyle = 'rgba(255, 82, 82, 0.7)';
  ctx.lineWidth = Math.max(1, cw / 600);
  const tickLen = Math.max(8, Math.min(bounds.w, bounds.h) * 0.04);
  const paraLen = dir === 'h' ? bounds.w : bounds.h;

  // Direction perpendicular to the counting line (for tick orientation)
  const ldx = lineEnd[0] - lineStart[0], ldy = lineEnd[1] - lineStart[1];
  const lineLen = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
  const perpX = -ldy / lineLen, perpY = ldx / lineLen;

  for (const pos of positions) {
    const t = paraLen > 0 ? pos / paraLen : 0;
    const px = lineStart[0] + t * ldx;
    const py = lineStart[1] + t * ldy;

    ctx.beginPath();
    ctx.moveTo(px - perpX * tickLen, py - perpY * tickLen);
    ctx.lineTo(px + perpX * tickLen, py + perpY * tickLen);
    ctx.stroke();
  }

  // Pleat number labels
  const labelEvery = positions.length > 30 ? 5 : positions.length > 15 ? 3 : 2;
  ctx.font = `${Math.max(9, Math.round(cw / 80))}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.textAlign = 'center';
  for (let i = 0; i < positions.length; i++) {
    if (i % labelEvery !== 0 && i !== positions.length - 1) continue;
    const t = paraLen > 0 ? positions[i] / paraLen : 0;
    const px = lineStart[0] + t * ldx;
    const py = lineStart[1] + t * ldy;
    ctx.fillText(String(i + 1), px - perpX * (tickLen + 8), py - perpY * (tickLen + 8));
  }

  // Draggable corner handles — drawn last so they sit on top
  drawCornerHandles(ctx, quad, cw);
}

/** Draws filled circles at each quad corner as drag handles. */
function drawCornerHandles(ctx: CanvasRenderingContext2D, quad: Quad, cw: number) {
  const handleR = Math.max(6, Math.round(cw / 100));
  for (const [x, y] of quad) {
    ctx.beginPath();
    ctx.arc(x, y, handleR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 230, 118, 0.85)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'white';
    ctx.stroke();
  }
}

/** Lightweight redraw for live corner dragging — shows image + quad outline + handles only. */
function drawQuadPreview(canvas: HTMLCanvasElement, img: HTMLImageElement, quad: Quad) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: cw, height: ch } = canvas;

  ctx.drawImage(img, 0, 0, cw, ch);

  // Darken outside
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath();
  ctx.rect(0, 0, cw, ch);
  ctx.moveTo(quad[3][0], quad[3][1]);
  ctx.lineTo(quad[2][0], quad[2][1]);
  ctx.lineTo(quad[1][0], quad[1][1]);
  ctx.lineTo(quad[0][0], quad[0][1]);
  ctx.closePath();
  ctx.fill('evenodd');

  // Quad outline
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = Math.max(1.5, cw / 400);
  ctx.setLineDash([8, 5]);
  ctx.beginPath();
  ctx.moveTo(quad[0][0], quad[0][1]);
  ctx.lineTo(quad[1][0], quad[1][1]);
  ctx.lineTo(quad[2][0], quad[2][1]);
  ctx.lineTo(quad[3][0], quad[3][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  drawCornerHandles(ctx, quad, cw);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PleatCounterPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [pleatCountStr, setPleatCountStr] = useState('');
  const [pleatDetected, setPleatDetected] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [sensitivity, setSensitivity] = useState(50);
  const [width, setWidth] = useState('');
  const [length, setLength] = useState('');
  const [pleatHeight, setPleatHeight] = useState('');
  const [panels, setPanels] = useState('1');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('ft²');
  const [analysisInfo, setAnalysisInfo] = useState<{ gratingDetected: boolean; confidence: number; period: number } | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [detectBright, setDetectBright] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputUploadRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const grayRef = useRef<{ gray: Float32Array; w: number; h: number } | null>(null);
  const quadRef = useRef<Quad | null>(null);
  const boundsRef = useRef<Rect | null>(null);
  const maskRef = useRef<Uint8Array | null>(null);
  const dragIdxRef = useRef(-1); // which corner is being dragged (-1 = none)
  const lastResultRef = useRef<PleatResult | null>(null);
  const sensitivityRef = useRef(50);
  const showOverlayRef = useRef(true);
  const detectBrightRef = useRef(true);

  // Derived values
  const pleatCount = Math.max(0, parseInt(pleatCountStr) || 0);
  const widthMm = parseFloat(width);
  const lengthMm = parseFloat(length);
  const phMm = parseFloat(pleatHeight);
  const panelCount = Math.max(1, parseInt(panels) || 1);

  const ppi = (pleatCount > 0 && !isNaN(lengthMm) && lengthMm > 0)
    ? (pleatCount * 25.4) / lengthMm : null;
  const pitchMm = (pleatCount > 0 && !isNaN(lengthMm) && lengthMm > 0)
    ? lengthMm / pleatCount : null;
  const areaMm2 = (pleatCount > 0 && !isNaN(widthMm) && !isNaN(phMm) && widthMm > 0 && phMm > 0)
    ? pleatCount * 2 * phMm * widthMm * panelCount : null;

  function convertArea(mm2: number): number {
    if (areaUnit === 'ft²') return mm2 / 92903.04;
    if (areaUnit === 'm²') return mm2 / 1e6;
    return mm2 / 645.16;
  }

  const areaDisplay = areaMm2 !== null ? convertArea(areaMm2) : null;
  const showResults = ppi !== null || areaDisplay !== null;
  const fmt = (n: number, d: number) => n.toFixed(d).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');

  const processImage = useCallback((img: HTMLImageElement, sens: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cw = img.naturalWidth, ch = img.naturalHeight;
    if (Math.max(cw, ch) > MAX_DIM) {
      const scale = MAX_DIM / Math.max(cw, ch);
      cw = Math.round(cw * scale);
      ch = Math.round(ch * scale);
    }
    canvas.width = cw;
    canvas.height = ch;
    ctx.drawImage(img, 0, 0, cw, ch);

    setLoadingStatus('Detecting filter boundary\u2026');

    requestAnimationFrame(() => {
      setTimeout(() => {
        const imageData = ctx.getImageData(0, 0, cw, ch);
        const gray = toGrayscale(imageData.data);
        grayRef.current = { gray, w: cw, h: ch };
        imgRef.current = img;

        setLoadingStatus('Detecting grating & analyzing pleats\u2026');

        requestAnimationFrame(() => {
          setTimeout(() => {
            const quad = detectFilterQuad(gray, cw, ch);
            const bounds = quadBounds(quad);
            const mask = createQuadMask(quad, cw, ch);
            quadRef.current = quad;
            boundsRef.current = bounds;
            maskRef.current = mask;

            const result = analyzePleats(gray, cw, ch, bounds, mask, sens, detectBrightRef.current);
            lastResultRef.current = result;
            setPleatCountStr(String(result.count));
            setPleatDetected(result.count > 0);
            setAnalysisInfo({
              gratingDetected: result.gratingDetected,
              confidence: result.confidence,
              period: result.period,
            });
            setAnalyzing(false);
            setLoadingStatus(null);
            drawOverlay(canvas, img, quad, bounds, result, showOverlayRef.current);
          }, 0);
        });
      }, 0);
    });
  }, []);

  const reanalyze = useCallback((sens: number) => {
    const gd = grayRef.current, img = imgRef.current,
          quad = quadRef.current, bounds = boundsRef.current,
          mask = maskRef.current, canvas = canvasRef.current;
    if (!gd || !img || !quad || !bounds || !mask || !canvas) return;
    const result = analyzePleats(gd.gray, gd.w, gd.h, bounds, mask, sens, detectBrightRef.current);
    lastResultRef.current = result;
    setPleatCountStr(String(result.count));
    setPleatDetected(result.count > 0);
    setAnalysisInfo({
      gratingDetected: result.gratingDetected,
      confidence: result.confidence,
      period: result.period,
    });
    drawOverlay(canvas, img, quad, bounds, result, showOverlayRef.current);
  }, []);

  // Reanalyze after quad corners are moved by the user
  const reanalyzeWithQuad = useCallback((newQuad: Quad) => {
    const gd = grayRef.current, img = imgRef.current, canvas = canvasRef.current;
    if (!gd || !img || !canvas) return;

    const bounds = quadBounds(newQuad);
    const mask = createQuadMask(newQuad, gd.w, gd.h);
    quadRef.current = newQuad;
    boundsRef.current = bounds;
    maskRef.current = mask;

    const result = analyzePleats(gd.gray, gd.w, gd.h, bounds, mask, sensitivityRef.current, detectBrightRef.current);
    lastResultRef.current = result;
    setPleatCountStr(String(result.count));
    setPleatDetected(result.count > 0);
    setAnalysisInfo({
      gratingDetected: result.gratingDetected,
      confidence: result.confidence,
      period: result.period,
    });
    drawOverlay(canvas, img, newQuad, bounds, result, showOverlayRef.current);
  }, []);

  const loadFile = useCallback((file: File) => {
    const isImage = file.type.startsWith('image/')
      || /\.(heic|heif|jpg|jpeg|png|webp|avif|bmp|tiff?)$/i.test(file.name);
    if (!isImage) return;

    setAnalyzing(true);
    setLoadingStatus('Loading image\u2026');
    setImageSrc(null);
    setAnalysisInfo(null);

    const url = URL.createObjectURL(file);

    requestAnimationFrame(() => {
      setImageSrc(url);
      const img = new Image();
      img.onload = () => processImage(img, sensitivityRef.current);
      img.onerror = () => {
        setAnalyzing(false);
        setLoadingStatus(null);
        setImageSrc(null);
      };
      img.src = url;
    });
  }, [processImage]);

  const handleCapture = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragActive(true); };
  const handleDragLeave = (e: DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragActive(false);
  };
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  const handleSensitivityChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSensitivity(val);
    sensitivityRef.current = val;
    reanalyze(val);
  };

  const handleToggleOverlay = () => {
    const next = !showOverlayRef.current;
    showOverlayRef.current = next;
    setShowOverlay(next);
    // Redraw without re-analyzing
    const canvas = canvasRef.current, img = imgRef.current,
          quad = quadRef.current, bounds = boundsRef.current,
          result = lastResultRef.current;
    if (canvas && img && quad && bounds && result) {
      drawOverlay(canvas, img, quad, bounds, result, next);
    }
  };

  const handleToggleDetectBright = (bright: boolean) => {
    detectBrightRef.current = bright;
    setDetectBright(bright);
    reanalyze(sensitivityRef.current);
  };

  const handleReset = () => {
    setImageSrc(null);
    setAnalyzing(false);
    setLoadingStatus(null);
    setPleatCountStr('');
    setPleatDetected(false);
    setAnalysisInfo(null);
    imgRef.current = null;
    grayRef.current = null;
    quadRef.current = null;
    boundsRef.current = null;
    maskRef.current = null;
    lastResultRef.current = null;
    dragIdxRef.current = -1;
  };

  // ── Canvas corner drag handlers ──────────────────────────────────────────
  const canvasToPixel = useCallback((clientX: number, clientY: number): Pt | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return [(clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY];
  }, []);

  const findNearestCorner = useCallback((px: number, py: number): number => {
    const quad = quadRef.current;
    if (!quad) return -1;
    const canvas = canvasRef.current;
    const hitR = Math.max(18, (canvas?.width || 500) / 30);
    let bestIdx = -1, bestDist = hitR * hitR;
    for (let i = 0; i < 4; i++) {
      const dx = quad[i][0] - px, dy = quad[i][1] - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) { bestDist = d2; bestIdx = i; }
    }
    return bestIdx;
  }, []);

  const handlePointerDown = useCallback((px: number, py: number) => {
    const idx = findNearestCorner(px, py);
    if (idx >= 0) dragIdxRef.current = idx;
  }, [findNearestCorner]);

  const handlePointerMove = useCallback((px: number, py: number) => {
    const idx = dragIdxRef.current;
    const quad = quadRef.current;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (idx < 0 || !quad || !img || !canvas) return;

    // Clamp to canvas bounds
    const cx = Math.max(0, Math.min(canvas.width - 1, px));
    const cy = Math.max(0, Math.min(canvas.height - 1, py));

    // Update corner
    const newQuad: Quad = [...quad] as Quad;
    newQuad[idx] = [cx, cy];
    quadRef.current = newQuad;

    // Lightweight preview (no reanalysis during drag)
    drawQuadPreview(canvas, img, newQuad);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragIdxRef.current < 0) return;
    dragIdxRef.current = -1;
    const quad = quadRef.current;
    if (quad) reanalyzeWithQuad(quad);
  }, [reanalyzeWithQuad]);

  const onCanvasMouseDown = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
    const pt = canvasToPixel(e.clientX, e.clientY);
    if (pt) handlePointerDown(pt[0], pt[1]);
  }, [canvasToPixel, handlePointerDown]);

  const onCanvasMouseMove = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (dragIdxRef.current < 0) return;
    e.preventDefault();
    const pt = canvasToPixel(e.clientX, e.clientY);
    if (pt) handlePointerMove(pt[0], pt[1]);
  }, [canvasToPixel, handlePointerMove]);

  const onCanvasMouseUp = useCallback(() => {
    handlePointerUp();
  }, [handlePointerUp]);

  const onCanvasTouchStart = useCallback((e: ReactTouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const pt = canvasToPixel(t.clientX, t.clientY);
    if (pt && findNearestCorner(pt[0], pt[1]) >= 0) {
      e.preventDefault(); // prevent scroll when starting a corner drag
      handlePointerDown(pt[0], pt[1]);
    }
  }, [canvasToPixel, findNearestCorner, handlePointerDown]);

  const onCanvasTouchMove = useCallback((e: ReactTouchEvent<HTMLCanvasElement>) => {
    if (dragIdxRef.current < 0 || e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    const pt = canvasToPixel(t.clientX, t.clientY);
    if (pt) handlePointerMove(pt[0], pt[1]);
  }, [canvasToPixel, handlePointerMove]);

  const onCanvasTouchEnd = useCallback(() => {
    handlePointerUp();
  }, [handlePointerUp]);

  // Attach global mousemove/mouseup so dragging outside the canvas still works
  useEffect(() => {
    const onGlobalMouseMove = (e: globalThis.MouseEvent) => {
      if (dragIdxRef.current < 0) return;
      e.preventDefault();
      const pt = canvasToPixel(e.clientX, e.clientY);
      if (pt) handlePointerMove(pt[0], pt[1]);
    };
    const onGlobalMouseUp = () => handlePointerUp();
    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
    };
  }, [canvasToPixel, handlePointerMove, handlePointerUp]);

  const increment = () => setPleatCountStr((s: string) => String((parseInt(s) || 0) + 1));
  const decrement = () => setPleatCountStr((s: string) => String(Math.max(0, (parseInt(s) || 0) - 1)));

  const adjBtn: CSSProperties = {
    width: 48, height: 48, minWidth: 48,
    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
    background: 'var(--surface)', color: 'var(--text-primary)',
    fontSize: '1.5rem', fontWeight: 300, lineHeight: 1,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    transition: 'border-color 0.15s, background 0.15s',
  };

  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        {/* Header */}
        <div className="page-header">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            <Link href="/projects" style={{ color: 'var(--accent-secondary)' }}>Projects</Link>
            {' / '}Machine Vision Pleat Counting
          </p>
          <h1 className="section-title">
            <span className="gradient-text">Machine Vision Pleat Counting</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Upload a photo of a filter — pleats are counted through grating obstructions using multi-strip analysis, autocorrelation, and ridge tracking
          </p>
        </div>

        {/* Main content */}
        <div style={{ maxWidth: 720, margin: '0 auto 4rem' }}>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            capture="environment"
            onChange={handleCapture}
            style={{ display: 'none' }}
          />
          <input
            ref={fileInputUploadRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleCapture}
            style={{ display: 'none' }}
          />

          {/* Full-screen loading overlay (shown before canvas is ready) */}
          {analyzing && !imageSrc && (
            <div style={{
              border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(16px)',
              padding: '3rem 2rem',
              textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '1rem', minHeight: 220,
            }}>
              <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: 'var(--accent-secondary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                {loadingStatus || 'Loading image\u2026'}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Large photos may take a moment to decode
              </p>
            </div>
          )}

          {/* Capture Zone / Canvas */}
          {!imageSrc && !analyzing ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${isDragActive ? 'var(--accent-secondary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)',
                background: isDragActive ? 'rgba(0,184,148,0.05)' : 'var(--glass-bg)',
                backdropFilter: 'blur(16px)',
                padding: '3rem 2rem',
                textAlign: 'center',
                transition: 'border-color 0.2s, background 0.2s',
                cursor: 'default',
              }}
            >
              <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.4rem' }}>
                Photograph your filter
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem', maxWidth: 380, margin: '0 auto 1.75rem' }}>
                Take a photo or upload an image of the filter&apos;s pleated media — pleats will be counted automatically, even through grating
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: '1rem', padding: '0.8rem 1.75rem' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Take Photo
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => fileInputUploadRef.current?.click()}
                  style={{ fontSize: '1rem', padding: '0.8rem 1.75rem' }}
                >
                  Upload Image
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '0.5rem' }}>
              {/* Canvas */}
              <div style={{ position: 'relative' }}>
                <canvas
                  ref={canvasRef}
                  onMouseDown={onCanvasMouseDown}
                  onMouseMove={onCanvasMouseMove}
                  onMouseUp={onCanvasMouseUp}
                  onTouchStart={onCanvasTouchStart}
                  onTouchMove={onCanvasTouchMove}
                  onTouchEnd={onCanvasTouchEnd}
                  style={{ width: '100%', height: 'auto', borderRadius: 'var(--radius-md)', display: 'block', touchAction: 'none', cursor: 'default' }}
                />
                {analyzing && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(26,26,46,0.6)', borderRadius: 'var(--radius-md)',
                    gap: '0.75rem',
                  }}>
                    <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#00e676', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>{loadingStatus || 'Analyzing pleats\u2026'}</p>
                  </div>
                )}
              </div>

              {/* Legend + Retake row — below the image, never overlapping corner handles */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: 12, height: 2, background: '#00e676', borderRadius: 2, display: 'inline-block' }} />
                    Filter boundary
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: 12, height: 2, background: 'rgba(0,191,255,0.6)', borderRadius: 2, display: 'inline-block' }} />
                    Ridge lines
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: 12, height: 2, background: 'rgba(255,214,10,0.85)', borderRadius: 2, display: 'inline-block' }} />
                    Counting line
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: 12, height: 2, background: 'rgba(255,82,82,0.7)', borderRadius: 2, display: 'inline-block' }} />
                    Detected pleats
                  </span>
                  {analysisInfo?.gratingDetected && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: 12, height: 2, background: 'rgba(255,165,0,0.5)', borderRadius: 2, display: 'inline-block' }} />
                      Grating bars
                    </span>
                  )}
                </div>
                <button
                  onClick={handleReset}
                  style={{
                    flexShrink: 0,
                    background: 'var(--surface)', color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem',
                    cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                    letterSpacing: '0.02em',
                  }}
                >
                  Retake
                </button>
              </div>
            </div>
          )}

          {/* Analysis info banner */}
          {imageSrc && !analyzing && analysisInfo && (
            <div style={{
              marginTop: '1rem', padding: '0.6rem 1rem',
              background: analysisInfo.gratingDetected ? 'rgba(255,165,0,0.08)' : 'rgba(0,184,148,0.06)',
              border: `1px solid ${analysisInfo.gratingDetected ? 'rgba(255,165,0,0.2)' : 'rgba(0,184,148,0.15)'}`,
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem', color: 'var(--text-secondary)',
              display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center',
            }}>
              {analysisInfo.gratingDetected && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ color: 'rgba(255,165,0,0.9)', fontWeight: 700, fontSize: '0.85rem' }}>GRATING DETECTED</span>
                  <span style={{ color: 'var(--text-muted)' }}>&mdash; counting through obstructions</span>
                </span>
              )}
              <span>Confidence: <strong>{Math.round(analysisInfo.confidence * 100)}%</strong></span>
              {analysisInfo.period > 0 && (
                <span>Period: <strong>{analysisInfo.period.toFixed(1)}px</strong></span>
              )}
            </div>
          )}

          {/* Detection controls */}
          {imageSrc && (
            <div style={{
              marginTop: '0.75rem', padding: '0.9rem 1.1rem',
              background: 'var(--surface)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex', flexDirection: 'column', gap: '0.75rem',
            }}>

              {/* Sensitivity slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Detection Sensitivity
                  </label>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {sensitivity}%
                  </span>
                </div>
                <input
                  type="range" min={5} max={95} step={5}
                  value={sensitivity}
                  onChange={handleSensitivityChange}
                  style={{ width: '100%', accentColor: 'var(--accent-secondary)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  <span>Selective (strong pleats only)</span>
                  <span>Sensitive (catches subtle pleats)</span>
                </div>
              </div>

              {/* Pleat feature toggle: bright tips vs dark valleys */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Count Feature
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {([true, false] as const).map((bright) => (
                    <button
                      key={String(bright)}
                      onClick={() => handleToggleDetectBright(bright)}
                      style={{
                        flex: 1, padding: '0.35rem 0.5rem',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        borderRadius: 'var(--radius-sm)',
                        border: detectBright === bright
                          ? '1.5px solid var(--accent-secondary)'
                          : '1.5px solid var(--border-subtle)',
                        background: detectBright === bright
                          ? 'rgba(0,184,148,0.12)'
                          : 'transparent',
                        color: detectBright === bright
                          ? 'var(--accent-secondary)'
                          : 'var(--text-muted)',
                      }}
                    >
                      {bright ? 'Bright peaks (pleat tips)' : 'Dark valleys'}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  {detectBright
                    ? 'Lines snap to bright pleat tips facing the camera'
                    : 'Lines snap to dark valleys between pleats'}
                </div>
              </div>

              {/* Overlay visibility toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Show Overlay
                </span>
                <button
                  onClick={handleToggleOverlay}
                  style={{
                    padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 600,
                    cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                    border: '1.5px solid var(--border-subtle)',
                    background: showOverlay ? 'rgba(0,184,148,0.12)' : 'transparent',
                    color: showOverlay ? 'var(--accent-secondary)' : 'var(--text-muted)',
                  }}
                >
                  {showOverlay ? 'On' : 'Off'}
                </button>
              </div>

            </div>
          )}

          {/* Calculator Card */}
          <div className="calculator-card" style={{ marginTop: '1.25rem' }}>

            {/* Pleat count display */}
            <div className="calc-field">
              <label className="calc-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Pleat Count
                {imageSrc && pleatDetected && (
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent-secondary)',
                    background: 'rgba(0,184,148,0.1)', padding: '0.1rem 0.45rem',
                    borderRadius: 999, letterSpacing: '0.04em',
                  }}>
                    AUTO-DETECTED
                  </span>
                )}
              </label>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <button onClick={decrement} style={adjBtn} aria-label="Decrease pleat count">&minus;</button>
                <input
                  type="number"
                  inputMode="numeric"
                  className="calc-input"
                  value={pleatCountStr}
                  onChange={e => setPleatCountStr(e.target.value)}
                  placeholder="0"
                  min={0}
                  style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.5rem', flex: 1 }}
                />
                <button onClick={increment} style={adjBtn} aria-label="Increase pleat count">+</button>
              </div>
              {imageSrc && !analyzing && !pleatDetected && (
                <p style={{ fontSize: '0.8rem', color: 'var(--accent-warm)', marginTop: '0.4rem' }}>
                  No clear pattern detected — try raising sensitivity or enter count manually
                </p>
              )}
            </div>

            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.25rem 0 1.25rem' }} />

            {/* Measurement inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0 1.25rem' }}>
              <div className="calc-field">
                <label className="calc-label">
                  Width <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(mm) &mdash; along pleat edge</span>
                </label>
                <input type="number" inputMode="decimal" className="calc-input"
                  placeholder="e.g. 500" value={width} onChange={e => setWidth(e.target.value)} />
              </div>
              <div className="calc-field">
                <label className="calc-label">
                  Length <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(mm) &mdash; direction of counting pleats</span>
                </label>
                <input type="number" inputMode="decimal" className="calc-input"
                  placeholder="e.g. 300" value={length} onChange={e => setLength(e.target.value)} />
              </div>
              <div className="calc-field">
                <label className="calc-label">
                  Pleat Height <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(mm) &mdash; fold depth</span>
                </label>
                <input type="number" inputMode="decimal" className="calc-input"
                  placeholder="e.g. 28" value={pleatHeight} onChange={e => setPleatHeight(e.target.value)} />
              </div>
              <div className="calc-field" style={{ marginBottom: 0 }}>
                <label className="calc-label">Panels</label>
                <input type="number" inputMode="numeric" className="calc-input"
                  placeholder="1" min={1} value={panels} onChange={e => setPanels(e.target.value)} />
              </div>
            </div>

            {/* Results */}
            {showResults && (
              <div style={{
                marginTop: '1.5rem', padding: '1.25rem',
                background: 'rgba(0,184,148,0.07)',
                border: '1px solid rgba(0,184,148,0.2)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.25rem' }}>

                  {areaDisplay !== null && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <span className="calc-result-label" style={{ marginBottom: 0 }}>Media Area</span>
                        <select
                          value={areaUnit}
                          onChange={e => setAreaUnit(e.target.value as AreaUnit)}
                          style={{
                            fontSize: '0.72rem', fontWeight: 700,
                            background: 'transparent', border: 'none',
                            color: 'var(--accent-secondary)', cursor: 'pointer', outline: 'none',
                          }}
                        >
                          <option value="ft²">ft²</option>
                          <option value="m²">m²</option>
                          <option value="in²">in²</option>
                        </select>
                      </div>
                      <div className="calc-result-value">{fmt(areaDisplay, 2)}</div>
                      <div className="calc-result-detail">{areaUnit}</div>
                    </div>
                  )}

                  {ppi !== null && (
                    <div>
                      <div className="calc-result-label">Pleats / Inch</div>
                      <div className="calc-result-value">{fmt(ppi, 2)}</div>
                      <div className="calc-result-detail">PPI</div>
                    </div>
                  )}

                  {pitchMm !== null && (
                    <div>
                      <div className="calc-result-label">Pleat Pitch</div>
                      <div className="calc-result-value">{fmt(pitchMm, 1)}</div>
                      <div className="calc-result-detail">mm / pleat</div>
                    </div>
                  )}

                  {areaDisplay !== null && !isNaN(widthMm) && !isNaN(lengthMm) && widthMm > 0 && lengthMm > 0 && (
                    <div>
                      <div className="calc-result-label">Media : Face</div>
                      <div className="calc-result-value">
                        {fmt(areaMm2! / (widthMm * lengthMm * panelCount), 2)}
                        <span style={{ fontSize: '1rem', fontWeight: 400 }}>&times;</span>
                      </div>
                      <div className="calc-result-detail">expansion ratio</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <Footer />
    </main>
  );
}
