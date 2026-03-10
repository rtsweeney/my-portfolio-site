# Ryan's Personal Website (sweeney-town)

## What This Is

A personal website that serves as a central hub for everything Ryan is up to — concerts he's attended, places he's traveled, projects and web apps he's built, and his professional resume. It's designed for multiple audiences: potential employers evaluating his work, peers and collaborators interested in what he's building, and friends/family keeping up with what he's been doing.

## Core Value

Visitors can quickly see what Ryan has been making, where he's been, and what he's about — in one place that feels personal and well-crafted.

## Requirements

### Validated

- ✓ Resume page — existing at `/resume`
- ✓ Projects / web apps showcase — existing at `/projects`
- ✓ Sanity CMS integration — studio embedded at `/studio`, schemas for blog/projects exist
- ✓ Calculators section — existing at `/calculators`
- ✓ Planetarium section — existing at `/planetarium`
- ✓ Cloudflare Pages deployment — configured via `wrangler.json`

### Active

- [ ] Homepage rework — current landing page needs redesign to better reflect the site's purpose
- [ ] Concert reviews feed — chronological list with photos, star rating, caption; sortable by rating
- [ ] Travel map — interactive map (US-focused + international) with city-level pins for personally visited places; clicking a pin zooms in and shows a detail card below (photos, description, date, rating)
- [ ] Replace /blog with concerts and travel sections

### Out of Scope

- Admin auth / custom login form — Sanity Studio at `/studio` already serves as the content management UI
- Mobile app — web-first
- Real-time features / social interaction — this is a personal showcase, not a social platform
- Full world map (every country) — map should only show personally visited places

## Context

- Stack: Next.js 15 (App Router) + React 19 + TypeScript + Sanity CMS + Cloudflare Pages
- Sanity Studio is already embedded at `/studio` — all new content types (concerts, travel) will be managed there via new schema definitions
- Concert and travel entries share a similar data shape: photos, caption/description, date, star rating — only the presentation differs (feed vs. map)
- Interactive map library needed for travel section (Leaflet or Mapbox); choice TBD during phase planning
- All dynamic content (concerts, travel) will follow the existing Sanity pattern: GROQ queries + `safeFetch` + ISR revalidation

## Constraints

- **Tech Stack**: Next.js 15 + Sanity — new features must fit this stack
- **Deployment**: Cloudflare Pages — no Node-only APIs; must be edge-compatible
- **CMS**: Sanity is the content source for all dynamic data — no separate database

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Sanity Studio as admin UI for concerts/travel | Already embedded at /studio, no extra auth needed | — Pending |
| Replace /blog with concerts + travel | Blog was unused; these sections better represent Ryan's life | — Pending |
| City-level pins for travel map | Granular enough to be interesting, manageable to maintain | — Pending |

---
*Last updated: 2026-03-10 after initialization*
