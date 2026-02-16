---
phase: 05-export-reporting
plan: 02
subsystem: export
tags: [json, dual-layer, evidence, confidence, machine-readable]

# Dependency graph
requires:
  - phase: 02-normalization-component-mining
    provides: NormalizationResult with cross-page validated tokens, AggregatedComponent with variants
  - phase: 04-pattern-detection
    provides: StoredPattern for flows and content analysis, ContentStyleResult
  - phase: 05-01
    provides: Evidence formatting utilities and semantic naming algorithms
provides:
  - Dual-layer JSON exports for all 5 machine-readable files
  - generateTokensJSON with quick lookup and rich context layers
  - generateComponentsJSON with component catalog structure
  - generatePatternsJSON for flow and content patterns
  - generateContentStyleJSON for voice, capitalization, CTA, error patterns
  - generateEvidenceIndexJSON without verbose computedStyles
affects: [05-03, 05-04, 05-05, 05-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [dual-layer export structure, quick/rich separation, evidence sampling for exports]

key-files:
  created:
    - src/export/formatters/json-layers.ts
  modified:
    - src/export/formatters/index.ts
    - src/export/index.ts

key-decisions:
  - "Quick layer provides fast name->value lookups for developer consumption"
  - "Rich layer includes full evidence arrays, confidence objects, and relationships for Claude agent reasoning"
  - "Evidence sampling limited to first 10 items per token to prevent export bloat"
  - "Typography tokens split into separate quick-layer entries (size, weight, family, line-height) but single rich entry"
  - "Content style quick layer picks highest-confidence pattern per category"
  - "Evidence index strips computedStyles to reduce export size"

patterns-established:
  - "DualLayerExport<Q, R> generic interface for all JSON exports"
  - "Quick layer: simple key-value or summary objects (fast developer access)"
  - "Rich layer: full context with evidence arrays, confidence scoring, metadata"
  - "Metadata: generatedAt timestamp and version for all exports"

# Metrics
duration: 4 min
completed: 2026-02-16
---

# Phase 05 Plan 02: Dual-Layer JSON Exports Summary

**Dual-layer JSON generators for tokens, components, patterns, content style, and evidence with quick-lookup and rich-context layers**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-16T03:55:59Z
- **Completed:** 2026-02-16T04:00:49Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- All 5 JSON export generators implemented with dual-layer structure
- Quick layers provide fast developer lookups (name->value, type->summary)
- Rich layers provide full context for Claude agent reasoning (evidence, confidence, relationships)
- Evidence sampling prevents export bloat while maintaining traceability
- All generators accessible from single barrel export at src/export/index.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create dual-layer JSON generators for tokens, components, and evidence** - `3bbf5e0` (feat)
2. **Task 2: Add patterns and content style JSON generators, create formatters barrel** - `3ccd8ef` (feat)

## Files Created/Modified

- `src/export/formatters/json-layers.ts` - All 5 dual-layer JSON generators with quick/rich separation
- `src/export/formatters/index.ts` - Updated barrel to export JSON generators alongside CSS/Tailwind/Figma formatters
- `src/export/index.ts` - Main export barrel re-exporting all JSON generators

## Decisions Made

**Dual-layer structure:** Every JSON export (except evidence_index) has two layers — quick for fast developer lookups, rich for Claude agent reasoning. Quick layer uses simple key-value maps or summary objects. Rich layer includes full evidence arrays, confidence scores with levels, and relationship metadata.

**Evidence sampling:** Limited to first 10 evidence items per token to prevent JSON export bloat. Full evidence index remains available separately for detailed tracing.

**Typography split:** In quick layer, typography tokens have separate entries for size, weight, family, and line-height to enable fast property-specific lookups. Rich layer combines all properties into single entry with full context.

**Content style quick layer:** Picks highest-confidence pattern per category (voice, capitalization, CTA, error) for fast summary access. Rich layer includes all patterns with full examples.

**Evidence index optimization:** Strips verbose computedStyles from export to reduce file size. Retains pageUrl, selector, timestamp, screenshotPath, boundingBox for traceability.

**Standards array usage:** All token generators use CrossPageResult standards arrays from NormalizationResult, ensuring only cross-page validated tokens are exported.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**TypeScript structure alignment:** Initial implementation accessed token fields incorrectly (e.g., `crossPageToken.token.cluster.canonical` instead of `crossPageToken.token.canonical`). Fixed by understanding that CrossPageResult<ColorCluster> wraps ColorCluster directly, not NormalizedColorToken. All other token types followed standard CrossPageResult<T> pattern.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for 05-03 (multi-format exporters). All 5 JSON generators available for:
- Direct JSON file writing in export pipeline
- Source data for CSS/Tailwind/Figma format conversions
- Evidence tracing in component stub generation
- Markdown report generation with confidence levels

JSON exports provide machine-readable foundation for all downstream export formats.

## Self-Check: PASSED

All created files verified to exist on disk:
- ✓ src/export/formatters/json-layers.ts

All commits verified in git history:
- ✓ 3bbf5e0 (Task 1)
- ✓ 3ccd8ef (Task 2)

All exports verified in TypeScript compilation:
- ✓ generateTokensJSON
- ✓ generateComponentsJSON
- ✓ generatePatternsJSON
- ✓ generateContentStyleJSON
- ✓ generateEvidenceIndexJSON
- ✓ DualLayerExport type

---
*Phase: 05-export-reporting*
*Completed: 2026-02-16*
