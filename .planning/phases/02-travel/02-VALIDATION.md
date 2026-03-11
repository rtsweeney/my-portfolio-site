---
phase: 2
slug: travel
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework installed (consistent with Phase 1) |
| **Config file** | none |
| **Quick run command** | Manual browser check at `http://localhost:3000/travel` |
| **Full suite command** | Manual walkthrough: Studio CRUD + map pin + detail card |
| **Estimated runtime** | ~5 minutes manual |

---

## Sampling Rate

- **After every task commit:** Manual browser verification at `http://localhost:3000/travel` and/or `http://localhost:3000/studio`
- **After every plan wave:** Full manual walkthrough: create entry in Studio, verify pin appears on map, click pin, verify zoom + detail card
- **Before `/gsd:verify-work`:** All 5 success criteria pass manual inspection
- **Max feedback latency:** ~5 minutes

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | TRVL-05, TRVL-06 | manual | N/A — Studio UI verification | ❌ | ⬜ pending |
| 2-01-02 | 01 | 1 | TRVL-05, TRVL-06 | manual | N/A — Studio UI verification | ❌ | ⬜ pending |
| 2-02-01 | 02 | 2 | TRVL-01, TRVL-02 | manual | N/A — visual map render requires browser | ❌ | ⬜ pending |
| 2-02-02 | 02 | 2 | TRVL-03 | manual | N/A — animated browser interaction | ❌ | ⬜ pending |
| 2-02-03 | 02 | 2 | TRVL-04 | manual | N/A — requires content + visual verification | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

No test framework installed. Consistent with Phase 1 — all Phase 2 requirements are visual/interactive and require browser verification. Playwright could eventually test map pin click + detail card appearance, but setup overhead exceeds benefit for this phase.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/travel` loads with interactive map showing pins | TRVL-01 | Visual map render requires browser | Load `http://localhost:3000/travel`, confirm map tiles load and pins appear |
| US and international pins at city-level precision | TRVL-02 | Requires content in Sanity + visual check | Add a US city and an international city in Studio; verify both pins appear on map |
| Clicking a pin zooms the map to that city | TRVL-03 | Animated browser interaction | Click a pin; confirm map animates (`flyTo`) to zoom level 10 on that city |
| Clicking a pin reveals detail card with photos/description/date/rating | TRVL-04 | Requires content + visual verification | Click a pin with photos/description/rating set; confirm detail card renders below map |
| Travel entries can be created/edited/deleted in Studio | TRVL-05 | CMS CRUD, not automatable without E2E framework | Open Studio `/studio`, create a travel entry, edit it, delete it |
| Travel schema fields present in Studio | TRVL-06 | Studio UI verification | Confirm fields: city, country, coordinates (geopoint), date, rating, description, photos |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5 minutes
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
