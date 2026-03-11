# Phase 2: Travel - Research

**Researched:** 2026-03-11
**Domain:** Interactive map (react-leaflet) + Sanity CMS schema (geopoint) + Next.js 15 App Router client-side interactivity
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRVL-01 | Visitor sees an interactive map showing cities Ryan has personally visited | react-leaflet v5 with `MapContainer` + `Marker` per city; dynamic import `ssr: false` required; OSM tiles free, no API key |
| TRVL-02 | Map supports both US and international locations with city-level pins | Leaflet/react-leaflet supports any lat/lng globally; coordinates stored in Sanity `geopoint` field (`lat`, `lng`) |
| TRVL-03 | Clicking a pin zooms the map into that location | `map.flyTo(latlng, zoom)` via `useMap()` hook inside a child `MapController` component; triggered from `Marker` click handler |
| TRVL-04 | Clicking a pin shows a detail card with photos, description, date visited, and rating | State-driven: `useState<TravelEntry | null>` for `selectedCity`; card renders below the map in DOM; reuses `urlFor` + star rating patterns from Phase 1 |
| TRVL-05 | Travel entries are managed via Sanity Studio | New `travel` schema registered in `schemaTypes/index.ts`; same `defineType`/`defineField` pattern as `concert.ts` |
| TRVL-06 | Travel schema includes: city, country, coordinates, date, photos, description, rating | `string` for city/country, Sanity `geopoint` for coordinates, `date`, photos `array` of inline `image`, `text` for description, `number` 1–5 for rating |
</phase_requirements>

---

## Summary

Phase 2 adds a `/travel` route with an interactive world map showing cities Ryan has visited. The core new challenge versus Phase 1 is integrating an interactive map library (react-leaflet) that is inherently client-side and incompatible with Next.js SSR. The solution is a well-established two-part pattern: wrap the map in a `'use client'` component and import it via `next/dynamic` with `ssr: false` from the Server Component page.

The Sanity schema work mirrors the `concert.ts` pattern exactly, with the addition of a Sanity-native `geopoint` field for coordinates. Coordinates are queried from Sanity GROQ as `coordinates.lat` and `coordinates.lng`, then passed directly to react-leaflet `Marker` position props. No coordinate transformation is needed.

The "click pin → zoom + show detail card" interaction pattern requires controlled state: the page's Client Component holds a `selectedCity` state, marker click sets it, and a detail card renders below the map. A sibling `MapController` component (a render-null child of `MapContainer`) consumes the selected city and calls `map.flyTo()` via the `useMap()` hook to animate the zoom. This is the canonical react-leaflet pattern for external state controlling map view.

**Primary recommendation:** Use react-leaflet v5 + Leaflet v1.9 with OpenStreetMap tiles (no API key). Wrap the entire map UI in a single `TravelMap` Client Component, dynamically imported with `ssr: false` from the `/travel` Server Component page. Store coordinates as Sanity `geopoint` fields.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-leaflet` | ^5.0.0 | React bindings for Leaflet interactive maps | v5 requires React 19 (already installed); well-documented Next.js App Router patterns; 2M+ weekly downloads |
| `leaflet` | ^1.9.x | Core map engine (peer dep of react-leaflet) | Stable, lightweight (~42KB gzip), no API key for OSM tiles |
| `@types/leaflet` | ^1.9.x | TypeScript types for Leaflet | Required for TypeScript; devDependency |
| `leaflet-defaulticon-compatibility` | ^0.1.x | Fixes broken default marker icons in webpack/Next.js | Without this, marker PNG icons 404 in production builds |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next/dynamic` | (Next.js 15 built-in) | Lazy-load client-only component with `ssr: false` | Required — import the TravelMap component dynamically from the Server Component page |
| Sanity `geopoint` type | (Sanity built-in) | Native lat/lng/alt coordinate field in Studio | Use for the `coordinates` field; renders a map picker UI in Studio by default |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-leaflet` + OSM tiles | Mapbox GL JS + `react-map-gl` | Mapbox requires API key, ~250KB vs ~42KB bundle, closer to Cloudflare's 25MB Worker limit; no advantage for city pin display |
| `react-leaflet` | `maplibre-gl` (open-source Mapbox fork) | MapLibre is more powerful but heavier; no benefit for this use case |
| Sanity `geopoint` field | Two separate `number` fields (`lat`, `lng`) | `geopoint` gives Studio a map picker UI and is GROQ geo-function compatible; no downside |
| Detail card below map | Leaflet `Popup` inside marker | Popups constrain layout and can't show full photos/description at desired size; a DOM-controlled card below the map gives full design flexibility |

**Installation:**
```bash
npm install leaflet react-leaflet leaflet-defaulticon-compatibility
npm install -D @types/leaflet
```

---

## Architecture Patterns

### Recommended Project Structure
```
Coding/rysite/src/
├── app/
│   └── travel/
│       └── page.tsx              # Server Component: fetches all travel entries, exports revalidate
├── components/
│   └── TravelMap.tsx             # Client Component ('use client'): owns selectedCity state, renders map + detail card
└── sanity/
    └── schemaTypes/
        ├── travel.ts             # New schema definition
        └── index.ts              # Add travel to types array
