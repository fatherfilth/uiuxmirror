# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Every extracted standard and inferred component must trace back to observable evidence from the source site
**Current focus:** Phase 2 Complete — Ready for Phase 3

## Current Position

Phase: 3 of 6 (Synthesis & Inference Engine)
Plan: 6 of 6 in current phase
Status: Complete
Last activity: 2026-02-16 — Completed 03-06 (Unit & integration tests for synthesis)

Progress: [██████████] 100% (6/6 Phase 3 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 19
- Average duration: 5.7 minutes
- Total execution time: 1.83 hours

**By Phase:**

| Phase | Plans | Total     | Avg/Plan |
|-------|-------|-----------|----------|
| 1     | 7     | 51.9 min  | 7.4 min  |
| 2     | 6     | 42.8 min  | 7.1 min  |
| 3     | 6     | 27.0 min  | 4.5 min  |

**Recent Executions:**

| Plan     | Duration | Tasks | Files |
|----------|----------|-------|-------|
| 03-01    | 4 min    | 2     | 5     |
| 03-02    | 5 min    | 2     | 10    |
| 03-03    | 6 min    | 2     | 4     |
| 03-04    | 4 min    | 2     | 3     |
| 03-05    | 3 min    | 2     | 4     |
| 03-06    | 5 min    | 2     | 7     |

**Recent Trend:**
- Last 6 plans: 03-01 (4 min), 03-02 (5 min), 03-03 (6 min), 03-04 (4 min), 03-05 (3 min), 03-06 (5 min)
- Trend: Phase 3 complete, averaging 4.5 min per plan

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
- **03-01:** Synthesis types import from implementation files (normalize-pipeline.ts, component-aggregator.ts) rather than type-only files
- **03-01:** Token constraint checker returns null for missing tokens (never fabricates values)
- **03-01:** DTCG naming conventions used in buildTokenMap (color-1, spacing-xs, heading-1, etc.)
- **03-01:** Confidence calculation based on resolved/total ratio in validateTokenConstraints
- **03-04:** Use DTCG formatted tokens for semantic color lookup (ColorCluster lacks semantic categories)
- **03-04:** Inline ARIA pattern database (6 patterns ~150 lines, avoids file I/O overhead)
- **03-03:** Use claude-sonnet-4-5-20250514 for style decisions (cost-appropriate for motion/microcopy, cheaper than Opus)
- **03-03:** Manual JSON schema conversion instead of zod-to-json-schema package (avoid extra dependency, full control)
- **03-03:** Graceful degradation when ANTHROPIC_API_KEY not set (returns null refinements, logs warning)
- **03-03:** Sequential API calls instead of parallel (respect rate limits, easier error handling)
- **03-03:** Prompt caching with cache_control ephemeral (5-min lifetime, significant cost savings for multi-component synthesis)
- **03-04:** Component type aliases for naming variations (table→data-table, dialog→modal)
- **03-02:** Template aliases for common variations (table→data-table, dialog→modal) improve UX
- **03-02:** Token coverage threshold of 50% required for synthesis (prevents low-quality output)
- **03-02:** Handlebars custom helpers (fallback, ifEqual, cssValue) for readable templates
- **03-02:** WCAG 2.1 luminance calculation for color contrast (industry standard)
- **03-02:** Template context merges tokens and request constraints for flexibility
- [Phase 03-05]: Evidence chain sorted by source priority: observed_token > observed_component > inferred_pattern > llm_decision
- [Phase 03-05]: Weighted confidence calculation: token_application (1.0), structural_choice (0.8), llm_refinement (0.6)
- [Phase 03-05]: synthesizeComponent() is the primary entry point for all component synthesis
- **03-06:** Mock DesignDNA fixtures provide realistic Phase 2 output for testing
- **03-06:** Anti-hallucination tests validate all color values trace to DesignDNA tokens
- **03-06:** All tests pass without ANTHROPIC_API_KEY to ensure CI compatibility
- **03-06:** Evidence validation confirms no empty references and correct priority sorting
- **03-06:** State completeness tests verify all 7 states with proper ARIA attributes

### Pending Todos

None yet.

### Blockers/Concerns

None - Phase 3 progressing well, 5 of 6 plans complete.

## Session Continuity

Last session: 2026-02-16
Stopped at: Completed 03-06-PLAN.md (Unit & integration tests) — Phase 3 Complete
Resume file: None

---
*State initialized: 2026-02-15*
*Last updated: 2026-02-16*
