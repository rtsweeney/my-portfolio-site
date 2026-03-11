# Phase 1: Concerts - Research

**Researched:** 2026-03-10
**Domain:** Sanity CMS schema authoring + Next.js App Router page with client-side sort
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONC-01 | Visitor can view a chronological feed of concerts Ryan has attended | GROQ `order(date desc)` pattern already proven in `blog/page.tsx`; `revalidate = 60` provides ISR freshness |
| CONC-02 | Each concert entry displays at least one photo, a star rating, and a caption/review | `urlFor` from `@/sanity/lib/image` + `next/image` handles photos; rating rendered as emoji/icon stars; review as a plain `text` or `string` field |
| CONC-03 | Visitor can sort the concert feed by star rating (no page reload) | Client Component (`'use client'`) with `useState` for sort key; sort applied in-memory over fetched array |
| CONC-04 | Concert entries are managed via Sanity Studio | New schema registered in `schemaTypes/index.ts` automatically appears in Studio at `/studio` |
| CONC-05 | Concert schema includes: title, date, venue, photos, star rating (1–5), caption/review | `defineType` / `defineField` pattern from existing `blogPost.ts` and `photo.ts` |
</phase_requirements>

---

## Summary

Phase 1 adds a `/concerts` feed to a Next.js 15 + Sanity CMS site that already ships identical infrastructure for `/blog` and `/projects`. The entire implementation pattern — schema definition, GROQ query, `safeFetch`, ISR, `urlFor` image rendering — is proven and in production. Nothing novel needs to be invented; the work is almost entirely applying the established patterns to a new content type.

The one genuinely new challenge is **client-side sort-by-rating**: the existing CMS-driven pages (blog, projects) are pure Server Components, but sort-by-rating must update the list without a page reload. The correct solution is a thin Client Component wrapper that receives the pre-fetched concerts array as props from the Server Component parent, then drives rendering via `useState`. This keeps data fetching on the server while satisfying the interactive sort requirement without introducing a separate data-fetching layer.

Image rendering uses `next/image` with the existing `urlFor` builder, which is already configured for `cdn.sanity.io` in `next.config.mjs`. Star rating is stored as a Sanity `number` field (integer 1–5) and rendered client-side as filled/empty star characters or SVG icons — no third-party library needed.

**Primary recommendation:** Model `concert.ts` directly on `blogPost.ts`, add photos as an `array` of `image` objects (with `hotspot: true` and an `alt` sub-field, matching the existing `photo.ts` pattern), split the page into a thin Server Component data-fetcher that passes data to a Client Component that owns sort state.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next-sanity` | ^11.6.10 | `safeFetch`, `PortableText`, Sanity client | Already in `package.json`; used by blog + projects pages |
| `@sanity/image-url` | ^1.2.0 | `urlFor()` CDN image builder | Already in `src/sanity/lib/image.ts`; `cdn.sanity.io` already in `next.config.mjs` |
| `next/image` | (Next.js 15 built-in) | Optimized image rendering | Required for Sanity CDN images; remote pattern already configured |
| `sanity` | ^4.21.1 | `defineType`, `defineField` for schema | Already in `package.json`; used by all existing schemas |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lucide-react` | ^0.561.0 | Star icons (optional) | Use if emoji stars feel insufficiently polished; already installed |
| `react` | ^19.0.0 | `useState` for sort state | Required for the Client Component sort wrapper |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline image `array` in concert schema | Separate `photo` document type | Separate doc type adds CMS complexity with no benefit for this use case; inline is simpler and matches the travel schema pattern planned for Phase 2 |
| `useState` sort in Client Component | URL search params sort (server-side) | URL params would cause a page reload or require `router.push`; requirement says no page reload, so client-side state wins |
| Emoji star characters (`★`/`☆`) | `lucide-react` `Star` icon | Both are valid; emoji is zero-dependency; lucide is already installed if visual consistency is preferred |

**No new packages need to be installed.** All required dependencies are already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure
```
Coding/rysite/src/
├── app/
│   └── concerts/
│       └── page.tsx              # Server Component: fetches data, exports revalidate
├── components/
│   └── ConcertFeed.tsx           # Client Component: owns sort state, renders cards
└── sanity/
    └── schemaTypes/
        ├── concert.ts            # New schema definition
        └── index.ts              # Add concert to types array
```

