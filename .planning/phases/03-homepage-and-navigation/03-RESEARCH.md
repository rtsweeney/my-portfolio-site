# Phase 3: Homepage and Navigation - Research

**Researched:** 2026-03-11
**Domain:** Next.js 15 App Router — homepage redesign, navigation update, route retirement
**Confidence:** HIGH

## Summary

Phase 3 is the final v1 phase. Its job is surgical: update the homepage so it accurately represents what the site is now (concerts, travel, projects, resume), update the nav to expose /concerts and /travel, and retire /blog. All three sections it will link to (/concerts, /travel, /projects, /resume) already exist and are live from Phases 1 and 2. This phase is not adding new data models or third-party libraries — it is pure UI and routing work within the existing stack.

The existing homepage (`src/app/page.tsx`) renders a hero + a 4-card `home-grid`. Two of those cards point to /projects and /resume (correct), one points to /blog (must change to /concerts), and there is no card for /travel. The home-grid CSS already supports `repeat(auto-fit, minmax(280px, 1fr))` so adding a fifth or replacing one card will reflow cleanly. The existing accent color system (`card-accent-purple`, `card-accent-teal`, `card-accent-pink`, `card-accent-gold`) has unused colors (--accent-orange) that can serve the two new cards.

The `/blog` route is a file-based route at `src/app/blog/page.tsx`. In Next.js 15 App Router the canonical way to redirect it is a `permanentRedirect()` call in the page file itself, or via a `redirects` array in `next.config.mjs`. A redirect to `/concerts` (the nearest replacement) is the right outcome. The existing Navigation component (`src/components/Navigation.tsx`) is a Client Component with a hardcoded link list — adding /concerts and /travel, and removing /blog, is a direct edit.

**Primary recommendation:** Replace the /blog card on the homepage with /concerts; add a /travel card (bringing the grid to 5 items or restructuring to a 2+2+1 layout); edit Navigation.tsx to swap the "Life Updates" /blog link for Concerts and Travel links; redirect /blog → /concerts via next.config.mjs redirects.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HOME-01 | Visitor sees a redesigned homepage that clearly communicates the site's purpose (concerts, travel, projects, resume) | Homepage card grid already exists; replace /blog card with /concerts and add /travel card. Update hero subtitle copy to name the four sections. |
| HOME-02 | Visitor can navigate from the homepage to each major section (concerts, travel, projects, resume) in one click | All four routes are live. Add Link cards for /concerts and /travel alongside existing /projects and /resume cards. |
| HOME-03 | Homepage feels personal and well-crafted, not generic | Existing design system (gradient-text, card-accent colors, animate-in classes, vibrant palette) is already non-generic. Updating copy and icons is sufficient; no new design primitives needed. |
| NAV-01 | /blog route is replaced — redirects or is removed in favor of /concerts and /travel | Use `redirects` array in next.config.mjs to send /blog → /concerts (308 permanent). Optionally replace blog/page.tsx with redirect() call. |
| NAV-02 | Site navigation includes links to /concerts and /travel sections | Edit Navigation.tsx: remove the "Life Updates" /blog nav-link, add nav-links for /concerts and /travel. |
| NAV-03 | /concerts and /travel routes are live and accessible | Already true from Phases 1 and 2. Verification-only — confirm routes render without error. |
</phase_requirements>

## Standard Stack

### Core (already installed — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^15.1.0 | App Router, redirects, page routing | Project foundation |
| React | ^19.0.0 | Component rendering | Project foundation |
| lucide-react | ^0.561.0 | Nav icons (Menu, X, ChevronDown) | Already used in Navigation.tsx |
| next/link | built-in | Client-side navigation links | Used throughout |

### No New Dependencies
This phase requires zero new `npm install` commands. Everything needed is already in the project.

## Architecture Patterns