```

### Pattern 1: Dynamic Import of Map Component (SSR Bypass)

**What:** The `/travel` Server Component page fetches data from Sanity and passes it to `TravelMap` via a `next/dynamic` import with `ssr: false`. This prevents Leaflet from executing during server rendering (where `window` is undefined).

**When to use:** Any time a component depends on browser APIs (`window`, `document`, WebGL, canvas) unavailable at SSR time.

**Example:**
```typescript
// src/app/travel/page.tsx — Server Component
import dynamic from 'next/dynamic';
import Footer from '@/components/Footer';
import { safeFetch } from '@/sanity/lib/client';

export const revalidate = 60;

const TravelMap = dynamic(() => import('@/components/TravelMap'), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map…</div>,
});

export default async function TravelPage() {
  const entries = await safeFetch<TravelEntry[]>(TRAVEL_QUERY, []);

  return (
    <main>
      <div className="page-bg" />
      <div className="container">
        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">Travel</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Cities Ryan has personally visited
          </p>
        </div>
        <TravelMap entries={entries} />
      </div>
      <Footer />
    </main>
  );
}
```

### Pattern 2: TravelMap Client Component with Controlled State

**What:** `TravelMap` is a `'use client'` component that holds `selectedCity` state. Marker clicks update state. A sibling `MapController` child (which returns null) reacts to state and calls `map.flyTo()` via `useMap()`. The detail card renders below the map when a city is selected.

**When to use:** Whenever map view must react to external state changes (e.g., clicking a list item or marker to fly to a location).

**Example:**
```typescript
// src/components/TravelMap.tsx
'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import type { LatLngTuple } from 'leaflet';
import Image from 'next/image';
import { urlFor } from '@/sanity/lib/image';

interface TravelEntry {
  _id: string;
  city: string;
  country: string;
  coordinates: { lat: number; lng: number };
  date: string;
  rating: number;
  description?: string;
  photos?: { asset: { _ref: string }; alt?: string }[];
}

// Child component: reacts to selectedCity and flies the map to it
function MapController({ selectedCity }: { selectedCity: TravelEntry | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedCity) {
      const { lat, lng } = selectedCity.coordinates;
      map.flyTo([lat, lng], 10, { animate: true, duration: 1.2 });
    }
  }, [selectedCity, map]);
  return null;
}

export default function TravelMap({ entries }: { entries: TravelEntry[] }) {
  const [selectedCity, setSelectedCity] = useState<TravelEntry | null>(null);

  const defaultCenter: LatLngTuple = [20, 0]; // World overview
  const defaultZoom = 2;

  return (
    <div className="travel-map-wrapper">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '500px', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController selectedCity={selectedCity} />
        {entries.map((entry) => (
          <Marker
            key={entry._id}
            position={[entry.coordinates.lat, entry.coordinates.lng]}
            eventHandlers={{ click: () => setSelectedCity(entry) }}
          />
        ))}
      </MapContainer>

      {selectedCity && (
        <div className="travel-detail-card card">
          {/* photos, description, date, rating */}
        </div>
      )}
    </div>
  );
}
```

### Pattern 3: Travel Sanity Schema

**What:** A `defineType` document mirroring `concert.ts` with `geopoint` for coordinates and the same inline image array pattern.

**When to use:** Any new CMS content type in this project.

**Example:**
```typescript
// src/sanity/schemaTypes/travel.ts
import { defineField, defineType } from 'sanity';

