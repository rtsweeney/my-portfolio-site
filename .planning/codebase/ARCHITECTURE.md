# Architecture

**Analysis Date:** 2026-03-10

## Pattern Overview

**Overall:** Next.js App Router — page-per-route with co-located components and a headless CMS layer (Sanity) for dynamic content.

**Key Characteristics:**
- Pages are React Server Components by default; interactive calculators and the navigation component opt in to client rendering via `'use client'`
- Content-managed sections (blog, projects) fetch data from Sanity at request time using `safeFetch` with ISR (`revalidate = 60`)
- Static/built-in sections (resume, individual project pages, calculators) are fully hardcoded and contain no CMS dependency
- Sanity Studio is embedded at `/studio` as a catch-all edge route, giving the owner a full CMS UI at that path
- Global layout wraps every page with a persistent `Navigation` component; pages individually include a `Footer`

## Layers

**Routing / Pages Layer:**
- Purpose: Define URL structure and render page content
- Location: `Coding/rysite/src/app/`
- Contains: `page.tsx` files (one per route), `layout.tsx` (root), `globals.css`
- Depends on: Components layer, Sanity data layer
- Used by: Next.js router

**Shared Components Layer:**
- Purpose: Reusable UI building blocks used across multiple pages
- Location: `Coding/rysite/src/components/`
- Contains: `Navigation.tsx`, `Footer.tsx`, `CalculatorLayout.tsx`
- Depends on: Nothing (no Sanity, no business logic)
- Used by: Pages layer

**Sanity Data Layer:**
- Purpose: CMS configuration, schema definitions, and data-fetching utilities
- Location: `Coding/rysite/src/sanity/`
- Contains:
  - `env.ts` — reads environment variables
  - `lib/client.ts` — Sanity client + `safeFetch` wrapper
  - `lib/image.ts` — Sanity image URL builder
  - `lib/live.ts` — `sanityFetch` / `SanityLive` for live content API
  - `schemaTypes/` — Sanity document type definitions
  - `structure.ts` — Studio sidebar structure
- Depends on: `next-sanity`, `@sanity/image-url`, environment variables
- Used by: Pages layer (blog, projects), `sanity.config.ts`

**CMS Configuration Layer:**
- Purpose: Configure Sanity Studio and wire schema to the embedded editor
- Location: `Coding/rysite/sanity.config.ts`, `Coding/rysite/sanity.cli.ts`
- Contains: Studio plugin configuration, schema registration
- Depends on: Sanity data layer schemas and structure
- Used by: `src/app/studio/[[...tool]]/page.tsx`

## Data Flow

**CMS-driven page (Blog, Projects):**

1. Next.js renders the Server Component page (`src/app/blog/page.tsx` or `src/app/projects/page.tsx`)
2. Page calls `safeFetch<T>(GROQ_QUERY, fallback)` from `src/sanity/lib/client.ts`
3. `safeFetch` checks if Sanity is configured (env vars present); returns fallback `[]` if not
4. If configured, Sanity client executes the GROQ query against `cdn.sanity.io`
5. Typed data is passed as props into JSX; rich-text fields are rendered via `<PortableText>`
6. Next.js ISR revalidates the page every 60 seconds (`export const revalidate = 60`)

**Static page (Resume, Calculators index, individual project routes):**

1. Next.js renders the Server Component at build time
2. All content is hardcoded in JSX — no external calls
3. Page is served as a static file from the CDN edge

**Interactive calculator:**

1. Page component is a Client Component (`'use client'`)
2. Component renders inside `CalculatorLayout` wrapper
3. User input drives local `useState`; `useEffect` recalculates result on each input change
4. No server calls — all computation is client-side

**State Management:**
- No global state manager. Interactive state is local `useState` within individual Client Components. No Context, Redux, or Zustand.

## Key Abstractions

**`safeFetch<T>` utility:**
- Purpose: Guard against missing Sanity configuration in development or misconfigured environments
- Location: `Coding/rysite/src/sanity/lib/client.ts`
- Pattern: Returns a typed fallback value if env vars are absent or the query throws; prevents build/runtime crashes

**`CalculatorLayout` component:**
- Purpose: Consistent page shell for all calculator routes — breadcrumb, title, subtitle, card wrapper
- Location: `Coding/rysite/src/components/CalculatorLayout.tsx`
- Pattern: Accepts `title`, `description`, and `children` props; all calculator `page.tsx` files wrap their UI inside it

**Sanity schema types:**
- Purpose: Define the shape of CMS documents
- Location: `Coding/rysite/src/sanity/schemaTypes/`
- Files: `blogPost.ts`, `project.ts`, `resume.ts`, `photo.ts`, `index.ts`
- Pattern: Each file uses `defineType` / `defineField`; `index.ts` aggregates all types into `schema.types` for `sanity.config.ts`

## Entry Points

**Root layout:**
- Location: `Coding/rysite/src/app/layout.tsx`
- Triggers: Every page request
- Responsibilities: Applies Inter font, sets global metadata, renders `<Navigation>` above page content

**Homepage:**
- Location: `Coding/rysite/src/app/page.tsx`
- Triggers: `GET /`
- Responsibilities: Hero section + four card links to main sections; no data fetching

**Sanity Studio:**
- Location: `Coding/rysite/src/app/studio/[[...tool]]/page.tsx`
- Triggers: Any request to `/studio/**`
- Responsibilities: Mounts the embedded Sanity Studio editor; runs on the Edge runtime

## Error Handling

**Strategy:** Silent fallback in data layer; no global error boundary.

**Patterns:**
- `safeFetch` wraps all Sanity queries in `try/catch` and returns the provided fallback value — prevents CMS errors from crashing pages
- Pages show an empty-state UI component when `posts.length === 0` or `projects.length === 0` rather than showing errors
- No custom `error.tsx` or `not-found.tsx` files detected; Next.js defaults apply

## Cross-Cutting Concerns

**Logging:** No logging framework detected. Errors in `safeFetch` are silently swallowed (`catch {}`).

**Validation:** Sanity schema validation at content-entry time (Studio). No runtime input validation on the Next.js side beyond HTML `type="number"` attributes in calculators.

**Authentication:** None. The Studio route at `/studio` is publicly accessible with no auth guard.

---

*Architecture analysis: 2026-03-10*
