# Codebase Concerns

**Analysis Date:** 2026-03-10

## Tech Debt

**Monolithic pleat-counter page component:**
- Issue: All image processing utilities, algorithm logic, and UI are packed into a single 1,974-line file with no separation of concerns
- Files: `Coding/rysite/src/app/projects/pleat-counter/page.tsx`
- Impact: Hard to test, understand, or extend; any change to algorithm or UI requires touching the same giant file
- Fix approach: Extract pure functions (image processing, Otsu, Theil-Sen, autocorrelation, analyzePleats) into a `lib/pleat-analysis.ts` module; extract canvas drawing helpers into `lib/pleat-overlay.ts`

**Large planetarium page component:**
- Issue: Canvas drawing, astronomy math (LST, RA/Dec, alt/az), time-wheel dragging logic, geolocation, and full UI are all in a single 1,115-line file
- Files: `Coding/rysite/src/app/planetarium/page.tsx`
- Impact: Difficult to maintain; any change forces navigating through hundreds of unrelated lines
- Fix approach: Split astronomy math out of `constellations.ts` into a dedicated `lib/astronomy.ts`, and extract the canvas rendering into a custom hook or standalone module

**Hardcoded navigation calculator list:**
- Issue: The `calculators` array in `Navigation.tsx` is a manually maintained list that must be kept in sync with actual routes in `src/app/calculators/`
- Files: `Coding/rysite/src/components/Navigation.tsx` (lines 9-13)
- Impact: Adding a new calculator page requires updating the nav file separately; easy to forget
- Fix approach: Drive the nav list from a shared constants file, or generate from filesystem at build time

**Resume page is entirely hardcoded HTML:**
- Issue: All work history, education, and contact info are hardcoded JSX strings rather than driven by Sanity CMS (which already has a `resume` schema type defined)
- Files: `Coding/rysite/src/app/resume/page.tsx`, `Coding/rysite/src/sanity/schemaTypes/resume.ts`
- Impact: Updating the resume requires a code change and redeploy rather than a CMS edit; the Sanity `resume` schema is unused dead code
- Fix approach: Fetch resume data via `safeFetch` using the existing schema, or remove the dead `resume.ts` schema if CMS-driven resume is not planned

**`sanityFetch` / `SanityLive` defined but never used:**
- Issue: `Coding/rysite/src/sanity/lib/live.ts` exports `sanityFetch` and `SanityLive` for real-time content updates, but neither is imported anywhere in the app; all data fetching uses the plain `safeFetch` wrapper with `export const revalidate = 60`
- Files: `Coding/rysite/src/sanity/lib/live.ts`
- Impact: Dead code shipped to users; if live content was intended, it is silently not working
- Fix approach: Either wire up `SanityLive` in `layout.tsx` and migrate queries to `sanityFetch`, or delete `live.ts` if real-time updates are not needed

**Nested `requestAnimationFrame` + `setTimeout` for UI thread yielding:**
- Issue: The image analysis pipeline in `processImage` uses two nested rAF/setTimeout pairs to yield the UI thread between processing steps, which is a fragile workaround
- Files: `Coding/rysite/src/app/projects/pleat-counter/page.tsx` (lines 1257-1290)
- Impact: If the browser batches the callbacks differently, loading status messages may not render; there is no `AbortController` or cancellation if the user loads a new image mid-analysis
- Fix approach: Move the heavy analysis into a Web Worker to avoid blocking the main thread entirely, eliminating the need for the timer workaround

## Known Bugs

**Undefined CSS custom properties — `--card-bg`, `--border-color`, `--accent-color`:**
- Symptoms: Backgrounds and borders on the Reactive Fun Backgrounds gallery page and the Jellyfish Aquarium page render as transparent/invisible because the CSS variables they reference are not defined in `globals.css`
- Files:
  - `Coding/rysite/src/app/projects/reactive-fun-backgrounds/page.tsx` (lines 24, 36)
  - `Coding/rysite/src/app/projects/reactive-fun-backgrounds/jellyfish-aquarium/page.tsx` (lines 13, 25, 30-37, 55)
- Trigger: Viewing either page in any browser
- Root cause: `globals.css` defines `--card-bg` nowhere; actual card background is `--surface-raised: #ffffff`. Defined variables are `--border` (not `--border-color`) and `--accent-primary` (not `--accent-color`)
- Workaround: None; elements silently have no background or border

