# Technology Stack

**Analysis Date:** 2026-03-10

## Languages

**Primary:**
- TypeScript 5.x - All application code (`Coding/rysite/src/**/*.ts`, `**/*.tsx`)

**Secondary:**
- HTML/CSS - Global styles at `Coding/rysite/src/app/globals.css`; standalone visuals at `Coding/rysite/public/visuals/reactive-fun-backgrounds/` (plain `.html` files)

## Runtime

**Environment:**
- Node.js (no version pinned — no `.nvmrc` or `.node-version` file present)

**Package Manager:**
- npm
- Lockfile: present (`Coding/rysite/package-lock.json`, lockfile version 3)

## Frameworks

**Core:**
- Next.js ^15.1.0 - Full-stack React framework; App Router; pages at `Coding/rysite/src/app/`
- React ^19.0.0 - UI rendering
- React DOM ^19.0.0 - DOM bindings

**CMS/Studio:**
- Sanity ^4.21.1 - Headless CMS; studio embedded at `/studio` route via `Coding/rysite/src/app/studio/[[...tool]]/page.tsx`
- next-sanity ^11.6.10 - Next.js integration layer (client, live content, PortableText, studio embed)

**Build/Dev:**
- ESLint ^9 with `eslint-config-next` ^15.1.0 - Linting; config at `Coding/rysite/eslint.config.mjs`
- TypeScript compiler (via `tsconfig.json`) - Strict mode enabled, target `es5`, `moduleResolution: bundler`

## Key Dependencies

**Critical:**
- `next-sanity` ^11.6.10 - Provides `createClient`, `sanityFetch`, `SanityLive`, `PortableText`, and `NextStudio`
- `@sanity/image-url` ^1.2.0 - Builds CDN image URLs from Sanity image references; used in `Coding/rysite/src/sanity/lib/image.ts`
- `@sanity/vision` ^4.21.1 - GROQ query explorer plugin inside Sanity Studio

**UI:**
- `lucide-react` ^0.561.0 - Icon library
- `styled-components` ^6.1.19 - CSS-in-JS (imported as a dependency; currently used sparingly alongside global CSS)
- Google Fonts (Inter) - Loaded via `next/font/google` in `Coding/rysite/src/app/layout.tsx`

**Infrastructure:**
- `@types/node` ^20, `@types/react` ^19, `@types/react-dom` ^19 - TypeScript types

## Configuration

**Environment:**
- All required env vars are prefixed `NEXT_PUBLIC_` (client-safe)
- Required vars:
  - `NEXT_PUBLIC_SANITY_PROJECT_ID`
  - `NEXT_PUBLIC_SANITY_DATASET`
  - `NEXT_PUBLIC_SANITY_API_VERSION` (optional; defaults to `2025-12-14`)
- Var sourcing defined in `Coding/rysite/src/sanity/env.ts` and `Coding/rysite/sanity.cli.ts`
- No `.env` file committed; no `.env.example` present

**Build:**
- Next.js config at `Coding/rysite/next.config.mjs` — allows remote images from `cdn.sanity.io`
- TypeScript config at `Coding/rysite/tsconfig.json` — path alias `@/*` → `./src/*`
- Wrangler config at `wrangler.json` (repo root) — `nodejs_compat` flag and observability enabled; suggests Cloudflare Workers/Pages deployment target

## Platform Requirements

**Development:**
- Node.js (version unspecified; npm lockfile v3 requires Node 16+)
- Run: `npm run dev` (from `Coding/rysite/`)

**Production:**
- Cloudflare Pages (indicated by `wrangler.json` at repo root with `nodejs_compat` compatibility flag)
- Sanity Studio served at `/studio` (edge runtime: `export const runtime = 'edge'` in studio page)
- CDN images served from `cdn.sanity.io`

---

*Stack analysis: 2026-03-10*
