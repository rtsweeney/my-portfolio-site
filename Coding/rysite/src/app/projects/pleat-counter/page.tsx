'use client';

import { useState, useRef, useCallback, type CSSProperties, type ChangeEvent, type DragEvent } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';

type AreaUnit = 'ft²' | 'm²' | 'in²';

export default function PleatCounterPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pleatCountStr, setPleatCountStr] = useState('');
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

  const MAX_DIM = 1000;

  // Load and display image on canvas (no CV processing yet — Part 2)
  const displayImage = useCallback((img: HTMLImageElement) => {
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
    imgRef.current = img;
    setAnalyzing(false);
  }, []);

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setAnalyzing(true);
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { setImageSrc(url); displayImage(img); };
    img.src = url;
  }, [displayImage]);

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
    setPleatCountStr('');
    imgRef.current = null;
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

          {/* Sensitivity slider (visible after capture) — wired up in Part 2 */}
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
                onChange={e => setSensitivity(Number(e.target.value))}
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
              {imageSrc && !analyzing && pleatCount === 0 && (
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
