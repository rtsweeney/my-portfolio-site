# Codebase Structure

**Analysis Date:** 2026-03-10

## Directory Layout

```
sweeney-town/                          # Repo root
├── Coding/
│   └── rysite/                        # Next.js application root
│       ├── public/                    # Static assets served at /
│       │   ├── visuals/               # Legacy standalone HTML visuals (reactive backgrounds)
│       │   └── resume.pdf             # Downloadable resume PDF
│       ├── src/
│       │   ├── app/                   # Next.js App Router — all routes live here
│       │   │   ├── layout.tsx         # Root layout (Navigation wrapper, global font/metadata)
│       │   │   ├── page.tsx           # Homepage /
│       │   │   ├── globals.css        # All global CSS (design tokens, component classes)
│       │   │   ├── icon.svg           # Favicon
│       │   │   ├── blog/
│       │   │   │   └── page.tsx       # /blog — Sanity-driven life updates feed
│       │   │   ├── calculators/
│       │   │   │   ├── page.tsx       # /calculators — calculator index/listing
│       │   │   │   ├── air-density/page.tsx
│       │   │   │   ├── beers-per-beer/page.tsx
│       │   │   │   └── unit-converter/page.tsx
│       │   │   ├── planetarium/
│       │   │   │   ├── page.tsx       # /planetarium — interactive star map (large, ~81KB)
│       │   │   │   └── constellations.ts  # Static constellation data (~64KB)
│       │   │   ├── projects/
│       │   │   │   ├── page.tsx       # /projects — mix of hardcoded + Sanity projects
│       │   │   │   ├── pleat-counter/page.tsx
│       │   │   │   └── reactive-fun-backgrounds/
│       │   │   │       ├── page.tsx
│       │   │   │       └── jellyfish-aquarium/page.tsx
│       │   │   ├── resume/
│       │   │   │   └── page.tsx       # /resume — hardcoded resume content
│       │   │   └── studio/
│       │   │       └── [[...tool]]/page.tsx  # /studio/** — embedded Sanity Studio (edge)
│       │   ├── components/            # Shared UI components
│       │   │   ├── Navigation.tsx
│       │   │   ├── Footer.tsx
│       │   │   └── CalculatorLayout.tsx
│       │   └── sanity/                # Sanity CMS integration
│       │       ├── env.ts             # Reads NEXT_PUBLIC_SANITY_* env vars
│       │       ├── structure.ts       # Studio sidebar structure
│       │       ├── lib/
│       │       │   ├── client.ts      # Sanity client + safeFetch utility
│       │       │   ├── image.ts       # Image URL builder (urlFor)
│       │       │   └── live.ts        # sanityFetch / SanityLive for live API
│       │       └── schemaTypes/
│       │           ├── index.ts       # Schema barrel — aggregates all types
│       │           ├── blogPost.ts
│       │           ├── project.ts
│       │           ├── resume.ts
│       │           └── photo.ts
│       ├── next.config.mjs            # Next.js config (remote image patterns for cdn.sanity.io)
│       ├── sanity.config.ts           # Sanity Studio configuration
│       ├── sanity.cli.ts              # Sanity CLI config
│       ├── tsconfig.json              # TypeScript config (@/* path alias)
│       ├── eslint.config.mjs          # ESLint config
│       └── package.json
├── .planning/                         # GSD planning docs
│   └── codebase/
└── wrangler.json                      # Cloudflare Wrangler config (root level)
```

## Directory Purposes

**`src/app/`:**
- Purpose: All routes. Each subdirectory becomes a URL segment. Every `page.tsx` is a route handler.
- Contains: Route page components, root `layout.tsx`, `globals.css`
- Key files: `Coding/rysite/src/app/layout.tsx`, `Coding/rysite/src/app/page.tsx`, `Coding/rysite/src/app/globals.css`

**`src/app/calculators/`:**
- Purpose: Calculator tools. The index page at `calculators/page.tsx` lists all calculators. Each subdirectory is a standalone calculator.
- Contains: One `page.tsx` per calculator — all are Client Components (`'use client'`)
- Pattern: Each calculator page wraps its UI in `<CalculatorLayout>` imported from `@/components/CalculatorLayout`

**`src/app/projects/`:**
- Purpose: Interactive project routes. Each subdirectory is a built-in project with its own page.
- Contains: Project page components; large interactive pages (pleat-counter, planetarium, jellyfish aquarium)

**`src/components/`:**
- Purpose: Shared layout and wrapper components used across multiple pages
- Contains: `Navigation.tsx` (global nav, client component), `Footer.tsx` (social links), `CalculatorLayout.tsx` (calculator page shell)
- Key files: `Coding/rysite/src/components/Navigation.tsx`, `Coding/rysite/src/components/CalculatorLayout.tsx`

