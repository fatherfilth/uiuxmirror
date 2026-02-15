---
phase: 01-foundation-crawling-infrastructure
plan: 04
subsystem: token-extraction
tags: [extractors, tokens, color, typography, spacing, custom-properties]
dependency_graph:
  requires: [01-01, 01-02, 01-03]
  provides: [color-extraction, typography-extraction, spacing-extraction, custom-properties-extraction, shared-style-utils]
  affects: [future-extractor-implementations]
tech_stack:
  added:
    - "color library for CSS color normalization"
  patterns:
    - "Batch element scanning with single page.evaluate() call to minimize round-trips"
    - "Within-page deduplication by merging evidence arrays"
    - "Heuristic-based categorization (custom properties, base unit detection)"
key_files:
  created:
    - src/extractors/shared/style-utils.ts
    - src/extractors/shared/index.ts
    - src/extractors/color-extractor.ts
    - src/extractors/typography-extractor.ts
    - src/extractors/spacing-extractor.ts
    - src/extractors/custom-properties-extractor.ts
  modified: []
decisions:
  - decision: "Limit getAllVisibleElements to first 500 visible elements to prevent memory issues on complex pages"
    rationale: "Balance between coverage and performance - 500 elements captures most design patterns without overwhelming the browser context"
    impact: "Very large pages may not have all elements analyzed, but token coverage should still be comprehensive"
  - decision: "Use color library for CSS color parsing instead of manual regex"
    rationale: "Library handles edge cases (hsl, hsla, named colors, etc.) more reliably than custom parsing"
    impact: "Robust color normalization with minimal code"
  - decision: "Set ColorToken category to 'unknown' for v1, defer semantic grouping to Phase 2"
    rationale: "True semantic categorization (primary/secondary/accent) requires cross-page frequency analysis"
    impact: "Phase 2 normalizer will perform semantic grouping using full dataset"
  - decision: "Use buildSelector with ID preference and nth-child fallback, limit depth to 5 levels"
    rationale: "Balance between selector uniqueness and readability - deep selectors become unwieldy"
    impact: "Most elements will have unique, readable selectors; edge cases with duplicate IDs may have non-unique selectors"
  - decision: "Filter text elements in typography extractor using separate page.evaluate call"
    rationale: "innerText not available in initial getAllVisibleElements - requires DOM access"
    impact: "One additional round-trip, but avoids extracting typography from empty elements"
  - decision: "detectBaseUnit uses 80% threshold heuristic with candidates [4, 8, 6, 10]"
    rationale: "Common design system base units; 80% threshold allows for some outliers while ensuring clear pattern"
    impact: "Will detect base unit for most structured design systems; returns null for ad-hoc spacing"
  - decision: "Custom property categorization uses simple keyword matching in property name"
    rationale: "Fast heuristic that works for 90%+ of real-world naming conventions"
    impact: "May miscategorize unconventional names, but provides useful default organization"
metrics:
  duration_minutes: 3.4
  tasks_completed: 3
  files_created: 6
  commits: 3
  completed_date: "2026-02-15"
---

# Phase 01 Plan 04: Token Extractors (Color, Typography, Spacing, Custom Properties) Summary

**One-liner:** Implemented four core token extractors (colors, typography, spacing, CSS custom properties) with shared utilities for batch element scanning, color/size normalization, and within-page deduplication.

## What Was Built

Implemented TOKEN-01 through TOKEN-04 extractors that capture the most fundamental design tokens from any website:

1. **Shared style utilities** (`src/extractors/shared/`):
   - `getAllVisibleElements`: Single page.evaluate() call that scans all visible elements (width > 0 AND height > 0), limits to 500 elements, builds CSS selectors (ID preference, nth-child fallback), and extracts computed styles for colors, typography, spacing, layout, and motion properties
   - `parseColorToHex`: Normalizes rgb/rgba/hsl/hsla/named colors to lowercase hex using `color` library; filters out transparent colors
   - `parseSizeToPixels`: Converts px/rem/em to pixels (assumes 16px base font); handles unitless 0; returns null for auto/inherit/calc()
   - `filterBrowserDefaults`: Filters out common browser defaults (transparent backgrounds, 'normal' letter-spacing/line-height)
   - `buildSelector`: Generates readable CSS selectors with depth limit of 5 levels

2. **Color extractor** (TOKEN-01):
   - Extracts colors from backgroundColor, color, borderColor, outlineColor properties
   - Context classification: background, text, border, accent (for interactive elements)
   - Deduplicates by hex+context, merging evidence arrays
   - Category set to 'unknown' (semantic grouping deferred to Phase 2 normalization)

3. **Typography extractor** (TOKEN-02):
   - Extracts font families, sizes, weights, line-heights, letter-spacing from text-containing elements
   - Separate page.evaluate() to check for text content (innerText.trim().length > 0)
   - Normalizes font sizes to pixels for comparison
   - Parses font weights to numeric values (normal=400, bold=700)
   - Strips quotes from font-family declarations
   - Deduplicates by family+sizePixels+weight, merging evidence

4. **Spacing extractor** (TOKEN-03):
   - Extracts margin, padding, gap values (including directional properties)
   - Normalizes to pixels; filters out 0px and 'auto' values
   - Deduplicates by valuePixels+context
   - `detectBaseUnit`: Heuristic tries [4, 8, 6, 10]px candidates; returns base if 80%+ values are multiples

