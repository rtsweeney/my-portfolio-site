'use client';

import { useState, useRef, useCallback, type CSSProperties, type ChangeEvent, type DragEvent } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

type AreaUnit = 'ft²' | 'm²' | 'in²';
interface Rect { x: number; y: number; w: number; h: number }

interface PleatResult {
  count: number;
  positions: number[];
  direction: 'h' | 'v';
  ridgeLines: number[][];   // for each pleat: array of perpendicular positions where ridge was tracked
  ridgeOffsets: number[][];  // lateral offset at each tracked position (how much ridge wandered)
  gratingBars: number[];     // positions of detected grating bars (perpendicular to pleats)
  period: number;            // estimated pleat spacing in pixels
  gratingDetected: boolean;
  confidence: number;        // 0-1 confidence in the count
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

// ── Enhanced Filter Region Detection ─────────────────────────────────────────
// Uses gradient energy + brightness to better isolate filter media from frame/background

function detectFilterRegion(gray: Float32Array, w: number, h: number): Rect {
  const blurR = Math.max(2, Math.round(Math.min(w, h) * 0.005));
  const blurred = boxBlur(gray, w, h, blurR);
  const t = otsuThreshold(blurred);

  // Compute gradient magnitude for edge-energy based detection
  const gradEnergy = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx = blurred[y * w + x + 1] - blurred[y * w + x - 1];
      const gy = blurred[(y + 1) * w + x] - blurred[(y - 1) * w + x];
      gradEnergy[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // Combine brightness and texture (gradient energy) for row/col scoring
  const rowBright = new Float32Array(h);
  const colBright = new Float32Array(w);
  const rowTexture = new Float32Array(h);
  const colTexture = new Float32Array(w);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (blurred[idx] > t) { rowBright[y]++; colBright[x]++; }
      rowTexture[y] += gradEnergy[idx];
      colTexture[x] += gradEnergy[idx];
    }
  }

  // Normalize texture scores
  let maxRowTex = 0, maxColTex = 0;
  for (let y = 0; y < h; y++) maxRowTex = Math.max(maxRowTex, rowTexture[y]);
  for (let x = 0; x < w; x++) maxColTex = Math.max(maxColTex, colTexture[x]);
  if (maxRowTex > 0) for (let y = 0; y < h; y++) rowTexture[y] /= maxRowTex;
  if (maxColTex > 0) for (let x = 0; x < w; x++) colTexture[x] /= maxColTex;

  // Combined score: brightness coverage + texture presence
  const rowScore = new Float32Array(h);
  const colScore = new Float32Array(w);
  for (let y = 0; y < h; y++) rowScore[y] = (rowBright[y] / w) * 0.6 + rowTexture[y] * 0.4;
  for (let x = 0; x < w; x++) colScore[x] = (colBright[x] / h) * 0.6 + colTexture[x] * 0.4;

  // Find region boundaries using a threshold on combined score
  const scoreThreshR = 0.25;
  const scoreThreshC = 0.25;
  let top = 0, bottom = h - 1, left = 0, right = w - 1;
  for (let y = 0; y < h; y++) { if (rowScore[y] >= scoreThreshR) { top = y; break; } }
  for (let y = h - 1; y >= 0; y--) { if (rowScore[y] >= scoreThreshR) { bottom = y; break; } }
  for (let x = 0; x < w; x++) { if (colScore[x] >= scoreThreshC) { left = x; break; } }
  for (let x = w - 1; x >= 0; x--) { if (colScore[x] >= scoreThreshC) { right = x; break; } }

