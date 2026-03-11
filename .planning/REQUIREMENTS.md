# Requirements: sweeney-town

**Defined:** 2026-03-10
**Core Value:** Visitors can quickly see what Ryan has been making, where he's been, and what he's about — in one place that feels personal and well-crafted.

## v1 Requirements

### Homepage

- [x] **HOME-01**: Visitor sees a redesigned homepage that clearly communicates the site's purpose (concerts, travel, projects, resume)
- [x] **HOME-02**: Visitor can navigate from the homepage to each major section (concerts, travel, projects, resume) in one click
- [x] **HOME-03**: Homepage feels personal and well-crafted, not generic

### Concerts

- [x] **CONC-01**: Visitor can view a chronological feed of concerts Ryan has attended
- [x] **CONC-02**: Each concert entry displays at least one photo, a star rating, and a caption/review
- [x] **CONC-03**: Visitor can sort the concert feed by star rating
- [x] **CONC-04**: Concert entries are managed via Sanity Studio (create, edit, delete)
- [x] **CONC-05**: Concert schema in Sanity includes: title, date, venue, photos, star rating (1–5), caption/review

### Travel

- [x] **TRVL-01**: Visitor sees an interactive map showing cities Ryan has personally visited
- [x] **TRVL-02**: Map supports both US and international locations with city-level pins
- [x] **TRVL-03**: Clicking a pin zooms the map into that location
- [x] **TRVL-04**: Clicking a pin shows a detail card (below or alongside map) with photos, description, date visited, and rating
- [x] **TRVL-05**: Travel entries are managed via Sanity Studio (create, edit, delete)
- [x] **TRVL-06**: Travel schema in Sanity includes: city, country, coordinates, date, photos, description, rating

### Navigation

- [x] **NAV-01**: /blog route is replaced — redirects or is removed in favor of /concerts and /travel
- [x] **NAV-02**: Site navigation includes links to /concerts and /travel sections
- [x] **NAV-03**: /concerts and /travel routes are live and accessible

## v2 Requirements

### Concerts

- **CONC-V2-01**: Visitor can filter concert feed by artist or venue
- **CONC-V2-02**: Visitor can search concerts by keyword

### Travel

- **TRVL-V2-01**: Visitor can filter travel map by year or region
- **TRVL-V2-02**: Travel map shows a trip timeline view alongside the map

## Out of Scope

| Feature | Reason |
|---------|--------|
| Admin auth / custom login | Sanity Studio at /studio already serves as CMS UI |
| Mobile app | Web-first; not a separate app |
| Real-time features / social interaction | Personal showcase, not a social platform |
| Full world map (every country) | Map shows only personally visited places |
| Blog / life updates feed | /blog was unused; replaced by concerts + travel |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HOME-01 | Phase 3 | Complete |
| HOME-02 | Phase 3 | Complete |
| HOME-03 | Phase 3 | Complete |
| CONC-01 | Phase 1 | Complete |
| CONC-02 | Phase 1 | Complete |
| CONC-03 | Phase 1 | Complete |
| CONC-04 | Phase 1 | Complete |
| CONC-05 | Phase 1 | Complete |
| TRVL-01 | Phase 2 | Complete |
| TRVL-02 | Phase 2 | Complete |
| TRVL-03 | Phase 2 | Complete |
| TRVL-04 | Phase 2 | Complete |
| TRVL-05 | Phase 2 | Complete |
| TRVL-06 | Phase 2 | Complete |
| NAV-01 | Phase 3 | Complete |
| NAV-02 | Phase 3 | Complete |
| NAV-03 | Phase 3 | Complete |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 — traceability filled by roadmapper*
