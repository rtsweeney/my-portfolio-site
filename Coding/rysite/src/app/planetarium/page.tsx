'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Footer from '@/components/Footer';
import {
  CONSTELLATIONS,
  getVisibleConstellations,
  localSiderealTime,
  projectToSkyMap,
  raDecToAltAz,
  azimuthToCompass,
  describeDirection,
  type Constellation,
} from './constellations';

interface VisibleConstellation extends Constellation {
  altitude: number;
  azimuth: number;
  compass: string;
  directionHint: string;
}

interface Location {
  lat: number;
  lon: number;
  name: string;
}

export default function PlanetariumPage() {
  const [date, setDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [location, setLocation] = useState<Location>({ lat: 40.7128, lon: -74.006, name: 'New York, NY' });
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [visibleConstellations, setVisibleConstellations] = useState<VisibleConstellation[]>([]);
  const [selectedConstellation, setSelectedConstellation] = useState<VisibleConstellation | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get user's geolocation on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      setLocationStatus('loading');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            name: `${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`,
          });
          setLocationStatus('success');
        },
        () => {
          setLocationStatus('error');
        },
        { timeout: 10000 }
      );
    }
  }, []);

  // Calculate visible constellations whenever inputs change
  useEffect(() => {
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const observeDate = new Date(year, month - 1, day, hours, minutes);

    const visible = getVisibleConstellations(observeDate, location.lat, location.lon) as VisibleConstellation[];
    setVisibleConstellations(visible);

    // If selected constellation is no longer visible, deselect
    if (selectedConstellation && !visible.find(c => c.name === selectedConstellation.name)) {
      setSelectedConstellation(null);
    }
  }, [date, time, location, selectedConstellation]);

  // Draw sky map on canvas
  const drawSkyMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displaySize = Math.min(canvas.parentElement?.clientWidth || 500, 500);
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    ctx.scale(dpr, dpr);

    const cx = displaySize / 2;
    const cy = displaySize / 2;
    const radius = displaySize / 2 - 30;

    // Clear
    ctx.clearRect(0, 0, displaySize, displaySize);

    // Sky background
    const skyGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    skyGrad.addColorStop(0, '#0a0a2e');
    skyGrad.addColorStop(0.7, '#0d1137');
    skyGrad.addColorStop(1, '#151845');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = skyGrad;
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Altitude rings
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.1)';
    ctx.lineWidth = 1;
    for (let alt = 30; alt < 90; alt += 30) {
      const r = ((90 - alt) / 90) * radius;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cardinal direction lines
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.08)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.stroke();

    // Direction labels
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(108, 92, 231, 0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, cy - radius - 14);
    ctx.fillText('S', cx, cy + radius + 14);
    ctx.fillText('E', cx + radius + 14, cy);
    ctx.fillText('W', cx - radius - 14, cy);

    // Calculate current LST
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const observeDate = new Date(year, month - 1, day, hours, minutes);
    const lst = localSiderealTime(observeDate, location.lon);

    // Draw background stars (random faint dots for atmosphere)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    // Use a seeded-like approach based on date for consistency
    const seed = year * 10000 + month * 100 + day;
    for (let i = 0; i < 200; i++) {
      const pseudoRandom = ((seed * (i + 1) * 9301 + 49297) % 233280) / 233280;
      const pseudoRandom2 = ((seed * (i + 1) * 7393 + 38291) % 177311) / 177311;
      const angle = pseudoRandom * Math.PI * 2;
      const dist = Math.sqrt(pseudoRandom2) * radius;
      const sx = cx + Math.cos(angle) * dist;
      const sy = cy + Math.sin(angle) * dist;
      const size = 0.5 + pseudoRandom * 1;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw constellations
    for (const constellation of CONSTELLATIONS) {
      // Project all stars
      const projectedStars = constellation.stars.map(star =>
        projectToSkyMap(star.ra, star.dec, location.lat, lst)
      );

      const anyVisible = projectedStars.some(p => p !== null);
      if (!anyVisible) continue;

      const isSelected = selectedConstellation?.name === constellation.name;
      const isVisible = visibleConstellations.some(vc => vc.name === constellation.name);

      // Draw constellation lines
      ctx.strokeStyle = isSelected
        ? 'rgba(0, 184, 148, 0.8)'
        : isVisible
          ? 'rgba(108, 92, 231, 0.35)'
          : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = isSelected ? 2 : 1;

      for (const line of constellation.lines) {
        const from = projectedStars[line.from];
        const to = projectedStars[line.to];
        if (!from || !to) continue;

        ctx.beginPath();
        ctx.moveTo(cx + from.x * radius, cy + from.y * radius);
        ctx.lineTo(cx + to.x * radius, cy + to.y * radius);
        ctx.stroke();
      }

      // Draw stars
      for (let i = 0; i < projectedStars.length; i++) {
        const proj = projectedStars[i];
        if (!proj) continue;

        const star = constellation.stars[i];
        const starSize = Math.max(1, 4 - star.mag * 0.8);

        const sx = cx + proj.x * radius;
        const sy = cy + proj.y * radius;

        if (isSelected) {
          // Glow effect for selected constellation
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, starSize * 3);
          glow.addColorStop(0, 'rgba(0, 184, 148, 0.6)');
          glow.addColorStop(1, 'rgba(0, 184, 148, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(sx, sy, starSize * 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#00e6b8';
        } else if (isVisible) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        }

        ctx.beginPath();
        ctx.arc(sx, sy, starSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw constellation name if selected or visible
      if (isSelected || isVisible) {
        const centerProj = projectToSkyMap(constellation.ra, constellation.dec, location.lat, lst);
        if (centerProj) {
          ctx.font = isSelected ? '600 12px system-ui, sans-serif' : '500 10px system-ui, sans-serif';
          ctx.fillStyle = isSelected ? '#00e6b8' : 'rgba(255, 255, 255, 0.5)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(
            constellation.name,
            cx + centerProj.x * radius,
            cy + centerProj.y * radius - 10
          );
        }
      }
    }

    // Draw zenith marker
    ctx.fillStyle = 'rgba(108, 92, 231, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [date, time, location, selectedConstellation, visibleConstellations]);

  useEffect(() => {
    drawSkyMap();

    const handleResize = () => drawSkyMap();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawSkyMap]);

  // Handle canvas click to select constellations
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const displaySize = rect.width;
    const cx = displaySize / 2;
    const cy = displaySize / 2;
    const radius = displaySize / 2 - 30;

    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const observeDate = new Date(year, month - 1, day, hours, minutes);
    const lst = localSiderealTime(observeDate, location.lon);

    // Find closest constellation center to click
    let closestDist = Infinity;
    let closestConstellation: VisibleConstellation | null = null;

    for (const vc of visibleConstellations) {
      const proj = projectToSkyMap(vc.ra, vc.dec, location.lat, lst);
      if (!proj) continue;

      const sx = cx + proj.x * radius;
      const sy = cy + proj.y * radius;
      const dist = Math.sqrt((clickX - sx) ** 2 + (clickY - sy) ** 2);

      if (dist < 40 && dist < closestDist) {
        closestDist = dist;
        closestConstellation = vc;
      }
    }

    setSelectedConstellation(closestConstellation);
  };

  const handleManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      setLocation({ lat, lon, name: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°` });
      setShowManualInput(false);
      setLocationStatus('success');
    }
  };

  const handleRetryGeolocation = () => {
    if ('geolocation' in navigator) {
      setLocationStatus('loading');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            name: `${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`,
          });
          setLocationStatus('success');
          setShowManualInput(false);
        },
        () => {
          setLocationStatus('error');
        },
        { timeout: 10000 }
      );
    }
  };

  // Get selected constellation's star positions for the detail panel
  const getStarDetails = () => {
    if (!selectedConstellation) return [];

    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const observeDate = new Date(year, month - 1, day, hours, minutes);
    const lst = localSiderealTime(observeDate, location.lon);

    return selectedConstellation.stars.map(star => {
      const { altitude, azimuth } = raDecToAltAz(star.ra, star.dec, location.lat, lst);
      return {
        ...star,
        altitude,
        azimuth,
        compass: azimuthToCompass(azimuth),
        visible: altitude > 0,
      };
    });
  };

  const currentMonth = new Date(date).getMonth() + 1;
  const inSeasonConstellations = visibleConstellations.filter(c => c.bestMonths.includes(currentMonth));

  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <Link href="/projects" className="planetarium-breadcrumb">
            Projects
          </Link>
          <h1 className="section-title">
            <span className="gradient-text">Planetarium</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Explore what&apos;s in the sky tonight — find constellations visible from your location
          </p>
        </div>

        {/* Controls */}
        <div className="planetarium-controls">
          <div className="planetarium-control-group">
            <div className="calc-field">
              <label className="calc-label">Date</label>
              <input
                type="date"
                className="calc-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="calc-field">
              <label className="calc-label">Time</label>
              <input
                type="time"
                className="calc-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="planetarium-location">
            <label className="calc-label">Location</label>
            <div className="planetarium-location-row">
              <div className="planetarium-location-display">
                {locationStatus === 'loading' && 'Detecting location...'}
                {locationStatus === 'success' && location.name}
                {locationStatus === 'error' && `Using default: ${location.name}`}
                {locationStatus === 'idle' && location.name}
              </div>
              <button
                className="planetarium-location-btn"
                onClick={handleRetryGeolocation}
                title="Detect my location"
              >
                &#128205;
              </button>
              <button
                className="planetarium-location-btn"
                onClick={() => setShowManualInput(!showManualInput)}
                title="Enter coordinates manually"
              >
                &#9998;
              </button>
            </div>
            {showManualInput && (
              <div className="planetarium-manual-location">
                <input
                  type="number"
                  className="calc-input"
                  placeholder="Latitude (-90 to 90)"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  min={-90}
                  max={90}
                  step="0.01"
                />
                <input
                  type="number"
                  className="calc-input"
                  placeholder="Longitude (-180 to 180)"
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                  min={-180}
                  max={180}
                  step="0.01"
                />
                <button className="calc-btn" onClick={handleManualLocation} style={{ marginTop: 0 }}>
                  Set Location
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Dashboard */}
        <div className="planetarium-dashboard">
          {/* Sky Map */}
          <div className="planetarium-skymap-container">
            <h2 className="planetarium-panel-title">Sky Map</h2>
            <p className="planetarium-panel-subtitle">
              Click a constellation to see viewing details
            </p>
            <div className="planetarium-canvas-wrapper">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                style={{ cursor: 'pointer' }}
              />
            </div>
            <div className="planetarium-skymap-legend">
              <span className="planetarium-legend-item">
                <span className="planetarium-legend-dot planetarium-legend-dot--visible" />
                Visible
              </span>
              <span className="planetarium-legend-item">
                <span className="planetarium-legend-dot planetarium-legend-dot--selected" />
                Selected
              </span>
              <span className="planetarium-legend-item">
                <span className="planetarium-legend-dot planetarium-legend-dot--dim" />
                Below horizon
              </span>
            </div>
          </div>

          {/* Detail Panel */}
          <div className="planetarium-detail-panel">
            {selectedConstellation ? (
              <div className="planetarium-detail-content">
                <h2 className="planetarium-detail-name">{selectedConstellation.name}</h2>
                <p className="planetarium-detail-abbr">{selectedConstellation.abbreviation}</p>

                {/* Where to look */}
                <div className="planetarium-direction-card">
                  <div className="planetarium-direction-label">Where to look</div>
                  <div className="planetarium-direction-compass">{selectedConstellation.compass}</div>
                  <div className="planetarium-direction-hint">{selectedConstellation.directionHint}</div>
                  <div className="planetarium-direction-stats">
                    <div>
                      <span className="planetarium-stat-label">Altitude</span>
                      <span className="planetarium-stat-value">{selectedConstellation.altitude.toFixed(1)}°</span>
                    </div>
                    <div>
                      <span className="planetarium-stat-label">Azimuth</span>
                      <span className="planetarium-stat-value">{selectedConstellation.azimuth.toFixed(1)}°</span>
                    </div>
                  </div>
                </div>

                <p className="planetarium-detail-desc">{selectedConstellation.description}</p>

                <div className="planetarium-detail-section">
                  <h3 className="planetarium-detail-section-title">Best Viewing Months</h3>
                  <div className="planetarium-months">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                      <span
                        key={m}
                        className={`planetarium-month ${selectedConstellation.bestMonths.includes(i + 1) ? 'planetarium-month--active' : ''} ${i + 1 === currentMonth ? 'planetarium-month--current' : ''}`}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="planetarium-detail-section">
                  <h3 className="planetarium-detail-section-title">Notable Stars</h3>
                  <div className="planetarium-stars-list">
                    {getStarDetails().map(star => (
                      <div key={star.name} className={`planetarium-star-item ${star.visible ? '' : 'planetarium-star-item--hidden'}`}>
                        <div className="planetarium-star-name">
                          {star.name}
                          <span className="planetarium-star-mag">mag {star.mag.toFixed(1)}</span>
                        </div>
                        <div className="planetarium-star-pos">
                          {star.visible
                            ? `${star.compass} · ${star.altitude.toFixed(0)}° alt`
                            : 'Below horizon'
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="planetarium-detail-empty">
                <div className="planetarium-detail-empty-icon">&#127776;</div>
                <h3>Select a Constellation</h3>
                <p>Click on a constellation in the sky map or choose one from the list below to see detailed viewing information.</p>
              </div>
            )}
          </div>
        </div>

        {/* Visible Constellations List */}
        <div className="planetarium-list-section">
          <h2 className="planetarium-panel-title">
            Visible Tonight
            <span className="planetarium-count">{visibleConstellations.length}</span>
          </h2>
          {inSeasonConstellations.length > 0 && inSeasonConstellations.length < visibleConstellations.length && (
            <p className="planetarium-panel-subtitle">
              {inSeasonConstellations.length} of {visibleConstellations.length} are in their best viewing season
            </p>
          )}

          {visibleConstellations.length === 0 ? (
            <div className="planetarium-empty-sky">
              <p>No constellations visible above the horizon at this time and location. Try adjusting the time or date.</p>
            </div>
          ) : (
            <div className="planetarium-constellation-grid">
              {visibleConstellations.map(c => (
                <button
                  key={c.name}
                  className={`planetarium-constellation-card ${selectedConstellation?.name === c.name ? 'planetarium-constellation-card--selected' : ''} ${c.bestMonths.includes(currentMonth) ? 'planetarium-constellation-card--inseason' : ''}`}
                  onClick={() => setSelectedConstellation(
                    selectedConstellation?.name === c.name ? null : c
                  )}
                >
                  <div className="planetarium-constellation-card-header">
                    <span className="planetarium-constellation-name">{c.name}</span>
                    <span className="planetarium-constellation-alt">{c.altitude.toFixed(0)}°</span>
                  </div>
                  <div className="planetarium-constellation-direction">
                    {c.directionHint}
                  </div>
                  {c.bestMonths.includes(currentMonth) && (
                    <span className="planetarium-season-badge">In Season</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