### Pattern 1: Server/Client Component Split for Interactive Sort

**What:** The page `page.tsx` is a Server Component that fetches data via `safeFetch`. It passes the concerts array as a prop to `<ConcertFeed>`, a Client Component that owns the sort state.

**When to use:** Whenever a page needs both server-side data fetching (ISR, GROQ) and client-side interactivity (sort, filter) without a full page reload.

**Example:**
```typescript
// src/app/concerts/page.tsx — Server Component
import { safeFetch } from '@/sanity/lib/client'
import ConcertFeed from '@/components/ConcertFeed'

const CONCERTS_QUERY = `*[_type == "concert"] | order(date desc) {
  _id,
  title,
  date,
  venue,
  rating,
  caption,
  photos[] {
    asset,
    alt
  }
}`

export const revalidate = 60

export default async function ConcertsPage() {
  const concerts = await safeFetch<Concert[]>(CONCERTS_QUERY, [])
  return (
    <main>
      <div className="page-bg" />
      <div className="container">
        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">Concerts</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Shows Ryan has attended, rated and reviewed
          </p>
        </div>
        <ConcertFeed concerts={concerts} />
      </div>
      <Footer />
    </main>
  )
}
```

```typescript
// src/components/ConcertFeed.tsx — Client Component
'use client'
import { useState } from 'react'
import Image from 'next/image'
import { urlFor } from '@/sanity/lib/image'

type SortKey = 'date' | 'rating'

interface ConcertFeedProps {
  concerts: Concert[]
}

export default function ConcertFeed({ concerts }: ConcertFeedProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date')

  const sorted = [...concerts].sort((a, b) =>
    sortKey === 'rating' ? b.rating - a.rating : 0
    // 'date' order comes from GROQ; no re-sort needed
  )

  return (
    <>
      {/* Sort controls */}
      <div className="concert-sort-bar">
        <button
          className={`btn btn-secondary${sortKey === 'date' ? ' active' : ''}`}
          onClick={() => setSortKey('date')}
        >
          Chronological
        </button>
        <button
          className={`btn btn-secondary${sortKey === 'rating' ? ' active' : ''}`}
          onClick={() => setSortKey('rating')}
        >
          Top Rated
        </button>
      </div>
      {/* Concert cards */}
      <div className="concert-grid">
        {sorted.map((concert) => (
          <article key={concert._id} className="card concert-card">
            {/* photo, stars, venue, caption */}
          </article>
        ))}
      </div>
    </>
  )
}
```

### Pattern 2: Concert Sanity Schema

**What:** A `defineType` document using `defineField` for each required field, following the exact conventions in `blogPost.ts` and `project.ts`.

**When to use:** Any new CMS content type.

**Example:**
```typescript
// src/sanity/schemaTypes/concert.ts
import { defineField, defineType } from 'sanity'

export const concert = defineType({
  name: 'concert',
  title: 'Concert',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Artist / Show Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'venue',
      title: 'Venue',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'rating',
      title: 'Star Rating (1–5)',
      type: 'number',
      validation: (rule) => rule.required().min(1).max(5).integer(),
    }),
    defineField({
      name: 'caption',
      title: 'Review / Caption',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'photos',
      title: 'Photos',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alt Text',
              description: 'Important for accessibility.',
            },
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      date: 'date',
      rating: 'rating',
      media: 'photos.0',
    },
    prepare({ title, date, rating, media }) {
      const stars = rating ? '★'.repeat(rating) : '—'
      return {
        title,
        subtitle: `${stars} — ${date || 'no date'}`,
        media,
      }
    },
  },
})
```

### Pattern 3: Schema Registration

**What:** Add the new schema type to `schemaTypes/index.ts` so Sanity Studio picks it up.

**Example:**
```typescript
// src/sanity/schemaTypes/index.ts (updated)
import { type SchemaTypeDefinition } from 'sanity'
import { resume } from './resume'
import { photo } from './photo'
import { project } from './project'
import { blogPost } from './blogPost'
import { concert } from './concert'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [resume, photo, project, blogPost, concert],
}
```