  const rw = right - left + 1, rh = bottom - top + 1;
  if (rw < w * 0.18 || rh < h * 0.18) {
    const mx = Math.round(w * 0.075), my = Math.round(h * 0.075);
    return { x: mx, y: my, w: w - 2 * mx, h: h - 2 * my };
  }
  const ins = Math.round(Math.min(rw, rh) * 0.02);
  return { x: left + ins, y: top + ins, w: rw - 2 * ins, h: rh - 2 * ins };
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
// Finds dominant periodic spacing by computing autocorrelation of a 1D signal.
// Much more robust to partial occlusion than simple peak counting.

function estimatePeriodAutocorr(profile: Float32Array, minPeriod: number, maxPeriod: number): { period: number; strength: number } {
  const n = profile.length;
  // Normalize
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

  // Compute autocorrelation for lags in [minPeriod, maxPeriod]
  const minLag = Math.max(2, Math.floor(minPeriod));
  const maxLag = Math.min(Math.floor(n / 2), Math.ceil(maxPeriod));
  const acf = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) sum += centered[i] * centered[i + lag];
    acf[lag] = sum / energy;
  }

  // Find first significant peak in autocorrelation
  let bestLag = 0, bestVal = -Infinity;
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (acf[lag] > acf[lag - 1] && acf[lag] >= acf[lag + 1] && acf[lag] > bestVal) {
      bestVal = acf[lag];
      bestLag = lag;
      break; // take the first (fundamental) peak
    }
  }

  // If no clear peak found, try global max
  if (bestLag === 0) {
    for (let lag = minLag; lag <= maxLag; lag++) {
      if (acf[lag] > bestVal) { bestVal = acf[lag]; bestLag = lag; }
    }
  }

  // Parabolic interpolation for sub-pixel accuracy
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

// ── Grating Detection ────────────────────────────────────────────────────────
// Detects periodic grating bars running perpendicular to pleats.
// Returns positions of grating bars and gaps between them.

function detectGrating(
  gray: Float32Array, imgW: number, region: Rect, pleatDir: 'h' | 'v'
): { bars: number[]; gaps: Array<[number, number]>; detected: boolean } {
  // The grating runs perpendicular to pleats.
  // For horizontal pleats, grating bars are vertical (detected in the vertical profile).
  // For vertical pleats, grating bars are horizontal (detected in the horizontal profile).
  const perpLen = pleatDir === 'h' ? region.h : region.w;
  const paraLen = pleatDir === 'h' ? region.w : region.h;

  // Build profile perpendicular to pleats (averaging along pleat direction)
  const profile = new Float32Array(perpLen);
  const margin = 0.1;
  const paraStart = Math.floor(paraLen * margin);
  const paraEnd = Math.floor(paraLen * (1 - margin));
  const paraCount = paraEnd - paraStart;
  if (paraCount <= 0) return { bars: [], gaps: [], detected: false };

  for (let perp = 0; perp < perpLen; perp++) {
    let sum = 0;
    for (let para = paraStart; para < paraEnd; para++) {
      const x = pleatDir === 'h' ? region.x + para : region.x + perp;
      const y = pleatDir === 'h' ? region.y + perp : region.y + para;
      sum += gray[y * imgW + x];
    }
    profile[perp] = sum / paraCount;
  }

  // Smooth and detrend
  const smoothR = Math.max(1, Math.round(perpLen * 0.005));
  const smoothed = smoothProfile(profile, smoothR);
  const det = detrend(smoothed);

  // Look for grating period — grating bars are usually wider-spaced than pleats
  const minGratingPeriod = Math.max(5, perpLen * 0.03);
  const maxGratingPeriod = perpLen * 0.25;
  const { period: gratingPeriod, strength } = estimatePeriodAutocorr(det, minGratingPeriod, maxGratingPeriod);

  // Grating detection threshold: need reasonable periodicity
  if (strength < 0.15 || gratingPeriod < minGratingPeriod) {
    return { bars: [], gaps: [], detected: false };
  }

  // Find the dark bars (grating bars are typically darker)
  const sd = stdDev(det);
  const barThreshold = -sd * 0.3; // bars are valleys (dark)
  const bars: number[] = [];

  // Find valleys (dark bars)
  for (let i = 1; i < perpLen - 1; i++) {
    if (det[i] < det[i - 1] && det[i] <= det[i + 1] && det[i] < barThreshold) {
      // Check it's roughly consistent with the grating period
      if (bars.length === 0 || Math.abs((i - bars[bars.length - 1]) - gratingPeriod) < gratingPeriod * 0.5) {
        bars.push(i);
      }
    }
  }

  // Estimate bar width (typically ~15-30% of grating period)
  const barHalfWidth = Math.max(2, Math.round(gratingPeriod * 0.12));

  // Compute gaps between bars
  const gaps: Array<[number, number]> = [];
  if (bars.length > 0) {
    // Gap before first bar
    if (bars[0] > barHalfWidth * 2) {
      gaps.push([0, bars[0] - barHalfWidth]);
    }
    // Gaps between bars
    for (let i = 0; i < bars.length - 1; i++) {
      const gapStart = bars[i] + barHalfWidth;
      const gapEnd = bars[i + 1] - barHalfWidth;
      if (gapEnd > gapStart + 2) gaps.push([gapStart, gapEnd]);
    }
    // Gap after last bar
    if (bars[bars.length - 1] + barHalfWidth * 2 < perpLen) {
      gaps.push([bars[bars.length - 1] + barHalfWidth, perpLen - 1]);
    }
  }

  return { bars, gaps, detected: bars.length >= 2 };
}