**`src/sanity/`:**
- Purpose: All Sanity CMS integration — client, schema types, Studio structure, image helpers
- Contains: `env.ts`, `lib/`, `schemaTypes/`, `structure.ts`
- Key files: `Coding/rysite/src/sanity/lib/client.ts`, `Coding/rysite/src/sanity/schemaTypes/index.ts`

**`public/`:**
- Purpose: Static files served verbatim at the root URL
- Contains: Social icons (PNG), `resume.pdf`, SVGs, `visuals/` subdirectory with legacy standalone HTML/JS visuals
- Generated: No
- Committed: Yes

## Key File Locations

**Entry Points:**
- `Coding/rysite/src/app/layout.tsx`: Root layout applied to every page
- `Coding/rysite/src/app/page.tsx`: Homepage
- `Coding/rysite/src/app/studio/[[...tool]]/page.tsx`: Embedded Sanity Studio

**Configuration:**
- `Coding/rysite/next.config.mjs`: Next.js configuration (remote image allowlist)
- `Coding/rysite/sanity.config.ts`: Sanity Studio setup
- `Coding/rysite/tsconfig.json`: TypeScript, includes `@/*` → `./src/*` path alias
- `Coding/rysite/src/sanity/env.ts`: Sanity environment variable reads

**Core Logic:**
- `Coding/rysite/src/sanity/lib/client.ts`: `safeFetch<T>` — all CMS data fetching goes through here
- `Coding/rysite/src/sanity/schemaTypes/index.ts`: Schema barrel file; add new schema types here
- `Coding/rysite/src/app/globals.css`: All design tokens (CSS custom properties) and utility classes

**Testing:**
- Not applicable — no test files detected

## Naming Conventions

**Files:**
- Pages: always `page.tsx` (enforced by Next.js App Router)
- Components: PascalCase — `Navigation.tsx`, `Footer.tsx`, `CalculatorLayout.tsx`
- Sanity schema files: camelCase singular noun — `blogPost.ts`, `project.ts`, `resume.ts`
- Utility/config files: camelCase — `client.ts`, `image.ts`, `live.ts`, `env.ts`
- Data files: camelCase — `constellations.ts`

**Directories:**
- Route segments: kebab-case — `beers-per-beer/`, `air-density/`, `unit-converter/`, `pleat-counter/`, `reactive-fun-backgrounds/`, `jellyfish-aquarium/`
- Special Next.js catch-all: `[[...tool]]/` (Sanity Studio)

**Components:**
- Default exports only; one component per file; file name matches component name

## Where to Add New Code

**New calculator:**
- Create directory: `Coding/rysite/src/app/calculators/<kebab-name>/`
- Implementation: `Coding/rysite/src/app/calculators/<kebab-name>/page.tsx`
- Add `'use client'` at top; wrap UI in `<CalculatorLayout title="..." description="...">`
- Register in Navigation dropdown: `Coding/rysite/src/components/Navigation.tsx` (the `calculators` array at the top)
- Register in calculators index: `Coding/rysite/src/app/calculators/page.tsx` (the `calculators` array)

**New built-in project:**
- Create directory: `Coding/rysite/src/app/projects/<kebab-name>/`
- Implementation: `Coding/rysite/src/app/projects/<kebab-name>/page.tsx`
- Add a hardcoded card to `Coding/rysite/src/app/projects/page.tsx`

**New Sanity content type:**
- Define schema: `Coding/rysite/src/sanity/schemaTypes/<typeName>.ts`
- Register: add export to `Coding/rysite/src/sanity/schemaTypes/index.ts` `types` array
- Consume in a page: call `safeFetch<T>(GROQ_QUERY, [])` in the relevant `page.tsx`

**Shared component:**
- Place in `Coding/rysite/src/components/`
- Use PascalCase filename matching the default export name

**Utilities:**
- Sanity-related helpers: `Coding/rysite/src/sanity/lib/`
- No general-purpose `utils/` directory exists; create one at `Coding/rysite/src/lib/` if needed

## Special Directories

**`public/visuals/`:**
- Purpose: Legacy standalone reactive-background visuals (HTML + vanilla JS + CSS)
- Generated: No
- Committed: Yes
- Note: Separate from the Next.js app; these are referenced by project pages in `src/app/projects/reactive-fun-backgrounds/`

**`.planning/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: Yes (by GSD commands)
- Committed: Depends on project preference

---

*Structure analysis: 2026-03-10*
