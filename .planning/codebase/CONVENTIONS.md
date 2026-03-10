# Coding Conventions

**Analysis Date:** 2026-03-10

## Naming Patterns

**Files:**
- Page files always named `page.tsx` per Next.js App Router convention
- Component files use PascalCase: `Navigation.tsx`, `Footer.tsx`, `CalculatorLayout.tsx`
- Utility/data modules use camelCase: `client.ts`, `image.ts`, `constellations.ts`
- Sanity schema files use camelCase matching the schema name: `blogPost.ts`, `project.ts`, `resume.ts`

**Functions:**
- React component functions use PascalCase matching file name: `function Navigation()`, `function AirDensityPage()`
- Page component names include page suffix: `BeersPerBeerPage`, `UnitConverterPage`, `BlogPage`, `ProjectsPage`
- Utility/pure functions use camelCase: `toKelvin`, `toMeters`, `atmosphericPressure`, `saturationVaporPressure`, `formatBlogDate`, `calcAirDensityKgm3`
- Event handlers use `handle` prefix: `handleConvert`, `handleCategoryChange`, `handleUnitChange`
- Boolean helpers use `is` prefix: `isActive`

**Variables:**
- React state variables use camelCase nouns: `temperature`, `tempUnit`, `humidity`, `altitude`, `mobileOpen`
- State setter pairs match variable name: `setTemperature`, `setTempUnit`, `setHumidity`
- Physical/math constants use SCREAMING_SNAKE_CASE: `STANDARD_ABV`, `STANDARD_OZ`, `STANDARD_ML`, `PIXELS_PER_MINUTE`
- Scientific constants within module scope use short uppercase single-letter: `Rd`, `Rv`, `P0`, `T0`, `L`, `g`, `M`, `R`
- GROQ queries use SCREAMING_SNAKE_CASE with `_QUERY` suffix: `BLOG_QUERY`, `PROJECTS_QUERY`
- Config/mapping objects use SCREAMING_SNAKE_CASE: `TAG_CLASS_MAP`

**Types:**
- Type aliases for string unions use PascalCase: `TempUnit`, `AltUnit`, `DensityUnit`, `UnitCategory`, `AreaUnit`
- Interfaces for data shapes use PascalCase: `BlogPost`, `Project`, `CalculatorLayoutProps`, `Location`, `VisibleConstellation`
- Props interfaces named `[ComponentName]Props`: `CalculatorLayoutProps`
- Types colocated in the file where used — no separate types file

## Code Style

**Formatting:**
- No Prettier config detected — formatting enforced via ESLint only
- Single quotes used in `.ts`/`.tsx` files consistently (`'use client'`, `import ... from '...'`)
- Double quotes used in JSX attributes: `className="nav"`, `lang="en"`
- Trailing commas present in multi-line arrays and objects
- Semicolons absent in `client.ts`, `env.ts`, `image.ts`; present in component/page files — inconsistent across the codebase

**Linting:**
- ESLint 9 with flat config (`eslint.config.mjs`)
- Extends `next/core-web-vitals` and `next/typescript`
- Ignores `.next/**`, `out/**`, `build/**`
- No custom rules defined beyond Next.js defaults

## Import Organization

**Order (observed pattern):**
1. `'use client'` directive (when needed) — always first line
2. React/Next.js core imports: `import { useState } from 'react'`, `import Link from 'next/link'`
3. Internal path-aliased imports: `import CalculatorLayout from '@/components/CalculatorLayout'`
4. Type-only imports last or inline: `import type { Metadata } from "next"`

**Path Aliases:**
- `@/*` maps to `./src/*` — use for all internal imports
- Example: `import { safeFetch } from '@/sanity/lib/client'`
- Never use relative paths like `../../components/`

**`type` keyword:**
- Use `import type` for type-only imports: `import type { PortableTextBlock } from 'next-sanity'`
- Inline `type` keyword for re-exported types: `import { type Constellation } from './constellations'`

## Client vs. Server Components

