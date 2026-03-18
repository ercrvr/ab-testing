# A/B Testing Dashboard

A GitHub Pages-hosted dashboard that connects to any GitHub repository containing A/B test data, auto-discovers all projects and tests, and renders smart side-by-side comparisons with content-aware viewers.

## Features

- **GitHub Authentication** — Login with GitHub OAuth or Personal Access Token to access public and private repos
- **Auto-Discovery** — Point it at any repo following the [test structure convention](./AB_TEST_GUIDE.md) and the dashboard maps all projects and tests automatically
- **Smart Comparison** — Files are auto-matched across variants and rendered with the best viewer for each content type:
  - 🖼️ **Images** — Side-by-side with slider overlay (SVG, PNG, WebP, JPG, GIF, ICO, AVIF)
  - 📝 **Markdown** — Rendered side-by-side with optional source diff toggle
  - 💻 **Code** — Split diff view with syntax highlighting (Python, TypeScript, JavaScript, HTML, CSS, YAML, etc.)
  - 📊 **JSON** — Structural diff with added/removed/changed key highlighting
  - 📋 **CSV** — Table diff with cell-level change highlighting
  - 📄 **PDF** — Side-by-side embedded viewers
  - 🌐 **HTML** — Sandboxed iframe previews
  - 📃 **Plain Text** — Unified diff with line-level highlighting
  - 📦 **Binary** — Metadata comparison (size, type) with download links
- **Dark/Light Mode** — System preference detection with manual toggle
- **Responsive Layout** — Works on desktop, tablet, and mobile

## Quick Start

### 1. Structure Your Test Data

Follow the [A/B Test Structure Guide](./AB_TEST_GUIDE.md) to organize your test data. The basic structure is:

```
your-repo/
├── project-name/
│   └── tests/
│       ├── test1/
│       │   ├── meta.json
│       │   ├── with-skill/
│       │   │   ├── results.md
│       │   │   └── ...output files
│       │   └── without-skill/
│       │       ├── results.md
│       │       └── ...output files
│       └── test2/
│           └── ...
└── another-project/
    └── tests/
        └── ...
```

### 2. Access the Dashboard

Visit the deployed GitHub Pages site and authenticate with your GitHub account to browse your test data.

### 3. Navigate

1. **Select a repository** containing your A/B test data
2. **Browse projects** — each project card shows aggregate stats
3. **View tests** — click into any test for the full side-by-side comparison

## Self-Hosting / Deployment

### Prerequisites

- Node.js 18+
- A GitHub OAuth App (free) — for the "Login with GitHub" flow
- A Cloudflare Worker (free tier) — tiny OAuth token exchange proxy

### Setup

```bash
# Clone and install
git clone https://github.com/ercrvr/ab-testing.git
cd ab-testing
npm install

# Configure environment
cp .env.example .env
# Edit .env with your GitHub OAuth Client ID and Cloudflare Worker URL

# Development
npm run dev

# Build for production
npm run build
```

### GitHub Pages Deployment

The repository includes a GitHub Actions workflow that automatically builds and deploys to GitHub Pages on every push to `main`.

To enable:
1. Go to repo **Settings → Pages**
2. Set source to **GitHub Actions**
3. Push to `main` — the site will deploy automatically

### Cloudflare Worker (OAuth Proxy)

The `worker/` directory contains the OAuth proxy code. Deploy it to Cloudflare Workers (free tier, 100k requests/day):

1. Create a free [Cloudflare account](https://dash.cloudflare.com/sign-up)
2. Create a new Worker and paste the code from `worker/oauth-proxy.js`
3. Add your GitHub OAuth **Client Secret** as an environment variable
4. Update your `.env` with the Worker URL

## Tech Stack

- **React 18** + **TypeScript** — UI framework
- **Vite** — Build tool
- **Tailwind CSS v4** + **DaisyUI v5** — Styling
- **Octokit** — GitHub API client
- **React Router** (hash mode) — Client-side routing for GitHub Pages
- **react-markdown** + **remark-gfm** — Markdown rendering
- **Shiki** — Syntax highlighting

## License

MIT