export const travel = defineType({
  name: 'travel',
  title: 'Travel',
  type: 'document',
  fields: [
    defineField({ name: 'city', title: 'City', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'country', title: 'Country', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'coordinates', title: 'Coordinates', type: 'geopoint', validation: (r) => r.required() }),
    defineField({ name: 'date', title: 'Date Visited', type: 'date', validation: (r) => r.required() }),
    defineField({
      name: 'rating', title: 'Rating (1–5)', type: 'number',
      validation: (r) => r.required().min(1).max(5).integer(),
      options: { list: [1, 2, 3, 4, 5] },
    }),
    defineField({ name: 'description', title: 'Description', type: 'text', rows: 4 }),
    defineField({
      name: 'photos', title: 'Photos', type: 'array',
      of: [{
        type: 'image', options: { hotspot: true },
        fields: [defineField({ name: 'alt', title: 'Alt Text', type: 'string' })],
      }],
    }),
  ],
  preview: {
    select: { title: 'city', subtitle: 'country', media: 'photos.0' },
    prepare({ title, subtitle, media }) {
      return { title, subtitle, media };
    },
  },
});
```

### Pattern 4: GROQ Query for Travel Entries

**What:** Fetch all travel entries with coordinates projected from the `geopoint` field.

**Example:**
```typescript
const TRAVEL_QUERY = `*[_type == "travel"] | order(date desc) {
  _id,
  city,
  country,
  "coordinates": {
    "lat": coordinates.lat,
    "lng": coordinates.lng
  },
  date,
  rating,
  description,
  photos[] {
    asset,
    alt
  }
}`;
```

Note: The `geopoint` field object contains `_type`, `lat`, `lng`, and optionally `alt`. Project only `lat` and `lng` to keep the client payload clean.

### Anti-Patterns to Avoid

- **Importing `react-leaflet` or `leaflet` in a Server Component or without `ssr: false`:** Leaflet accesses `window` at module load time. This causes a `ReferenceError: window is not defined` build error in Next.js App Router.
- **Calling `useMap()` inside `TravelMap` directly (not inside a child of `MapContainer`):** `useMap()` requires being inside a `MapContainer` context. Create a dedicated child component like `MapController` that uses `useMap()` and returns null.
- **Using `useEffect` with `map.flyTo` directly in the `MapContainer`'s JSX scope:** `useMap()` must be in a descendant component of `MapContainer`, not in the same component that renders `MapContainer`.
- **Importing `leaflet/dist/leaflet.css` in a Server Component or `layout.tsx`:** Import Leaflet CSS only inside the `TravelMap` Client Component to avoid CSS extraction conflicts.
- **Using the `geopoint._type` field in GROQ projections:** Project only `lat` and `lng` — the `_type: "geopoint"` string is not needed client-side.
- **Setting a fixed `height` on `MapContainer` without a parent container height:** Leaflet requires explicit pixel height on `MapContainer`; percentage heights require an ancestor with a defined pixel height.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Map tile rendering | Canvas/SVG world map | `react-leaflet` + OpenStreetMap tiles | Tile-based mapping is thousands of lines of projection math; Leaflet handles pan, zoom, projection, tile caching |
| Animated map fly-to | CSS transitions on lat/lng | `map.flyTo()` from Leaflet | Leaflet's `flyTo` is a tested eased animation that handles projection and zoom simultaneously |
| Coordinate input in Studio | Custom lat/lng number field pair | Sanity `geopoint` field | Built-in type with map picker UI, GROQ geo-function support, validated decimal degree storage |
| Broken marker icons | Copy Leaflet PNG assets manually | `leaflet-defaulticon-compatibility` | webpack/Next.js module resolution breaks Leaflet's default icon URL detection; this package patches it at import |
| Image CDN URLs | Raw string construction | `urlFor` from `@/sanity/lib/image` | Already wired to project/dataset; handles all transformations — identical to Phase 1 |

**Key insight:** Leaflet is 35+ years of mapping complexity distilled. The only application code is wiring Sanity data to props. Never rebuild projection, tile management, or animated transitions.

---

## Common Pitfalls

### Pitfall 1: `window is not defined` During Build
**What goes wrong:** Next.js tries to render the map component server-side during build; Leaflet immediately accesses `window`, throwing a `ReferenceError` that crashes the build.
**Why it happens:** App Router Server Components and the build step run in Node.js, where `window` doesn't exist. Leaflet is designed for browsers only.
**How to avoid:** Always import `TravelMap` via `next/dynamic(() => import(…), { ssr: false })` in the Server Component page. Never import Leaflet or react-leaflet components directly in a Server Component.
**Warning signs:** Build error: `ReferenceError: window is not defined` or `document is not defined` pointing to leaflet or react-leaflet internals.

### Pitfall 2: `useMap()` Must Be Inside `MapContainer` Tree
**What goes wrong:** Calling `useMap()` in a component that is a sibling of `MapContainer` (not a descendant) throws: `No leaflet map context found. Make sure you use MapContainer.`
**Why it happens:** `useMap()` reads from a React context that `MapContainer` provides to its children.
**How to avoid:** Create a dedicated child component (e.g., `MapController`) that renders null but uses `useMap()` and place it as a JSX child inside `<MapContainer>`.

### Pitfall 3: Marker Icons 404 in Production
**What goes wrong:** Markers appear on the map but the default blue pin icon returns a 404 in development or production builds. The map shows blank squares or missing icons.
**Why it happens:** Leaflet detects its own icon path using `import.meta.url` or webpack magic; Next.js's file hashing changes the resolved path.
**How to avoid:** Import `leaflet-defaulticon-compatibility` and its CSS at the top of `TravelMap.tsx` before any Leaflet usage. This package patches the icon detection logic.

### Pitfall 4: CSS Height on MapContainer
**What goes wrong:** The map renders as a 0-pixel-height invisible element; nothing appears on the page.
**Why it happens:** Leaflet's `MapContainer` uses an inline style for height; if the `style` prop is omitted or set to `height: '100%'` without a parent with an explicit height, the map collapses.
**How to avoid:** Always pass an explicit pixel height: `style={{ height: '500px', width: '100%' }}`.

### Pitfall 5: Leaflet CSS Missing — Tiles Appear But Controls Are Broken
**What goes wrong:** Map tiles render but zoom controls, attribution, and popup styling are broken or mispositioned.
**Why it happens:** Leaflet's built-in UI depends on `leaflet/dist/leaflet.css` being loaded.
**How to avoid:** Import `leaflet/dist/leaflet.css` inside `TravelMap.tsx` (the Client Component). Do not import it in a Server Component or `layout.tsx`.

### Pitfall 6: Sanity `geopoint.alt` Conflicts with HTML `alt`
**What goes wrong:** TypeScript may infer that `geopoint` has an `alt` (altitude) field. This is not the same as the photo `alt` (alt text) field.
**Why it happens:** Both use the key `alt` for different purposes.
**How to avoid:** In GROQ projections, explicitly project only `lat` and `lng` from the `geopoint` type. In the `photos` inline image objects, the `alt` field is alt text — these are in separate object shapes.

### Pitfall 7: `scrollWheelZoom` Interferes with Page Scrolling
**What goes wrong:** Visitors scrolling down the `/travel` page accidentally zoom the map instead, creating a jarring UX where the page seems "stuck."
**Why it happens:** Leaflet defaults to capturing scroll wheel events for zoom.
**How to avoid:** Set `scrollWheelZoom={false}` on `MapContainer`. Users can still zoom using the +/- controls or pinch gestures.

---

## Code Examples

Verified patterns from official sources and existing codebase:

### Dynamic Import of Client-Only Component
```typescript
// Source: Next.js official docs + react-leaflet community pattern
import dynamic from 'next/dynamic';