**Pattern:**
- Server components (default): page files that fetch data from Sanity — `blog/page.tsx`, `projects/page.tsx`, `resume/page.tsx`, `app/page.tsx`
- Client components: add `'use client'` as the literal first line when using React hooks (`useState`, `useEffect`, `useRef`, `useCallback`) or browser APIs
- Client component pages: `Navigation.tsx`, all calculator pages, `planetarium/page.tsx`, `pleat-counter/page.tsx`
- Layout components without hooks (`CalculatorLayout.tsx`, `Footer.tsx`) remain server components

## TypeScript Patterns

**Strict mode:** Enabled in `tsconfig.json` (`"strict": true`)

**Type assertions:** Use `as` casts sparingly for DOM/event values: `e.target.value as TempUnit`

**Generic functions:**
```typescript
export async function safeFetch<T>(query: string, fallback: T): Promise<T>
```

**Interfaces over types for shapes:**
```typescript
interface BlogPost {
  _id: string;
  title: string;
  date: string;
  tag: string;
  body: PortableTextBlock[];
}
```

**String union types for constrained values:**
```typescript
type TempUnit = '°F' | '°C' | 'K';
type AltUnit = 'ft' | 'm';
```

**`Record<K, V>` for maps:**
```typescript
const TAG_CLASS_MAP: Record<string, string> = { ... }
const categoryLabels: Record<UnitCategory, string> = { ... }
```

## Error Handling

**Server-side data fetching:**
- All Sanity fetches go through `safeFetch` in `src/sanity/lib/client.ts`
- `safeFetch` wraps `client.fetch` in try/catch and returns a typed fallback value
- Catch blocks are bare (`catch {}`) — errors are silently swallowed in favor of graceful degradation
- Pages receive empty arrays/objects as fallbacks and render empty states

**Client-side validation:**
- Calculator pages use `useEffect` to reactively validate inputs
- Validation errors stored in `error` state (`useState<string | null>(null)`)
- Error messages rendered inline near the affected field
- Pattern: validate → `setError('message')` → `setResult(null)` → `return`

**Empty states:**
- Pages check `posts.length === 0` / `projects.length === 0` and render dedicated empty state UI with icon, title, and descriptive text

## Logging

**Framework:** None — no logging library present

**Pattern:** No `console.log/warn/error` calls found in source files. Silent failure via `safeFetch` fallback is the only observable pattern.

## Comments

**When to Comment:**
- JSDoc-style block comments for pure utility functions: `/** ISA atmospheric pressure (Pa) at a given altitude (m). Valid up to ~20 km. */`
- Inline comments for non-obvious constants: `// J/(kg·K) — specific gas constant for dry air`
- Section dividers in JSX via HTML comments: `{/* Temperature */}`, `{/* Sanity-managed projects */}`
- URL references for external specs: `// https://www.sanity.io/docs/image-url`
- No comments on self-evident code

## Function Design

**Size:** Pure math/conversion functions are small (3–10 lines). Page components can be large (up to 1,974 lines for `pleat-counter/page.tsx`).

**Parameters:** Use destructuring for props: `function CalculatorLayout({ title, description, children }: CalculatorLayoutProps)`

**Return Values:**
- Components always return JSX
- Pure functions return primitives (number, string)
- Async data functions return typed generics: `Promise<T>`

## Module Design

**Exports:**
- One `export default` per file — always the page component or layout component
- Named exports for constants, types, and utility functions: `export const CONSTELLATIONS`, `export function raDecToAltAz`
- Sanity schema modules use named exports: `export const blogPost = defineType(...)`

**Barrel Files:** No barrel files (`index.ts` re-exports) — import directly from source files

**Co-location:** Types and helper functions defined in the same file as the component using them, not in separate utility modules (except `constellations.ts` which extracts astronomy math used by `planetarium/page.tsx`)

## Styling

**Approach:** Global CSS classes defined in `src/app/globals.css`; no CSS modules or styled-components in use despite `styled-components` being listed as a dependency

**CSS-in-JSX:** Inline `style` props used for one-off adjustments: `style={{ fontSize: '2rem' }}`, `style={{ flex: 1 }}`

**Class naming:** BEM-inspired kebab-case: `nav-inner`, `calc-field`, `calc-label`, `blog-tag-update`, `project-tech-tag`

**CSS variables:** Referenced via `var(--token-name)`: `var(--accent-primary)`, `var(--text-secondary)`, `var(--radius-sm)`, `var(--border)`

---

*Convention analysis: 2026-03-10*
