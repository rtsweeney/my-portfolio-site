'use client';

import { useState, useEffect } from 'react';
import CalculatorLayout from '@/components/CalculatorLayout';

// Standard beer: 4.2% ABV, 12 oz / 355 mL
const STANDARD_ABV = 4.2;
const STANDARD_OZ = 12;
const STANDARD_ML = 355;

export default function BeersPerBeerPage() {
  const [abv, setAbv] = useState('');
  const [volume, setVolume] = useState('');
  const [unit, setUnit] = useState<'oz' | 'mL'>('oz');
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    const abvNum = parseFloat(abv);
    const volNum = parseFloat(volume);

    if (!isNaN(abvNum) && !isNaN(volNum) && abvNum > 0 && volNum > 0) {
      const standard = unit === 'oz'
        ? STANDARD_OZ * STANDARD_ABV
        : STANDARD_ML * STANDARD_ABV;
      const beers = (volNum * abvNum) / standard;
      setResult(beers);
    } else {
      setResult(null);
    }
  }, [abv, volume, unit]);

  function handleUnitChange(newUnit: 'oz' | 'mL') {
    setUnit(newUnit);
    setVolume('');
    setResult(null);
  }

  const resultDisplay = result !== null
    ? Number(result.toFixed(4)) === Math.round(result * 10000) / 10000
      ? result % 1 === 0
        ? result.toFixed(0)
        : result.toFixed(2)
      : result.toFixed(2)
    : null;

  return (
    <CalculatorLayout
      title="Beers Per Beer"
      description="How many standard beers are in your drink?"
    >
      <div className="calc-field">
        <label className="calc-label">ABV (%)</label>
        <input
          type="number"
          className="calc-input"
          placeholder="e.g. 8.4"
          min="0"
          max="100"
          step="0.1"
          value={abv}
          onChange={(e) => setAbv(e.target.value)}
        />
      </div>

      <div className="calc-field">
        <label className="calc-label">Volume</label>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="number"
            className="calc-input"
            placeholder={unit === 'oz' ? 'e.g. 12' : 'e.g. 355'}
            min="0"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            className="calc-select"
            value={unit}
            onChange={(e) => handleUnitChange(e.target.value as 'oz' | 'mL')}
            style={{ width: 'auto', minWidth: '5rem' }}
          >
            <option value="oz">oz</option>
            <option value="mL">mL</option>
          </select>
        </div>
      </div>

      {result !== null && (
        <div className="calc-result">
          <div className="calc-result-label">Standard Beers</div>
          <div className="calc-result-value" style={{ fontSize: '2rem' }}>
            {resultDisplay}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            based on a 12 oz / 355 mL beer at 4.2% ABV
          </div>
        </div>
      )}
    </CalculatorLayout>
  );
}
