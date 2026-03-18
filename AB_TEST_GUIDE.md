# A/B Test Structure Guide

This document defines how to structure A/B test data so the dashboard can automatically discover and render it. Follow this guide when creating test data manually or when building AI agents/scripts that generate test results.

---

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Required Files](#required-files)
  - [meta.json](#metajson)
  - [results.md](#resultsmd)
- [Output Files](#output-files)
- [Naming Conventions](#naming-conventions)
- [Complete Examples](#complete-examples)
  - [Example 1: 2-Variant Image Generation Test](#example-1-2-variant-image-generation-test)
  - [Example 2: 2-Variant Code Generation Test](#example-2-2-variant-code-generation-test)
  - [Example 3: 3-Variant Model Comparison Test](#example-3-3-variant-model-comparison-test)
- [Checklist](#checklist)
- [FAQ](#faq)

---

## Overview

The A/B testing dashboard compares the output of **any number of variants**. Each variant represents a different condition, model, configuration, or approach being evaluated.

| Concept | Description |
|---|---|
| **Variant** | A single experimental condition. Each variant is a subdirectory under the test directory containing its own `results.md` and output files. |
| **Project** | The skill or feature being evaluated (e.g., `icon-generation`). Contains multiple tests. |
| **Test** | An individual prompt/scenario within a project. Contains 2 or more variants. |

Variant names are **user-defined** — you choose directory names that describe each condition. Common patterns include:

| Pattern | Example Variant Names | Use Case |
|---|---|---|
| Skill comparison | `with-skill`, `without-skill` | Testing effect of a specific skill/prompt |
| Model comparison | `gpt4o`, `claude`, `gemini` | Comparing different AI models |
| Version comparison | `v1`, `v2`, `v3` | Iterating on a prompt or approach |
| Configuration | `baseline`, `optimized`, `aggressive` | Testing different parameter settings |

---

## Directory Structure

```
{repository-root}/
│
├── {project-name}/                    # One directory per skill/feature being tested
│   └── tests/
│       ├── test1/                     # Each test is a numbered directory
│       │   ├── meta.json              # REQUIRED — test metadata
│       │   ├── variant-a/             # First variant (user-defined name)
│       │   │   ├── results.md         # REQUIRED — narrative writeup
│       │   │   └── ...                # Any output files
│       │   ├── variant-b/             # Second variant
│       │   │   ├── results.md         # REQUIRED — narrative writeup
│       │   │   └── ...                # Any output files
│       │   └── variant-c/             # Additional variants (as many as needed)
│       │       ├── results.md         # REQUIRED — narrative writeup
│       │       └── ...                # Any output files
│       ├── test2/
│       │   ├── meta.json
│       │   ├── with-skill/
│       │   │   └── ...
│       │   └── without-skill/
│       │       └── ...
│       └── testN/
│           └── ...
│
├── {another-project}/
│   └── tests/
│       └── ...
│
├── README.md
└── AB_TEST_GUIDE.md                   # This file
```

### Key Rules

1. **Project directories** can be any valid directory name (lowercase, hyphens recommended)
2. **Test directories** must be named `test` followed by a number: `test1`, `test2`, `test3`, etc.
3. **Variant directories** can be any valid directory name — you choose names that describe each condition
4. **Every variant directory must contain** a `results.md` file
5. **Every test must contain** `meta.json` at the test root level
6. Any subdirectory under a test directory (other than `meta.json`) is treated as a variant
7. Output files inside variant directories can have **any structure** — flat, nested subdirectories, any file types
8. **Minimum 2 variants per test** — you need at least two things to compare

---

## Required Files

### meta.json

Every test directory must contain a `meta.json` file at the root level. This file describes the test scenario and optionally provides per-variant metadata.

#### Schema

```json
{
  "name": "string (required) — short, descriptive test name",
  "prompt": "string (required) — the exact prompt or task given to the agent",
  "difficulty": "string (required) — one of: Simple, Medium, Complex",
  "context": "string (optional) — additional context about the test setup",
  "tags": ["string array (optional) — tags for filtering/categorization"],
  "date": "ISO 8601 (optional) — when the test was run",
  "variants": {
    "variant-name": {
      "description": "string (optional) — what this variant represents",
      "highlights": ["string array (optional) — what this variant did well"],
      "issues": ["string array (optional) — problems or shortcomings"],
      "notes": ["string array (optional) — any additional observations"]
    }
  }
}
```

The `variants` field is a map where each key matches a variant directory name. All fields within each variant entry are optional. You can also add custom fields — the dashboard reads known fields and preserves any extras.

#### Difficulty Levels

| Level | Description | Examples |
|---|---|---|
| **Simple** | Straightforward task, minimal ambiguity | "Generate a settings icon", "Write a hello world function" |
| **Medium** | Requires some judgment, multiple valid approaches | "Create a dashboard layout", "Write a REST API client" |
| **Complex** | Ambiguous, multi-step, requires deep reasoning | "Design a complete icon system", "Build a full-stack auth flow" |

#### Example: 2-Variant Test

```json
{
  "name": "Settings Icon",
  "prompt": "Create a settings gear icon in SVG format, suitable for use as a favicon and in-app icon. It should be clean, minimal, and work at small sizes.",
  "difficulty": "Simple",
  "variants": {
    "with-skill": {
      "description": "Agent with icon design skill",
      "highlights": [
        "Produced a single, clean SVG with proper viewBox",
        "Icon renders crisply at 16x16 and scales well",
        "Used currentColor for theme adaptability",
        "Included accessibility attributes (role, aria-label, title)"
      ],
      "notes": [
        "Designed at 24x24 base with simple geometry",
        "Used stroke-based design for clarity at small sizes",
        "Added ARIA attributes and title element",
        "Verified rendering at 16x16 and 32x32"
      ]
    },
    "without-skill": {
      "description": "Agent without icon design skill (control)",
      "highlights": [
        "Produced a recognizable gear icon",
        "Generated multiple style variations"
      ],
      "issues": [
        "Overly complex paths that blur at small sizes",
        "No accessibility attributes",
        "Generated unnecessary PNG conversions",
        "Inconsistent sizing across variations"
      ]
    }
  }
}
```

#### Example: 3-Variant Model Comparison

```json
{
  "name": "REST API Client",
  "prompt": "Generate a TypeScript REST API client for a todo-list API with CRUD operations.",
  "difficulty": "Medium",
  "tags": ["code-generation", "typescript", "api"],
  "date": "2026-03-18",
  "variants": {
    "gpt4o": {
      "description": "GPT-4o output",
      "highlights": [
        "Clean type definitions",
        "Comprehensive error handling"
      ],
      "issues": [
        "Slightly verbose implementation"
      ]
    },
    "claude": {
      "description": "Claude 3.5 Sonnet output",
      "highlights": [
        "Elegant, concise code",
        "Good use of generics"
      ],
      "issues": [
        "Missing retry logic"
      ]
    },
    "gemini": {
      "description": "Gemini Pro output",
      "highlights": [
        "Good documentation",
        "Included usage examples"
      ],
      "issues": [
        "Types less precise",
        "No error type definitions"
      ]
    }
  }
}
```

---

### results.md

Each variant directory must contain a `results.md` file. This is the narrative writeup that explains what happened during the test — what the agent did, what it produced, and how well it performed.

#### Guidelines

- Write in **third person** ("The agent produced...", not "I produced...")
- Start with a **brief summary** (1-2 sentences)
- Include a **Process** section describing the steps taken
- Include an **Output** section describing what was produced
- Include an **Assessment** section with honest evaluation
- Reference specific output files by name so the dashboard can link them
- Use standard Markdown formatting (headers, lists, code blocks, tables)

#### Template

```markdown
# {Test Name} — {Variant Name}

{1-2 sentence summary of the result.}

## Process

{Describe the steps the agent took, in order.}

1. Step one...
2. Step two...
3. Step three...

## Output

{Describe what was produced. Reference files by name.}

- `output-file.svg` — Description of this file
- `subdirectory/another-file.png` — Description

## Assessment

{Honest evaluation. What worked? What didn't? How does this compare to the other variants?}

### Strengths
- Strength 1
- Strength 2

### Weaknesses
- Weakness 1
- Weakness 2
```

---

## Output Files

Output files are the actual artifacts produced during the test. They can be **any file type** and can be organized in **any directory structure** within the variant folder.

### Supported Content Types

The dashboard renders these content types with specialized viewers:

| Category | Extensions | Rendering |
|---|---|---|
| Images | `.svg`, `.png`, `.webp`, `.jpg`, `.jpeg`, `.gif`, `.ico`, `.avif`, `.bmp` | Visual preview in grid with fullscreen popup on click |
| Markdown | `.md` | Rendered with full formatting |
| Code | `.py`, `.ts`, `.js`, `.tsx`, `.jsx`, `.css`, `.html`, `.sh`, `.bash`, `.yml`, `.yaml`, `.toml`, `.rs`, `.go`, `.java`, `.c`, `.cpp`, `.rb`, `.php`, `.swift`, `.kt` | Syntax-highlighted with diff view |
| Data | `.json`, `.csv`, `.xml`, `.webmanifest`, `.plist` | Structured viewer (tree/table) with diff |
| Documents | `.pdf` | Embedded viewer |
| Rich HTML | `.html` | Sandboxed iframe preview |
| Plain Text | `.txt`, `.log`, `.env`, `.cfg`, `.ini`, `.conf` | Monospace diff view |
| Audio | `.mp3`, `.wav`, `.ogg`, `.m4a`, `.flac` | Audio player |
| Video | `.mp4`, `.webm`, `.mov` | Video player |
| Other | Any extension | Metadata display (name, size, type) with download link |

### File Matching for Comparison

The dashboard automatically groups files across all variants for comparison using a responsive grid:

1. **Exact path match** — `variant-a/icon.svg` ↔ `variant-b/icon.svg` ↔ `variant-c/icon.svg` → grouped
2. **Nested path match** — `variant-a/png/icon-32.png` ↔ `variant-b/png/icon-32.png` → grouped
3. **Unmatched files** — files that exist in only one variant are shown in a separate "Only in {variant}" section

**Tip:** Use the same filenames and directory structure across all variants whenever possible to get the best comparison experience.

---

## Naming Conventions

| Item | Convention | Examples |
|---|---|---|
| Project directory | Lowercase, hyphens, descriptive | `icon-generation`, `changelog-generator`, `api-client` |
| Test directory | `test` + number, sequential | `test1`, `test2`, `test10` |
| Variant directories | User-defined, lowercase, hyphens | `with-skill`, `without-skill`, `baseline`, `gpt4o`, `v1` |
| Output files | Lowercase, hyphens, descriptive | `settings-icon.svg`, `api-client.ts`, `report.pdf` |
| Subdirectories in variants | Any valid name | `png/`, `exports/`, `src/` |

---

## Complete Examples

### Example 1: 2-Variant Image Generation Test

```
icon-generation/
└── tests/
    └── test1/
        ├── meta.json
        ├── with-skill/
        │   ├── results.md
        │   └── settings.svg
        └── without-skill/
            ├── results.md
            ├── settings-filled.svg
            ├── settings-outline.svg
            ├── settings.svg
            └── png/
                ├── settings-16x16.png
                ├── settings-32x32.png
                ├── settings-128x128.png
                └── settings-512x512.png
```

### Example 2: 2-Variant Code Generation Test

```
api-client-generator/
└── tests/
    └── test1/
        ├── meta.json
        ├── with-skill/
        │   ├── results.md
        │   ├── client.ts
        │   ├── types.ts
        │   └── tests/
        │       └── client.test.ts
        └── without-skill/
            ├── results.md
            ├── client.ts
            └── types.ts
```

### Example 3: 3-Variant Model Comparison Test

```
api-client-generator/
└── tests/
    └── test2/
        ├── meta.json
        ├── gpt4o/
        │   ├── results.md
        │   ├── client.ts
        │   └── types.ts
        ├── claude/
        │   ├── results.md
        │   ├── client.ts
        │   └── types.ts
        └── gemini/
            ├── results.md
            ├── client.ts
            └── types.ts
```

---

## Checklist

Use this checklist when creating a new test:

- [ ] Project directory exists with a `tests/` subdirectory
- [ ] Test directory is named `testN` (e.g., `test1`, `test2`)
- [ ] `meta.json` exists in the test directory with all required fields (`name`, `prompt`, `difficulty`)
- [ ] `meta.json` has valid `difficulty` value (`Simple`, `Medium`, or `Complex`)
- [ ] At least **2 variant directories** exist under the test directory
- [ ] Each variant directory contains a `results.md`
- [ ] `results.md` files follow the template (summary, process, output, assessment)
- [ ] If using `meta.json` `variants` field, each key matches a variant directory name
- [ ] Output files use descriptive, lowercase, hyphenated names
- [ ] Matching output files use the **same filename** across all variants for best comparison

---

## FAQ

**Q: Can I have nested subdirectories in variant folders?**
Yes. The dashboard recursively discovers all files in each variant directory. Use whatever structure makes sense for your outputs.

**Q: What if one variant has files the others don't?**
That's fine and expected. Unmatched files are displayed in an "Only in {variant-name}" section. This is valuable data — it shows what one approach produced that the others didn't.

**Q: Can I add extra fields to meta.json?**
Yes. The dashboard reads the required fields and ignores any extras. Feel free to add custom fields for your own tracking — both at the top level and within individual variant entries.

**Q: What's the maximum number of tests per project?**
No hard limit. The dashboard paginates and lazy-loads test data, so even hundreds of tests will work. However, the GitHub API has rate limits (5,000 requests/hour authenticated), so very large repos may need the dashboard's caching to work smoothly.

**Q: Can I have more than 2 variants?**
Yes! You can have as many variants as you need. The dashboard renders them in a responsive grid — 2 variants get 2 columns, 3 get 3 columns, and so on. Each grid cell is clickable to open a fullscreen popup for detailed inspection. This is great for comparing multiple AI models, prompt versions, or configurations side by side.

**Q: Can I use any variant naming convention?**
Yes. Variant directory names are entirely user-defined. Use whatever names describe your conditions best — `with-skill`/`without-skill`, `baseline`/`experiment`, `gpt4o`/`claude`/`gemini`, `v1`/`v2`/`v3`, etc. Just use lowercase with hyphens for consistency.

**Q: Do I need to commit binary files (PNGs, PDFs) to the repo?**
Yes. The dashboard reads all content via the GitHub API, so files must be committed. For very large binary files (>100 MB), consider using Git LFS.

**Q: Do I need to include the `variants` field in meta.json?**
No, the `variants` field is optional. The dashboard discovers variants by scanning subdirectories, not by reading the `variants` field. However, including it provides rich metadata (highlights, issues, descriptions) that the dashboard displays prominently.
