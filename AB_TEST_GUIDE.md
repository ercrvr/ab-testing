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
  - [Image Generation Test](#example-1-image-generation-test)
  - [Code Generation Test](#example-2-code-generation-test)
  - [Document Generation Test](#example-3-document-generation-test)
- [Checklist](#checklist)
- [FAQ](#faq)

---

## Overview

The A/B testing dashboard compares the output of two variants:

| Variant | Directory | Description |
|---|---|---|
| **With Skill** | `with-skill/` | Output produced when the AI agent had access to a specific skill/prompt/instruction |
| **Without Skill** | `without-skill/` | Output produced by the same agent without that skill — the control group |

Tests are organized under **projects** (the skill or feature being evaluated), and each project contains multiple **tests** (individual prompts/scenarios).

---

## Directory Structure

```
{repository-root}/
│
├── {project-name}/                    # One directory per skill/feature being tested
│   └── tests/
│       ├── test1/                     # Each test is a numbered directory
│       │   ├── meta.json              # REQUIRED — test metadata
│       │   ├── with-skill/            # REQUIRED — skill variant outputs
│       │   │   ├── results.md         # REQUIRED — narrative writeup
│       │   │   └── ...                # Any output files
│       │   └── without-skill/         # REQUIRED — control variant outputs
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
3. **Variant directories** must be named exactly `with-skill` and `without-skill`
4. **Every test must contain** `meta.json`, `with-skill/results.md`, and `without-skill/results.md`
5. Output files inside variant directories can have **any structure** — flat, nested subdirectories, any file types

---

## Required Files

### meta.json

Every test directory must contain a `meta.json` file at the root level. This file describes the test scenario and summarizes the results.

#### Schema

```json
{
  "name": "string (required) — short, descriptive test name",
  "prompt": "string (required) — the exact prompt or task given to the agent",
  "difficulty": "string (required) — one of: Simple, Medium, Complex",
  "withSkill": {
    "highlights": ["string array (required) — what the skill-guided agent did well"],
    "skillSteps": ["string array (required) — steps the skill guided the agent through"]
  },
  "withoutSkill": {
    "highlights": ["string array (required) — what the unguided agent did well (if anything)"],
    "issues": ["string array (required) — problems, mistakes, or shortcomings"]
  }
}
```

#### Difficulty Levels

| Level | Description | Examples |
|---|---|---|
| **Simple** | Straightforward task, minimal ambiguity | "Generate a settings icon", "Write a hello world function" |
| **Medium** | Requires some judgment, multiple valid approaches | "Create a dashboard layout", "Write a REST API client" |
| **Complex** | Ambiguous, multi-step, requires deep reasoning | "Design a complete icon system", "Build a full-stack auth flow" |

#### Example

```json
{
  "name": "Settings Icon",
  "prompt": "Create a settings gear icon in SVG format, suitable for use as a favicon and in-app icon. It should be clean, minimal, and work at small sizes.",
  "difficulty": "Simple",
  "withSkill": {
    "highlights": [
      "Produced a single, clean SVG with proper viewBox",
      "Icon renders crisply at 16x16 and scales well",
      "Used currentColor for theme adaptability",
      "Included accessibility attributes (role, aria-label, title)"
    ],
    "skillSteps": [
      "Designed at 24x24 base with simple geometry",
      "Used stroke-based design for clarity at small sizes",
      "Added ARIA attributes and title element",
      "Verified rendering at 16x16 and 32x32"
    ]
  },
  "withoutSkill": {
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
```

---

### results.md

Each variant directory (`with-skill/` and `without-skill/`) must contain a `results.md` file. This is the narrative writeup that explains what happened during the test — what the agent did, what it produced, and how well it performed.

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

{Honest evaluation. What worked? What didn't? How does this compare to the other variant?}

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
| Images | `.svg`, `.png`, `.webp`, `.jpg`, `.jpeg`, `.gif`, `.ico`, `.avif`, `.bmp` | Visual preview with slider comparison |
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

The dashboard automatically pairs files across variants for side-by-side comparison:

1. **Exact path match** — `with-skill/icon.svg` ↔ `without-skill/icon.svg` → paired
2. **Nested path match** — `with-skill/png/icon-32.png` ↔ `without-skill/png/icon-32.png` → paired
3. **Unmatched files** — files that exist in only one variant are shown in a separate section

**Tip:** Use the same filenames and directory structure in both variants whenever possible to get the best comparison experience.

---

## Naming Conventions

| Item | Convention | Examples |
|---|---|---|
| Project directory | Lowercase, hyphens, descriptive | `icon-generation`, `changelog-generator`, `api-client` |
| Test directory | `test` + number, sequential | `test1`, `test2`, `test10` |
| Variant directories | Exact names required | `with-skill`, `without-skill` |
| Output files | Lowercase, hyphens, descriptive | `settings-icon.svg`, `api-client.ts`, `report.pdf` |
| Subdirectories in variants | Any valid name | `png/`, `exports/`, `src/` |

---

## Complete Examples

### Example 1: Image Generation Test

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

### Example 2: Code Generation Test

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

### Example 3: Document Generation Test

```
changelog-generator/
└── tests/
    └── test1/
        ├── meta.json
        ├── with-skill/
        │   ├── results.md
        │   ├── CHANGELOG.md
        │   └── summary.json
        └── without-skill/
            ├── results.md
            ├── CHANGELOG.md
            └── notes.txt
```

---

## Checklist

Use this checklist when creating a new test:

- [ ] Project directory exists with a `tests/` subdirectory
- [ ] Test directory is named `testN` (e.g., `test1`, `test2`)
- [ ] `meta.json` exists in the test directory with all required fields
- [ ] `meta.json` has valid `difficulty` value (`Simple`, `Medium`, or `Complex`)
- [ ] `meta.json` has non-empty arrays for `highlights`, `skillSteps`, and `issues`
- [ ] `with-skill/` directory exists with a `results.md`
- [ ] `without-skill/` directory exists with a `results.md`
- [ ] `results.md` files follow the template (summary, process, output, assessment)
- [ ] Output files use descriptive, lowercase, hyphenated names
- [ ] Matching output files use the **same filename** in both variants for best comparison

---

## FAQ

**Q: Can I have nested subdirectories in variant folders?**
Yes. The dashboard recursively discovers all files in each variant directory. Use whatever structure makes sense for your outputs.

**Q: What if one variant has files the other doesn't?**
That's fine and expected. Unmatched files are displayed in an "Only in with-skill" or "Only in without-skill" section. This is valuable data — it shows what one approach produced that the other didn't.

**Q: Can I add extra fields to meta.json?**
Yes. The dashboard reads the required fields and ignores any extras. Feel free to add custom fields for your own tracking.

**Q: What's the maximum number of tests per project?**
No hard limit. The dashboard paginates and lazy-loads test data, so even hundreds of tests will work. However, the GitHub API has rate limits (5,000 requests/hour authenticated), so very large repos may need the dashboard's caching to work smoothly.

**Q: Can I use a different variant naming convention (e.g., "baseline" vs "experiment")?**
Not currently. The dashboard specifically looks for `with-skill` and `without-skill` directories. Stick with these names.

**Q: Do I need to commit binary files (PNGs, PDFs) to the repo?**
Yes. The dashboard reads all content via the GitHub API, so files must be committed. For very large binary files (>100 MB), consider using Git LFS.