// ── Multi-Strip Profile Extraction ───────────────────────────────────────────
// Extracts intensity profiles from multiple strips, preferring gaps between grating bars.

function extractStripProfiles(
  gray: Float32Array, imgW: number, region: Rect, dir: 'h' | 'v',
  gaps: Array<[number, number]> | null, numStrips: number
): Float32Array[] {
  const paraLen = dir === 'h' ? region.w : region.h;
  const perpLen = dir === 'h' ? region.h : region.w;
  const profiles: Float32Array[] = [];

  // Determine strip positions
  let stripRanges: Array<[number, number]>;
  if (gaps && gaps.length > 0) {
    // Sample within each gap
    stripRanges = [];
    for (const [gStart, gEnd] of gaps) {
      const gapSize = gEnd - gStart;
      if (gapSize < 3) continue;
      // Use the middle portion of each gap for cleaner signal
      const margin = Math.max(1, Math.floor(gapSize * 0.15));
      stripRanges.push([gStart + margin, gEnd - margin]);
    }
  } else {
    // No grating detected — divide into uniform strips
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
    const count = stripEnd - stripStart;
    if (count <= 0) continue;
    for (let perp = stripStart; perp < stripEnd; perp++) {
      for (let para = 0; para < paraLen; para++) {
        const x = dir === 'h' ? region.x + para : region.x + perp;
        const y = dir === 'h' ? region.y + perp : region.y + para;
        prof[para] += gray[y * imgW + x];
      }
    }
    for (let i = 0; i < paraLen; i++) prof[i] /= count;
    profiles.push(prof);
  }

  return profiles;
}

// ── Consensus Peak Voting ────────────────────────────────────────────────────
// Merges peaks from multiple strips using a vote accumulator.
// Peaks at similar positions across strips reinforce each other.

