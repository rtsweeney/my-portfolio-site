'use client';

import { useState } from 'react';
import CalculatorLayout from '@/components/CalculatorLayout';

type UnitCategory = 'length' | 'weight' | 'temperature';

const units: Record<UnitCategory, { name: string; toBase: (v: number) => number; fromBase: (v: number) => number }[]> = {
  length: [
    { name: 'Meters', toBase: (v) => v, fromBase: (v) => v },
    { name: 'Kilometers', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
    { name: 'Miles', toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
    { name: 'Feet', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
    { name: 'Inches', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
    { name: 'Centimeters', toBase: (v) => v * 0.01, fromBase: (v) => v / 0.01 },
    { name: 'Yards', toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
  ],
  weight: [
    { name: 'Kilograms', toBase: (v) => v, fromBase: (v) => v },
    { name: 'Grams', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
    { name: 'Pounds', toBase: (v) => v * 0.453592, fromBase: (v) => v / 0.453592 },
    { name: 'Ounces', toBase: (v) => v * 0.0283495, fromBase: (v) => v / 0.0283495 },
    { name: 'Milligrams', toBase: (v) => v / 1_000_000, fromBase: (v) => v * 1_000_000 },
  ],
  temperature: [
    { name: 'Celsius', toBase: (v) => v, fromBase: (v) => v },
    { name: 'Fahrenheit', toBase: (v) => (v - 32) * 5 / 9, fromBase: (v) => v * 9 / 5 + 32 },
    { name: 'Kelvin', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
  ],
};

const categoryLabels: Record<UnitCategory, string> = {
  length: 'Length',
  weight: 'Weight',
  temperature: 'Temperature',
};

export default function UnitConverterPage() {
  const [category, setCategory] = useState<UnitCategory>('length');
  const [fromUnit, setFromUnit] = useState(0);
  const [toUnit, setToUnit] = useState(1);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const currentUnits = units[category];

  function handleConvert() {
    const num = parseFloat(value);
    if (isNaN(num)) return;

    const base = currentUnits[fromUnit].toBase(num);
    const converted = currentUnits[toUnit].fromBase(base);

    setResult(
      `${num} ${currentUnits[fromUnit].name} = ${Number(converted.toFixed(6))} ${currentUnits[toUnit].name}`
    );
  }

  function handleCategoryChange(newCat: UnitCategory) {
    setCategory(newCat);
    setFromUnit(0);
    setToUnit(1);
    setValue('');
    setResult(null);
  }

  return (
    <CalculatorLayout
      title="Unit Converter"
      description="Convert between common units of measurement"
    >
      {/* Category selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(Object.keys(units) as UnitCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid',
              borderColor: category === cat ? 'var(--accent-primary)' : 'var(--border)',
              background: category === cat ? 'rgba(108, 92, 231, 0.15)' : 'transparent',
              color: category === cat ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      <div className="calc-field">
        <label className="calc-label">Value</label>
        <input
          type="number"
          className="calc-input"
          placeholder="Enter a value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConvert()}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="calc-field">
          <label className="calc-label">From</label>
          <select
            className="calc-select"
            value={fromUnit}
            onChange={(e) => setFromUnit(Number(e.target.value))}
          >
            {currentUnits.map((u, i) => (
              <option key={u.name} value={i}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="calc-field">
          <label className="calc-label">To</label>
          <select
            className="calc-select"
            value={toUnit}
            onChange={(e) => setToUnit(Number(e.target.value))}
          >
            {currentUnits.map((u, i) => (
              <option key={u.name} value={i}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      <button className="calc-btn" onClick={handleConvert}>
        Convert
      </button>

      {result && (
        <div className="calc-result">
          <div className="calc-result-label">Result</div>
          <div className="calc-result-value" style={{ fontSize: '1.25rem' }}>{result}</div>
        </div>
      )}
    </CalculatorLayout>
  );
}