### Pattern 4: Star Rating Rendering

**What:** Convert the integer `rating` field (1–5) to a visual star display using Unicode characters or a simple loop.

**Example:**
```typescript
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="concert-stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < rating ? 'var(--accent-gold)' : 'var(--border)' }}>
          ★
        </span>
      ))}
    </div>
  )
}
```

### Pattern 5: Sanity Image Rendering

**What:** Use `urlFor` from `@/sanity/lib/image` with `next/image` for optimized photo display.

**Example:**
```typescript
// Source: existing pattern in src/sanity/lib/image.ts
import Image from 'next/image'
import { urlFor } from '@/sanity/lib/image'

// Inside card render:
{concert.photos && concert.photos.length > 0 && (
  <div className="concert-photo-wrapper">
    <Image
      src={urlFor(concert.photos[0]).width(600).height(400).fit('crop').url()}
      alt={concert.photos[0].alt ?? concert.title}
      width={600}
      height={400}
      style={{ objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
    />
  </div>
)}
```

### Anti-Patterns to Avoid

- **Making the page a Client Component:** Fetching Sanity data in a Client Component breaks ISR and increases bundle size. Keep `safeFetch` in the Server Component parent.
- **Storing sort state in a URL param with `router.push`:** This causes a server round-trip and a full page re-render, violating the "no page reload" requirement.
- **Using `sanityFetch` / `SanityLive` from `lib/live.ts`:** These are for live preview / draft mode. The standard `safeFetch` + `revalidate = 60` ISR pattern is correct for the public-facing feed.
- **Referencing `photo` document type for concert images:** The existing `photo` schema is a standalone document type for a gallery. Concert photos should be inline image objects within the concert document array for editorial simplicity.
- **Forgetting `export const revalidate = 60`:** Without this, Next.js defaults to static generation at build time — new concerts won't appear until the next deploy.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image CDN URL construction | Custom URL string builder | `urlFor` from `@/sanity/lib/image` | Handles asset references, transformations, CDN routing — already wired to project/dataset env vars |
| Sanity data fetching with graceful degradation | Custom try/catch fetch | `safeFetch<T>` from `@/sanity/lib/client` | Already guards against missing env vars and network errors; matches project pattern |
| CMS image optimization | `<img>` with raw `urlFor` URL | `next/image` + `urlFor` | `next/image` handles lazy loading, size optimization, LCP; remote pattern already in `next.config.mjs` |
| Star icon rendering | SVG star component from scratch | Unicode `★`/`☆` or `lucide-react` `Star` | Both are already available; `lucide-react` is installed |

**Key insight:** The data layer (safeFetch, urlFor, client) is fully built. The schema layer is copy-and-modify from existing schemas. The page layer is proven by blog and projects. The only genuinely new surface is the Client Component sort wrapper — which is ~40 lines of `useState` logic.

---

## Common Pitfalls

### Pitfall 1: Date Timezone Shift
**What goes wrong:** `new Date('2024-08-15')` in JavaScript interprets the date string as UTC midnight, which shifts to the prior day in US timezones when calling `.getDate()` or `.toLocaleDateString()`.
**Why it happens:** ISO date strings without a time component are treated as UTC by the Date constructor.
**How to avoid:** Append `T00:00:00` to the date string before constructing: `new Date(dateStr + 'T00:00:00')`. The existing `formatBlogDate` in `blog/page.tsx` already uses this pattern — copy it.
**Warning signs:** Concert dates display one day earlier than entered in Studio.

### Pitfall 2: Missing `'use client'` on Sort Component
**What goes wrong:** `useState` call throws "You're importing a component that needs useState. It only works in a Client Component..." build error.
**Why it happens:** Next.js App Router defaults all components to Server Components.
**How to avoid:** Add `'use client'` as the literal first line of `ConcertFeed.tsx` before any imports.
**Warning signs:** Build error at compile time.

### Pitfall 3: Mutating the Props Array During Sort
**What goes wrong:** `.sort()` mutates the array in place; sorting the `concerts` prop directly causes React to not detect the state change or produces stale renders.
**Why it happens:** JavaScript `.sort()` is in-place.
**How to avoid:** Always spread before sorting: `const sorted = [...concerts].sort(...)`.