**`new Date(dateStr)` timezone parsing on blog and planetarium:**
- Symptoms: Dates parsed as `new Date("2025-06-01")` are treated as UTC midnight, which displays the previous day for users in negative UTC offset timezones
- Files:
  - `Coding/rysite/src/app/blog/page.tsx` (line 34 — `new Date(dateStr + 'T00:00:00')` partially mitigates but creates a local-time midnight which may still be off if the Sanity date string already encodes a date boundary)
  - `Coding/rysite/src/app/planetarium/page.tsx` (line 732 — `new Date(date)` parses the date-only string as UTC)
- Impact: Off-by-one-day display for users west of UTC

## Security Considerations

**Sanity Studio exposed at `/studio` with no authentication gate at the app layer:**
- Risk: Anyone who discovers `yourdomain.com/studio` can attempt to access the CMS editor
- Files: `Coding/rysite/src/app/studio/[[...tool]]/page.tsx`, `Coding/rysite/src/app/studio/[[...tool]]/layout.tsx`
- Current mitigation: Sanity itself requires a Sanity account with project access to write; read access depends on dataset permissions
- Recommendations: Confirm the Sanity dataset is set to `private` if the content is not intended to be public; consider adding a Next.js middleware check to block the `/studio` route in production for non-authorized IPs or users

**Phone number and personal email exposed in static JSX:**
- Risk: Personal contact details are hardcoded in publicly-rendered JSX and will appear in HTML source, making them easily scrapable by bots
- Files: `Coding/rysite/src/app/resume/page.tsx` (lines 38-39: `(201) 701-0637`, `rtsweeney01@gmail.com`)
- Current mitigation: None; data is fully static
- Recommendations: Obfuscate with CSS direction tricks or render via JavaScript to reduce bot harvesting; consider removing the phone number from the public page

**Jellyfish Aquarium iframe microphone permission:**
- Risk: The iframe at `/visuals/reactive-fun-backgrounds/jellyfish.html` is granted `allow="microphone; fullscreen; autoplay"` and runs with `sandbox="allow-scripts allow-same-origin"`, meaning scripts in the iframe can access the microphone without a separate user prompt if the parent page already has permission
- Files: `Coding/rysite/src/app/projects/reactive-fun-backgrounds/jellyfish-aquarium/page.tsx` (lines 38-52)
- Current mitigation: The iframe is same-origin (served from `/public`), limiting XSS risk
- Recommendations: Document this permission model; ensure the HTML file in `/public/visuals/` is not user-editable or writeable via any external path

## Performance Bottlenecks

**Synchronous image processing on the main thread:**
- Problem: `toGrayscale`, `boxBlur`, `analyzePleats`, and the full quad-detection pipeline all run synchronously on the main thread, blocking rendering for potentially 500ms–2s on large images
- Files: `Coding/rysite/src/app/projects/pleat-counter/page.tsx`
- Cause: No Web Worker; the nested rAF/setTimeout hack (lines 1257-1290) splits work into two chunks but each chunk is still synchronous
- Improvement path: Move `toGrayscale` + `analyzePleats` + `detectFilterQuad` into a Web Worker using `postMessage` with a `Transferable` `ArrayBuffer` for the image data

**Constellation data fully loaded and iterated on every render:**
- Problem: The entire `CONSTELLATIONS` array (1,222 lines of data) is iterated inside `drawSkyMap` on every canvas redraw, including for constellations not visible and not selected
- Files: `Coding/rysite/src/app/planetarium/page.tsx` (lines 184-277), `Coding/rysite/src/app/planetarium/constellations.ts`
- Cause: No pre-filtering or memoization of which constellations to render
- Improvement path: Memoize the set of visible constellation names and skip rendering entirely for below-horizon constellations unless they have visible stars

**`drawSkyMap` recreated on every state change:**
- Problem: The `drawSkyMap` `useCallback` in the planetarium lists six state values as dependencies (`date`, `time`, `location`, `selectedConstellation`, `visibleConstellations`, `expandedStar`, `celestialBodies`, `selectedBody`); any change to any of these rebuilds and re-runs the full canvas draw
- Files: `Coding/rysite/src/app/planetarium/page.tsx` (line 427)
- Cause: Fine-grained dependencies not separated from coarse render triggers
- Improvement path: Split static sky drawing from dynamic selection highlights; use `useEffect` to trigger redraws only when rendering-relevant state changes

## Fragile Areas