function consensusPeaks(
  allPeaks: number[][], profileLen: number, expectedPeriod: number
): number[] {
  if (allPeaks.length === 0) return [];

  // Create vote accumulator with some tolerance for positional jitter
  const tolerance = Math.max(2, Math.round(expectedPeriod * 0.15));
  const votes = new Float32Array(profileLen);

  for (const peaks of allPeaks) {
    for (const p of peaks) {
      // Gaussian-weighted vote centered on peak position
      for (let d = -tolerance; d <= tolerance; d++) {
        const idx = p + d;
        if (idx >= 0 && idx < profileLen) {
          const weight = Math.exp(-(d * d) / (2 * (tolerance / 2) ** 2));
          votes[idx] += weight;
        }
      }
    }
  }

  // Smooth the vote accumulator slightly
  const smoothedVotes = smoothProfile(votes, Math.max(1, Math.round(tolerance * 0.3)));

  // Find peaks in vote accumulator
  const minVotes = Math.max(1, allPeaks.length * 0.15);
  const consensusPositions: number[] = [];
  for (let i = 1; i < profileLen - 1; i++) {
    if (smoothedVotes[i] > smoothedVotes[i - 1] && smoothedVotes[i] >= smoothedVotes[i + 1]
        && smoothedVotes[i] >= minVotes) {
      // Merge with previous if too close
      if (consensusPositions.length > 0 && i - consensusPositions[consensusPositions.length - 1] < expectedPeriod * 0.4) {
        // Keep the one with more votes
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

// ── Ridge Tracking ───────────────────────────────────────────────────────────
// For each pleat position, tracks the ridge perpendicular to the pleat direction.
// Follows the local intensity maximum across grating bars and gaps.

function trackRidges(
  gray: Float32Array, imgW: number, region: Rect, dir: 'h' | 'v',
  pleatPositions: number[], period: number, gratingBars: number[]
): { ridgeLines: number[][]; ridgeOffsets: number[][] } {
  const perpLen = dir === 'h' ? region.h : region.w;
  const searchRadius = Math.max(2, Math.round(period * 0.2));
  const step = Math.max(1, Math.round(perpLen / 100)); // sample every few pixels

  // Create grating bar mask for quick lookup
  const barHalfWidth = Math.max(2, Math.round(period * 0.1));
  const isGratingBar = new Uint8Array(perpLen);
  for (const bar of gratingBars) {
    for (let d = -barHalfWidth; d <= barHalfWidth; d++) {
      const idx = bar + d;
      if (idx >= 0 && idx < perpLen) isGratingBar[idx] = 1;
    }
  }

  const ridgeLines: number[][] = [];
  const ridgeOffsets: number[][] = [];

  for (const pleatPos of pleatPositions) {
    const line: number[] = [];
    const offsets: number[] = [];
    let currentPos = pleatPos;

    for (let perp = 0; perp < perpLen; perp += step) {
      // At this perpendicular position, find the local maximum near expected pleat position
      let bestPos = currentPos;
      let bestVal = -Infinity;

      for (let d = -searchRadius; d <= searchRadius; d++) {
        const para = currentPos + d;
        if (para < 0 || para >= (dir === 'h' ? region.w : region.h)) continue;

        const x = dir === 'h' ? region.x + para : region.x + perp;
        const y = dir === 'h' ? region.y + perp : region.y + para;
        const val = gray[y * imgW + x];

        if (val > bestVal) {
          bestVal = val;
          bestPos = para;
        }
      }

      line.push(perp);
      offsets.push(bestPos - pleatPos);

      // If not on a grating bar, allow the tracker to update position
      // On grating bars, maintain predicted trajectory to bridge the gap
      if (!isGratingBar[perp]) {
        currentPos = bestPos;
      }
      // else: keep currentPos as-is, effectively extrapolating through the grating
    }

    ridgeLines.push(line);
    ridgeOffsets.push(offsets);
  }

  return { ridgeLines, ridgeOffsets };
}

// ── Grid Extrapolation ───────────────────────────────────────────────────────
// Uses estimated period to project a regular grid of expected pleat positions.
// Fills in any pleats missed by peak detection due to occlusion.

function extrapolateGrid(
  detectedPositions: number[], period: number, regionLen: number
): { gridPositions: number[]; count: number } {
  if (period <= 0 || detectedPositions.length === 0) {
    return { gridPositions: detectedPositions, count: detectedPositions.length };
  }

  // Find the best phase alignment by voting
  // Phase = position mod period
  const phaseBins = Math.max(10, Math.round(period));
  const phaseVotes = new Float32Array(phaseBins);
  for (const pos of detectedPositions) {
    const phase = ((pos % period) + period) % period;
    const bin = Math.round((phase / period) * phaseBins) % phaseBins;
    phaseVotes[bin]++;
  }

  // Find best phase
  let bestPhase = 0, bestVotes = 0;
  for (let i = 0; i < phaseBins; i++) {
    if (phaseVotes[i] > bestVotes) { bestVotes = phaseVotes[i]; bestPhase = i; }
  }
  const phaseOffset = (bestPhase / phaseBins) * period;

  // Generate grid: all positions = phaseOffset + n*period within region
  const gridPositions: number[] = [];
  let pos = phaseOffset;
  // Walk backwards to find the first grid position
  while (pos - period >= 0) pos -= period;
  // Now walk forwards through the region
  while (pos < regionLen) {
    if (pos >= 0) {
      gridPositions.push(Math.round(pos));
    }
    pos += period;
  }

  // Validate: each grid position should have a detected peak nearby, or be in a gap
  // (i.e., the grid should mostly agree with detected peaks)
  let matches = 0;
  const matchTolerance = period * 0.3;
  for (const gp of gridPositions) {
    for (const dp of detectedPositions) {
      if (Math.abs(gp - dp) < matchTolerance) { matches++; break; }
    }
  }

  // If grid matches detected peaks well, use the grid (fills in gaps)
  // If not, fall back to detected positions
  const matchRatio = detectedPositions.length > 0 ? matches / detectedPositions.length : 0;
  if (matchRatio >= 0.5 && gridPositions.length > 0) {
    return { gridPositions, count: gridPositions.length };
  }

  return { gridPositions: detectedPositions, count: detectedPositions.length };
}

// ── Main Analysis Pipeline ───────────────────────────────────────────────────

function analyzePleats(
  gray: Float32Array, imgW: number, imgH: number, region: Rect, sensitivity: number
): PleatResult {
  const pFactor = 0.55 - (sensitivity / 100) * 0.50;
  const smoothR = Math.max(1, Math.round(Math.max(region.w, region.h) * 0.003));
  const numStrips = 12;

  function analyzeDirection(dir: 'h' | 'v'): PleatResult {
    const paraLen = dir === 'h' ? region.w : region.h;

    // Step 1: Detect grating (perpendicular to pleats)
    const grating = detectGrating(gray, imgW, region, dir);

    // Step 2: Extract profiles from multiple strips (between grating bars if detected)
    const profiles = extractStripProfiles(
      gray, imgW, region, dir,
      grating.detected ? grating.gaps : null,
      numStrips
    );

    if (profiles.length === 0) {
      return { count: 0, positions: [], direction: dir, ridgeLines: [], ridgeOffsets: [],
               gratingBars: [], period: 0, gratingDetected: false, confidence: 0 };
    }

    // Step 3: Process each strip profile and collect peaks
    const allPeaks: number[][] = [];
    let bestPeriodSum = 0, periodCount = 0;

    for (const rawProfile of profiles) {
      const smooth = smoothProfile(rawProfile, smoothR);
      const det = detrend(smooth);
      const sd = stdDev(det);
      const peaks = findPeaks(det, sd * pFactor);
      if (peaks.length >= 2) allPeaks.push(peaks);

      // Estimate period for this strip
      const minPeriod = Math.max(3, paraLen * 0.01);
      const maxPeriod = paraLen * 0.15;
      const { period, strength } = estimatePeriodAutocorr(det, minPeriod, maxPeriod);
      if (strength > 0.1 && period > 0) {
        bestPeriodSum += period;
        periodCount++;
      }
    }

    // Step 4: Get combined profile for global period estimation
    const combinedProfile = new Float32Array(paraLen);
    for (const p of profiles) for (let i = 0; i < paraLen; i++) combinedProfile[i] += p[i];
    for (let i = 0; i < paraLen; i++) combinedProfile[i] /= profiles.length;
    const combinedSmooth = smoothProfile(combinedProfile, smoothR);
    const combinedDet = detrend(combinedSmooth);

    const minPeriod = Math.max(3, paraLen * 0.01);
    const maxPeriod = paraLen * 0.15;
    const globalPeriod = estimatePeriodAutocorr(combinedDet, minPeriod, maxPeriod);

    // Best period: prefer per-strip average if available, else global
    const estPeriod = periodCount > 0
      ? bestPeriodSum / periodCount
      : globalPeriod.period;

    // Step 5: Consensus voting across strips
    let positions: number[];
    if (allPeaks.length >= 2 && estPeriod > 0) {
      positions = consensusPeaks(allPeaks, paraLen, estPeriod);
    } else {
      // Fall back to combined profile peak detection
      const sd = stdDev(combinedDet);
      positions = findPeaks(combinedDet, sd * pFactor);
    }

    // Step 6: Grid extrapolation to fill gaps from occlusion
    const { gridPositions, count } = extrapolateGrid(positions, estPeriod, paraLen);

    // Step 7: Ridge tracking
    const { ridgeLines, ridgeOffsets } = trackRidges(
      gray, imgW, region, dir, gridPositions, estPeriod, grating.bars
    );

    // Confidence scoring
    const periodConfidence = globalPeriod.strength;
    const stripAgreement = allPeaks.length / Math.max(1, profiles.length);
    const confidence = Math.min(1, periodConfidence * 0.5 + stripAgreement * 0.5);

    return {
      count,
      positions: gridPositions,
      direction: dir,
      ridgeLines,
      ridgeOffsets,
      gratingBars: grating.bars,
      period: estPeriod,
      gratingDetected: grating.detected,
      confidence,
    };
  }

  const hResult = analyzeDirection('h');
  const vResult = analyzeDirection('v');

  // Score each direction: period strength * count, with bonus for grating detection
  const hScore = hResult.confidence * hResult.count * (hResult.gratingDetected ? 1.2 : 1);
  const vScore = vResult.confidence * vResult.count * (vResult.gratingDetected ? 1.2 : 1);

  if (hScore >= vScore && hResult.count > 0) return hResult;
  if (vResult.count > 0) return vResult;

  // Fallback to whichever direction found anything
  if (hResult.count > 0) return hResult;
  return vResult.count > 0 ? vResult : { ...hResult, count: 0, positions: [], direction: 'h' };
}

// ── Canvas Overlay ────────────────────────────────────────────────────────────

function drawOverlay(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  region: Rect,
  result: PleatResult
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: cw, height: ch } = canvas;
  const { positions, direction: dir, ridgeLines, ridgeOffsets, gratingBars, gratingDetected } = result;

  ctx.drawImage(img, 0, 0, cw, ch);

  // Darken area outside the detected filter region
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fillRect(0, 0, cw, region.y);
  ctx.fillRect(0, region.y + region.h, cw, ch - region.y - region.h);
  ctx.fillRect(0, region.y, region.x, region.h);
  ctx.fillRect(region.x + region.w, region.y, cw - region.x - region.w, region.h);

  // Detected filter outline
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = Math.max(1.5, cw / 400);
  ctx.setLineDash([8, 5]);
  ctx.strokeRect(region.x, region.y, region.w, region.h);
  ctx.setLineDash([]);

  // Corner accents
  const cl = 18;
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = Math.max(2, cw / 300);
  ([[region.x, region.y, 1, 1], [region.x + region.w, region.y, -1, 1],
    [region.x, region.y + region.h, 1, -1], [region.x + region.w, region.y + region.h, -1, -1]] as number[][])
    .forEach(([cx, cy, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx + dx * cl, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + dy * cl);
      ctx.stroke();
    });

  if (positions.length === 0) return;

  // Draw grating bar indicators (if detected)
  if (gratingDetected && gratingBars.length > 0) {
    ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)';
    ctx.lineWidth = Math.max(1, cw / 500);
    ctx.setLineDash([4, 4]);
    for (const barPos of gratingBars) {
      ctx.beginPath();
      if (dir === 'h') {
        const y = region.y + barPos;
        ctx.moveTo(region.x, y);
        ctx.lineTo(region.x + region.w, y);
      } else {
        const x = region.x + barPos;
        ctx.moveTo(x, region.y);
        ctx.lineTo(x, region.y + region.h);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // Draw ridge lines — continuous lines tracking each pleat across the filter
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
        const x = dir === 'h' ? region.x + para : region.x + perp;
        const y = dir === 'h' ? region.y + perp : region.y + para;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  // Counting line — a single line across the pleats showing where counting occurs
  ctx.strokeStyle = 'rgba(255, 214, 10, 0.85)';
  ctx.lineWidth = Math.max(2, cw / 350);
  ctx.setLineDash([]);
  ctx.beginPath();
  if (dir === 'h') {
    const lineY = Math.round(region.y + region.h * 0.5);
    ctx.moveTo(region.x, lineY);
    ctx.lineTo(region.x + region.w, lineY);
  } else {
    const lineX = Math.round(region.x + region.w * 0.5);
    ctx.moveTo(lineX, region.y);
    ctx.lineTo(lineX, region.y + region.h);
  }
  ctx.stroke();

  // Pleat indicator tick marks along the counting line
  ctx.strokeStyle = 'rgba(255, 82, 82, 0.7)';
  ctx.lineWidth = Math.max(1, cw / 600);
  const tickLen = Math.max(8, Math.min(region.w, region.h) * 0.04);
  for (const pos of positions) {
    ctx.beginPath();
    if (dir === 'h') {
      const x = region.x + pos;
      const midY = region.y + region.h * 0.5;
      ctx.moveTo(x, midY - tickLen);
      ctx.lineTo(x, midY + tickLen);
    } else {
      const y = region.y + pos;
      const midX = region.x + region.w * 0.5;
      ctx.moveTo(midX - tickLen, y);
      ctx.lineTo(midX + tickLen, y);
    }
    ctx.stroke();
  }

  // Pleat number labels (small, every few pleats to avoid clutter)
  const labelEvery = positions.length > 30 ? 5 : positions.length > 15 ? 3 : 2;
  ctx.font = `${Math.max(9, Math.round(cw / 80))}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.textAlign = 'center';
  for (let i = 0; i < positions.length; i++) {
    if (i % labelEvery !== 0 && i !== positions.length - 1) continue;
    const pos = positions[i];
    if (dir === 'h') {
      const x = region.x + pos;
      const midY = region.y + region.h * 0.5;
      ctx.fillText(String(i + 1), x, midY - tickLen - 4);
    } else {
      const y = region.y + pos;
      const midX = region.x + region.w * 0.5;
      ctx.fillText(String(i + 1), midX + tickLen + 12, y + 3);
    }
  }
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputUploadRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const grayRef = useRef<{ gray: Float32Array; w: number; h: number } | null>(null);
  const regionRef = useRef<Rect | null>(null);

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
    return mm2 / 645.16; // in²
  }

  const areaDisplay = areaMm2 !== null ? convertArea(areaMm2) : null;
  const showResults = ppi !== null || areaDisplay !== null;
  const fmt = (n: number, d: number) => n.toFixed(d).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');

  // CV analysis pipeline — defers heavy work so spinner paints first
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

    setLoadingStatus('Detecting filter region\u2026');

    // Yield to the browser so the spinner/status text actually paints
    requestAnimationFrame(() => {
      setTimeout(() => {
        const imageData = ctx.getImageData(0, 0, cw, ch);
        const gray = toGrayscale(imageData.data);
        grayRef.current = { gray, w: cw, h: ch };
        imgRef.current = img;

        setLoadingStatus('Detecting grating & analyzing pleats\u2026');

        requestAnimationFrame(() => {
          setTimeout(() => {
            const region = detectFilterRegion(gray, cw, ch);
            regionRef.current = region;

            const result = analyzePleats(gray, cw, ch, region, sens);
            setPleatCountStr(String(result.count));
            setPleatDetected(result.count > 0);
            setAnalysisInfo({
              gratingDetected: result.gratingDetected,
              confidence: result.confidence,
              period: result.period,
            });
            setAnalyzing(false);
            setLoadingStatus(null);
            drawOverlay(canvas, img, region, result);
          }, 0);
        });
      }, 0);
    });
  }, []);

  const reanalyze = useCallback((sens: number) => {
    const gd = grayRef.current, img = imgRef.current,
          region = regionRef.current, canvas = canvasRef.current;
    if (!gd || !img || !region || !canvas) return;
    const result = analyzePleats(gd.gray, gd.w, gd.h, region, sens);
    setPleatCountStr(String(result.count));
    setPleatDetected(result.count > 0);
    setAnalysisInfo({
      gratingDetected: result.gratingDetected,
      confidence: result.confidence,
      period: result.period,
    });
    drawOverlay(canvas, img, region, result);
  }, []);

  const loadFile = useCallback((file: File) => {
    // Accept image/* plus HEIC/HEIF which iOS may report with non-standard types
    const isImage = file.type.startsWith('image/')
      || /\.(heic|heif|jpg|jpeg|png|webp|avif|bmp|tiff?)$/i.test(file.name);
    if (!isImage) return;

    setAnalyzing(true);
    setLoadingStatus('Loading image\u2026');
    setImageSrc(null); // ensure upload zone disappears on re-upload
    setAnalysisInfo(null);

    const url = URL.createObjectURL(file);

    // Show the loading UI immediately, then start decoding
    requestAnimationFrame(() => {
      setImageSrc(url);
      const img = new Image();
      img.onload = () => processImage(img, sensitivity);
      img.onerror = () => {
        setAnalyzing(false);
        setLoadingStatus(null);
        setImageSrc(null);
      };
      img.src = url;
    });
  }, [processImage, sensitivity]);

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
    reanalyze(val);
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
    regionRef.current = null;
  };

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
            <div style={{ position: 'relative', marginBottom: '1.75rem' }}>
              <canvas
                ref={canvasRef}
                style={{ width: '100%', height: 'auto', borderRadius: 'var(--radius-md)', display: 'block' }}
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
              <button
                onClick={handleReset}
                style={{
                  position: 'absolute', top: 10, right: 10,
                  background: 'rgba(26,26,46,0.65)', color: 'white',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 'var(--radius-sm)', padding: '0.35rem 0.75rem',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  backdropFilter: 'blur(8px)', letterSpacing: '0.02em',
                }}
              >
                Retake
              </button>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem', fontSize: '0.72rem', color: 'var(--text-muted)', flexWrap: 'wrap', position: 'absolute', bottom: -24, left: 0 }}>
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
            </div>
          )}

          {/* Analysis info banner (shown after analysis) */}
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

          {/* Sensitivity slider (visible after capture) */}
          {imageSrc && (
            <div style={{
              marginTop: '0.75rem', padding: '0.9rem 1.1rem',
              background: 'var(--surface)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Detection Sensitivity
                </label>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {sensitivity}%
                </span>
              </div>
              <input
                type="range" min={10} max={90} step={5}
                value={sensitivity}
                onChange={handleSensitivityChange}
                style={{ width: '100%', accentColor: 'var(--accent-secondary)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                <span>Selective (strong pleats only)</span>
                <span>Sensitive (catches subtle pleats)</span>
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