const TravelMap = dynamic(() => import('@/components/TravelMap'), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map…</div>,
});
```

### MapController: useMap() Child Pattern
```typescript
// Source: react-leaflet.js.org/docs/api-map + react-leaflet external state example
function MapController({ selectedCity }: { selectedCity: TravelEntry | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedCity) {
      map.flyTo([selectedCity.coordinates.lat, selectedCity.coordinates.lng], 10, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [selectedCity, map]);
  return null;
}
```

### Marker Click to Set Selected City
```typescript
// Source: react-leaflet docs — eventHandlers prop
<Marker
  key={entry._id}
  position={[entry.coordinates.lat, entry.coordinates.lng]}
  eventHandlers={{ click: () => setSelectedCity(entry) }}
/>
```

### GROQ Projection for Geopoint
```typescript
// Source: Sanity docs — geopoint type + GROQ projection
const TRAVEL_QUERY = `*[_type == "travel"] | order(date desc) {
  _id,
  city,
  country,
  "coordinates": { "lat": coordinates.lat, "lng": coordinates.lng },
  date,
  rating,
  description,
  photos[] { asset, alt }
}`;
```

### safeFetch Usage (same as Phase 1)
```typescript
// Source: Coding/rysite/src/sanity/lib/client.ts
export const revalidate = 60;

export default async function TravelPage() {
  const entries = await safeFetch<TravelEntry[]>(TRAVEL_QUERY, []);
  // ...
}
```

### Photo Display in Detail Card (reuse Phase 1 pattern)
```typescript
// Source: Phase 1 ConcertFeed.tsx — urlFor + next/image pattern
import Image from 'next/image';
import { urlFor } from '@/sanity/lib/image';

{selectedCity.photos && selectedCity.photos.length > 0 && (
  <Image
    src={urlFor(selectedCity.photos[0]).width(600).height(400).fit('crop').url()}
    alt={selectedCity.photos[0].alt ?? selectedCity.city}
    width={600}
    height={400}
    className="travel-card-photo"
  />
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Leaflet directly in `useEffect` with manual DOM node | react-leaflet v5 declarative components | react-leaflet v4+ | Map elements are React components; no imperative DOM manipulation needed |
| `react-leaflet` v3/v4 requiring React 18 | `react-leaflet` v5 requiring React 19 | Dec 2024 (v5 release) | This project uses React 19 — use v5, which is compatible |
| `@cloudflare/next-on-pages` (edge-runtime only) | OpenNext (`@opennextjs/cloudflare`) | Late 2024/2025 | OpenNext supports full Node.js compat; map libraries (client-only) unaffected either way since they run in the browser |
| Manual lat/lng number fields in CMS | Sanity `geopoint` type | Sanity v3+ | Native type with map picker UI in Studio; no coordinate validation code needed |
| Leaflet `Popup` for location details | React state-controlled detail card | N/A (design decision) | Popup is constrained to small overlays; detail card below the map allows full photo/description layout |

**Deprecated/outdated:**
- `leaflet-defaulticon-compatibility` workaround via `delete L.Icon.Default.prototype._getIconUrl`: This older hack manipulates Leaflet internals directly. Use `leaflet-defaulticon-compatibility` package instead — cleaner and maintained.
- Importing Leaflet via CDN `<script>` tag: Not applicable in Next.js App Router. Use npm package + dynamic import.

---

## Open Questions

1. **Initial map center and zoom level**
   - What we know: The map should show "both US domestic and international" pins (TRVL-02); a world overview at zoom ~2 with center ~[20, 0] covers both.
   - What's unclear: Ryan's actual travel spread — if primarily US-focused, a US-centered view at zoom ~3 may be better UX.
   - Recommendation: Default to world view (center `[20, 0]`, zoom `2`). If Ryan only has US pins initially, the markers will look clustered — he can adjust. This is a content/aesthetic decision, not a technical one. Planner can leave this as a noted parameter in the component.

2. **Detail card dismissal**
   - What we know: The requirements say clicking a pin reveals a detail card. They do not say how to close it.
   - What's unclear: Should clicking elsewhere on the map close it? Should there be an explicit close button?
   - Recommendation: Add a close button (`×`) on the detail card. Also close on clicking the map background (Leaflet map `click` event via `useMapEvents`). This is low-complexity and good UX.

3. **Sanity Studio coordinate input UX**
   - What we know: Sanity's built-in `geopoint` type renders a text-input-based coordinate entry in Studio by default (lat/lng number inputs). The `@sanity/google-maps-input` plugin adds a map picker but requires a Google Maps API key.
   - What's unclear: Whether Ryan needs a visual map picker in Studio or is comfortable entering coordinates manually (from Google Maps or similar).
   - Recommendation: Use the plain `geopoint` type without any plugin. Ryan can copy-paste coordinates from Google Maps. This avoids adding a Google Maps API key dependency to the CMS. The planner can note this recommendation.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test files, no jest/vitest/playwright config |
| Config file | None — same as Phase 1 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRVL-01 | `/travel` loads with interactive map showing pins | manual-only | N/A — visual map render requires browser | ❌ |
| TRVL-02 | US and international pins at city-level precision | manual-only | N/A — requires content in Sanity | ❌ |
| TRVL-03 | Clicking a pin zooms the map to that city | manual-only | N/A — requires animated browser interaction | ❌ |
| TRVL-04 | Clicking a pin reveals detail card with photos/description/date/rating | manual-only | N/A — requires content + visual verification | ❌ |
| TRVL-05 | Travel entries can be created/edited/deleted in Studio | manual-only | N/A — CMS CRUD, not automatable | ❌ |
| TRVL-06 | Travel schema fields present in Studio | manual-only | N/A — Studio UI verification | ❌ |

### Sampling Rate
- **Per task commit:** Manual browser verification at `http://localhost:3000/travel` and `http://localhost:3000/studio`
- **Per wave merge:** Full manual walkthrough: create entry in Studio, verify pin appears on map, click pin, verify zoom + detail card
- **Phase gate:** All 5 success criteria from phase description pass manual inspection

### Wave 0 Gaps
- No test framework installed. Consistent with Phase 1 posture — all Phase 2 requirements are visual/interactive and require browser verification.
- Recommendation: Accept manual verification. Playwright could eventually test map pin click + detail card appearance, but setup overhead exceeds benefit for this phase.

---

## Sources

### Primary (HIGH confidence)
- `Coding/rysite/src/sanity/schemaTypes/concert.ts` — exact schema pattern to mirror for `travel.ts`
- `Coding/rysite/src/app/concerts/page.tsx` — Server Component + dynamic import page structure
- `Coding/rysite/src/components/ConcertFeed.tsx` — Client Component state pattern; star rating; urlFor usage
- `Coding/rysite/src/sanity/lib/client.ts` — `safeFetch<T>` implementation
- `Coding/rysite/src/sanity/lib/image.ts` — `urlFor` implementation
- `Coding/rysite/src/sanity/schemaTypes/index.ts` — schema registration pattern
- [react-leaflet.js.org — API Map docs](https://react-leaflet.js.org/docs/api-map/) — `useMap`, `MapContainer`, `TileLayer`, `Marker`, `eventHandlers`
- [react-leaflet.js.org — Events example](https://react-leaflet.js.org/docs/example-events/) — `useMapEvents`, `flyTo` pattern
- [react-leaflet.js.org — External state example](https://react-leaflet.js.org/docs/example-external-state/) — controlling map from outside via `useMap` child component
- [Sanity docs — geopoint type](https://www.sanity.io/docs/studio/geopoint-type) — field definition, data shape (`lat`, `lng`, `alt`)
- GitHub: react-leaflet releases — v5.0.0 confirmed, requires React 19 (peer dep satisfied)

### Secondary (MEDIUM confidence)
- [Next.js dynamic import docs](https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading) — `next/dynamic` with `ssr: false` pattern for client-only libraries
- [Leaflet defaulticon-compatibility npm](https://www.npmjs.com/package/leaflet-defaulticon-compatibility) — resolves broken marker icons in webpack/Next.js builds
- Multiple community sources (PlaceKit, XXL Steve, AntStack) confirming `dynamic({ ssr: false })` + `'use client'` is the canonical Next.js 15 App Router approach for react-leaflet

### Tertiary (LOW confidence)
- Bundle size comparison (Leaflet ~42KB vs Mapbox ~250KB) — from community analysis, not official benchmarks; directionally correct, not precise

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — react-leaflet v5 confirmed compatible with React 19; leaflet-defaulticon-compatibility is a well-known required fix; Sanity geopoint is documented official type
- Architecture patterns: HIGH — directly derived from existing Phase 1 patterns + canonical react-leaflet docs for useMap/flyTo/external state
- Pitfalls: HIGH — SSR/window issue and marker icon issue are universal, well-documented react-leaflet in Next.js problems; CSS height issue is from Leaflet's own requirements
- Validation: HIGH — consistent with Phase 1: no test framework, all requirements require browser+content verification

**Research date:** 2026-03-11
**Valid until:** 2026-09-11 (stable libraries — react-leaflet v5 is recent stable; Sanity 4 schema API is stable; Next.js 15 dynamic import API is stable)
