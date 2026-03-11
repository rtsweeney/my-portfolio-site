# Phase 3: Homepage and Navigation — Validation

**Created:** 2026-03-11
**Framework:** None (no test infrastructure in project)
**Strategy:** Lint + build automation, human visual review

## Summary

This is a pure UI and routing phase — no new data models, no third-party libraries, no business logic. The appropriate validation strategy is:

1. `npm run lint` — catches TypeScript and import errors after each task
2. `npm run build` — catches all routing, redirect, and rendering issues after all changes
3. Human visual review — confirms homepage and nav match design intent

No test files are created for this phase. Build + lint + manual review is the complete and sufficient validation suite.

## Requirements → Validation Map

| Req ID | Behavior to Verify | Validation Type | Command / Method |
|--------|-------------------|-----------------|-----------------|
| HOME-01 | Homepage hero subtitle names concerts, travel, projects, resume | automated + manual | `npm run build` + visual review |
| HOME-02 | Four section cards each link to /concerts, /travel, /projects, /resume | automated + manual | `npm run build` + click each card |
| HOME-03 | Homepage feels personal and well-crafted, not generic | manual | Visual review (human judgment) |
| NAV-01 | /blog redirects to /concerts (308) | automated + manual | `npm run build` + browser visit /blog |
| NAV-02 | Nav includes Concerts and Travel links, no Life Updates/Blog | manual | Visual review of nav bar |
| NAV-03 | /concerts and /travel routes live and accessible | automated | `npm run build` (pages from Phases 1+2) |

## Sampling Schedule

| Checkpoint | Command | When |
|------------|---------|------|
| After Task 1 | `npm run lint` | page.tsx + globals.css + layout.tsx updated |
| After Task 2 | `npm run lint` | Navigation.tsx updated |
| After Task 3 | `npm run build` | blog/page.tsx + next.config.mjs updated |
| Phase gate | Human review checklist | All tasks complete, build green |

## Human Review Checklist

1. Open http://localhost:3000 — hero subtitle mentions concerts, travel, projects, and resume
2. Homepage grid shows 4 cards: Projects (purple top), Resume (teal top), Concerts (pink top, guitar icon), Travel (orange top, globe icon)
3. Click Concerts card → navigates to /concerts
4. Click Travel card → navigates to /travel
5. Nav bar shows Concerts and Travel links; "Life Updates" / "Blog" link is absent
6. Visit /blog → browser redirects to /concerts (check address bar)
7. Overall page feels personal and site-specific, not generic portfolio boilerplate

## Wave 0 Gaps

None. No test infrastructure exists in this project. This phase requires zero new test files.

Build + lint + manual review is the correct and complete validation strategy for a pure UI/routing phase.