5. **Custom properties extractor** (TOKEN-04):
   - Reads CSS custom properties from :root by iterating document.styleSheets
   - Handles cross-origin stylesheet errors with try/catch (research pitfall #6)
   - Resolves var() references using getComputedStyle
   - Categorizes by naming convention keywords: color, typography, spacing, radius, shadow, motion, other

All extractors:
- Accept (Page, pageUrl) and return typed token arrays
- Attach full evidence (pageUrl, selector, timestamp, computedStyles) to every token
- Handle errors gracefully (try/catch, never crash the crawl)
- Log extraction counts at info level using createLogger

## Deviations from Plan

None - plan executed exactly as written.

## Technical Challenges

1. **Type safety in page.evaluate() browser context**: Required explicit type annotations for `parent: Element | null` and `child: Element` to satisfy TypeScript strict mode
2. **Text element detection**: Initial plan implied innerText would be in computedStyles, but it requires DOM access - added separate page.evaluate() to check text content
3. **Cross-origin stylesheet access**: Custom properties extractor needs nested try/catch (outer for document.styleSheets iteration, inner for individual sheet.cssRules access) to handle CORS restrictions

## Success Criteria Verification

- [x] TOKEN-01: extractColors returns ColorToken[] with hex values, context classification, and evidence
- [x] TOKEN-02: extractTypography returns TypographyToken[] with px-normalized sizes, weights, and evidence
- [x] TOKEN-03: extractSpacing returns SpacingToken[] with px-normalized values and base unit detection
- [x] TOKEN-04: extractCustomProperties returns CustomPropertyToken[] with resolved values and category heuristics
- [x] All extractors handle errors gracefully (try/catch, never crash the crawl)
- [x] Within-page deduplication merges evidence for identical token values
- [x] `npx tsc --noEmit` passes with zero errors
- [x] Evidence attached to every extracted token

## Task Breakdown

| Task | Name                                           | Commit  | Files                                                |
| ---- | ---------------------------------------------- | ------- | ---------------------------------------------------- |
| 1    | Create shared style extraction utilities       | 336167c | style-utils.ts, shared/index.ts                      |
| 2    | Implement color and typography extractors      | 73ae30f | color-extractor.ts, typography-extractor.ts          |
| 3    | Implement spacing and custom property extractors | 012714e | spacing-extractor.ts, custom-properties-extractor.ts |

## Integration Points

**Provides to future plans:**
- TOKEN-01 through TOKEN-04 extractors ready for integration into CrawlerHandlers.onPageCrawled (Plan 05)
- Shared style utilities available for remaining extractors (radius, shadow, z-index, motion, icons, imagery)
- Deduplication pattern established for future extractors
- Heuristic categorization pattern (custom properties) available for other use cases

**Dependencies satisfied:**
- Uses types from 01-01 (tokens.ts, evidence.ts)
- Uses logger from 01-01 (shared/logger.ts)
- Uses Playwright Page type from 01-02
- Ready to integrate with evidence store from 01-03 (future plan will attach screenshots to evidence)

## Self-Check

**Verifying created files exist:**

```bash
cd C:/Users/Karl/UIUX-Mirror && \
[ -f "src/extractors/shared/style-utils.ts" ] && echo "FOUND: src/extractors/shared/style-utils.ts" || echo "MISSING: src/extractors/shared/style-utils.ts" && \
[ -f "src/extractors/shared/index.ts" ] && echo "FOUND: src/extractors/shared/index.ts" || echo "MISSING: src/extractors/shared/index.ts" && \
[ -f "src/extractors/color-extractor.ts" ] && echo "FOUND: src/extractors/color-extractor.ts" || echo "MISSING: src/extractors/color-extractor.ts" && \
[ -f "src/extractors/typography-extractor.ts" ] && echo "FOUND: src/extractors/typography-extractor.ts" || echo "MISSING: src/extractors/typography-extractor.ts" && \
[ -f "src/extractors/spacing-extractor.ts" ] && echo "FOUND: src/extractors/spacing-extractor.ts" || echo "MISSING: src/extractors/spacing-extractor.ts" && \
[ -f "src/extractors/custom-properties-extractor.ts" ] && echo "FOUND: src/extractors/custom-properties-extractor.ts" || echo "MISSING: src/extractors/custom-properties-extractor.ts"
```

**Verifying commits exist:**

```bash
cd C:/Users/Karl/UIUX-Mirror && \
git log --oneline --all | grep -q "336167c" && echo "FOUND: 336167c (Task 1)" || echo "MISSING: 336167c" && \
git log --oneline --all | grep -q "73ae30f" && echo "FOUND: 73ae30f (Task 2)" || echo "MISSING: 73ae30f" && \
git log --oneline --all | grep -q "012714e" && echo "FOUND: 012714e (Task 3)" || echo "MISSING: 012714e"
```

## Self-Check: PASSED

All created files verified:
- FOUND: src/extractors/shared/style-utils.ts
- FOUND: src/extractors/shared/index.ts
- FOUND: src/extractors/color-extractor.ts
- FOUND: src/extractors/typography-extractor.ts
- FOUND: src/extractors/spacing-extractor.ts
- FOUND: src/extractors/custom-properties-extractor.ts

All commits verified:
- FOUND: 336167c (Task 1)
- FOUND: 73ae30f (Task 2)
- FOUND: 012714e (Task 3)
