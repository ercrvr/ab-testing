# A/B Testing Dashboard — Progress Tracker

> **Last Updated:** 2026-03-19
> **Current Phase:** Phase 3 In Progress
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
| Implement `lib/github.ts` | 🟡 | PR #8: Octokit wrapper with `getRepoTree`, `getFileContent`, `listUserRepos`, `getRepo`. PR #9: Added ETag conditional requests on all API calls, rate limit tracking from response headers |
| Implement `lib/discovery.ts` | 🟡 | PR #8: Tree walker finds projects, tests, variants, files. Matches `meta.json`, `results.md`, and content files |
| Implement `lib/cache.ts` | 🟡 | PR #8: TTL-based localStorage cache. PR #9: Added ETag field, `cacheGetEntry()` for conditional requests, `cacheRefresh()` for 304 responses |
| Implement `lib/content-type.ts` | ⬜ | Deferred — not needed until Phase 4 renderers |
| Implement `useRepo.ts` hook | 🟡 | PR #8: Selected repo state via RepoContext |
| Implement `useProjects.ts` hook | 🟡 | PR #8: Discovers projects from repo tree via `getRepoTree` + `discoverProjects`. PR #9: Simplified — github.ts handles caching internally |
| Implement `useTests.ts` hook | 🟡 | PR #8: Lists tests for a project via `discoverTests`. PR #9: Simplified |
| Implement `useTestData.ts` hook | 🟡 | PR #8: Lazy-loads file contents for a test. PR #9: Simplified |
| Build `RepoSelector.tsx` page | 🟡 | PR #8: Search/browse repos, direct owner/repo lookup. PR #9: Added page 1 caching |
| Build `ProjectList.tsx` page | 🟡 | PR #8: Card grid of discovered projects with test count + difficulty stats |
| Build `ProjectView.tsx` page | 🟡 | PR #8: Stats + test list for one project |
| Set up `react-router-dom` hash routing | 🟡 | PR #8: All 5 routes wired in App.tsx |
| Build `Header.tsx` + `Breadcrumbs.tsx` | 🟡 | PR #8: Header with nav + Breadcrumbs component. PR #9: Breadcrumbs moved to separate always-visible bar (was hidden on mobile), rate limit indicator added to header, clickable navigation links |
| Implement `useRateLimit.ts` hook | 🟡 | PR #9: New hook — subscribes to rate limit updates from github.ts |

**Phase 3 PRs:**
- PR #8 (`phase-3-navigation-discovery`): Initial implementation — 10 new files, 6 modified. TypeScript + Vite build clean.
- PR #9 (`phase-3-fixes`): Fixes — ETag caching, rate limit display, mobile breadcrumbs, repo list caching. 9 files changed. TypeScript + Vite build clean.
- **Status:** Iterating — needs testing and possible further fixes before marking complete.

---

### Phase 4: Content Renderers
| Task | Status | Notes |
|---|---|---|
| `ImageRenderer.tsx` | ⬜ | Display + lightbox |
| `ImageSlider.tsx` | ⬜ | Overlay slider comparison (pick any 2 variants) |
| `MarkdownRenderer.tsx` | ⬜ | react-markdown + remark-gfm |
| `CodeRenderer.tsx` | ⬜ | Shiki syntax highlighting |
| `DiffRenderer.tsx` | ⬜ | Side-by-side + unified diff |
| `JsonDiff.tsx` | ⬜ | Structural tree diff |
| `CsvTable.tsx` | ⬜ | Sortable table + cell diff |
| `PdfViewer.tsx` | ⬜ | Embedded viewer |
| `HtmlPreview.tsx` | ⬜ | Sandboxed iframe |
| `AudioPlayer.tsx` | ⬜ | `<audio>` element |
| `VideoPlayer.tsx` | ⬜ | `<video>` element |
| `BinaryInfo.tsx` | ⬜ | Metadata + download link fallback |

---

### Phase 5: Comparison Engine
| Task | Status | Notes |
|---|---|---|
| Implement `lib/diff.ts` | ⬜ | Line diff, word diff, JSON structural diff |
| Implement file matching algorithm | ⬜ | See Dev Spec §10: N-variant exact path matching |
| Build `FileGroupView.tsx` | ⬜ | Routes matched file groups to correct renderer (N-variant grid) |
| Build `FullscreenModal.tsx` | ⬜ | Fullscreen popup for viewing content at full size |
| Build `UnmatchedFiles.tsx` | ⬜ | "Only in {variant}" sections per variant |
| Build `ResultsNarrative.tsx` | ⬜ | Grid of results.md rendering (one per variant) |
| Build `TestComparison.tsx` page | ⬜ | Full comparison view — the main event |

---

### Phase 6: Polish & UX
| Task | Status | Notes |
|---|---|---|
| Dark/light theme toggle (`useTheme.ts`) | ⬜ | System detection + manual override |
| Responsive layout (mobile/tablet) | ⬜ | Stack side-by-side → vertical on small screens |
| Loading states & skeletons | ⬜ | All async pages |
| Error boundaries & error pages | ⬜ | Per Dev Spec §18 |
| Rate limit indicator in header | 🟡 | PR #9: Added to Header.tsx — color-coded gauge (green/yellow/red) with remaining count |
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

---

## Blockers & Issues

| Issue | Status | Owner | Notes |
|---|---|---|---|
| Phase 3 needs testing + iteration | Open | Owner | PR #8 and #9 need merge + live testing. Breadcrumbs, caching, rate limit display need verification on device |

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

### 2026-03-19: Phase 3 In Progress
- **PR #8** (`phase-3-navigation-discovery`): Core navigation + data discovery
  - `lib/github.ts`: Octokit wrapper with `getRepoTree`, `getFileContent`, `listUserRepos`, `getRepo`
  - `lib/discovery.ts`: Tree walker — discovers projects, tests, variants, file matching
  - `lib/cache.ts`: TTL-based localStorage caching
  - `hooks/useRepo.ts`, `useProjects.ts`, `useTests.ts`, `useTestData.ts`
  - `pages/RepoSelector.tsx`: Search/browse + direct owner/repo lookup
  - `pages/ProjectList.tsx`: Card grid with test count + difficulty stats
  - `pages/ProjectView.tsx`: Project stats + test list
  - `components/layout/Header.tsx` + `Breadcrumbs.tsx`
  - Hash routing for all 5 pages
  - 10 new files, 6 modified. Build clean.
- **PR #9** (`phase-3-fixes`): Fixes for missing Phase 3 requirements
  - ETag conditional requests on all API calls (304s don't count against rate limit)
  - Rate limit indicator in header (color-coded gauge)
  - Breadcrumbs always visible on mobile, clickable navigation
  - Repo list page 1 caching
  - Simplified hooks (github.ts handles caching internally)
  - `useRateLimit.ts` hook added
  - 9 files changed. Build clean.
- **Needs:** Live testing, possible further iteration
