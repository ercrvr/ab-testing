# A/B Testing Dashboard — Progress Tracker

> **Last Updated:** 2026-03-18
> **Current Phase:** Phase 1 Complete → Starting Phase 2
> **Repository:** [github.com/ercrvr/ab-testing](https://github.com/ercrvr/ab-testing)

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
| Verify blank app deploys to GitHub Pages | ⬜ | Deferred to first PR merge — will verify after this PR lands |
| Lab-style typography and branding | ✅ | Space Grotesk headings, monospace labels, LAB badge, backdrop blur header, animated pulse dot, feature pills |

---

### Phase 2: Authentication
| Task | Status | Notes |
|---|---|---|
| Create Cloudflare Worker (OAuth proxy) | ⬜ | `worker/oauth-proxy.js` — ~20 lines |
| Implement `AuthContext.tsx` | ⬜ | Token storage, user state, login/logout |
| Implement `useAuth.ts` hook | ⬜ | Wraps AuthContext |
| Build `Landing.tsx` page | ⬜ | OAuth button + PAT input fallback |
| Handle OAuth callback (code → token exchange) | ⬜ | Via Cloudflare Worker |
| PAT validation (test API call) | ⬜ | Verify token works before storing |
| Logout + token clearing | ⬜ | |
| **User setup:** Create GitHub OAuth App | ⬜ | Owner must do this manually |
| **User setup:** Deploy Cloudflare Worker | ⬜ | Owner must do this manually |
| **User setup:** Set env vars (Client ID, Worker URL) | ⬜ | `.env` or build-time config |

---

### Phase 3: Core Navigation & Data Discovery
| Task | Status | Notes |
|---|---|---|
| Implement `lib/github.ts` | ⬜ | Octokit wrapper with rate limit handling |
| Implement `lib/discovery.ts` | ⬜ | Tree walker: find projects, tests, variants, files |
| Implement `lib/cache.ts` | ⬜ | localStorage + ETag-based caching |
| Implement `lib/content-type.ts` | ⬜ | Extension → renderer mapping |
| Implement `useRepo.ts` hook | ⬜ | Selected repo state |
| Implement `useProjects.ts` hook | ⬜ | Discover projects from repo tree |
| Implement `useTests.ts` hook | ⬜ | List tests for a project |
| Implement `useTestData.ts` hook | ⬜ | Lazy-load file contents for a test |
| Build `RepoSelector.tsx` page | ⬜ | Search/browse repos |
| Build `ProjectList.tsx` page | ⬜ | Card grid of discovered projects |
| Build `ProjectView.tsx` page | ⬜ | Stats + test list for one project |
| Set up `react-router-dom` hash routing | ⬜ | Routes per Dev Spec §6 |
| Build `Header.tsx` + `Breadcrumbs.tsx` | ⬜ | Navigation chrome |

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
| Rate limit indicator in header | ⬜ | Show remaining API calls |
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

---

## Blockers & Issues

| Issue | Status | Owner | Notes |
|---|---|---|---|
| None yet | — | — | — |

---

## PR Workflow — IMPORTANT

> **DO NOT create a PR until the owner explicitly confirms a phase is 100% done.**

1. Work on code locally / in the agent filesystem during development
2. Iterate with the owner — they will review, request changes, test, etc.
3. Only when the owner says the phase work is **100% complete**, create a PR with all changes for that phase
4. PR title format: `feat: phase N — <short description>`
5. PR body should include: what was built, files changed, and the updated PROGRESS.md showing ✅ for completed tasks
6. Multiple phases can be bundled into one PR if the owner confirms them together

**When the owner confirms a phase is 100% done, the PR must include:**
1. All source code for the phase
2. Updated `PROGRESS.md` — mark completed tasks ✅, add notes on what was built
3. Updated `DEV_SPEC.md` — reflect the **actual** state of the app, not just the plan. If implementation diverged from the spec (different component names, changed APIs, new patterns), update the spec to match reality. The spec should always be a living, accurate document.

**This rule exists because:** The owner iterates and refines before merging. Premature PRs create noise and require force-pushes or multiple PRs for the same work. Keeping docs in sync ensures any agent can pick up the project at any time.

---

## How to Continue This Project

1. **Read `DEV_SPEC.md`** — it is the single source of truth for all technical decisions
2. **Check this file** for current status — find the first ⬜ phase and start there
3. **Read the PR Workflow section above** — do NOT create PRs until the owner confirms phase completion
4. **Update this file** after completing tasks — change ⬜ → ✅ and add notes
5. **Test incrementally** — each phase should produce a working (if incomplete) app

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
