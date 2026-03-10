# Testing Patterns

**Analysis Date:** 2026-03-10

## Test Framework

**Runner:** None detected

No test runner (Jest, Vitest, Playwright, Cypress) is installed. The `package.json` at `Coding/rysite/package.json` contains no testing dependencies in `dependencies` or `devDependencies`, and no test script in `scripts`.

**Assertion Library:** None

**Run Commands:**
```bash
# No test commands available
npm run lint    # Only quality check available
```

## Test File Organization

**Location:** No test files exist in the repository.

No `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files found anywhere in `Coding/rysite/src/`.

**Naming:** No established convention.

## Test Coverage

**Requirements:** None enforced — no coverage tooling configured.

## What Exists Instead of Tests

**Linting:** ESLint with `next/core-web-vitals` and `next/typescript` rules runs via `npm run lint`. This is the only automated code quality check.

**TypeScript:** Strict mode TypeScript (`"strict": true` in `tsconfig.json`) provides compile-time type safety. This catches type errors but not runtime logic bugs.

**Graceful degradation:** The `safeFetch` function in `src/sanity/lib/client.ts` uses try/catch with fallback values, providing resilience against CMS connectivity failures at runtime rather than through tests.

## Units with Testable Logic

The following pure functions in `src/app/calculators/air-density/page.tsx` and `src/app/planetarium/constellations.ts` contain complex, deterministic math that would benefit from unit tests if testing is added:

**Air density calculations (`src/app/calculators/air-density/page.tsx`):**
- `toKelvin(temp, unit)` — temperature conversion
- `toMeters(alt, unit)` — altitude conversion
- `atmosphericPressure(altM)` — ISA barometric formula
- `saturationVaporPressure(tempC)` — Buck equation
- `calcAirDensityKgm3(tempK, rhPct, altM)` — main density calculation
- `convertDensity(rho, unit)` — unit conversion
- `formatDensity(value)` — display formatting

**Astronomy calculations (`src/app/planetarium/constellations.ts`):**
- `dateToJulianDay(date)`
- `gmst(jd)`
- `localSiderealTime(date, longitudeDeg)`
- `raDecToAltAz(ra, dec, lat, lst)`
- `azimuthToCompass(azimuth)`
- `getVisibleConstellations(date, lat, lon)`
- `getCelestialBodies(date, latDeg, lonDeg)`

**Unit converter logic (`src/app/calculators/unit-converter/page.tsx`):**
- `toBase` / `fromBase` conversion functions defined inline in the `units` record

## Recommendations for Adding Tests

If tests are added to this project, use the following guidance to match the codebase style:

**Suggested framework:** Vitest (compatible with Next.js, fast, ESM-native, minimal config)

**Suggested install:**
```bash
npm install -D vitest @vitejs/plugin-react
```

**Suggested config file:** `vitest.config.ts` at `Coding/rysite/`

**Suggested test location:** Co-locate test files next to source:
```
src/app/calculators/air-density/air-density.test.ts
src/app/planetarium/constellations.test.ts
```

**Suggested test structure (following project's function naming style):**
```typescript
import { describe, it, expect } from 'vitest';
import { toKelvin, toMeters, calcAirDensityKgm3 } from './page';

describe('toKelvin', () => {
  it('converts Fahrenheit to Kelvin', () => {
    expect(toKelvin(32, '°F')).toBeCloseTo(273.15);
  });

  it('converts Celsius to Kelvin', () => {
    expect(toKelvin(0, '°C')).toBeCloseTo(273.15);
  });

  it('returns Kelvin unchanged', () => {
    expect(toKelvin(300, 'K')).toBe(300);
  });
});
```

**Note on exporting:** Pure utility functions in calculator/planetarium pages are not currently exported. To make them testable, extract them to a separate module (e.g., `air-density.utils.ts`) or add named exports alongside `export default`.

---

*Testing analysis: 2026-03-10*
