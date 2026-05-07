'use client';

import { useState, useRef, useCallback, useEffect, type CSSProperties, type ChangeEvent, type DragEvent, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

type AreaUnit = 'ft²' | 'm²' | 'in²';
type Pt = [number, number];
type Quad = [Pt, Pt, Pt, Pt]; // TL, TR, BR, BL — clockwise

const MAX_DIM = 1000;

// ── Quad helpers ─────────────────────────────────────────────────────────────

function defaultQuad(w: number, h: number): Quad {
  const mx = Math.round(w * 0.08);
  const my = Math.round(h * 0.08);
  return [[mx, my], [w - mx, my], [w - mx, h - my], [mx, h - my]];
}

// ── Canvas drawing ───────────────────────────────────────────────────────────

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

function drawScene(canvas: HTMLCanvasElement, img: HTMLImageElement, quad: Quad) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: cw, height: ch } = canvas;

  ctx.drawImage(img, 0, 0, cw, ch);

  // Darken outside the quad using evenodd punch-hole fill
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

  // Corner accents (L-brackets along edges)
  const cl = 18;
  ctx.strokeStyle = '#00e676';
  ctx.lineWidth = Math.max(2, cw / 300);
  for (let i = 0; i < 4; i++) {
    const curr = quad[i];
    const prev = quad[(i + 3) % 4];
    const next = quad[(i + 1) % 4];

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

  drawCornerHandles(ctx, quad, cw);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PleatCounterPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [pleatCountStr, setPleatCountStr] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [width, setWidth] = useState('');
  const [length, setLength] = useState('');
  const [pleatHeight, setPleatHeight] = useState('');
  const [panels, setPanels] = useState('1');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('ft²');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputUploadRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const quadRef = useRef<Quad | null>(null);
  const dragIdxRef = useRef(-1);

  // Derived calculator values
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

  const setupImage = useCallback((img: HTMLImageElement) => {
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

    const quad = defaultQuad(cw, ch);
    quadRef.current = quad;
    imgRef.current = img;

    drawScene(canvas, img, quad);
    setAnalyzing(false);
    setLoadingStatus(null);
  }, []);

  const loadFile = useCallback((file: File) => {
    const isImage = file.type.startsWith('image/')
      || /\.(heic|heif|jpg|jpeg|png|webp|avif|bmp|tiff?)$/i.test(file.name);
    if (!isImage) return;

    setAnalyzing(true);
    setLoadingStatus('Loading image…');
    setImageSrc(null);

    const url = URL.createObjectURL(file);

    requestAnimationFrame(() => {
      setImageSrc(url);
      const img = new Image();
      img.onload = () => setupImage(img);
      img.onerror = () => {
        setAnalyzing(false);
        setLoadingStatus(null);
        setImageSrc(null);
      };
      img.src = url;
    });
  }, [setupImage]);

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

  const handleReset = () => {
    setImageSrc(null);
    setAnalyzing(false);
    setLoadingStatus(null);
    setPleatCountStr('');
    imgRef.current = null;
    quadRef.current = null;
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

    const cx = Math.max(0, Math.min(canvas.width - 1, px));
    const cy = Math.max(0, Math.min(canvas.height - 1, py));

    const newQuad: Quad = [...quad] as Quad;
    newQuad[idx] = [cx, cy];
    quadRef.current = newQuad;

    drawScene(canvas, img, newQuad);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragIdxRef.current < 0) return;
    dragIdxRef.current = -1;
  }, []);

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
      e.preventDefault();
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

  // Global mousemove/up so dragging outside the canvas still works
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
            Upload a photo of a filter, frame the pleated media with the corner handles, and enter the pleat count to compute media area and PPI
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
                {loadingStatus || 'Loading image…'}
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
                Take a photo or upload an image of the filter&apos;s pleated media — frame the media with the corner handles, then enter the pleat count
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
                    <p style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>{loadingStatus || 'Loading…'}</p>
                  </div>
                )}
              </div>

              {/* Hint + Retake row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Drag the green handles to frame the pleated media
                </span>
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

          {/* Calculator Card */}
          <div className="calculator-card" style={{ marginTop: '1.25rem' }}>

            {/* Pleat count display */}
            <div className="calc-field">
              <label className="calc-label">Pleat Count</label>
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
