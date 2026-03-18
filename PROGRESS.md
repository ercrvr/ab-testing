# A/B Testing Dashboard — Progress Tracker

> **Last Updated:** 2026-03-18
> **Current Phase:** Pre-implementation
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
| Initialize Vite + React + TypeScript project | ⬜ | `npm create vite@latest` |
| Install dependencies (see Dev Spec §2) | ⬜ | react-router-dom, @octokit/rest, react-markdown, remark-gfm, shiki, diff, lucide-react |
| Configure Tailwind v4 + DaisyUI v5 | ⬜ | CSS-based config, no tailwind.config.js |
| Set up `index.css` with theme | ⬜ | Dark/light mode, custom theme tokens |
| Create directory structure (see Dev Spec §3) | ⬜ | src/lib, hooks, context, pages, components |
| Configure Vite for hash routing + GitHub Pages base | ⬜ | `base: '/ab-testing/'` |
| Set up GitHub Actions deploy workflow | ⬜ | `.github/workflows/deploy.yml` |
| Verify blank app deploys to GitHub Pages | ⬜ | |

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
| `ImageSlider.tsx` | ⬜ | Overlay slider for image pair comparison |
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
| Implement file matching algorithm | ⬜ | See Dev Spec §10: exact path → name+ext → stem → manual |
| Build `FilePairView.tsx` | ⬜ | Routes matched pairs to correct renderer |
| Build `UnmatchedFiles.tsx` | ⬜ | "Only in variant A / variant B" sections |
| Build `ResultsNarrative.tsx` | ⬜ | Side-by-side results.md rendering |
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

## How to Continue This Project

1. **Read `DEV_SPEC.md`** — it is the single source of truth for all technical decisions
2. **Check this file** for current status — find the first ⬜ phase and start there
3. **Update this file** after completing tasks — change ⬜ → ✅ and add notes
4. **Push changes via PR** — keep the main branch clean
5. **Test incrementally** — each phase should produce a working (if incomplete) app
