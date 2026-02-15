# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Every extracted standard and inferred component must trace back to observable evidence from the source site
**Current focus:** Phase 2 Complete — Ready for Phase 3

## Current Position

Phase: 2 of 6 (Normalization & Component Mining)
Plan: 6 of 6 in current phase
Status: Phase 2 Complete (Verified)
Last activity: 2026-02-16 — Phase 2 execution complete, all 6 plans verified

Progress: [██████████] 100% (6/6 Phase 2 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 6.7 minutes
- Total execution time: 1.4 hours

**By Phase:**

| Phase | Plans | Total     | Avg/Plan |
|-------|-------|-----------|----------|
| 1     | 7     | 51.9 min  | 7.4 min  |
| 2     | 6     | 42.8 min  | 7.1 min  |

**Recent Executions:**

| Plan     | Duration | Tasks | Files |
|----------|----------|-------|-------|
| 01-07    | 16 min   | 2     | 9     |
| 02-04    | 4 min    | 2     | 10    |
| 02-01    | 4 min    | 2     | 8     |
| 02-02    | 8.8 min  | 2     | 6     |
| 02-05    | 4 min    | 2     | 6     |
| 02-03    | 6 min    | 2     | 6     |
| 02-06    | 8 min    | 2     | 8     |

**Recent Trend:**
- Last 5 plans: 02-02 (8.8 min), 02-05 (4 min), 02-03 (6 min), 02-06 (8 min)
- Trend: Phase 2 consistently fast (4-9 min range)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **01-01:** ESM-only module system for modern Node.js compatibility
- **01-01:** Strict TypeScript with bundler module resolution for maximum type safety
- **01-01:** File-based JSON storage with LowDB (validated for v1 scope)
- **01-01:** Simple console-based logger to minimize dependencies
- **01-02:** Added DOM to tsconfig lib array for Playwright browser context type checking
- **01-02:** Used @ts-ignore for page.evaluate() browser context code (standard Playwright pattern)
- **01-02:** maxRequestsPerCrawl in Crawlee handles maxPages limit automatically
- **01-02:** CrawlerHandlers.onPageCrawled passes live Playwright Page to extractors
- **01-03:** In-memory evidence index with periodic flush for better I/O performance
- **01-03:** Screenshot filenames use URL hash + selector hash + timestamp for collision resistance
- **01-04:** Limit getAllVisibleElements to 500 elements to prevent memory issues on complex pages
- **01-04:** ColorToken category set to 'unknown' for v1; semantic grouping deferred to Phase 2 cross-page analysis
- **01-04:** detectBaseUnit uses 80% threshold with [4, 8, 6, 10]px candidates for spacing base unit detection
- **01-05:** Z-index stacking context uses simplified heuristic (selector depth ≤2 = global, >2 = local) for v1
- **01-05:** Warning logged if >20 unique z-index values detected (indicates z-index management issue)
- **01-05:** Icon detection uses dual heuristics (src pattern + size <64px) to identify icons
- **01-05:** Imagery aspect ratios normalized to common formats with 5% tolerance
- **01-05:** extractAllTokens runs all extractors concurrently via Promise.all (safe, all read-only)
- **01-06:** Default import for fs-extra instead of namespace import to fix ESM compatibility
- **01-06:** Token hash includes token counts and representative samples (first 5 of each type)
- **01-06:** Evidence sampling: 10 tokens per type, 1-2 evidence items per token to avoid overwhelming storage
- **01-06:** CLI uses simple process.argv parsing instead of external framework for minimal dependencies
- **01-06:** Added /storage/ to .gitignore for Crawlee cache (root level only, not src/storage/)
- **01-07:** Vitest chosen for test framework (fast, ESM-native, Playwright-compatible)
- **01-07:** String-based page.evaluate() to avoid esbuild __name decorator injection
- **01-07:** Try/catch guards added to all extractors for robustness
- **02-01:** Use culori's differenceEuclidean('lab') for CIEDE2000 perceptual color distance
- **02-01:** Default threshold 2.3 for color clustering (JND - just noticeable difference)
- **02-01:** Round normalized px values to 2 decimal places for precision vs readability
- **02-01:** Preserve original values and units alongside normalized px values
- **02-01:** Sort color clusters by occurrence count descending
- **02-04:** Multi-signal detection (tag + ARIA + CSS) ensures coverage of custom components
- **02-04:** Priority-based resolution handles elements matching multiple signatures
- **02-04:** Card signature has lower priority (5) than specific components (10)
- **02-04:** Styled links detected via padding >= 6/12px + borderRadius > 0 + (bg or border)
- **02-04:** Component scanning limited to 500 elements (consistent with Phase 1)
- **02-02:** Cross-page threshold at 3 pages balances noise filtering with design system discovery
- **02-02:** Density bonus formula (avgOccurrences - 1) / 5, capped at +0.2 to reward multiple occurrences
- **02-02:** Confidence levels: low <0.3, medium 0.3-0.6, high >0.6 for filtering/prioritization
- **02-02:** Spacing scale tries common bases [4,8,6,10] before GCD for design-meaningful scales
- **02-02:** baseUnit=1 reports coverage=0 to distinguish mathematical from design-meaningful scales
- **02-05:** Size variants use percentile-based clustering (33rd/66th percentiles) instead of fixed thresholds
- **02-05:** Emphasis detection via bg/border heuristics (primary/secondary/tertiary/ghost)
- **02-05:** Hover/focus states captured via Playwright interaction with transition waits (150ms/100ms)
- **02-05:** Loading/error states detected opportunistically from aria attributes and CSS classes
- **02-05:** State mapping returns only properties that differ from default to minimize data
- **02-05:** State capture limited to 20 components per type to balance coverage with execution time
- **02-03:** Use custom zod schema instead of w3c-design-tokens-standard-schema (package incompatible with our needs)
- **02-03:** Store confidence metadata in $extensions['com.uiux-mirror'] per W3C DTCG spec
- **02-03:** Semantic naming for tokens (heading-1, spacing-xs) more meaningful than pure numeric
- **02-03:** DTCG validation warns instead of fails for robust pipeline operation
- **02-06:** Component confidence combines page frequency (50%), variant consistency (30%), and density (20%)
- **02-06:** Canonical component representation uses mode of CSS properties across all instances
- **02-06:** Variant consistency = 1 - (uniqueVariants / totalInstances) rewards uniformity
- **02-06:** Confidence levels: low <0.3, medium 0.3-0.6, high >0.6 based on combined score
- **02-06:** Integration tests use pre-merged tokens with multi-page evidence for cross-page validation
- **02-06:** Fixed duplicate NormalizationResult export conflict between output/index.ts and normalization/index.ts

### Pending Todos

None yet.

### Blockers/Concerns

None - Phase 2 complete, all blockers resolved.

## Session Continuity

Last session: 2026-02-16
Stopped at: Phase 2 Complete — all 6 plans executed and verified (5/5 must-haves passed)
Resume file: None

---
*State initialized: 2026-02-15*
*Last updated: 2026-02-16*