### Recommended Project Structure (changes only)
```
src/
├── app/
│   ├── page.tsx              # EDIT: update hero copy + replace /blog card, add /travel card
│   ├── blog/
│   │   └── page.tsx          # EDIT: replace content with redirect() call OR remove (use next.config redirect)
│   └── (all others)          # unchanged
├── components/
│   └── Navigation.tsx         # EDIT: swap /blog link for /concerts + /travel
└── (all others)               # unchanged
next.config.mjs                # EDIT: add redirects array for /blog → /concerts
```

### Pattern 1: Next.js Config Redirect (NAV-01)
**What:** Declare a permanent HTTP redirect from /blog to /concerts in `next.config.mjs`
**When to use:** Route has been renamed/retired and external links may exist
**Example:**
```javascript
// Source: Next.js docs — https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
  },
  async redirects() {
    return [
      {
        source: '/blog',
        destination: '/concerts',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
```

### Pattern 2: Homepage Card Grid (HOME-01, HOME-02)
**What:** Extend the existing `home-grid` with a /concerts card and update/replace the /blog card with /travel
**When to use:** Grid currently has 4 cards; need to represent 4 sections (concerts, travel, projects, resume)
**Example:**
```tsx
// Consistent with existing pattern in src/app/page.tsx
// Replace the /blog card:
<Link href="/concerts" style={{ textDecoration: 'none' }}>
  <div className="card card-accent-pink">
    <div className="home-card-icon">&#127928;</div>  {/* 🎸 */}
    <h3 className="home-card-title">Concerts</h3>
    <p className="home-card-desc">
      Shows Ryan has attended — rated, reviewed, and remembered.
    </p>
  </div>
</Link>

// Add /travel card (5th card or swap order):
<Link href="/travel" style={{ textDecoration: 'none' }}>
  <div className="card card-accent-teal">
    <div className="home-card-icon">&#127758;</div>  {/* 🌎 */}
    <h3 className="home-card-title">Travel</h3>
    <p className="home-card-desc">
      Cities Ryan has personally visited — an interactive map of everywhere he&apos;s been.
    </p>
  </div>
</Link>
```