### Pitfall 4: `urlFor` Called on Undefined Photo
**What goes wrong:** Runtime error if `concert.photos` is empty or undefined when calling `urlFor(concert.photos[0])`.
**Why it happens:** Sanity array fields return `undefined` when no items have been added.
**How to avoid:** Guard with `concert.photos && concert.photos.length > 0` before accessing index 0. Match the empty-state pattern used in `projects/page.tsx`.

### Pitfall 5: Schema Not Registered in index.ts
**What goes wrong:** The new `concert` schema file exists but does not appear in Sanity Studio.
**Why it happens:** Sanity discovers types only through the `schema.types` array in `schemaTypes/index.ts`.
**How to avoid:** Always add the import and array entry to `schemaTypes/index.ts` as step one of schema work.
**Warning signs:** `/studio` opens fine but no "Concert" document type appears in the sidebar.

### Pitfall 6: `next/image` Width/Height Mismatch with `urlFor` Dimensions
**What goes wrong:** Next.js `next/image` requires `width` and `height` props; if they don't match the `urlFor` transform dimensions, layout shift or blurry images result.
**How to avoid:** Set `urlFor(...).width(W).height(H)` to match the `<Image width={W} height={H}>` props exactly, or use `fill` layout with a sized container div.

---

## Code Examples

Verified patterns from existing codebase:

### GROQ Query with Date Ordering
```typescript
// Source: Coding/rysite/src/app/blog/page.tsx
const CONCERTS_QUERY = `*[_type == "concert"] | order(date desc) {
  _id,
  title,
  date,
  venue,
  rating,
  caption,
  photos[] {
    asset,
    alt
  }
}`
```

### safeFetch Usage
```typescript
// Source: Coding/rysite/src/app/blog/page.tsx
export const revalidate = 60

export default async function ConcertsPage() {
  const concerts = await safeFetch<Concert[]>(CONCERTS_QUERY, [])
  // ...
}
```

### urlFor Image URL
```typescript
// Source: Coding/rysite/src/sanity/lib/image.ts
import { urlFor } from '@/sanity/lib/image'
// Usage:
urlFor(photo).width(600).height(400).fit('crop').url()
```

### Empty State Pattern
```tsx
// Source: Coding/rysite/src/app/blog/page.tsx
{concerts.length === 0 ? (
  <div className="empty-state">
    <div className="empty-state-icon">&#127928;</div>
    <h3 className="empty-state-title">No concerts yet</h3>
    <p className="empty-state-text">
      Visit <Link href="/studio">/studio</Link> to add your first concert.
    </p>
  </div>
) : (
  <ConcertFeed concerts={concerts} />
)}
```

### Date Format Helper (copy from blog)
```typescript
// Source: Coding/rysite/src/app/blog/page.tsx
function formatConcertDate(dateStr: string) {
  if (!dateStr) return { month: '', day: '', year: '' }
  const d = new Date(dateStr + 'T00:00:00')  // Avoids UTC timezone shift
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    day: String(d.getDate()),
    year: String(d.getFullYear()),
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getServerSideProps` / `getStaticProps` | App Router Server Components + `export const revalidate` | Next.js 13+ | Pages are Server Components by default; ISR via module-level export |
| Pages Router client fetch for interactivity | Server Component parent + Client Component child (props drilling) | Next.js 13+ | Keeps data fetching on server while enabling client-side state |
| `client.fetch()` directly | `safeFetch<T>` wrapper | Project convention | Prevents crashes from missing env vars in CI/dev environments |

**Deprecated/outdated:**
- `getStaticProps` / `getServerSideProps`: Not applicable in App Router. This codebase uses Server Components + `revalidate`.
- `SanityLive` / `sanityFetch` from `lib/live.ts`: These are for live preview/draft mode. Don't use for the public feed — use `safeFetch` + `revalidate`.

---

## Open Questions

1. **Multiple photos per concert — display strategy**
   - What we know: The schema will store an array of photos; CONC-02 requires "at least one photo" displayed.
   - What's unclear: Should all photos be shown (gallery/grid) or just the first (hero image)?
   - Recommendation: Show first photo as the card hero image. A multi-photo gallery is v2 scope. This is simpler and sufficient for the requirement.