**Quad corner drag detection in pleat counter:**
- Files: `Coding/rysite/src/app/projects/pleat-counter/page.tsx` (drag handling section)
- Why fragile: The drag logic uses `refs` (`quadRef`, `dragIdxRef`, `maskRef`) that are mutated imperatively and must stay in sync with React state (`imageSrc`, `pleatCountStr`); desync between refs and state can cause stale overlays or missed rerenders
- Safe modification: Always update both the ref and trigger a re-analysis when modifying the quad; never rely on ref values to be in sync with what is displayed
- Test coverage: No tests exist for this interaction

**`safeFetch` silently returns fallback on any error:**
- Files: `Coding/rysite/src/sanity/lib/client.ts` (lines 14-21)
- Why fragile: The catch block returns the fallback value without logging or surfacing the error in any way; a misconfigured `projectId`, network outage, or schema change will all look identical to "no content exists"
- Safe modification: Add at minimum a `console.error` in the catch block; for production, consider surfacing a visible error state to the user rather than silently showing an empty list

**Planetarium geolocation silently falls back to New York:**
- Files: `Coding/rysite/src/app/planetarium/page.tsx` (lines 65-83)
- Why fragile: Geolocation errors (permission denied, timeout, unavailable) all set `locationStatus` to `'error'` but do not change `location`; the app silently continues using New York coordinates without clear indication to the user that the data may be wrong for their location
- Safe modification: Always show a visible fallback indicator; consider reading from browser's `Intl` timezone API to make a better default guess

## Scaling Limits

**All project entries in `/projects` are either hardcoded or Sanity-fetched as a flat list:**
- Current capacity: Fine for <20 projects
- Limit: No pagination, filtering, or sorting controls; a large number of Sanity projects would render as an unbounded list with no truncation
- Scaling path: Add pagination to the GROQ query, or implement client-side filtering by tech stack

## Dependencies at Risk

**`next: "^15.1.0"` with `"^"` range:**
- Risk: The caret range allows automatic minor and patch upgrades which could pull in breaking changes in a fast-moving Next.js 15.x series
- Impact: Build failures or runtime errors after `npm install` in CI or on a new machine
- Migration plan: Pin to an exact version (e.g., `"next": "15.1.8"`) after verifying the build, then upgrade intentionally

**`styled-components: "^6.1.19"` installed but unused:**
- Risk: Dead dependency adds ~100KB to the install footprint and a potential supply-chain attack surface
- Impact: Wasted space; no functional risk
- Migration plan: Remove from `package.json` unless it is planned for future use

## Missing Critical Features

**No dark mode:**
- Problem: `globals.css` defines only a light theme; there is no `@media (prefers-color-scheme: dark)` block
- Blocks: Users who prefer dark mode or who use dark mode system-wide see a fully white site
- Note: The design uses a single `--background: #ffffff` root variable, so adding dark mode is feasible via a second `:root` block under the media query

**No error boundaries:**
- Problem: Neither the root layout nor any page wraps its content in a React error boundary; an uncaught render error in any page (e.g., unexpected null from Sanity, canvas context failure) will crash the entire app with a white screen
- Files: `Coding/rysite/src/app/layout.tsx`

## Test Coverage Gaps

**No tests exist:**
- What's not tested: Everything — the entire `src/` directory has no `*.test.*` or `*.spec.*` files
- Files: All of `Coding/rysite/src/`
- Risk: Any regression in the pleat-counter algorithm, astronomy math, or Sanity data fetching goes undetected until a user reports it
- Priority: High for pure functions (image processing utilities in `pleat-counter/page.tsx`, astronomy math in `constellations.ts`); those have no side effects and are straightforward to unit test

## Committed Artifacts

**Vim swap file committed to repo:**
- Issue: `Coding/rysite/src/app/.favicon.ico.swp` is a vim crash-recovery file that should not be in version control
- Files: `Coding/rysite/src/app/.favicon.ico.swp`
- Fix approach: Delete the file and add `*.swp` to `.gitignore`

**`.DS_Store` committed at repo root:**
- Issue: `/.DS_Store` (macOS directory metadata) is present at the repository root; `.DS_Store` is in `Coding/rysite/.gitignore` but not in a root-level `.gitignore`
- Files: `/.DS_Store`
- Fix approach: Add `**/.DS_Store` to a root-level `.gitignore`, then `git rm --cached .DS_Store`

---

*Concerns audit: 2026-03-10*
