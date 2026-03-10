# Roadmap: sweeney-town

## Overview

Three phases add the two missing content sections (concerts and travel) and then update the site's entry points to reflect the fuller picture of what the site is. Concerts and travel follow the same Sanity pattern already proven by projects — each gets a schema, a GROQ query, and a page. The homepage and navigation are updated last, once there are real destinations to point to.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Concerts** - Sanity schema, GROQ query, and /concerts feed page with photo/rating/caption display and sort-by-rating
- [ ] **Phase 2: Travel** - Sanity schema, GROQ query, and /travel interactive map page with city-level pins and detail cards
- [ ] **Phase 3: Homepage and Navigation** - Redesign homepage, add /concerts and /travel to site nav, retire /blog

## Phase Details

### Phase 1: Concerts
**Goal**: Visitors can browse a chronological feed of concerts Ryan has attended, each with photos, a star rating, and a review — and Ryan can manage entries in Sanity Studio
**Depends on**: Nothing (first phase)
**Requirements**: CONC-01, CONC-02, CONC-03, CONC-04, CONC-05
**Success Criteria** (what must be TRUE):
  1. Visitor can load /concerts and see a list of concert entries in reverse-chronological order
  2. Each entry shows at least one photo, a star rating (1-5), venue, and a caption/review
  3. Visitor can sort the feed by star rating and the order updates without a page reload
  4. Ryan can create, edit, and delete concert entries in Sanity Studio at /studio
  5. New or edited concerts appear on /concerts within 60 seconds (ISR revalidation)
**Plans**: TBD

### Phase 2: Travel
**Goal**: Visitors can explore an interactive map of cities Ryan has personally visited, click any pin to zoom in, and read a detail card with photos, description, date, and rating — and Ryan can manage entries in Sanity Studio
**Depends on**: Phase 1
**Requirements**: TRVL-01, TRVL-02, TRVL-03, TRVL-04, TRVL-05, TRVL-06
**Success Criteria** (what must be TRUE):
  1. Visitor can load /travel and see an interactive map with pins for each city Ryan has visited
  2. Map shows both US domestic and international pins at city-level precision
  3. Clicking a pin zooms the map into that city
  4. Clicking a pin reveals a detail card showing photos, description, date visited, and star rating
  5. Ryan can create, edit, and delete travel entries (including coordinates) in Sanity Studio
**Plans**: TBD

### Phase 3: Homepage and Navigation
**Goal**: The homepage clearly communicates what the site is and one-click navigation reaches all major sections; /blog is retired in favor of /concerts and /travel
**Depends on**: Phase 2
**Requirements**: HOME-01, HOME-02, HOME-03, NAV-01, NAV-02, NAV-03
**Success Criteria** (what must be TRUE):
  1. Visitor landing on / immediately understands the site covers concerts, travel, projects, and resume
  2. Visitor can reach /concerts, /travel, /projects, and /resume from the homepage in one click
  3. The homepage feels personal and well-crafted — not a generic developer portfolio template
  4. Site navigation includes visible links to /concerts and /travel
  5. Visiting /blog redirects or returns a 404; the route is no longer a live feed
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Concerts | TBD | Not started | - |
| 2. Travel | TBD | Not started | - |
| 3. Homepage and Navigation | TBD | Not started | - |
