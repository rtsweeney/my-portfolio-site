'use client';

import { useState, useRef, useCallback, type CSSProperties, type ChangeEvent, type DragEvent } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

type AreaUnit = 'ft²' | 'm²' | 'in²';
interface Rect { x: number; y: number; w: number; h: number }

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

// ── Filter Region Detection ───────────────────────────────────────────────────

function detectFilterRegion(gray: Float32Array, w: number, h: number): Rect {
  const blurR = Math.max(2, Math.round(Math.min(w, h) * 0.005));
  const blurred = boxBlur(gray, w, h, blurR);
  const t = otsuThreshold(blurred);

  const rowBright = new Float32Array(h);
  const colBright = new Float32Array(w);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (blurred[y * w + x] > t) { rowBright[y]++; colBright[x]++; }

  const rMin = w * 0.30, cMin = h * 0.30;
  let top = 0, bottom = h - 1, left = 0, right = w - 1;
  for (let y = 0; y < h; y++) { if (rowBright[y] >= rMin) { top = y; break; } }
  for (let y = h - 1; y >= 0; y--) { if (rowBright[y] >= rMin) { bottom = y; break; } }
  for (let x = 0; x < w; x++) { if (colBright[x] >= cMin) { left = x; break; } }
  for (let x = w - 1; x >= 0; x--) { if (colBright[x] >= cMin) { right = x; break; } }

  const rw = right - left + 1, rh = bottom - top + 1;
  if (rw < w * 0.18 || rh < h * 0.18) {
    const mx = Math.round(w * 0.075), my = Math.round(h * 0.075);
    return { x: mx, y: my, w: w - 2 * mx, h: h - 2 * my };
  }
  const ins = Math.round(Math.min(rw, rh) * 0.02);
  return { x: left + ins, y: top + ins, w: rw - 2 * ins, h: rh - 2 * ins };
}

// ── Profile Analysis & Peak Detection ─────────────────────────────────────────

function getProfile(
  gray: Float32Array, imgW: number, region: Rect, dir: 'h' | 'v'
): Float32Array {
  const margin = 0.15;
  if (dir === 'h') {
    const yS = Math.floor(region.y + region.h * margin);
    const yE = Math.floor(region.y + region.h * (1 - margin));
    const prof = new Float32Array(region.w);
    for (let y = yS; y < yE; y++)
      for (let x = 0; x < region.w; x++)
        prof[x] += gray[y * imgW + region.x + x];
    for (let x = 0; x < region.w; x++) prof[x] /= (yE - yS);
    return prof;
  } else {
    const xS = Math.floor(region.x + region.w * margin);
    const xE = Math.floor(region.x + region.w * (1 - margin));
    const prof = new Float32Array(region.h);
    for (let x = xS; x < xE; x++)
      for (let y = 0; y < region.h; y++)
        prof[y] += gray[(region.y + y) * imgW + x];
    for (let y = 0; y < region.h; y++) prof[y] /= (xE - xS);
    return prof;
  }
}

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

function periodicityScore(peaks: number[]): number {
  if (peaks.length < 3) return peaks.length * 0.5;
  const diffs = peaks.slice(1).map((p, i) => p - peaks[i]);
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  if (!mean) return 0;
  const variance = diffs.reduce((a, d) => a + (d - mean) ** 2, 0) / diffs.length;
  const cv = Math.sqrt(variance) / mean;
  return peaks.length * Math.max(0, 1 - cv);
}

function analyzePleats(
  gray: Float32Array, imgW: number, imgH: number, region: Rect, sensitivity: number
): { count: number; positions: number[]; direction: 'h' | 'v' } {
  const pFactor = 0.55 - (sensitivity / 100) * 0.50;
  const smoothR = Math.max(1, Math.round(Math.max(region.w, region.h) * 0.003));

  function analyze(dir: 'h' | 'v') {
    const raw = getProfile(gray, imgW, region, dir);
    const smooth = smoothProfile(raw, smoothR);
    const det = detrend(smooth);
    const sd = stdDev(det);
    const peaks = findPeaks(det, sd * pFactor);
    return { peaks, score: periodicityScore(peaks) };
  }

  const h = analyze('h');
  const v = analyze('v');

  if (h.score >= v.score && h.peaks.length > 0)
    return { count: h.peaks.length, positions: h.peaks, direction: 'h' };
  if (v.peaks.length > 0)
    return { count: v.peaks.length, positions: v.peaks, direction: 'v' };
  return { count: 0, positions: [], direction: 'h' };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PleatCounterPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pleatCountStr, setPleatCountStr] = useState('');
  const [pleatDetected, setPleatDetected] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [sensitivity, setSensitivity] = useState(50);
  const [width, setWidth] = useState('');
  const [length, setLength] = useState('');
  const [pleatHeight, setPleatHeight] = useState('');
  const [panels, setPanels] = useState('1');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('ft²');

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

  // CV analysis pipeline
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

    const imageData = ctx.getImageData(0, 0, cw, ch);
    const gray = toGrayscale(imageData.data);
    grayRef.current = { gray, w: cw, h: ch };
    imgRef.current = img;

    const region = detectFilterRegion(gray, cw, ch);
    regionRef.current = region;

    const result = analyzePleats(gray, cw, ch, region, sens);
    setPleatCountStr(String(result.count));
    setPleatDetected(result.count > 0);
    setAnalyzing(false);

    // Redraw base image (overlay drawing deferred to Part 3)
    ctx.drawImage(img, 0, 0, cw, ch);
  }, []);

  const reanalyze = useCallback((sens: number) => {
    const gd = grayRef.current, img = imgRef.current,
          region = regionRef.current, canvas = canvasRef.current;
    if (!gd || !img || !region || !canvas) return;
    const result = analyzePleats(gd.gray, gd.w, gd.h, region, sens);
    setPleatCountStr(String(result.count));
    setPleatDetected(result.count > 0);

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }, []);

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setAnalyzing(true);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { setImageSrc(url); processImage(img, sensitivity); };
    img.src = url;
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
    setPleatCountStr('');
    setPleatDetected(false);
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
            Upload a photo of a filter — pleats are counted and useable media area is calculated client-side
          </p>
        </div>

        {/* Main content */}
        <div style={{ maxWidth: 720, margin: '0 auto 4rem' }}>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            style={{ display: 'none' }}
          />
          <input
            ref={fileInputUploadRef}
            type="file"
            accept="image/*"
            onChange={handleCapture}
            style={{ display: 'none' }}
          />

          {/* Capture Zone / Canvas */}
          {!imageSrc ? (
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
                Take a photo or upload an image of the filter&apos;s pleated media — pleats will be counted automatically
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
            <div style={{ position: 'relative' }}>
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
                  <p style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>Analyzing pleats...</p>
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
            </div>
          )}

          {/* Sensitivity slider (visible after capture) */}
          {imageSrc && (
            <div style={{
              marginTop: '1rem', padding: '0.9rem 1.1rem',
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
                <button onClick={decrement} style={adjBtn} aria-label="Decrease pleat count">−</button>
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
                        <span style={{ fontSize: '1rem', fontWeight: 400 }}>×</span>
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