**Note on accent colors:** card-accent-pink (--accent-warm: #e84393) is currently used for /blog. card-accent-teal (--accent-secondary: #00b894) is used for /resume. With 4 required sections + optional calculators, reuse existing accent colors for the new sections. --accent-orange (#e17055) exists in the CSS variables but has no `card-accent-orange` class yet — can add one in globals.css if a 5th distinct color is needed.

### Pattern 3: Navigation Update (NAV-02)
**What:** Replace the "Life Updates" `/blog` nav-link with two nav-links: Concerts and Travel
**When to use:** Retiring a nav item, adding two replacements
**Example:**
```tsx
// In src/components/Navigation.tsx — replace the /blog Link with:
<Link href="/concerts" className={`nav-link ${isActive('/concerts') ? 'active' : ''}`}>
  Concerts
</Link>
<Link href="/travel" className={`nav-link ${isActive('/travel') ? 'active' : ''}`}>
  Travel
</Link>
```
**Note:** The `isActive` function uses `pathname === path` (exact match). This is correct for top-level routes — /concerts and /travel will highlight correctly.

### Pattern 4: Hero Copy Update (HOME-01, HOME-03)
**What:** Update hero subtitle so it names the site's actual sections
**Current copy:** "A little corner of the internet for projects, ideas, tools, and life updates."
**Suggested update:** Something like "Concerts, travel, projects, and more — in one place."
**Note:** Keep existing structure (hero-tagline, hero-title with gradient, hero-subtitle, hero-cta-group). Replace copy only. HOME-03 (feels personal) is already satisfied by the visual design system; copy that names real activities (concerts, travel) rather than generic ("life updates") is the key change.

### Anti-Patterns to Avoid
- **Deleting blog/page.tsx without a redirect:** External links to /blog will 404. Use the redirects config.
- **Adding a new CSS framework or component library:** The existing design system in globals.css is comprehensive and already applied everywhere. New components must use existing CSS classes (`.card`, `.card-accent-*`, `.home-card-*`, `.btn`, etc.).
- **Using `router.push` instead of `next/link`:** Navigation links must be `<Link>` components for prefetching and accessibility.
- **Making Navigation.tsx a Server Component:** It uses `usePathname()` and `useState()` — it must remain `'use client'`.
- **Over-engineering the homepage:** HOME-03 says "feels personal and well-crafted, not generic." The existing design achieves this. The risk is over-building (e.g., adding hero images, complex animations) when targeted copy + card updates are sufficient.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| /blog redirect | Custom middleware | `redirects` in next.config.mjs | Next.js handles 308 response, works on Cloudflare Pages edge |
| Navigation active state | Custom scroll tracker | `usePathname()` from next/navigation | Already used in codebase, exact-match active highlighting |
| New card styles | New CSS classes from scratch | Extend existing `.card`, `.card-accent-*` pattern | Consistency with all other pages; globals.css already has all needed primitives |

## Common Pitfalls

### Pitfall 1: Five Cards Break Layout
**What goes wrong:** Adding a 5th card to `home-grid` with `auto-fit, minmax(280px, 1fr)` may produce an awkward 3+2 or 4+1 split on wider screens.
**Why it happens:** `auto-fit` fills columns dynamically based on viewport; 5 items don't divide evenly into a 4-column row.
**How to avoid:** Option A — keep 4 cards (replace /blog with /concerts, keep /travel as a separate "more below" CTA). Option B — explicitly set `grid-template-columns: repeat(2, 1fr)` for a clean 2+2+1 or use `max-width` on the grid. Option C — keep 5 cards but accept natural reflow. All are valid; the planner should pick a layout direction.
**Warning signs:** On a 1200px-wide viewport, 5 × 280px = 1400px minimum, so `auto-fit` will produce a 2-column grid at most viewports — might actually look fine.

### Pitfall 2: /blog Still Appears in Nav After Edit
**What goes wrong:** Developer edits Navigation.tsx to add /concerts and /travel but forgets to remove the /blog link.
**Why it happens:** Copy-paste approach to adding links.
**How to avoid:** The task action should explicitly say "remove the existing /blog `<Link>` and replace it with /concerts and /travel links."

### Pitfall 3: Redirect Not Working on Cloudflare Pages
**What goes wrong:** `redirects()` in next.config.mjs may not apply on Cloudflare Pages edge runtime in all configurations.
**Why it happens:** Cloudflare Pages uses `@cloudflare/next-on-pages` adapter; some Next.js features behave differently.
**How to avoid:** Test the redirect after deployment, or use `redirect()` / `permanentRedirect()` inside `src/app/blog/page.tsx` as a fallback. This is the most reliable approach since it runs at the page level regardless of adapter.
**Safer alternative:**
```tsx
// src/app/blog/page.tsx — replace entire file
import { permanentRedirect } from 'next/navigation';

export default function BlogPage() {
  permanentRedirect('/concerts');
}
```

### Pitfall 4: Hero CTA Buttons Point to Outdated Routes
**What goes wrong:** The existing hero has two CTAs: "See My Projects" (/projects) and "View Resume" (/resume). These are fine and should remain. But if a developer adds /concerts and /travel CTAs without thought, the hero gets cluttered.
**How to avoid:** Keep the hero CTA group to 2-3 buttons maximum. /projects and /resume are the right professional anchors. The section cards below the hero are the right place for /concerts and /travel discovery.

## Code Examples

### Redirect in page.tsx (most reliable for edge compatibility)
```tsx
// Source: Next.js docs — https://nextjs.org/docs/app/api-reference/functions/permanentRedirect
// src/app/blog/page.tsx
import { permanentRedirect } from 'next/navigation';

export default function BlogPage() {
  permanentRedirect('/concerts');
}
```

### Adding card-accent-orange (if 5th card needs distinct color)
```css
/* In src/app/globals.css, alongside existing card-accent-* lines */
.card-accent-orange { border-top: 3px solid var(--accent-orange); }
```

### Metadata update for layout.tsx
```tsx
// src/app/layout.tsx — update description to reflect new site content
export const metadata: Metadata = {
  title: "Sweeney Town",
  description: "Ryan Sweeney's personal corner of the internet — concerts, travel, projects, and resume.",
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| getServerSideProps redirects | `permanentRedirect()` in Server Component / `redirects` in next.config | Next.js 13+ App Router | No props/params needed; works at component level |
| pages/ directory routing | app/ directory (App Router) | Next.js 13+ | Already using this; file-based routing in src/app/ |

**Deprecated/outdated:**
- `next/router` useRouter for redirects in Server Components: not applicable; `permanentRedirect` from `next/navigation` is the server-side equivalent.
- `/blog` route: retiring per project decisions made at project setup.

## Open Questions

1. **5-card grid layout**
   - What we know: `home-grid` uses `auto-fit, minmax(280px, 1fr)` — 5 items will reflow to 2 columns on typical viewports
   - What's unclear: Whether Ryan wants a strict 4-card grid (replacing /blog with /concerts and omitting a separate /travel card in the grid) or a 5-card grid
   - Recommendation: Default to 4 cards (replace /blog→/concerts, replace one other OR add /travel as a 5th) and note the layout tradeoff in the plan. The planner should make this call explicit.

2. **Hero CTA update**
   - What we know: Current CTAs are "See My Projects" and "View Resume"
   - What's unclear: Whether to add /concerts and /travel CTAs to the hero group or leave hero as is
   - Recommendation: Leave hero CTAs as /projects and /resume (professional anchors). New sections are discoverable via cards below.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test config found in project |
| Config file | None (no jest.config.*, vitest.config.*, pytest.ini) |
| Quick run command | `cd /home/user/sweeney-town/Coding/rysite && npm run lint` (linting only) |
| Full suite command | `cd /home/user/sweeney-town/Coding/rysite && npm run build` (build verification) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HOME-01 | Homepage shows concerts, travel, projects, resume sections | smoke (build) | `npm run build` | ❌ Wave 0 |
| HOME-02 | Four section cards are `<Link>` to correct hrefs | manual | Inspect DOM in browser | N/A |
| HOME-03 | Homepage feels personal | manual | Visual review | N/A |
| NAV-01 | /blog redirects to /concerts | smoke | `npm run build` + curl /blog | N/A |
| NAV-02 | Nav contains /concerts and /travel links | manual | Inspect nav in browser | N/A |
| NAV-03 | /concerts and /travel routes render | smoke | `npm run build` | existing pages |

### Sampling Rate
- **Per task commit:** `npm run lint` — catches TypeScript and import errors
- **Per wave merge:** `npm run build` — catches all routing, redirect, and rendering issues
- **Phase gate:** Build green + manual visual review of homepage, nav, and /blog redirect before `/gsd:verify-work`

### Wave 0 Gaps
- No test infrastructure exists in this project. This is a visual/routing phase — the natural validation is:
  1. `npm run build` succeeds (no TypeScript or import errors)
  2. Manual browser check of homepage cards, nav links, and /blog redirect

None — no test files need to be created for this phase. Build + lint + manual review is the appropriate validation strategy for a pure UI/routing phase.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `src/app/page.tsx`, `src/components/Navigation.tsx`, `src/app/blog/page.tsx`, `src/app/globals.css`, `next.config.mjs`, `package.json`
- Next.js docs — redirects: https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects
- Next.js docs — permanentRedirect: https://nextjs.org/docs/app/api-reference/functions/permanentRedirect

### Secondary (MEDIUM confidence)
- Cloudflare Pages + Next.js adapter redirect behavior: known limitation with some next.config features; `permanentRedirect()` in page is the safer path

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — codebase fully inspected, all patterns already in use
- Architecture: HIGH — changes are surgical edits to existing files with established patterns
- Pitfalls: HIGH for /blog redirect edge case (Cloudflare), MEDIUM for 5-card layout question (design judgment call)

**Research date:** 2026-03-11
**Valid until:** 2026-04-10 (stable Next.js 15 + static UI work)
