---
phase: 05-export-reporting
plan: 01
subsystem: export
tags: [evidence-linking, semantic-naming, markdown, utilities]

# Dependency graph
requires:
  - phase: 02-normalization-component-mining
    provides: Token normalization types and culori color analysis
  - phase: 01-foundation-crawling
    provides: Evidence type system and token evidence tracking
provides:
  - Evidence citation formatting with parenthetical citations
  - Semantic token naming algorithm using culori hue analysis
  - Markdown generation utilities wrapping markdown-table
  - Barrel export index for shared utilities
affects: [05-02, 05-03, 05-04, 05-05]

# Tech tracking
tech-stack:
  added: [markdown-table]
  patterns: [culori-based color classification, t-shirt size spacing scale, heading/body typography naming]

key-files:
  created:
    - src/export/evidence-linker.ts
    - src/export/semantic-namer.ts
    - src/export/reports/markdown-utils.ts
    - src/export/index.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Evidence citations use parenthetical format showing first 3 sources with '+N more' suffix"
  - "Color naming uses culori hue/saturation analysis: neutrals (<10% saturation), primary (most frequent), secondary/accent (2nd/3rd)"
  - "Typography naming uses size percentiles: first 20% = heading-N, next 30% = subheading-N, rest = body-N"
  - "Spacing naming uses t-shirt sizes (xs/sm/md/lg/xl/2xl/3xl) for first 7, numeric for extras"
  - "All token names are lowercase kebab-case to avoid case-sensitivity issues"

patterns-established:
  - "Evidence formatting: formatEvidenceCitation for inline, formatEvidenceSummary for structured data, formatEvidenceForJSON for export"
  - "Semantic naming: analyze token characteristics (hue, size, frequency) to generate meaningful names, not numeric IDs"
  - "Markdown helpers: wrap markdown-table with generateTable, provide codeBlock/heading/section helpers for consistent formatting"

# Metrics
duration: 3 min
completed: 2026-02-16
---

# Phase 05 Plan 01: Shared Export Utilities Summary

**Evidence citation formatter, semantic token namer with culori color analysis, and markdown generation utilities for all Phase 5 exports**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-16T03:49:49Z
- **Completed:** 2026-02-16T03:53:06Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Evidence linker provides consistent citation formatting across all export consumers
- Semantic namer generates meaningful token names (color-primary, heading-1, spacing-sm) using culori hue analysis
- Markdown utilities wrap markdown-table for GFM-compliant table generation
- Barrel export index provides single import point for all shared utilities

## Task Commits

Each task was committed atomically:

1. **Task 1: Install markdown-table and create evidence linker + semantic namer** - `e3f3594` (feat)
2. **Task 2: Create markdown utilities and export module barrel** - `efc7cc7` (feat)

## Files Created/Modified

- `src/export/evidence-linker.ts` - Evidence citation formatting (parenthetical, structured summary, JSON export)
- `src/export/semantic-namer.ts` - Semantic token naming with culori color classification
- `src/export/reports/markdown-utils.ts` - Markdown generation helpers (table, codeBlock, heading, etc.)
- `src/export/index.ts` - Barrel export re-exporting all shared utilities
- `package.json` - Added markdown-table dependency
- `package-lock.json` - Lockfile updated

## Decisions Made

**Evidence citation format:** Parenthetical citations showing first 3 source pages with "+N more" suffix for conciseness. Format: `pathname1, pathname2, pathname3 (+N more)`. Uses URL pathname for readability; if pathname is "/", shows hostname instead.

**Color naming algorithm:** Uses culori's oklch color space for hue/saturation analysis. Colors with <10% saturation classified as "neutral-N". Saturated colors classified by frequency: most frequent = "primary", second = "secondary", third = "accent", remaining = "color-N".

**Typography naming algorithm:** Size-based percentile classification. Sorted descending by pixel size: first 20% = "heading-N", next 30% = "subheading-N", remaining = "body-N". Matches existing dtcg-formatter pattern.

**Spacing naming algorithm:** T-shirt size scale for first 7 values (xs, sm, md, lg, xl, 2xl, 3xl), numeric suffix for extras. Provides semantic names developers understand without documentation.

**Case normalization:** All token names lowercase kebab-case to prevent case-only collisions on case-insensitive platforms (Windows, some build tools).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 05-02 (dual-layer JSON exports). Shared utilities now available for:
- JSON exports to format evidence and generate semantic names
- Multi-format exporters (CSS, Tailwind, Figma) to use semantic naming
- Component stubs to reference evidence
- Reports to generate markdown tables and inline evidence citations

## Self-Check: PASSED

All created files verified to exist on disk:
- ✓ src/export/evidence-linker.ts
- ✓ src/export/semantic-namer.ts
- ✓ src/export/reports/markdown-utils.ts
- ✓ src/export/index.ts

All commits verified in git history:
- ✓ e3f3594 (Task 1)
- ✓ efc7cc7 (Task 2)

---
*Phase: 05-export-reporting*
*Completed: 2026-02-16*
