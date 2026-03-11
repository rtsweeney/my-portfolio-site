# External Integrations

**Analysis Date:** 2026-03-10

## APIs & External Services

**Headless CMS:**
- Sanity.io - Content management for blog posts, projects, photos, and resume data
  - SDK/Client: `next-sanity` (wraps `@sanity/client`); client initialized in `Coding/rysite/src/sanity/lib/client.ts`
  - Auth: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`
  - API versioning: `NEXT_PUBLIC_SANITY_API_VERSION` (default `2025-12-14`)
  - Query language: GROQ (used directly in page components, e.g., `Coding/rysite/src/app/blog/page.tsx`, `Coding/rysite/src/app/projects/page.tsx`)
  - Live content: `sanityFetch` / `SanityLive` from `Coding/rysite/src/sanity/lib/live.ts` for real-time updates

**Font Loading:**
- Google Fonts - Inter font family
  - Loaded via `next/font/google` in `Coding/rysite/src/app/layout.tsx`
  - No API key required

## Data Storage

**Databases:**
- Sanity Content Lake (cloud)
  - Connection: `NEXT_PUBLIC_SANITY_PROJECT_ID` + `NEXT_PUBLIC_SANITY_DATASET`
  - Client: `createClient` from `next-sanity`; CDN reads enabled (`useCdn: true`)
  - Schema types: `blogPost`, `photo`, `project`, `resume` — defined in `Coding/rysite/src/sanity/schemaTypes/`

**File Storage:**
- Sanity Asset CDN (`cdn.sanity.io`) - Images uploaded through Sanity Studio
  - URL builder: `Coding/rysite/src/sanity/lib/image.ts` via `@sanity/image-url`
  - Allowed in Next.js image config (`Coding/rysite/next.config.mjs`)
- Local filesystem - Static assets in `Coding/rysite/public/` (resume PDF, icons, standalone HTML visuals)

**Caching:**
- None (no Redis, Memcached, or similar); Next.js ISR used on blog and projects pages (`export const revalidate = 60`)

## Authentication & Identity

**Auth Provider:**
- None for end users — the site is a public personal portfolio with no user login
- Sanity Studio auth (Sanity-managed OAuth) — accessed at `/studio` route; requires Sanity account with project access

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, etc.)

**Logs:**
- Cloudflare observability enabled in `wrangler.json` (`"observability": { "enabled": true }`) — provides request logs via Cloudflare dashboard

## CI/CD & Deployment

**Hosting:**
- Cloudflare Pages — indicated by `wrangler.json` at repo root with `nodejs_compat` compatibility flag
- Sanity Studio — embedded in the Next.js app at `/studio` (edge runtime)

**CI Pipeline:**
- Not detected (no GitHub Actions, CircleCI, or similar config present)

## Browser APIs Used (Client-Side Integrations)

These are browser-native APIs used directly — no external service account required:

- **Geolocation API** — `navigator.geolocation.getCurrentPosition()` in `Coding/rysite/src/app/planetarium/page.tsx`; used to determine user's sky position
- **Canvas API** — used in planetarium (`Coding/rysite/src/app/planetarium/page.tsx`) and pleat counter (`Coding/rysite/src/app/projects/pleat-counter/page.tsx`) for rendering
- **Web Audio API** — used in jellyfish aquarium visual (`Coding/rysite/public/visuals/reactive-fun-backgrounds/`) for microphone beat detection
- **Fullscreen API** — used in reactive fun backgrounds visuals
- **Camera/getUserMedia** — used in pleat counter (`Coding/rysite/src/app/projects/pleat-counter/page.tsx`) for mobile camera access

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SANITY_PROJECT_ID` — Sanity project identifier
- `NEXT_PUBLIC_SANITY_DATASET` — Sanity dataset name (e.g., `production`)

**Optional env vars:**
- `NEXT_PUBLIC_SANITY_API_VERSION` — Sanity API date version; defaults to `2025-12-14`

**Secrets location:**
- No `.env` file committed; no `.env.example` template present
- All vars are `NEXT_PUBLIC_` prefixed (browser-safe; no server-side secrets)

---

*Integration audit: 2026-03-10*
