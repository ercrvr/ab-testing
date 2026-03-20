# A/B Testing Dashboard — Progress Tracker

> **Last Updated:** 2026-03-20
> **Current Phase:** Phase 3 Complete · Phase 4 In Progress
> **Repository:** [github.com/ercrvr/ab-testing](https://github.com/ercrvr/ab-testing)

---

## How to Continue This Project - IMPORTANT

1. **Read `DEV_SPEC.md`** — it is the single source of truth for all technical decisions
2. **Check this file** for current status — find the first ⬜ phase and start there
3. **Read the PR Workflow and DOC Updates sections below** — do NOT create PRs until the owner confirms phase completion unless the owner to do so. 
4. **Update this file** after completing tasks — change ⬜ → ✅ and add notes
5. **Test incrementally** — each phase should produce a working (if incomplete) app

---

## DOC Updates - IMPORTANT

> **DO NOT push to main until the owner explicitly confirms there are no pending PRs that could result to conflict/s. Double-check with the owner if they forgot to tell you main is updated.**

---

## CI/CD Constraints — IMPORTANT

> **DO NOT push changes to `.github/workflows/` or any CI/CD configuration files.** The owner manages these directly. This applies to all agents — never suggest or attempt to modify workflow files via the GitHub API or PRs.

- Deploy workflow: `.github/workflows/deploy.yml` — managed by owner only
- The workflow uses `paths-ignore` to skip builds on doc-only pushes (`*.md`, `docs/**`)
- Use `workflow_dispatch` (manual trigger) if a build is needed after doc changes

---

## PR Workflow — IMPORTANT

> **DO NOT create a PR until the owner explicitly confirms a phase is 100% done unless the owner requests for the PR.**

1. Work on code locally / in the agent filesystem during development
2. Iterate with the owner — they will review, request changes, test, etc.
3. Only when the owner says the phase work is **100% complete**, create a PR with all changes for that phase
4. PR title format: `feat: phase N — <short description>`
5. PR body should include: what was built, files changed.
6. Multiple phases can be bundled into one PR if the owner confirms them together

**When the owner confirms a phase is 100% done, docs must be pushed to main:**

1. Updated `PROGRESS.md` — mark completed tasks ✅, add notes on what was built
2. Updated `DEV_SPEC.md` — reflect the **actual** state of the app, not just the plan. If implementation diverged from the spec (different component names, changed APIs, new patterns), update the spec to match reality. The spec should always be a living, accurate document.

**This rule exists because:** The owner iterates and refines before merging. Premature PRs create noise and require force-pushes or multiple PRs for the same work. Keeping docs in sync ensures any agent can pick up the project at any time.

---

## Reference Files

| File | Location | Description |
|---|---|---|
| Dev Spec | `DEV_SPEC.md` (repo root) | Full technical specification — architecture, components, APIs, deployment |
| Structure Guide | `AB_TEST_GUIDE.md` (repo root) | Instructions for creating properly structured A/B test data |
| README | `README.md` (repo root) | Project overview and setup instructions |
| Migration Plan | Agent filesystem: `/agent/home/migration-plan.md` | Original planning document |

---

## Implementation Phases & Status

### Legend
- ⬜ Not started
- 🟡 In progress
- ✅ Complete
- 🔴 Blocked

---

### Phase 0: Documentation & Planning
| Task | Status | Notes |
|---|---|---|
| Create README.md | ✅ | PR #1 |
| Create AB_TEST_GUIDE.md | ✅ | PR #1 — structure guide for humans and AI |
| Create DEV_SPEC.md | ✅ | Full technical spec |
| Create PROGRESS.md (this file) | ✅ | |
| Push docs to repo | ✅ | PR #1 (README + guide), PR #2 (spec + progress) |

---

### Phase 1: Project Scaffold
| Task | Status | Notes |
|---|---|---|
| Initialize Vite + React + TypeScript project | ✅ | Vite 8 + React 19 + TypeScript 5.9 |
| Install dependencies (see Dev Spec §2) | ✅ | react-router-dom 7, lucide-react, @tailwindcss/vite — remaining deps (octokit, shiki, etc.) deferred to phases that need them |
| Configure Tailwind v4 + DaisyUI v5 | ✅ | CSS-based config via `@import "tailwindcss"` + `@plugin "daisyui"` |
| Set up `index.css` with theme | ✅ | Lab typography: Space Grotesk (headings), Inter (body), JetBrains Mono (labels). Custom diff colors. `.lab-label` utility class |
| Create directory structure (see Dev Spec §3) | ✅ | src/lib, hooks, context, pages, components/layout, components/ui — 20 source files |
| Configure Vite for hash routing + GitHub Pages base | ✅ | `base: '/ab-testing/'`, HashRouter in App.tsx |
| Set up GitHub Actions deploy workflow | ✅ | `.github/workflows/deploy.yml` with Node 20 + npm ci + build + Pages deploy |
| Verify blank app deploys to GitHub Pages | ✅ | Verified — site live at ercrvr.github.io/ab-testing. Uses `npm ci --legacy-peer-deps` due to @tailwindcss/vite not yet supporting Vite 8 |
| Lab-style typography and branding | ✅ | Space Grotesk headings, monospace labels, LAB badge, backdrop blur header, animated pulse dot, feature pills |

---

### Phase 2: Authentication
| Task | Status | Notes |
|---|---|---|
| Create Cloudflare Worker (OAuth proxy) | ✅ | `worker/oauth-proxy.js` template in repo, deployed by owner to Cloudflare |
| Implement `AuthContext.tsx` | ✅ | Token storage, user state, login/logout. `useAuth` hook exported from same file |
| Implement `useAuth.ts` hook | ✅ | Integrated into `AuthContext.tsx` (no separate file) |
| Build `Landing.tsx` page | ✅ | PR #6 — OAuth button + expandable PAT form + OAuth callback handler |
| Handle OAuth callback (code → token exchange) | ✅ | CSRF state param protection, exchanges code via Cloudflare Worker |
| PAT validation (test API call) | ✅ | Validates via `GET /user`, shows inline error on failure |
| Logout + token clearing | ✅ | Clears all `ab-dashboard-*` localStorage keys |
| **User setup:** Create GitHub OAuth App | ✅ | Owner created OAuth App with correct callback URL |
| **User setup:** Deploy Cloudflare Worker | ✅ | Owner deployed worker with Client ID, Secret, and Allowed Origin |
| **User setup:** Set env vars (Client ID, Worker URL) | ✅ | `GH_CLIENT_ID` and `OAUTH_PROXY_URL` set as GitHub repo variables |

---

### Phase 3: Core Navigation & Data Discovery
| Task | Status | Notes |
|---|---|---|
| Implement `lib/github.ts` | ✅ | Octokit wrapper with custom fetch for rate limit capture on all responses (including 304s). Window-aware rate limit tracking (10-min threshold prevents LB skew jumps). SessionStorage persistence survives tab kills. Pub/sub for UI updates. PRs #8, #9, #13, #15, #17 |
| Implement `lib/discovery.ts` | ✅ | Tree walker discovers projects, tests, variants, files. File matching algorithm (N-variant exact path). Uses `getContentType()` from content-type.ts. PRs #8, #9 |
| Implement `lib/cache.ts` | ✅ | TTL-based localStorage cache with ETag support. `cacheGetEntry()` returns stale data for conditional requests. `cacheRefresh()` for 304 responses. Automatic eviction on quota. PRs #8, #9 |
| Implement `lib/content-type.ts` | ✅ | Extension → ContentType mapping + `getShikiLanguage()` for Shiki syntax highlighting. Covers images, svg, markdown, code, json, csv, xml, pdf, html, plaintext, audio, video, binary. PR #8 |
| Implement `useRepo.ts` hook | ✅ | Selected repo state with localStorage persistence. `selectRepo()`, `clearRepo()`. PR #8 |
| Implement `useProjects.ts` hook | ✅ | Discovers projects from repo tree via `getRepoTree` + `discoverProjects`. PR #8, #9 |
| Implement `useTests.ts` hook | ✅ | Lists tests for a project via tree walking + meta.json fetch. PR #8, #9 |
| Implement `useTestData.ts` hook | ✅ | Lazy-loads file contents for a test. PR #8, #9 |
| Implement `useRateLimit.ts` hook | ✅ | Subscribes to rate limit pub/sub from github.ts. Provides `resetInMinutes` countdown (ticks every 30s). Fetches actual rate limit on mount. PR #9 |
| Implement `useCacheStatus.ts` hook | ✅ | Subscribes to data source events from github.ts. Tracks whether data came from cache, API, ETag revalidation, or stale fallback. PR #10 |
| Build `RepoSelector.tsx` page | ✅ | Search/browse repos, direct owner/repo lookup, pagination ("Load more"), page 1 caching. PRs #8, #9 |
| Build `ProjectList.tsx` page | ✅ | Card grid of discovered projects with test count + difficulty stats. PR #8 |
| Build `ProjectView.tsx` page | ✅ | Project stats + test list with difficulty badges. PR #8 |
| Set up `react-router-dom` hash routing | ✅ | All 5 routes wired in App.tsx with ProtectedRoute guards. PR #8 |
| Build `Header.tsx` | ✅ | Rate limit display with reset countdown (`4,834 · 47m`), color-coded (green/yellow/red). Cache source indicator (live/cached/revalidated/stale) with colored dot. Theme toggle, user avatar dropdown. PRs #8, #9, #10, #13 |
| Build `Breadcrumbs.tsx` | ✅ | Parses pathname (not `useParams()` since component lives outside `<Routes>`). History depth tracking via `location.state.repoNavDepth`. Uses `history.go(-depth)` to pop exact entries. PRs #8, #9, #10, #15 |
| Build `DebugOverlay.tsx` | ✅ | Error-triggered debug overlay — hidden by default, auto-shows on `console.error`/unhandled errors. Intercepts fetch (GitHub API calls with rate limit headers), sessionStorage writes, and history changes. Copy button for log export. PRs #14, #18 |

**Phase 3 PRs:**
- PR #8: Initial navigation + discovery (10 new files, 6 modified)
- PR #9: ETag caching, rate limit display, mobile breadcrumbs, repo list caching
- PR #10: Rate limit display precision, breadcrumb pathname parsing, cache source indicator
- PR #12: Rate limit sessionStorage persistence, reset countdown, history replace, repo clearing (includes PR #11)
- PR #13: Middot rendering fix, custom fetch wrapper for 304 rate limit headers
- PR #14: In-app debug overlay
- PR #15: Window-aware rate limit tracking, breadcrumb history depth popping
- PR #16: Hotfix — restored RepoSelector broken in PR #15
- PR #17: Rate limit same-window threshold (10-min) to handle GitHub LB skew
- PR #18: Debug overlay hidden by default, error-count button

---

### Phase 4: Content Renderers
| Task | Status | Notes |
|---|---|---|
| `FullscreenModal.tsx` | ✅ | Shared dialog-based modal — ESC/backdrop close, scrollable, X button. Pulled forward from Phase 5. PR #19 |
| `FileGroupRenderer.tsx` | ✅ | Dispatcher routing `FileGroup` → correct renderer by `contentType`. Accepts `owner`/`repo` props for content fetching. Pulled forward from Phase 5. PRs #19, #20 |
| `useFileContent.ts` hook | ✅ | React hook wrapping `getFileContent()` — returns `{ content, isLoading, error }`. Cancellation-safe. PRs #20, #21 |
| `ImageRenderer.tsx` | ✅ | Grid layout with lazy loading, file size + dimensions on load, click-to-fullscreen. Grid/Slider toggle bar. PRs #19, #19 |
| `ImageSlider.tsx` | ✅ | Draggable vertical divider overlay — CSS `clip-path`, pointer capture, variant selector dropdowns, corner labels. PR #19 |
| `MarkdownRenderer.tsx` | ✅ | Rendered/Source toggle, `react-markdown` + `remark-gfm`, DaisyUI `prose` styling, responsive variant grid, fullscreen. PR #20 |
| `TestComparison.tsx` update | ✅ | Matched file groups are expandable/collapsible cards with chevron icons. Passes `owner`/`repo` to renderers. PRs #19, #20 |
| `lib/shiki.ts` | ✅ | Shiki highlighter initialization — lazy singleton, dual theme (github-light + github-dark-dimmed) via CSS variables. PR #22 |
| `CodeRenderer.tsx` | ✅ | Shiki syntax highlighting, line numbers toggle, diff mode toggle (lazy-loads DiffRenderer), dark/light theme support, fullscreen. PR #22 |
| `DiffRenderer.tsx` | ✅ | Line-level diff highlighting with Shiki + `diff` package. Adds/removes get green/red background tints. Lazy-loaded from CodeRenderer to keep `diff` out of main bundle. PR #24 |
| `JsonDiff.tsx` | ✅ | Collapsible JSON tree with color-coded values (strings green, numbers blue, booleans purple, null red). Lazy-loaded. PR #23 |
| `CsvTable.tsx` | ✅ | Sortable columns (asc/desc/none cycle), sticky headers, CSV parsing with proper quote/newline handling, responsive variant grid. Lazy-loaded. PR #25 |
| `PdfViewer.tsx` | ✅ | PDF.js canvas rendering for universal device support (desktop + mobile). Page navigation (prev/next), responsive sizing with ResizeObserver, fullscreen, download link fallback on error. Added `pdfjs-dist` dependency. PRs #26, #27, #28, #29 |
| `HtmlPreview.tsx` | ✅ | Sandboxed `<iframe srcdoc>` with `allow-scripts`. Preview/Source toggle — Source mode delegates to CodeRenderer for syntax-highlighted HTML. Expand button per variant, fullscreen. Lazy-loaded. PR #30 |
| `AudioPlayer.tsx` | ⬜ | `<audio>` element |
| `VideoPlayer.tsx` | ⬜ | `<video>` element |
| `BinaryInfo.tsx` | ⬜ | Metadata + download link fallback |

---

### Phase 5: Comparison Engine
| Task | Status | Notes |
|---|---|---|
| Implement `lib/diff.ts` | ⬜ | Line diff, word diff, JSON structural diff |
| Implement file matching algorithm | ✅ | N-variant exact path matching — completed in Phase 3 (`discovery.ts`) |
| Build `FileGroupView.tsx` | ✅ | Implemented as `FileGroupRenderer.tsx` — pulled forward to Phase 4 |
| Build `FullscreenModal.tsx` | ✅ | Pulled forward to Phase 4 |
| Build `UnmatchedFiles.tsx` | ⬜ | "Only in {variant}" sections per variant |
| Build `ResultsNarrative.tsx` | ⬜ | Grid of results.md rendering (one per variant) |
| Build `TestComparison.tsx` page | ✅ | Base layout completed in Phase 4 — expandable file group cards with renderer routing |

---

### Phase 6: Polish & UX
| Task | Status | Notes |
|---|---|---|
| Dark/light theme toggle (`useTheme.ts`) | ⬜ | System detection + manual override |
| Responsive layout (mobile/tablet) | ⬜ | Stack side-by-side → vertical on small screens |
| Loading states & skeletons | ⬜ | All async pages |
| Error boundaries & error pages | ⬜ | Per Dev Spec §18 |
| Rate limit indicator in header | ✅ | Pulled forward to Phase 3. Header.tsx: color-coded gauge (green/yellow/red) with remaining count + reset countdown + cache source indicator |
| Keyboard shortcuts | ⬜ | Navigation, theme toggle |
| Footer | ⬜ | |

---

### Phase 7: Deployment & Go-Live
| Task | Status | Notes |
|---|---|---|
| Final GitHub Actions workflow test | ⬜ | Build + deploy on push to main |
| Enable GitHub Pages on repo | ⬜ | Settings → Pages → GitHub Actions source |
| Configure custom domain (optional) | ⬜ | |
| Verify live site works end-to-end | ⬜ | Auth → repo select → project → test → comparison |
| Test with existing `icon-skill` data | ⬜ | Ensure backward compatibility |

---

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-03-18 | Vite + React over Next.js | GitHub Pages is static, no SSR needed |
| 2026-03-18 | Hash routing over history mode | GitHub Pages doesn't support server-side rewrites |
| 2026-03-18 | Cloudflare Worker for OAuth proxy | Free tier (100k req/day), ~20 lines of code |
| 2026-03-18 | Shiki over Prism for syntax highlighting | Better language support, static HTML output |
| 2026-03-18 | Lazy loading + localStorage cache | Respect GitHub API rate limits (5000/hr authenticated) |
| 2026-03-18 | Auto-match files by relative path | Best UX — exact match → fuzzy match → manual pairing |
| 2026-03-18 | Support both OAuth + PAT auth | OAuth for polish, PAT for simplicity/fallback |
| 2026-03-18 | Rename GITHUB_CLIENT_ID → GH_CLIENT_ID for Actions var | GitHub disallows `GITHUB_` prefix on repo variables. Vite env var and Cloudflare Worker env var unchanged |
| 2026-03-18 | Use `npm ci --legacy-peer-deps` in deploy workflow | @tailwindcss/vite@4.2.1 doesn't support Vite 8 yet. Temporary workaround |
| 2026-03-19 | ETag conditional requests for caching | 304 responses don't count against GitHub API rate limit — key for staying within 5000/hr |
| 2026-03-19 | Custom fetch wrapper for rate limit headers | Octokit throws on 304 responses before headers are accessible. Intercepting at fetch level captures rate limit from ALL responses |
| 2026-03-19 | Window-aware rate limit tracking (10-min threshold) | GitHub LB returns different reset timestamps (~4 min apart) from different backends. Treating < 10 min diff as same window prevents UI jumps |
| 2026-03-19 | sessionStorage for rate limit persistence | Rate limit data survives tab kills but not new sessions. sessionStorage is appropriate since rate limit window is hourly |
| 2026-03-19 | Pull FullscreenModal + FileGroupRenderer into Phase 4 | Renderers need these components immediately — waiting for Phase 5 would block all renderer work |
| 2026-03-19 | `repoPath` field on DiscoveredFile (separate from `path`) | `path` stores relative path for file matching, `repoPath` stores full repo path for API calls. Both are needed — merging them would break one use case |
| 2026-03-19 | CSS `clip-path` for ImageSlider | Clean, performant image clipping with no extra DOM elements. Pointer capture for smooth dragging |
| 2026-03-19 | Pathname parsing for Breadcrumbs (not useParams) | Breadcrumbs component lives outside `<Routes>` so `useParams()` doesn't work. Parsing `location.pathname` directly |
| 2026-03-19 | History depth tracking via location.state | Breadcrumbs need to pop exact number of history entries. Each navigation passes `repoNavDepth` in state, `history.go(-depth)` pops back |
| 2026-03-19 | Shiki dual theme via CSS variables | Single render pass outputs both light/dark colors. CSS swaps `--shiki-dark` vars in dark mode — no re-highlighting needed on theme toggle |
| 2026-03-19 | Lazy-load DiffRenderer from CodeRenderer | `diff` package (+ Shiki diff logic) stays out of main bundle. Only loaded when user clicks the Diff toggle |
| 2026-03-19 | React.lazy() for heavy renderers | JsonDiff, CsvTable, PdfViewer, HtmlPreview, DiffRenderer all code-split. Main bundle stays lean, renderers load on demand |
| 2026-03-19 | PDF.js canvas rendering over `<embed>`/`<iframe>` | GitHub raw URLs serve PDFs as `application/octet-stream` — browser PDF plugins won't render them. Mobile browsers don't support inline PDF at all. PDF.js renders to `<canvas>` universally |
| 2026-03-19 | `pdfjs-dist` as runtime dependency | ~300KB gzipped but code-split behind React.lazy(). Only loaded when a PDF file group is opened |
| 2026-03-20 | Sandboxed iframe with `allow-scripts` only for HtmlPreview | Prevents navigation, popups, form submission, and top-level access. `allow-scripts` is needed for JS-heavy HTML files. srcdoc avoids CORS issues |

---

## Blockers & Issues

| Issue | Status | Owner | Notes |
|---|---|---|---|
| Phase 3 needs testing + iteration | ✅ Closed | Owner | All PRs merged and tested on device. Rate limit jumping, breadcrumb history, 304 header capture all resolved |

---

## Change Log

### 2026-03-18: Phase 1 Complete
- Vite 8 + React 19 + TypeScript 5.9 + Tailwind 4.2 + DaisyUI 5.5 scaffold
- Lab-style branding: Space Grotesk, Inter, JetBrains Mono fonts
- Header with LAB badge, backdrop blur, theme toggle
- Landing page with animated status dot, feature pills
- 5 page shells (Landing, RepoSelector, ProjectList, ProjectView, TestComparison)
- UI components: ThemeToggle, DifficultyBadge, ErrorBanner, LoadingSpinner, StatCard
- GitHub Actions deploy workflow
- Cloudflare Worker OAuth proxy template
- Build passes: 341KB JS + 50KB CSS (gzipped: 96KB + 9KB)

### 2026-03-18: Dynamic Variants
- Changed from fixed `with-skill` / `without-skill` variants to dynamic N-variant support
- Any subdirectory under a test is now treated as a variant
- Updated `meta.json` schema with generic `variants` map
- `FilePair` → `FileGroup` (supports N variants)
- Comparison view changed from 2-column to responsive grid with fullscreen popup
- Updated: DEV_SPEC.md, AB_TEST_GUIDE.md, types.ts

### 2026-03-18: Phase 2 Complete
- OAuth login flow working end-to-end (GitHub OAuth App → Cloudflare Worker → token exchange)
- PAT login with validation via `GET /user`
- Landing page with OAuth button + expandable PAT form + adaptive UI (hides OAuth if no Client ID configured)
- Route guards: ProtectedRoute wrapper redirects unauthenticated users to Landing
- CSRF state parameter protection on OAuth flow
- Inline error handling for auth failures
- `useAuth` hook integrated into AuthContext.tsx (no separate file needed)
- GitHub Pages deploy verified working at ercrvr.github.io/ab-testing

### 2026-03-19–20: Phase 4 Continued (Renderers 4.5–4.10)
- **Libraries:**
  - `lib/shiki.ts`: Lazy singleton Shiki highlighter — dual theme (github-light + github-dark-dimmed), CSS variable output for zero-cost theme switching
- **Renderers:**
  - `CodeRenderer.tsx`: Shiki syntax highlighting with line numbers toggle, diff mode toggle (lazy-loads DiffRenderer), click-to-fullscreen. PR #22
  - `JsonDiff.tsx`: Collapsible JSON tree viewer — color-coded values (strings/numbers/booleans/null), expand/collapse all, lazy-loaded. PR #23
  - `DiffRenderer.tsx`: Line-level diff highlighting — uses `diff` package for change detection, Shiki for syntax highlighting, green/red background tints per line, dark mode support. Lazy-loaded from CodeRenderer. PR #24
  - `CsvTable.tsx`: Sortable columns (asc/desc/none click cycle), sticky headers, proper CSV parsing (handles quoted fields, embedded newlines), responsive variant grid. Lazy-loaded. PR #25
  - `PdfViewer.tsx`: PDF.js canvas rendering for universal device support (desktop + mobile). Page navigation (prev/next), responsive sizing via ResizeObserver, fullscreen, download link fallback. PRs #26–#29
  - `HtmlPreview.tsx`: Sandboxed `<iframe sandbox="allow-scripts" srcdoc>` preview with Preview/Source toggle. Source mode delegates to CodeRenderer. Per-variant expand button, fullscreen. Lazy-loaded. PR #30
- **CSS:**
  - Shiki dual-theme integration — dark mode swaps to `--shiki-dark` CSS variables
  - Line numbers via CSS counters (`.line-numbers` class)
  - Diff view per-line background highlights — added (green tint) / removed (red tint) with dark mode variants
- **Dependencies:**
  - Added `pdfjs-dist@^4.10.38` for universal PDF rendering
- **Bugs Fixed:**
  - PdfViewer blank render on desktop — GitHub raw URLs serve PDFs as `application/octet-stream`, breaking browser `<embed>`. Fixed by switching to PDF.js canvas rendering (PRs #27, #28)
  - PdfViewer not rendering on mobile — `<iframe>`/`<embed>` PDF not supported on iOS Safari/Android Chrome. PDF.js canvas works universally (PR #28)
  - CI failure after PdfViewer merge — `package-lock.json` not synced with new `pdfjs-dist` dependency. Fixed in PR #29
- **PRs:** #22, #23, #24, #25, #26, #27, #28, #29, #30

### 2026-03-19: Phase 4 In Progress (Renderers 4.1–4.4)
- **Infrastructure (pulled forward from Phase 5):**
  - `FullscreenModal.tsx`: Shared dialog-based modal — ESC/backdrop close, scrollable, X button
  - `FileGroupRenderer.tsx`: Dispatcher routing `FileGroup` → correct renderer by `contentType`
  - `TestComparison.tsx`: Matched file groups as expandable/collapsible cards with chevron icons
- **Renderers:**
  - `ImageRenderer.tsx`: Grid layout with lazy loading, file size + natural dimensions on load, click-to-fullscreen
  - `ImageSlider.tsx`: Draggable vertical divider overlay — CSS `clip-path`, pointer capture, variant selector dropdowns, corner labels
  - `MarkdownRenderer.tsx`: Rendered/Source toggle, `react-markdown` + `remark-gfm`, DaisyUI `prose` styling, fullscreen
- **Hooks:**
  - `useFileContent.ts`: React hook wrapping `getFileContent()` — returns `{ content, isLoading, error }`, cancellation-safe
- **Types:**
  - Added `repoPath` field to `DiscoveredFile` — full repo path for API calls (vs `path` which is relative for file matching)
- **Bugs Fixed:**
  - Content fetching 404s on text-based renderers — `file.path` was relative (`"post.md"`), but `getFileContent()` needs full repo path (`"examples/tests/test2/claude/post.md"`). Fixed by adding `repoPath` field
- **Test Data:**
  - Generated 74 test files in `ercrvr/ab-tests` repo covering all 9 content types (images, markdown, code, data, HTML, plaintext, PDF, audio, video)
- **PRs:** #19 (ImageRenderer + ImageSlider + FullscreenModal + FileGroupRenderer), #20 (MarkdownRenderer + useFileContent), #21 (repoPath bugfix)

### 2026-03-19: Phase 3 Complete
- **Core Libraries:**
  - `lib/github.ts`: Octokit wrapper with custom fetch interceptor, window-aware rate limit tracking (10-min threshold), sessionStorage persistence, pub/sub pattern for UI reactivity
  - `lib/discovery.ts`: Git Trees API tree walker — discovers projects, tests, variants, file matching
  - `lib/cache.ts`: TTL-based localStorage cache with ETag conditional requests, stale-while-revalidate, automatic eviction
  - `lib/content-type.ts`: Extension → ContentType mapping + `getShikiLanguage()` for syntax highlighting
- **Hooks:**
  - `useRepo.ts`: Selected repo state with localStorage persistence
  - `useProjects.ts`, `useTests.ts`, `useTestData.ts`: Data discovery hooks
  - `useRateLimit.ts`: Rate limit subscription with reset countdown
  - `useCacheStatus.ts`: Data source tracking (cache/api/etag-revalidated/stale-fallback)
- **Pages:**
  - `RepoSelector.tsx`: Search/browse repos, direct owner/repo lookup, pagination, page 1 caching
  - `ProjectList.tsx`: Card grid with test count + difficulty stats
  - `ProjectView.tsx`: Project stats + test list
- **Components:**
  - `Header.tsx`: Rate limit with reset countdown, cache source indicator, theme toggle, user menu
  - `Breadcrumbs.tsx`: Pathname parsing, history depth tracking with `go(-depth)` popping
  - `DebugOverlay.tsx`: Error-triggered debug panel with fetch/storage/history interceptors
- **Bugs Fixed:**
  - Rate limit display precision (actual value not rounded up)
  - Breadcrumb navigation parsing (pathname instead of useParams)
  - Rate limit jumping on 304 responses (custom fetch wrapper)
  - Rate limit jumping across GitHub LB servers (window-aware 10-min threshold)
  - Rate limit persistence across tab kills (sessionStorage)
  - History stacking when navigating repos (depth tracking + go(-depth))
  - Middot rendering (`\u00b7` literal → JSX expression)
- **PRs:** #8, #9, #10, #11, #12, #13, #14, #15, #16, #17, #18
