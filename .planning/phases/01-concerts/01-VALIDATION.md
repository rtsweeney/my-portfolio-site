---
phase: 1
slug: concerts
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no test framework in codebase |
| **Config file** | none |
| **Quick run command** | manual browser check at `http://localhost:3000/concerts` |
| **Full suite command** | manual check at `/concerts` + `/studio` |
| **Estimated runtime** | ~2 minutes manual |

---

## Sampling Rate

- **After every task commit:** Manual browser verification at `http://localhost:3000/concerts` (dev server)
- **After every plan wave:** Full manual check — concerts feed + Studio CRUD
- **Before phase complete:** All success criteria from ROADMAP.md pass manual inspection

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| schema | 01 | 1 | CONC-04, CONC-05 | manual | N/A — CMS UI | ❌ | ⬜ pending |
| page | 01 | 1 | CONC-01, CONC-02 | manual | N/A | ❌ | ⬜ pending |
| sort | 01 | 1 | CONC-03 | manual | N/A | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None — no test framework setup needed. All phase requirements are verified manually (CMS UI, visual rendering, client-side interactivity). Introducing a test framework in Wave 0 would add setup overhead with no automatable coverage for this phase's requirements.

*Existing infrastructure covers all phase requirements (manual verification only).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| /concerts loads concert entries in date order | CONC-01 | No E2E framework; visual list order | Open /concerts, confirm newest concert appears first |
| Each card shows photo, rating (stars), and caption | CONC-02 | Visual rendering | Check concert card displays image, 1-5 stars, and review text |
| Sort toggle reorders list without page reload | CONC-03 | Client-side interactivity | Click "Top Rated" sort button; verify list reorders without full reload |
| Ryan can create/edit/delete concerts in Studio | CONC-04 | CMS admin UI, not automatable | Open /studio, create a Concert document, verify it appears on /concerts within 60s |
| Schema fields present in Studio | CONC-05 | CMS UI | Open /studio → Concert → confirm title, date, venue, rating, photos, caption fields exist |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < manual (~2 min)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