2. **CSS class namespace for concert feed**
   - What we know: `globals.css` uses BEM-inspired kebab-case with page-specific prefixes (`blog-`, `project-`, `planetarium-`).
   - What's unclear: Should concert styles go in `globals.css` or a scoped CSS Module?
   - Recommendation: Add `concert-` prefixed classes to `globals.css`, matching the existing convention. No CSS Modules exist in this project.

3. **Star rating input in Studio — slider vs. dropdown**
   - What we know: Sanity `number` field with `validation: rule.min(1).max(5).integer()` renders as a plain number input by default.
   - What's unclear: Whether a custom Studio input (e.g., `options: { list: [1,2,3,4,5] }`) would be more user-friendly.
   - Recommendation: Use `options: { list: [1,2,3,4,5] }` to render a dropdown of valid values — same pattern as the `tag` field in `blogPost.ts`. No custom input component needed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected in codebase |
| Config file | None — Wave 0 must establish if any testing is planned |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONC-01 | `/concerts` loads and shows concerts in date order | manual-only | N/A — no test framework | ❌ |
| CONC-02 | Each card shows photo, rating, and caption | manual-only | N/A | ❌ |
| CONC-03 | Sort toggle reorders list without page reload | manual-only | N/A | ❌ |
| CONC-04 | Studio CRUD for concert documents | manual-only | N/A — CMS UI, not automatable | ❌ |
| CONC-05 | Concert schema fields present in Studio | manual-only | N/A | ❌ |

### Sampling Rate
- **Per task commit:** Manual browser verification at `http://localhost:3000/concerts` and `/studio`
- **Per wave merge:** Same manual check
- **Phase gate:** All success criteria from ROADMAP.md pass manual inspection before marking phase complete

### Wave 0 Gaps
- No test framework is installed or configured. The project currently has zero test files.
- Given the manual-only nature of all phase requirements (CMS UI, visual rendering, client-side interactivity), introducing a test framework in Wave 0 would add setup overhead with limited automated coverage possible.
- Recommendation: Accept manual verification for Phase 1. If automated testing is desired in future phases, consider Playwright for E2E (can test sort behavior and page render) — but that is out of scope for this phase.

---

## Sources

### Primary (HIGH confidence)
- `Coding/rysite/src/app/blog/page.tsx` — exact pattern for safeFetch + revalidate + GROQ + empty state
- `Coding/rysite/src/app/projects/page.tsx` — pattern for Sanity-driven content page
- `Coding/rysite/src/sanity/schemaTypes/blogPost.ts` — exact schema authoring pattern to replicate
- `Coding/rysite/src/sanity/schemaTypes/photo.ts` — inline image field pattern with hotspot + alt
- `Coding/rysite/src/sanity/lib/client.ts` — `safeFetch<T>` implementation
- `Coding/rysite/src/sanity/lib/image.ts` — `urlFor` implementation
- `Coding/rysite/src/sanity/schemaTypes/index.ts` — schema registration pattern
- `Coding/rysite/src/app/globals.css` — design tokens, card/grid/empty-state CSS classes
- `Coding/rysite/next.config.mjs` — `cdn.sanity.io` already in `remotePatterns`

### Secondary (MEDIUM confidence)
- Next.js 15 App Router documentation pattern: Server Component parent + Client Component child for mixed data/interactivity
- Sanity `defineType` / `defineField` API — consistent with existing schema files in the codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed and in active use
- Architecture patterns: HIGH — directly derived from existing `/blog` and `/projects` implementations in the same codebase
- Schema design: HIGH — `concert.ts` mirrors `blogPost.ts` with additions; photo inline array mirrors `photo.ts`
- Client-side sort pattern: HIGH — standard React `useState` on a pre-fetched array, well-established Next.js App Router pattern
- Pitfalls: HIGH — date timezone issue sourced directly from existing `blog/page.tsx` code comments; others from first-principles App Router knowledge

**Research date:** 2026-03-10
**Valid until:** 2026-09-10 (stable stack — Next.js 15, Sanity 4, React 19; no fast-moving APIs involved)
