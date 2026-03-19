# A/B Testing Dashboard — Developer Specification

> **Version:** 1.2
> **Last Updated:** 2026-03-19
> **Status:** Phase 3 Complete (Core Navigation & Data Discovery)
> **Repository:** [github.com/ercrvr/ab-testing](https://github.com/ercrvr/ab-testing)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Layout](#3-repository-layout)
4. [Data Schema & Discovery](#4-data-schema--discovery)
5. [Authentication](#5-authentication)
6. [Routing](#6-routing)
7. [Pages & Views](#7-pages--views)
8. [Component Specifications](#8-component-specifications)
9. [Content Renderers](#9-content-renderers)
10. [File Matching Algorithm](#10-file-matching-algorithm)
11. [State Management](#11-state-management)
12. [GitHub API Integration](#12-github-api-integration)
13. [Caching Strategy](#13-caching-strategy)
14. [Styling & Theming](#14-styling--theming)
15. [Deployment](#15-deployment)
16. [Cloudflare Worker (OAuth Proxy)](#16-cloudflare-worker-oauth-proxy)
17. [Environment Variables](#17-environment-variables)
18. [Error Handling](#18-error-handling)
19. [Performance Considerations](#19-performance-considerations)
20. [Implementation Order](#20-implementation-order)
21. [Acceptance Criteria](#21-acceptance-criteria)

---

## 1. Project Overview

### What This Is

A **GitHub Pages-hosted single-page application (SPA)** that connects to any GitHub repository containing A/B test data, auto-discovers all projects and tests via the GitHub API, and renders smart side-by-side comparisons using content-aware viewers.

### What It Is NOT

- Not a backend application — purely static frontend, hosted on GitHub Pages
- Not a test runner — it only visualizes pre-existing test results
- Not limited to one repo — users authenticate and can select any repo they have access to

### Core User Flow

```
Authenticate → Select Repo → Browse Projects → Browse Tests → Compare Variants Side-by-Side
```

### Key Design Principles

1. **Zero backend** — everything runs client-side via GitHub API
2. **Lazy loading** — only fetch file contents when the user navigates to a specific test
3. **Content-aware rendering** — automatically pick the best viewer based on file extension
4. **Responsive** — works on desktop, tablet, and mobile
5. **Dark/light mode** — system preference detection + manual toggle

---

## 2. Tech Stack

| Layer | Package | Version | Purpose | Installed |
|---|---|---|---|---|
| Framework | `react` | ^19.x | UI framework | ✅ Phase 1 |
| Language | `typescript` | ~5.9 | Type safety | ✅ Phase 1 |
| Build Tool | `vite` | ^8.x | Dev server + production builds | ✅ Phase 1 |
| Styling | `tailwindcss` | ^4.2 | Utility-first CSS | ✅ Phase 1 |
| Component Library | `daisyui` | ^5.5 | Pre-built Tailwind components | ✅ Phase 1 |
| Routing | `react-router-dom` | ^7.x | Client-side routing (hash mode) | ✅ Phase 1 |
| Icons | `lucide-react` | ^0.400+ | Icon set | ✅ Phase 1 |
| GitHub API | `@octokit/rest` | ^22.0.1 | Official GitHub REST API client | ✅ Phase 3 |
| Markdown | `react-markdown` | ^10.1.0 | Render `.md` files | ✅ Phase 4 |
| Markdown Plugins | `remark-gfm` | ^4.x | GitHub Flavored Markdown (tables, strikethrough, etc.) | ✅ Phase 4 |
| Syntax Highlighting | `shiki` | ^4.0.2 | Code syntax highlighting for diffs and code viewers | ✅ Phase 4 |
| Diff Engine | `diff` | ^8.0.3 | Line-level and word-level text diffing | ✅ Phase 5 |

### Typography

| Font | Usage | Source |
|---|---|---|
| **Space Grotesk** | Headings (h1–h6, `.font-heading`) | Google Fonts |
| **Inter** | Body text (`--font-sans`) | Google Fonts |
| **JetBrains Mono** | Labels, badges, monospace (`.lab-label`, `--font-mono`) | Google Fonts |

The `.lab-label` CSS utility class applies: JetBrains Mono, 0.7rem, weight 500, 0.1em letter-spacing, uppercase. Used for status labels, badges, and instrument-style readouts.

### Why These Choices

- **Vite** over CRA/Next: GitHub Pages is static — no SSR needed. Vite is fast and simple.
- **Tailwind v4 + DaisyUI v5**: Tailwind v4 uses CSS-based config (no `tailwind.config.js` needed — use `@plugin` and `@theme` in CSS). DaisyUI v5 provides themed components with built-in dark mode.
- **Hash routing**: GitHub Pages doesn't support server-side rewrites. Hash mode (`/#/path`) avoids 404s on page refresh.
- **Shiki** over Prism: Better language support, themes, and produces static HTML (no runtime JS per code block).
- **Octokit**: Official, typed, handles pagination and rate limiting.

---

## 3. Repository Layout

```
ercrvr/ab-testing/
├── .github/
│   └── workflows/
│       └── deploy.yml                   # GitHub Actions: build + deploy to Pages
├── worker/
│   └── oauth-proxy.js                   # Cloudflare Worker source (reference/deploy manually)
├── public/
│   └── favicon.svg                      # App favicon
├── src/
│   ├── main.tsx                         # React entry point: mounts <App /> to #root
│   ├── App.tsx                          # Router setup + AuthProvider wrapper
│   ├── index.css                        # Tailwind v4 imports + custom theme overrides
│   ├── types.ts                         # All shared TypeScript interfaces/types
│   │
│   ├── lib/
│   │   ├── github.ts                    # Octokit wrapper: auth, API calls, custom fetch for rate limit capture, window-aware RL tracking, sessionStorage persistence
│   │   ├── discovery.ts                 # Repo tree walker: find projects, tests, files, file matching
│   │   ├── diff.ts                      # Diff engine: line diff, word diff, structural JSON diff (Phase 5)
│   │   ├── content-type.ts              # Extension → ContentType mapping + getShikiLanguage()
│   │   └── cache.ts                     # localStorage cache with ETag support + TTL + auto-eviction
│   │
│   ├── hooks/
│   │   ├── useRepo.ts                   # Selected repo state with localStorage persistence
│   │   ├── useProjects.ts               # Project discovery for a repo
│   │   ├── useTests.ts                  # Test listing for a project
│   │   ├── useTestData.ts              # On-demand file content fetching for a single test
│   │   ├── useRateLimit.ts              # Rate limit subscription with reset countdown
│   │   ├── useCacheStatus.ts            # Data source tracking (cache/api/etag-revalidated/stale-fallback)
│   │   └── useTheme.ts                  # Dark/light mode state
│   │
│   ├── context/
│   │   └── AuthContext.tsx              # React context provider for auth state + useAuth hook
│   │
│   ├── pages/
│   │   ├── Landing.tsx                  # Auth page: OAuth login + PAT input
│   │   ├── RepoSelector.tsx             # Search/browse repos, select one
│   │   ├── ProjectList.tsx              # Grid of project cards for the selected repo
│   │   ├── ProjectView.tsx              # Single project: stats + test list
│   │   └── TestComparison.tsx           # Side-by-side comparison view (the main event)
│   │
│   └── components/
│       ├── layout/
│       │   ├── Header.tsx               # Top nav: logo, breadcrumbs, theme toggle, user avatar
│       │   ├── Breadcrumbs.tsx           # Clickable navigation trail
│       │   └── Footer.tsx               # Minimal footer
│       │
│       ├── debug/
│       │   └── DebugOverlay.tsx          # Error-triggered debug panel: fetch/storage/history interceptors
│       │
│       ├── renderers/
│       │   ├── ImageRenderer.tsx         # Image display + lightbox on click
│       │   ├── ImageSlider.tsx           # Overlay comparison slider (pick any 2 variants)
│       │   ├── MarkdownRenderer.tsx      # Rendered markdown via react-markdown
│       │   ├── CodeRenderer.tsx          # Syntax-highlighted code block via Shiki
│       │   ├── DiffRenderer.tsx          # Side-by-side or unified diff view
│       │   ├── JsonDiff.tsx              # Structural JSON tree diff
│       │   ├── CsvTable.tsx              # Table rendering with cell-level diff
│       │   ├── PdfViewer.tsx             # Embedded PDF via <embed> or iframe
│       │   ├── HtmlPreview.tsx           # Sandboxed iframe for HTML files
│       │   ├── AudioPlayer.tsx           # <audio> player
│       │   ├── VideoPlayer.tsx           # <video> player
│       │   └── BinaryInfo.tsx            # Fallback: metadata + download link
│       │
│       ├── comparison/
│       │   ├── FileGroupView.tsx         # Renders a matched file group (N variants) with the right renderer
│       │   ├── UnmatchedFiles.tsx        # Lists files unique to specific variants
│       │   ├── ResultsNarrative.tsx      # Grid of results.md rendering (one per variant)
│       │   └── FullscreenModal.tsx       # Fullscreen popup for viewing content at full size
│       │
│       ├── cards/
│       │   ├── ProjectCard.tsx           # Project summary card for the grid
│       │   └── TestCard.tsx              # Test summary card within a project
│       │
│       └── ui/
│           ├── ThemeToggle.tsx           # Dark/light mode switch
│           ├── DifficultyBadge.tsx       # Simple/Medium/Complex colored badge
│           ├── StatCard.tsx              # Stat display (number + label)
│           ├── Lightbox.tsx              # Full-screen image overlay
│           ├── LoadingSpinner.tsx        # Loading state indicator
│           └── ErrorBanner.tsx           # Error display with retry option
│
├── index.html                            # Vite entry HTML
├── package.json
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js                      # ESLint flat config
├── .env.example                          # Template for environment variables
├── README.md                             # Project readme (already in repo)
├── PROGRESS.md                           # Phase-by-phase implementation progress log
└── AB_TEST_GUIDE.md                      # Test structure guide (already in repo)
```

---

## 4. Data Schema & Discovery

### Test Data Directory Convention

Defined in detail in [AB_TEST_GUIDE.md](https://github.com/ercrvr/ab-testing/blob/main/AB_TEST_GUIDE.md). Summary:

```
{repo-root}/
├── {project-name}/
│   └── tests/
│       └── testN/
│           ├── meta.json
│           ├── variant-a/
│           │   ├── results.md
│           │   └── ...outputs
│           ├── variant-b/
│           │   ├── results.md
│           │   └── ...outputs
│           └── variant-c/      ← as many variants as needed
│               ├── results.md
│               └── ...outputs
```

**Dynamic variants:** Any subdirectory under a `testN/` directory (excluding `meta.json` at the test root) is treated as a variant. Variant names are user-defined (e.g., `with-skill`, `without-skill`, `baseline`, `gpt4o`, `claude`, `v1`, `v2`).

### TypeScript Types (`src/types.ts`)

```typescript
// ─── Auth ───────────────────────────────────────────────

export type AuthMethod = 'oauth' | 'pat';

export interface AuthState {
  token: string | null;
  user: GitHubUser | null;
  method: AuthMethod | null;
  isAuthenticated: boolean;
}

export interface GitHubUser {
  login: string;
  avatarUrl: string;
  name: string | null;
}

// ─── Repository ─────────────────────────────────────────

export interface RepoInfo {
  owner: string;
  name: string;
  fullName: string;       // "owner/name"
  description: string | null;
  isPrivate: boolean;
  defaultBranch: string;
}

// ─── Project ────────────────────────────────────────────

export interface Project {
  name: string;            // directory name, e.g., "icon-generation"
  displayName: string;     // formatted, e.g., "Icon Generation"
  path: string;            // repo path, e.g., "icon-generation"
  testCount: number;
}

// ─── Variant Metadata ───────────────────────────────────

export interface VariantMeta {
  description?: string;
  highlights?: string[];
  issues?: string[];
  notes?: string[];
  [key: string]: unknown;
}

// ─── Test ───────────────────────────────────────────────

export interface TestMeta {
  name: string;
  prompt: string;
  difficulty: 'Simple' | 'Medium' | 'Complex';
  context?: string;
  tags?: string[];
  date?: string;
  variants?: Record<string, VariantMeta>;
  [key: string]: unknown;
}

export interface TestSummary {
  id: string;              // e.g., "test1" (the full dir name)
  name: string;            // from meta.name
  path: string;            // e.g., "icon-generation/tests/test1"
  difficulty: 'Simple' | 'Medium' | 'Complex';
  prompt: string;
  variantNames: string[];
}

export interface VariantData {
  name: string;            // variant directory name, e.g., "with-skill", "baseline"
  path: string;            // repo path, e.g., "icon-generation/tests/test1/with-skill"
  resultsMarkdown: string | null;  // content of results.md if present
  files: DiscoveredFile[];
}

export interface TestDetail {
  id: string;
  name: string;
  meta: TestMeta;
  variants: VariantData[];
  matchedFiles: FileGroup[];
  unmatchedFiles: Record<string, DiscoveredFile[]>;  // variant name → unmatched files
}

// ─── Files ──────────────────────────────────────────────

export interface DiscoveredFile {
  path: string;            // relative path within variant dir, e.g., "png/icon-32.png"
  name: string;            // filename only, e.g., "icon-32.png"
  extension: string;       // lowercase extension, e.g., "png"
  size: number;            // bytes
  sha: string;             // git blob SHA (used for fetching content)
  downloadUrl: string;     // raw content URL
  contentType: ContentType;
}

export interface FileGroup {
  relativePath: string;    // the matched path, e.g., "settings.svg"
  contentType: ContentType;
  files: Record<string, DiscoveredFile>;  // variant name → file (variants missing the file are absent)
  matchType: 'exact';
}

// ─── Content Types ──────────────────────────────────────

export type ContentType =
  | 'image'
  | 'markdown'
  | 'code'
  | 'json'
  | 'csv'
  | 'xml'
  | 'plaintext'
  | 'pdf'
  | 'html'
  | 'audio'
  | 'video'
  | 'svg'       // special: dual mode (image + code)
  | 'binary';   // fallback
```

### Discovery Algorithm (`src/lib/discovery.ts`)

The discovery process uses the GitHub Contents API and works in stages:

```
Stage 1: Discover Projects
─────────────────────────
GET /repos/{owner}/{repo}/contents/
→ For each directory entry:
    GET /repos/{owner}/{repo}/contents/{dir}
    → If it contains a "tests/" subdirectory → it's a Project

Stage 2: Discover Tests (per project, on navigation)
─────────────────────────────────────────────────────
GET /repos/{owner}/{repo}/contents/{project}/tests/
→ For each directory matching /^test\d+$/:
    GET /repos/{owner}/{repo}/contents/{project}/tests/{testDir}/meta.json
    → Parse JSON → TestSummary

Stage 3: Load Test Detail (per test, on navigation)
────────────────────────────────────────────────────
GET /repos/{owner}/{repo}/contents/{project}/tests/{testDir}/
    → List all entries
    → For each subdirectory entry (excluding meta.json) → this is a variant
    → For each variant directory:
        GET /repos/{owner}/{repo}/contents/{project}/tests/{testDir}/{variantName}/
        → Recursively list all files → VariantData
→ Run file matching algorithm across ALL variants → TestDetail

Stage 4: Fetch File Content (per file, on demand)
──────────────────────────────────────────────────
GET raw content via downloadUrl (for text files)
  or
Use downloadUrl directly as <img src> / <embed src> (for binary files)
```

**Important:** Stage 4 content is fetched lazily — only when the user scrolls a file group into view or expands it. Never prefetch all file contents.

---

## 5. Authentication

Two auth methods, both producing a GitHub personal access token stored in `localStorage`.

### Option A: GitHub OAuth (Recommended)

**Requires:** A GitHub OAuth App + Cloudflare Worker (both free). See [Section 16](#16-cloudflare-worker-oauth-proxy).

```
User clicks "Login with GitHub"
    → window.location = https://github.com/login/oauth/authorize
        ?client_id={GITHUB_CLIENT_ID}
        &redirect_uri={PAGES_URL}
        &scope=repo
        &state={random_nonce}

GitHub redirects back:
    → {PAGES_URL}?code={code}&state={state}

Frontend extracts code from URL params:
    → POST {WORKER_URL}/exchange
        body: { code }
    → Worker responds: { access_token }

Frontend stores token:
    → localStorage.setItem('ab-dashboard-token', token)
    → localStorage.setItem('ab-dashboard-auth-method', 'oauth')
    → Clean URL (remove ?code=&state= params)
    → Redirect to repo selector
```

### Option B: Personal Access Token (Fallback)

```
User clicks "Use Personal Access Token"
    → Input field appears
    → User pastes a PAT (needs `repo` scope for private repos, or no scope for public-only)

Frontend validates:
    → GET https://api.github.com/user (with Authorization: Bearer {pat})
    → If 200 → store token, redirect to repo selector
    → If 401 → show error "Invalid token"

Frontend stores token:
    → localStorage.setItem('ab-dashboard-token', pat)
    → localStorage.setItem('ab-dashboard-auth-method', 'pat')
```

### Token Storage Keys

| Key | Value |
|---|---|
| `ab-dashboard-token` | The access token string |
| `ab-dashboard-auth-method` | `'oauth'` or `'pat'` |
| `ab-dashboard-selected-repo` | JSON string of `RepoInfo` (last selected repo) |

### Implementation Notes (Phase 2)

- `useAuth` is exported directly from `AuthContext.tsx` — there is no separate `src/hooks/useAuth.ts` file
- Landing page uses an expandable/collapsible section for PAT input (not always visible)
- If `VITE_GITHUB_CLIENT_ID` is not configured (empty/undefined), the OAuth button is hidden and PAT form is shown directly
- OAuth flow includes CSRF protection via a random `state` parameter stored in `sessionStorage`

### Logout

Clear all `ab-dashboard-*` keys from localStorage and redirect to landing page.

---

## 6. Routing

**Hash-based routing** using `react-router-dom` with `HashRouter`.

| Route Pattern | Page Component | Description |
|---|---|---|
| `/#/` | `Landing` | Auth page (if not authenticated) |
| `/#/repos` | `RepoSelector` | Browse/search repos |
| `/#/repo/:owner/:repo` | `ProjectList` | All projects in a repo |
| `/#/repo/:owner/:repo/:project` | `ProjectView` | Single project overview + test list |
| `/#/repo/:owner/:repo/:project/:testId` | `TestComparison` | Side-by-side comparison |

### Route Guards

- All routes except `/#/` require authentication. If `token` is null, redirect to `/#/`.
- `/#/` should redirect to `/#/repos` if already authenticated.
- If `selectedRepo` exists in localStorage, the `/#/repos` page should show it as "Continue with {repo}" at the top. *(Phase 6 TODO — not yet implemented)*

### URL Examples

```
/#/                                                → Landing/auth
/#/repos                                           → Repo selector
/#/repo/ercrvr/ab-testing                          → Project list
/#/repo/ercrvr/ab-testing/icon-generation          → Project view
/#/repo/ercrvr/ab-testing/icon-generation/test1    → Test comparison
```

---

## 7. Pages & Views

### 7.1 Landing Page (`Landing.tsx`)

**Purpose:** Authentication entry point.

**Layout:**
````
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    🧪 A/B Testing LAB                           │
│                                                                 │
│        Compare AI agent outputs side-by-side with               │
│        smart, content-aware viewers.                            │
│                                                                 │
│        ┌─────────────────────────────────┐                      │
│        │  🔑  Login with GitHub          │  ← Primary button    │
│        └─────────────────────────────────┘                      │
│                                                                 │
│        ▸ Use a Personal Access Token instead  ← Expandable      │
│        ┌─────────────────────────────────┐                      │
│        │  ghp_xxxxxxxxxxxxxxxxxxxx       │  ← Text input        │
│        └─────────────────────────────────┘                      │
│        ┌──────────┐                                             │
│        │ Connect  │  ← Button with loading state                │
│        └──────────┘                                             │
│                                                                 │
│        ℹ️ Needs repo scope for private repos.                   │
│        🔗 Create a PAT → (links to github.com/settings/tokens) │
│                                                                 │
│        [Error banner shown inline on auth failure]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
````

**Behavior:**
- "Login with GitHub" → redirects to GitHub OAuth flow
- PAT input → on submit, validate by calling `GET /user`, show loading state
- On error, show inline error message (not a modal)
- After successful auth, redirect to `/#/repos`

---

### 7.2 Repo Selector (`RepoSelector.tsx`)

**Purpose:** Search and select a repository.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Header: [Logo] [Breadcrumb: Repositories] [Theme] [Avatar ▼]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ 🔍 Search repositories...                          │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                 │
│  📌 Recently Used (if localStorage has last repo)  [Phase 6]    │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  ercrvr/ab-testing  •  Private  •  Updated 2d ago   │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                 │
│  Your Repositories                                              │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  ercrvr/project-alpha  •  Public  •  Updated 5d ago │        │
│  │  ercrvr/ab-testing     •  Private •  Updated 2d ago │        │
│  │  ercrvr/dotfiles       •  Public  •  Updated 30d    │        │
│  │  ...                                                │        │
│  └─────────────────────────────────────────────────────┘        │
│  [Load more]                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- On load, fetch the user's repos via `GET /user/repos?sort=updated&per_page=30`
- Search box filters client-side first. If the user types `owner/repo` format, also search via `GET /repos/{owner}/{repo}` to find repos they have access to but don't own
- Clicking a repo saves it to localStorage and navigates to `/#/repo/{owner}/{repo}`
- Paginate with "Load more" button (not infinite scroll — saves API calls)

> **Phase 6 TODO:** The "📌 Recently Used" / "Continue with {repo}" section shown in the layout above is planned but not yet implemented. Currently, repos are displayed as a flat list with search and pagination only.

---

### 7.3 Project List (`ProjectList.tsx`)

**Purpose:** Overview of all A/B test projects in the selected repo.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Header: [Logo] [Breadcrumb: Repos > ercrvr/ab-testing] [...]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ercrvr/ab-testing                                              │
│  3 projects found                                               │
│                                                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │ Icon           │  │ Changelog      │  │ API Client     │    │
│  │ Generation     │  │ Generator      │  │ Generator      │    │
│  │                │  │                │  │                │    │
│  │ 12 tests       │  │ 5 tests        │  │ 8 tests        │    │
│  │                │  │                │  │                │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- On mount, run discovery Stage 1: list root → find projects
- Show loading skeleton cards while discovering
- Project card shows: formatted name, test count
- `displayName` is derived from directory name: replace hyphens with spaces, title case each word
  - `icon-generation` → `Icon Generation`
  - `api-client` → `Api Client`
- Click card → navigate to `/#/repo/{owner}/{repo}/{project}`
- If no projects found, show empty state: "No A/B test projects found. Make sure your repo follows the expected structure." with a link to `AB_TEST_GUIDE.md`

---

### 7.4 Project View (`ProjectView.tsx`)

**Purpose:** Overview of a single project with stats and test listing.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Header + Breadcrumbs: Repos > ercrvr/ab-testing > Icon Gen.    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Icon Generation                                                │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ 12       │  │ 3        │  │ 7        │  ← StatCards          │
│  │ Tests    │  │ Simple   │  │ Medium   │                       │
│  └──────────┘  └──────────┘  └──────────┘                      │
│                                                                 │
│  Tests                                                          │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ Test 1: Settings Icon          [Simple]             │        │
│  │ "Create a settings gear icon..."                    │        │
│  ├─────────────────────────────────────────────────────┤        │
│  │ Test 2: Home Icon              [Medium]             │        │
│  │ "Design a home/house icon..."                       │        │
│  ├─────────────────────────────────────────────────────┤        │
│  │ Test 3: Complete Icon Set      [Complex]            │        │
│  │ "Create a cohesive set of 5 navigation icons..."    │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- On mount, run discovery Stage 2: list tests, fetch all meta.json files
- Stats are computed client-side from the meta.json data
- Test cards show: test name, difficulty badge, prompt (truncated to ~120 chars with "...")
- Click test card → navigate to `/#/repo/{owner}/{repo}/{project}/{testId}`
- Tests sorted by ID (numeric)

---

### 7.5 Test Comparison (`TestComparison.tsx`)

**Purpose:** The core feature. Comparison of test variants in a responsive grid layout.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Header + Breadcrumbs: ... > Icon Gen. > Test 1                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Section A: Test Header ───────────────────────────────────┐ │
│  │ Settings Icon                                    [Simple]  │ │
│  │                                                            │ │
│  │ Prompt: "Create a settings gear icon in SVG format,        │ │
│  │ suitable for use as a favicon and in-app icon..."          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Section B: Results Narrative (responsive grid) ───────────┐ │
│  │                                                            │ │
│  │  Variant A           │  Variant B          │  Variant C    │ │
│  │  ────────────         │  ────────────       │  ──────────  │ │
│  │  (results.md)        │  (results.md)       │  (results.md) │ │
│  │                      │                     │               │ │
│  │                                              [Collapse ▲]  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Section C: Variant Highlights (from meta.json) ──────────┐ │
│  │                                                            │ │
│  │  Variant A              │  Variant B          │ Variant C  │ │
│  │  ✅ Highlights          │  ⚠️ Issues          │ 📝 Notes   │ │
│  │  • Clean SVG            │  • Complex paths    │ • Fast     │ │
│  │  • currentColor         │  • No a11y attrs    │ • Simple   │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─ Section D: File Comparison (responsive grid) ────────────┐ │
│  │                                                            │ │
│  │  Matched Files (3 groups)                                  │ │
│  │  ┌──────────────────────────────────────────────────┐      │ │
│  │  │ settings.svg                                     │      │ │
│  │  │                                                  │      │ │
│  │  │  [Variant A] 🔍  │  [Variant B] 🔍  │ [C] 🔍    │      │ │
│  │  │  (rendered)       │  (rendered)       │ (render)  │      │ │
│  │  │  943 B            │  2.1 KB           │ 1.5 KB   │      │ │
│  │  │                                                  │      │ │
│  │  └──────────────────────────────────────────────────┘      │ │
│  │                                                            │ │
│  │  Only in Variant B (4 files)                               │ │
│  │  ┌──────────────────────────────────────────────────┐      │ │
│  │  │ settings-filled.svg    946 B   [Preview]         │      │ │
│  │  │ png/settings-128.png   9.0 KB  [Preview]         │      │ │
│  │  │ ...                                              │      │ │
│  │  └──────────────────────────────────────────────────┘      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [← Previous Test]                     [Next Test →]            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Grid Layout:**
- Outputs are rendered as a responsive grid: one column per variant
- 2 variants = 2 columns, 3 variants = 3 columns, 4+ variants wraps to next row
- Each grid cell is clickable → opens a **fullscreen popup/modal** with the content rendered at full size
- A 🔍 icon on each cell indicates clickable fullscreen capability

**Fullscreen Popup:**
- Opens when any grid cell is clicked
- Dark overlay with centered content at full viewport size
- Shows the variant name as a header
- Close via X button, Escape key, or click outside
- Navigation arrows (←/→) to step through variants while popup is open

**Behavior:**
- On mount, run discovery Stage 3: list all variant subdirectories, recursively list their files, run matching
- Fetch `results.md` content for all variants immediately (they're small)
- Fetch file content for matched groups lazily (on scroll or expand)
- Previous/Next navigation links to sibling tests
- Section B (Results Narrative) is collapsible, expanded by default
- Section C (Highlights) displays highlights, issues, notes, and description from each variant's `meta.json` entry (if present)

---

## 8. Component Specifications

### 8.1 Header (`layout/Header.tsx`)

```
Props: none (reads from context/hooks)
```

Sticky top bar with backdrop blur. Contains:
- **Left:** FlaskConical icon + app name "A/B Testing" + LAB badge (hidden on mobile)
- **Right (authenticated):**
  - Cache source indicator: colored dot + label (`live`/`cached`/`revalidated`/`stale`) via `useCacheStatus()`
  - Rate limit: Gauge icon + remaining count + middot + reset countdown (e.g., `4,834 · 47m`) via `useRateLimit()`. Color-coded green/yellow/red based on remaining
  - Theme toggle (Sun/Moon icon)
  - User avatar dropdown with logout
- **Right (unauthenticated):** Theme toggle only
- **Below navbar:** `<Breadcrumbs />` component in a separate always-visible bar

### 8.2 Breadcrumbs (`layout/Breadcrumbs.tsx`)

```
Props: none (reads from location)
```

Auto-generates breadcrumb trail from `location.pathname` (parses segments directly — `useParams()` doesn't work here because the component lives outside `<Routes>`). Each segment is clickable. Recognizes `segments[0] === 'repo'` and generates links with the `/repo/` prefix (e.g., `/repo/{owner}/{repo}`).

**History depth tracking:** Each navigation level passes `repoNavDepth` in `location.state`. Clicking a breadcrumb calls `history.go(-(currentDepth - targetDepth))` to pop the exact number of entries, keeping browser back/forward buttons consistent.

**Segments:**
- `Repos` (depth 0) — clears selected repo, links to `/repos`
- `owner/repo` (depth 1) — links to `/repo/{owner}/{repo}`
- `Project Name` (depth 2, title-cased from directory name) — links to `/repo/{owner}/{repo}/{project}`
- `Test N` (depth 3)

Only shows on pages deeper than `/repos`. Hidden on landing page.

Example: `Repos` > `ercrvr/ab-testing` > `Icon Generation` > `Test 1`

### 8.3 DifficultyBadge (`ui/DifficultyBadge.tsx`)

```
Props: { difficulty: 'Simple' | 'Medium' | 'Complex' }
```

Renders a colored badge:
- Simple → green (`badge-success`)
- Medium → yellow (`badge-warning`)
- Complex → red (`badge-error`)

### 8.4 StatCard (`ui/StatCard.tsx`)

```
Props: { value: number | string; label: string; icon?: ReactNode }
```

A small card with a large number and a label below it. Used in project overview.

### 8.5 Lightbox (`ui/Lightbox.tsx`)

```
Props: {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt: string;
}
```

Full-screen dark overlay with the image centered. Close on click outside, Escape key, or X button.

### 8.6 ProjectCard (`cards/ProjectCard.tsx`)

```
Props: { project: Project; repoOwner: string; repoName: string }
```

Clickable card. Shows project `displayName` and `testCount`. Links to project view.

### 8.7 TestCard (`cards/TestCard.tsx`)

```
Props: { test: TestSummary; repoOwner: string; repoName: string; project: string }
```

Clickable card/row. Shows test name, difficulty badge, truncated prompt. Links to test comparison.

---

## 9. Content Renderers

All renderers accept content as a `string` (text-based files) or a `url` (binary files). Each renderer handles both single-file preview and grid comparison mode (N variants displayed in a responsive grid, one column per variant). Clicking any rendered item opens it in the FullscreenModal at full size.

### 9.1 Extension → ContentType Mapping (`lib/content-type.ts`)

```typescript
const CONTENT_TYPE_MAP: Record<string, ContentType> = {
  // Images
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image',
  webp: 'image', ico: 'image', avif: 'image', bmp: 'image',

  // SVG (special: image + code)
  svg: 'svg',

  // Markdown
  md: 'markdown',

  // Code
  py: 'code', ts: 'code', tsx: 'code', js: 'code', jsx: 'code',
  css: 'code', sh: 'code', bash: 'code', yml: 'code', yaml: 'code',
  toml: 'code', rs: 'code', go: 'code', java: 'code', c: 'code',
  cpp: 'code', rb: 'code', php: 'code', swift: 'code', kt: 'code',
  sql: 'code', r: 'code', scala: 'code', dart: 'code',

  // Structured Data
  json: 'json',
  csv: 'csv',
  xml: 'xml', webmanifest: 'xml', plist: 'xml',

  // Documents
  pdf: 'pdf',

  // HTML
  html: 'html', htm: 'html',

  // Plain text
  txt: 'plaintext', log: 'plaintext', env: 'plaintext',
  cfg: 'plaintext', ini: 'plaintext', conf: 'plaintext',

  // Audio
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio', flac: 'audio',

  // Video
  mp4: 'video', webm: 'video', mov: 'video',
};

export function getContentType(filename: string): ContentType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPE_MAP[ext] ?? 'binary';
}

export function getShikiLanguage(ext: string): string {
  // Map file extensions to Shiki language identifiers
  const langMap: Record<string, string> = {
    py: 'python', ts: 'typescript', tsx: 'tsx', js: 'javascript',
    jsx: 'jsx', css: 'css', html: 'html', sh: 'bash', bash: 'bash',
    yml: 'yaml', yaml: 'yaml', toml: 'toml', json: 'json',
    rs: 'rust', go: 'go', java: 'java', c: 'c', cpp: 'cpp',
    rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
    sql: 'sql', xml: 'xml', md: 'markdown', svg: 'xml',
    csv: 'csv', r: 'r', scala: 'scala', dart: 'dart',
  };
  return langMap[ext.toLowerCase()] ?? 'text';
}
```

### 9.2 Renderer Specifications

#### ImageRenderer

- **Input:** `url` (raw GitHub URL)
- **Single mode:** Render `<img>` with max-height constraint, click opens FullscreenModal
- **Grid mode:** One image per variant column. Below each: file size, dimensions (load via Image API). Click any image to open in FullscreenModal. An optional toggle switches to ImageSlider (overlay mode) — user picks which 2 variants to compare.

#### ImageSlider

- **Input:** `variants: Record<string, string>` (variant name → image URL), `selectedPair: [string, string]` (currently selected variant names)
- **Renders:** Two selected images stacked with a draggable vertical divider. Left image clips at divider position. Labels on each side.
- **Variant selector:** Dropdown to pick which 2 variants to compare. Defaults to first two. Always available regardless of total variant count.
- **Implementation:** CSS `clip-path` or `overflow: hidden` on a container. Divider is a draggable `<div>`.

#### MarkdownRenderer

- **Input:** `content` (raw markdown string)
- **Uses:** `react-markdown` with `remark-gfm` plugin
- **Styling:** Apply DaisyUI `prose` class for typography. Ensure code blocks within markdown are syntax-highlighted (use Shiki or rehype-highlight).
- **Grid mode:** One rendered column per variant. Toggle to "Source" switches to raw markdown view (syntax-highlighted). Click any variant to open in FullscreenModal.

#### CodeRenderer

- **Input:** `content` (raw code string), `language` (Shiki language ID)
- **Renders:** Syntax-highlighted code block with line numbers. Scrollable.
- **Uses Shiki:** Load the highlighter once (async), cache it. Use a theme that respects dark/light mode (e.g., `github-light` / `github-dark`).

#### DiffRenderer

- **Input:** `contents: Record<string, string>` (variant name → content), `language` (optional)
- **Uses `diff` package:** `diffLines()` for line-level diff
- **Grid mode:** Syntax-highlighted code blocks (one per variant column) with line numbers. Click any to open in FullscreenModal.
- **Scrollable:** Each code block is independently scrollable with a max-height constraint.

#### JsonDiff

- **Input:** `jsonContents: Record<string, string>` (variant name → JSON string)
- **Grid mode:** Formatted JSON views (one per variant column) with collapsible tree nodes. Color-coded values: strings in green, numbers in blue, booleans in purple. Click any to open in FullscreenModal.
- **Implementation:** Parse JSON strings, recursively compare, render tree with indentation. Use `<details>` for collapsible nodes or custom toggle.

#### CsvTable

- **Input:** `csvContents: Record<string, string>` (variant name → CSV string)
- **Renders:** One table per variant in a grid layout. Parse CSV into rows/columns. Click any table to open in FullscreenModal.
- **Implementation:** Split by newlines, then by commas (handle quoted values). Scrollable with sticky headers.

#### PdfViewer

- **Input:** `url` (raw GitHub URL)
- **Renders:** `<embed src={url} type="application/pdf" />` or `<iframe>` fallback
- **Grid mode:** One embed per variant column. Click to open in FullscreenModal for full-size viewing.

#### HtmlPreview

- **Input:** `content` (HTML string) or `url`
- **Renders:** `<iframe sandbox="allow-scripts" srcdoc={content} />` — sandboxed to prevent navigation/popups
- **Toggle:** "Preview" mode (iframe) vs "Source" mode (CodeRenderer with language="html")

#### AudioPlayer / VideoPlayer

- **Input:** `url` (raw GitHub URL)
- **Renders:** `<audio controls src={url} />` or `<video controls src={url} />`
- **Grid mode:** One player per variant column. Optional synchronized playback — a master play/pause/seek control syncs all N variant players simultaneously.

#### BinaryInfo

- **Input:** `file: DiscoveredFile`
- **Renders:** File icon, name, size (formatted), extension. Download link.
- **Used for:** Any file type not covered above

---

## 10. File Matching Algorithm

Implemented in `src/lib/discovery.ts`.

The algorithm matches files across **all variants** (not just two) by grouping on relative path.

```typescript
function matchFiles(
  variants: VariantData[]
): {
  matchedFiles: FileGroup[];
  unmatchedFiles: Record<string, DiscoveredFile[]>;
} {
  // Phase 1: Collect all unique relative paths across ALL variants
  // ──────────────────────────────────────────────────────────────
  // For each variant, iterate its files and collect relative paths.
  // Build a map: relativePath → Record<variantName, DiscoveredFile>

  // Phase 2: Create FileGroups
  // ──────────────────────────
  // For each unique relative path:
  //   - If the file exists in 2+ variants → create a FileGroup
  //     with matchType 'exact' and files map containing each variant's file
  //   - Variants that don't have the file are simply absent from the map

  // Phase 3: Collect unmatched files
  // ────────────────────────────────
  // For each unique relative path:
  //   - If the file exists in only 1 variant → it's unmatched
  //   - Group unmatched files by variant name: Record<variantName, DiscoveredFile[]>

  // Note: results.md is excluded from matching — it's rendered
  // separately in the Results Narrative section.
}
```

**Design decision:** Only exact path matching. Fuzzy matching was considered but rejected — it creates confusion when files are wrongly paired. The guide instructs users to use matching filenames across variants.

---

## 11. State Management

Lightweight — no Redux or Zustand. Use React Context for auth + React Router for URL state + hooks for data fetching.

### Auth Context (`context/AuthContext.tsx`)

```typescript
interface AuthContextValue {
  auth: AuthState;
  login: (token: string, method: AuthMethod) => Promise<void>;
  logout: () => void;
}
```

- `login()` validates the token by calling `GET /user`, stores token + user in localStorage + state
- `logout()` clears localStorage and resets state
- On app mount, check localStorage for existing token. If found, validate it (call `GET /user`). If expired/invalid, clear and redirect to landing.

### Data Fetching Hooks

All data fetching hooks follow the same pattern:

```typescript
interface UseQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}
```

- `useProjects(owner, repo, defaultBranch)` → `UseQueryResult<Project[]>`
- `useTests(owner, repo, project, defaultBranch)` → `UseQueryResult<TestSummary[]>`
- `useTestData(owner, repo, project, testId, defaultBranch)` → `UseQueryResult<TestDetail>`
- `useFileContent(owner, repo, filePath, defaultBranch)` → `UseQueryResult<string>` *(Phase 4 — not yet implemented; will wrap `getFileContent()` from `lib/github.ts`)*

Hooks fetch data on mount (or when params change) and cache results.

### Theme State (`hooks/useTheme.ts`)

```typescript
function useTheme(): {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
```

- On mount, check `localStorage.getItem('ab-dashboard-theme')`. If null, check `prefers-color-scheme` media query.
- Toggle sets `data-theme` attribute on `<html>` (DaisyUI reads this) and persists to localStorage.
- DaisyUI themes to use: `light` and `dark` (built-in).

---

## 12. GitHub API Integration

### API Client (`lib/github.ts`)

The GitHub API client module provides:

1. **Octokit initialization** with a custom fetch wrapper that captures rate limit headers from every response (including 304 Not Modified — Octokit throws before headers are accessible on 304s)
2. **Rate limit tracking** with window-aware logic: GitHub's load balancer routes requests to different backends that report slightly different reset timestamps (~4 min skew). A 10-minute threshold classifies same-window vs new-window:
   - Reset diff < 10 min: same window → `remaining = min(current, incoming)` (can only go down)
   - Reset diff > 10 min: new window (hourly rollover) → accept all values
   - Incoming reset much older: stale → ignore completely
3. **SessionStorage persistence**: Rate limit data survives tab kills (`ab-rate-limit` key)
4. **Pub/sub pattern**: `subscribeRateLimit()` and `subscribeDataSource()` for reactive UI updates
5. **Data source tracking**: Reports whether data came from `cache`, `api`, `etag-revalidated`, or `stale-fallback`
6. **ETag caching**: All data-fetching functions (`getRepo`, `getRepoTree`, `getFileContent`) use conditional requests with `If-None-Match` headers. On 304, cached data is refreshed. On network failure, stale cache is returned as fallback.

```typescript
// Key exports
export function initOctokit(token: string): void;       // Creates Octokit with custom fetch
export function clearOctokit(): void;                     // Clears instance on logout
export function getOctokit(): Octokit;                    // Throws if not initialized

// Rate limit
export function getRateLimitInfo(): RateLimitInfo;
export function subscribeRateLimit(listener: () => void): () => void;
export function fetchRateLimit(): Promise<RateLimitInfo>; // Explicit fetch via GET /rate_limit

// Data source
export function getLastDataSource(): DataSourceEvent | null;
export function subscribeDataSource(listener: () => void): () => void;

// API wrappers (all with ETag caching)
export function listUserRepos(page?: number, perPage?: number): Promise<Repo[]>;
export function getRepo(owner: string, repo: string): Promise<Repo>;
export function getRepoTree(owner: string, repo: string, branch: string): Promise<GitHubTreeEntry[]>;
export function getFileContent(owner: string, repo: string, path: string): Promise<string>;
```

### Key API Calls

| Function | API Endpoint | Used By |
|---|---|---|
| `listUserRepos(page, perPage)` | `GET /user/repos?sort=updated` | RepoSelector (paginated listing) |
| `getRepo(owner, repo)` | `GET /repos/{owner}/{repo}` | RepoSelector (direct access); ETag cached |
| `getRepoTree(owner, repo, branch)` | `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1` | Discovery (single-call full tree); ETag cached |
| `getFileContent(owner, repo, path)` | `GET /repos/{owner}/{repo}/contents/{path}` | File content fetching; ETag cached + stale fallback |

### Rate Limiting

- Authenticated requests: **5,000/hour** (per token, not per IP)
- Rate limit is tracked from response headers on **every** fetch (including 304s) via custom fetch wrapper
- **Window-aware tracking**: GitHub LB skew handled with 10-minute threshold — prevents displayed value from jumping when different backend servers return slightly different remaining counts
- **SessionStorage persistence**: Rate limit data survives tab kills via `ab-rate-limit` sessionStorage key
- **UI display**: Header shows `remaining · resetMinutes` (e.g., `4,834 · 47m`) with color coding:
  - Green: > 500 remaining
  - Yellow: 100–500 remaining
  - Red: < 100 remaining
- If rate limited (HTTP 403 with `X-RateLimit-Remaining: 0`), show a clear error message with reset time
- `useRateLimit` hook provides reactive state with 30-second countdown tick

### Binary vs Text Content

- **Text files** (code, markdown, JSON, CSV, etc.): Fetch via Contents API → response includes base64-encoded `content` field → decode
- **Binary files** (images, PDFs, audio, video): Use the `downloadUrl` directly as `src` attribute. The raw.githubusercontent.com URL works with the token as a query param or via fetch with Authorization header
- **Large files** (>1 MB): Contents API won't return content. Use the Git Blobs API (`GET /repos/{owner}/{repo}/git/blobs/{sha}`) or the `downloadUrl`

---

## 13. Caching Strategy

### localStorage Cache (`lib/cache.ts`)

Cache GitHub API responses to reduce API calls and improve responsiveness.

```typescript
interface CacheEntry {
  data: any;
  etag: string;         // from GitHub's ETag header
  timestamp: number;    // Date.now() when cached
  ttl: number;          // milliseconds until stale
}

const CACHE_PREFIX = 'ab-cache:';

// Cache TTLs
const TTL = {
  REPO_LIST: 5 * 60 * 1000,        // 5 minutes
  REPO_TREE: 10 * 60 * 1000,       // 10 minutes
  PROJECT_LIST: 10 * 60 * 1000,    // 10 minutes
  TEST_LIST: 10 * 60 * 1000,       // 10 minutes
  FILE_CONTENT: 30 * 60 * 1000,    // 30 minutes
  META_JSON: 30 * 60 * 1000,       // 30 minutes
};
```

**Strategy:**
1. Before making an API call, check cache. If entry exists and is not stale → return cached data.
2. If entry exists but is stale → make API call with `If-None-Match: {etag}` header. If GitHub returns 304 → update timestamp, return cached data (this does NOT count against rate limit).
3. If no cache or 200 response → store new data with ETag.

**Cache size management:**
- If localStorage is approaching quota (~5 MB), evict oldest entries first
- File content entries (largest) are evicted before metadata entries

---

## 14. Styling & Theming

### Tailwind CSS v4 Setup

Tailwind v4 uses a CSS-first configuration. No `tailwind.config.js` file.

**`src/index.css`:**
```css
@import "tailwindcss";
@plugin "daisyui";

@theme {
  --color-diff-added: oklch(0.87 0.12 145);
  --color-diff-removed: oklch(0.87 0.12 25);
  --color-diff-changed: oklch(0.9 0.1 85);

  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-heading: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
}

/* Lab-style typography utilities */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}

.font-heading {
  font-family: var(--font-heading);
}

.lab-label {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
```

### DaisyUI Component Usage

Use DaisyUI classes for consistent styling:

| Component | DaisyUI Class |
|---|---|
| Project/Test cards | `card`, `card-compact` |
| Buttons | `btn`, `btn-primary`, `btn-ghost` |
| Badges | `badge`, `badge-success`, `badge-warning`, `badge-error` |
| Inputs | `input`, `input-bordered` |
| Tabs | `tabs`, `tab` |
| Collapse sections | `collapse`, `collapse-arrow` |
| Loading | `loading`, `loading-spinner` |
| Avatar | `avatar` |
| Navbar | `navbar` |
| Stat display | `stat` |

### Responsive Breakpoints

- **Mobile (<768px):** Single column. Variant grid stacks vertically (one variant per row). FullscreenModal is the primary way to inspect content.
- **Tablet (768-1024px):** 2-column grid for variants with reduced padding. 3+ variants wrap to next row.
- **Desktop (>1024px):** Full responsive grid — 2 variants = 2 columns, 3 = 3 columns, 4+ wraps with comfortable spacing.

### Dark Mode

DaisyUI handles dark mode via the `data-theme` attribute on `<html>`:
```html
<html data-theme="dark">
```

All DaisyUI components automatically adapt. For custom styles, use Tailwind's `dark:` variants or DaisyUI CSS variables.

---

## 15. Deployment

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
    paths-ignore:
      - '*.md'
      - 'docs/**'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Build
        run: npm run build
        env:
          VITE_GITHUB_CLIENT_ID: ${{ vars.GH_CLIENT_ID }}
          VITE_OAUTH_PROXY_URL: ${{ vars.OAUTH_PROXY_URL }}

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Required GitHub Repository Settings

1. **Settings → Pages → Source:** Set to "GitHub Actions"
2. **Settings → Variables (Actions):**
   - `GH_CLIENT_ID` — from your GitHub OAuth App
   - `OAUTH_PROXY_URL` — your Cloudflare Worker URL

### Vite Config (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/ab-testing/',    // Must match repo name for GitHub Pages
  build: {
    outDir: 'dist',
  },
});
```

**Important:** `base` must be set to `/{repo-name}/` because GitHub Pages serves from `https://{user}.github.io/{repo-name}/`.

---

## 16. Cloudflare Worker (OAuth Proxy)

### Why It's Needed

GitHub's OAuth flow requires exchanging a `code` for an `access_token` using the `client_secret`. The secret can't be embedded in frontend code. The worker is a tiny proxy that holds the secret and performs this exchange.

### Worker Code (`worker/oauth-proxy.js`)

```javascript
export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(request, env),
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { code } = await request.json();
      if (!code) {
        return new Response(JSON.stringify({ error: 'Missing code' }), {
          status: 400,
          headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json' },
        });
      }

      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = await tokenResponse.json();

      return new Response(JSON.stringify(tokenData), {
        headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { ...corsHeaders(request, env), 'Content-Type': 'application/json' },
      });
    }
  },
};

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
  const isAllowed = allowed.includes(origin) || allowed.includes('*');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
```

### Worker Environment Variables

| Variable | Value |
|---|---|
| `GITHUB_CLIENT_ID` | From GitHub OAuth App settings |
| `GITHUB_CLIENT_SECRET` | From GitHub OAuth App settings |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed origins (e.g., `https://ercrvr.github.io`) |

### Deployment Steps

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → Create
2. Name it (e.g., `ab-testing-oauth`)
3. Paste the code above
4. Add the three environment variables (Settings → Variables)
5. Deploy
6. Note the worker URL (e.g., `https://ab-testing-oauth.{your-subdomain}.workers.dev`)

---

## 17. Environment Variables

### `.env.example`

```env
# GitHub OAuth App — Client ID (public, safe for frontend)
VITE_GITHUB_CLIENT_ID=your_github_oauth_app_client_id

# Cloudflare Worker URL — OAuth token exchange proxy
VITE_OAUTH_PROXY_URL=https://your-worker.your-subdomain.workers.dev

# Optional: Set required OAuth scopes (default: repo)
VITE_GITHUB_SCOPES=repo
```

> **Note:** The app URL (`redirect_uri` for OAuth) is computed dynamically from `window.location` at runtime — there is no `VITE_APP_URL` variable.

### Accessing in Code

Vite exposes env vars prefixed with `VITE_` via `import.meta.env`:

```typescript
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID;
const OAUTH_PROXY_URL = import.meta.env.VITE_OAUTH_PROXY_URL;
```

---

## 18. Error Handling

### Error Types

| Error | Cause | User-Facing Message | Action |
|---|---|---|---|
| **401 Unauthorized** | Token expired/revoked | "Your session has expired. Please log in again." | Clear token, redirect to landing |
| **403 Rate Limited** | GitHub API rate limit hit | "API rate limit reached. Resets at {time}." | Show countdown, disable further requests |
| **403 Forbidden** | No access to private repo | "You don't have access to this repository." | Suggest checking permissions |
| **404 Not Found** | Repo/file doesn't exist | "Repository not found." or "File not found." | Show error inline |
| **422 Validation** | Malformed request | "Something went wrong. Please try again." | Log to console |
| **Network Error** | No internet / CORS issue | "Unable to connect. Check your internet connection." | Retry button |
| **Invalid meta.json** | Malformed JSON in test data | "Could not parse test metadata." | Skip test, show warning |

### Error Display

- **Page-level errors** (can't load projects, can't load tests): Full-page error state with message + retry button
- **Component-level errors** (can't load one file in a comparison): Inline error within that component, don't break the rest of the page
- **Toast/banner errors** (rate limit warning, auth expiring): Top banner that can be dismissed

### Error Boundary

Wrap the app in a React error boundary that catches unhandled errors and shows a "Something went wrong" page with a "Reload" button.

---

## 19. Performance Considerations

### API Call Budget

A typical user session might look like:
1. Auth validation: 1 call
2. List repos: 1 call
3. List root contents: 1 call
4. List project contents: 1 call per project
5. List tests: 1 call per project
6. Fetch meta.json: 1 call per test
7. List variant files: 1 call to list test dir + 1 call per variant (N variants per test)
8. Fetch file content: 1 call per file viewed

**For a repo with 3 projects × 10 tests × 5 files each:**
- Discovery: ~40 calls (one-time, cached)
- Viewing all tests: ~100 calls (spread over time as user navigates)
- Total: ~140 calls — well within 5,000/hour

### Optimization Techniques

1. **Use the Git Trees API** for discovery instead of recursive Contents API calls:
   - `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1` returns the ENTIRE file tree in a single call
   - Parse the flat tree to build the project/test structure client-side
   - **This replaces ~40 discovery API calls with 1 call**

2. **Lazy content loading:** Only fetch file contents when the user navigates to a test and scrolls to a file group. Use IntersectionObserver for scroll-triggered loading.

3. **Image optimization:** Use `loading="lazy"` on all `<img>` tags. For raw GitHub URLs, consider appending a size parameter if supported.

4. **Shiki highlighter:** Initialize once on first code render. Don't re-initialize per component. Use `shiki.createHighlighter()` with only the needed languages and themes.

5. **Bundle size:** Use dynamic imports for heavy renderers (PdfViewer, JsonDiff) that aren't always needed.

---

## 20. Implementation Order

Build in this order. Each phase produces a testable increment.

### Phase 1: Project Scaffold ✅
1. Initialize Vite + React + TypeScript project
2. Install core dependencies (react-router-dom, lucide-react, tailwindcss, daisyui)
3. Configure Tailwind v4 + DaisyUI v5 (`index.css`)
4. Set up directory structure (src/lib, hooks, context, pages, components)
5. Create placeholder pages (Landing, RepoSelector, ProjectList, ProjectView, TestComparison)
6. Configure Vite for hash routing + GitHub Pages base path
7. Lab-style typography and branding (Space Grotesk, Inter, JetBrains Mono)
8. GitHub Actions deploy workflow
9. **Checkpoint:** Blank app deploys to GitHub Pages

### Phase 2: Authentication ✅
10. Implement `AuthContext.tsx` (token storage, user state, `useAuth` hook)
11. Build `Landing.tsx` (OAuth button + expandable PAT form)
12. Handle OAuth callback (code → token exchange via Cloudflare Worker)
13. PAT validation (test API call to `GET /user`)
14. Logout + token clearing
15. Route guards (ProtectedRoute wrapper, auth redirect)
16. **Checkpoint:** Can log in via OAuth or PAT, protected routes work

### Phase 3: Core Navigation & Data Discovery ✅
17. Install `@octokit/rest`
18. Implement `lib/github.ts` (Octokit wrapper with rate limit handling)
19. Implement `lib/discovery.ts` (Git Trees API for single-call discovery)
20. Implement `lib/cache.ts` (localStorage + ETag caching)
21. Implement data hooks (`useProjects`, `useTests`, `useTestData`)
22. Build `RepoSelector.tsx` (search/browse repos, recently used)
23. Build `ProjectList.tsx` (project cards grid)
24. Build `ProjectView.tsx` (stats + test cards)
25. Build `Header.tsx` breadcrumbs navigation
26. **Checkpoint:** Can navigate from repo → projects → tests ✅

### Phase 4: Content Renderers
27. Install `react-markdown`, `remark-gfm`, `shiki` *(dependencies installed ✅ — renderers not yet implemented)*
28. Implement `ImageRenderer.tsx` + `Lightbox.tsx`
29. Implement `ImageSlider.tsx` (overlay comparison)
30. Implement `MarkdownRenderer.tsx`
31. Implement `CodeRenderer.tsx` (Shiki syntax highlighting)
32. Implement `DiffRenderer.tsx` (side-by-side + unified)
33. Implement `JsonDiff.tsx` (structural tree diff)
34. Implement `CsvTable.tsx` (sortable table + cell diff)
35. Implement `PdfViewer.tsx`
36. Implement `HtmlPreview.tsx` (sandboxed iframe)
37. Implement `AudioPlayer.tsx` + `VideoPlayer.tsx`
38. Implement `BinaryInfo.tsx` (fallback)
39. **Checkpoint:** All content types rendering correctly

### Phase 5: Comparison Engine
40. Install `diff` package
41. Implement `lib/diff.ts` (line diff, word diff, JSON structural diff)
42. Implement file matching algorithm (N-variant exact path matching)
43. Build `TestComparison.tsx` layout (sections A-D)
44. Build `ResultsNarrative.tsx` (side-by-side results.md)
45. Build `FileGroupView.tsx` (routes matched files to correct renderer)
46. Build `FullscreenModal.tsx` (fullscreen content popup)
47. Build `UnmatchedFiles.tsx` ("Only in {variant}" sections)
48. **Checkpoint:** Full comparison view working

### Phase 6: Polish & UX
49. Dark/light theme toggle (useTheme.ts) — system detection + manual override
50. Responsive layout (mobile stacks vertical, tablet 2-col, desktop full grid)
51. Loading states & skeleton screens for all async pages
52. Error boundaries & error pages (per §18)
53. Rate limit indicator in header
54. Keyboard shortcuts (navigation, theme toggle)
55. Footer
56. **Checkpoint:** Polished, responsive, production-ready UX

### Phase 7: Deployment & Go-Live
57. Final GitHub Actions workflow test (clean build + deploy)
58. Verify GitHub Pages configuration
59. Configure custom domain (optional)
60. End-to-end test: Auth → Repo → Project → Test → Comparison
61. Test with existing test data (e.g., `icon-skill` project)
62. **Checkpoint:** Live and fully functional at ercrvr.github.io/ab-testing

## 21. Acceptance Criteria

### Must Have (MVP)

- [ ] User can authenticate via PAT
- [ ] User can select a repository
- [ ] App discovers all projects and tests automatically
- [ ] Project list page shows all projects with test counts
- [ ] Project view shows all tests with metadata
- [ ] Test comparison renders side-by-side results.md
- [ ] Test comparison renders side-by-side image outputs with slider
- [ ] Test comparison renders side-by-side code outputs with diff highlighting
- [ ] Test comparison shows highlights and issues from meta.json
- [ ] Unmatched files section shows files unique to each variant
- [ ] Dark/light mode works
- [ ] App deploys to GitHub Pages via GitHub Actions
- [ ] App is responsive on mobile

### Should Have

- [ ] OAuth login flow via Cloudflare Worker
- [ ] JSON structural diff viewer
- [ ] CSV table diff viewer
- [ ] PDF embedded viewer
- [ ] HTML sandboxed preview
- [ ] localStorage caching with ETags
- [ ] Rate limit display and handling
- [ ] Loading skeletons
- [ ] Previous/Next test navigation
- [ ] SVG dual-mode (visual + code)

### Nice to Have

- [ ] Audio/video players
- [ ] Unified vs split diff toggle
- [ ] Image metadata (dimensions) below images
- [ ] Keyboard navigation (←/→ for prev/next test)
- [ ] Search/filter tests within a project
- [ ] Export comparison as PDF or image
