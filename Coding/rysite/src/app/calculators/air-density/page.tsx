'use client';

import { useState, useEffect } from 'react';
import CalculatorLayout from '@/components/CalculatorLayout';

type TempUnit = '°F' | '°C' | 'K';
type AltUnit = 'ft' | 'm';
type DensityUnit = 'lb/ft³' | 'kg/m³' | 'g/cm³' | 'g/L' | 'slug/ft³';

// Physical constants
const Rd = 287.058;   // J/(kg·K) — specific gas constant for dry air
const Rv = 461.495;   // J/(kg·K) — specific gas constant for water vapor
const P0 = 101325;    // Pa — sea-level standard pressure
const T0 = 288.15;    // K  — sea-level standard temperature (ISA)
const L  = 0.0065;    // K/m — temperature lapse rate (troposphere)
const g  = 9.80665;   // m/s²
const M  = 0.0289644; // kg/mol — molar mass of dry air
const R  = 8.31446;   // J/(mol·K) — universal gas constant

function toKelvin(temp: number, unit: TempUnit): number {
  if (unit === '°F') return (temp - 32) * (5 / 9) + 273.15;
  if (unit === '°C') return temp + 273.15;
  return temp;
}

function toMeters(alt: number, unit: AltUnit): number {
  return unit === 'ft' ? alt * 0.3048 : alt;
}

/** ISA atmospheric pressure (Pa) at a given altitude (m). Valid up to ~20 km. */
function atmosphericPressure(altM: number): number {
  if (altM <= 11000) {
    return P0 * Math.pow(1 - (L * altM) / T0, (g * M) / (R * L));
  }
  // Stratosphere (11–20 km): isothermal layer at T11
  const P11 = P0 * Math.pow(1 - (L * 11000) / T0, (g * M) / (R * L));
  const T11 = T0 - L * 11000; // 216.65 K
  return P11 * Math.exp((-g * M * (altM - 11000)) / (R * T11));
}

/** Saturation vapor pressure (Pa) via the Buck equation. */
function saturationVaporPressure(tempC: number): number {
  return 1000 * 0.61121 * Math.exp((18.678 - tempC / 234.5) * (tempC / (257.14 + tempC)));
}

/** Air density (kg/m³) using the mixture ideal-gas law for moist air. */
function calcAirDensityKgm3(tempK: number, rhPct: number, altM: number): number {
  const tempC = tempK - 273.15;
  const P    = atmosphericPressure(altM);
  const Psat = saturationVaporPressure(tempC);
  const Pv   = (rhPct / 100) * Psat;
  const Pd   = P - Pv;
  return Pd / (Rd * tempK) + Pv / (Rv * tempK);
}

function convertDensity(rho: number, unit: DensityUnit): number {
  switch (unit) {
    case 'lb/ft³':   return rho * 0.0624279606;
    case 'kg/m³':    return rho;
    case 'g/cm³':    return rho * 0.001;
    case 'g/L':      return rho;          // 1 kg/m³ = 1 g/L
    case 'slug/ft³': return rho * 0.00194032;
  }
}

/** Pick decimal places so result always shows ~4 significant figures. */
function formatDensity(value: number): string {
  if (value === 0) return '0';
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const decimals = Math.max(0, 3 - magnitude);
  return value.toFixed(decimals + 2); // a little extra precision
}

export default function AirDensityPage() {
  const [temperature, setTemperature] = useState('');
  const [tempUnit, setTempUnit]       = useState<TempUnit>('°F');
  const [humidity, setHumidity]       = useState('');
  const [altitude, setAltitude]       = useState('0');
  const [altUnit, setAltUnit]         = useState<AltUnit>('ft');
  const [densityUnit, setDensityUnit] = useState<DensityUnit>('lb/ft³');
  const [result, setResult]           = useState<number | null>(null);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    setError(null);

    const tempNum = parseFloat(temperature);
    const rhNum   = parseFloat(humidity);
    const altNum  = parseFloat(altitude);

    if (isNaN(tempNum) || isNaN(rhNum) || isNaN(altNum)) {
      setResult(null);
      return;
    }

    if (rhNum < 0 || rhNum > 100) {
      setError('Relative humidity must be between 0% and 100%.');
      setResult(null);
      return;
    }

    const tempK = toKelvin(tempNum, tempUnit);
    if (tempK <= 0) {
      setError('Temperature must be above absolute zero.');
      setResult(null);
      return;
    }

    const altM = toMeters(altNum, altUnit);
    if (altM < 0) {
      setError('Altitude cannot be negative.');
      setResult(null);
      return;
    }

    const rhoKgm3 = calcAirDensityKgm3(tempK, rhNum, altM);
    setResult(convertDensity(rhoKgm3, densityUnit));
  }, [temperature, tempUnit, humidity, altitude, altUnit, densityUnit]);

  return (
    <CalculatorLayout
      title="Air Density Calculator"
      description="Calculate the density of air from temperature, relative humidity, and altitude."
    >
      {/* Temperature */}
      <div className="calc-field">
        <label className="calc-label">Temperature</label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="number"
            className="calc-input"
            placeholder="e.g. 59"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            className="calc-select"
            value={tempUnit}
            onChange={(e) => setTempUnit(e.target.value as TempUnit)}
            style={{ width: 'auto', minWidth: '5rem' }}
          >
            <option value="°F">°F</option>
            <option value="°C">°C</option>
            <option value="K">K</option>
          </select>
        </div>
      </div>

      {/* Relative Humidity */}
      <div className="calc-field">
        <label className="calc-label">Relative Humidity</label>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="number"
            className="calc-input"
            placeholder="e.g. 50"
            min="0"
            max="100"
            step="0.1"
            value={humidity}
            onChange={(e) => setHumidity(e.target.value)}
            style={{ flex: 1 }}
          />
          <span
            style={{
              padding: '0 0.75rem',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            %
          </span>
        </div>
      </div>

      {/* Altitude */}
      <div className="calc-field">
        <label className="calc-label">Altitude</label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="number"
            className="calc-input"
            placeholder="0 (sea level)"
            min="0"
            step="1"
            value={altitude}
            onChange={(e) => setAltitude(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            className="calc-select"
            value={altUnit}
            onChange={(e) => setAltUnit(e.target.value as AltUnit)}
            style={{ width: 'auto', minWidth: '5rem' }}
          >
            <option value="ft">ft</option>
            <option value="m">m</option>
          </select>
        </div>
      </div>

      {/* Output Units */}
      <div className="calc-field">
        <label className="calc-label">Output Units</label>
        <select
          className="calc-select"
          value={densityUnit}
          onChange={(e) => setDensityUnit(e.target.value as DensityUnit)}
        >
          <option value="lb/ft³">lb/ft³ (pounds per cubic foot)</option>
          <option value="kg/m³">kg/m³ (kilograms per cubic meter)</option>
          <option value="g/cm³">g/cm³ (grams per cubic centimeter)</option>
          <option value="g/L">g/L (grams per liter)</option>
          <option value="slug/ft³">slug/ft³ (slugs per cubic foot)</option>
        </select>
      </div>

      {error && (
        <div style={{ color: 'var(--accent-warm)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          {error}
        </div>
      )}

      {result !== null && !error && (
        <div className="calc-result">
          <div className="calc-result-label">Air Density</div>
          <div className="calc-result-value" style={{ fontSize: '2rem' }}>
            {formatDensity(result)}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {densityUnit}
          </div>
        </div>
      )}
    </CalculatorLayout>
  );
}
