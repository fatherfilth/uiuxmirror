---
phase: 01-foundation-crawling-infrastructure
plan: 05
subsystem: token-extraction
tags: [extractors, tokens, radius, shadow, z-index, motion, icons, imagery, evidence]

dependency-graph:
  requires:
    - 01-01 (types, evidence, shared utilities)
    - 01-04 (color, typography, spacing, custom-properties extractors)
  provides:
    - Complete token extraction suite (8 token types)
    - extractAllTokens convenience function
    - Barrel index for single-import access
  affects:
    - Phase 2 cross-page analysis will use all extractors
    - Component inference will leverage motion and visual tokens

tech-stack:
  added:
    - Shadow parsing with multi-layer support
    - Motion token extraction from transitions and @keyframes
    - Icon detection via SVG analysis and image heuristics
    - Imagery pattern detection with aspect ratio normalization
  patterns:
    - page.evaluate for browser-context extraction (icons, imagery)
    - TokenEvidence with timestamp and computedStyles for all tokens
    - Map-based deduplication with evidence merging
    - Promise.all for concurrent extractor execution

key-files:
  created:
    - src/extractors/radius-shadow-zindex-extractor.ts (extractRadii, extractShadows, extractZIndexes)
    - src/extractors/motion-extractor.ts (extractMotionTokens)
    - src/extractors/icon-extractor.ts (extractIconTokens)
    - src/extractors/imagery-extractor.ts (extractImageryTokens)
    - src/extractors/extract-all.ts (extractAllTokens convenience function)
    - src/extractors/index.ts (barrel export)
  modified:
    - src/types/tokens.ts (PageTokens interface: radius→radii, zIndex→zIndexes)

decisions:
  - Z-index stacking context uses simplified heuristic (selector depth ≤2 = global, >2 = local) for v1
  - Warning logged if >20 unique z-index values detected (indicates z-index management issue)
  - Icon detection uses dual heuristics (src pattern + size <64px) to identify icons vs content images
  - Imagery aspect ratios normalized to common formats (16:9, 4:3, 1:1, 3:2, etc.) with 5% tolerance
  - Icon font detection deferred to Phase 2 per research recommendation
  - extractAllTokens runs all extractors concurrently via Promise.all (no conflicts, all read-only)
  - PageTokens interface uses plural names (radii, zIndexes) for consistency with extractor function names

metrics:
  duration: 5.8 minutes
  tasks: 3
  files: 7
  commits: 3
  completed: 2026-02-15T10:14:27Z
---

# Phase 1 Plan 5: Remaining Token Extractors Summary

Complete token extraction suite with 4 additional extractors (radii/shadows/z-index, motion, icons, imagery), extractAllTokens convenience function, and barrel index for integration.

## What Was Built

Implemented the remaining 4 token extractors to complete the full 8-token suite specified in requirements TOKEN-05 through TOKEN-08:

**TOKEN-05 Extractors (radius-shadow-zindex-extractor.ts):**
- `extractRadii`: Parses border-radius (handles shorthand), uses max value as representative, returns sorted ascending
- `extractShadows`: Parses multi-layer box-shadow into structured ShadowLayer components (offsetX/Y, blur, spread, color, inset)
- `extractZIndexes`: Extracts z-index values with stacking context awareness (global vs local based on selector depth), warns if >20 unique values

**TOKEN-06 Extractor (motion-extractor.ts):**
- `extractMotionTokens`: Captures transition durations/easing, animation durations/easing/keyframes
- Scans stylesheets for @keyframes rules using CSSKeyframesRule detection
- Normalizes durations to milliseconds (handles "0.3s" and "300ms" formats)

**TOKEN-07 Extractor (icon-extractor.ts):**
- `extractIconTokens`: Analyzes inline SVGs for stroke vs fill style, stroke weight, size
- Detects icon images via dual heuristics (src pattern contains "icon", size ≤64px)
- Handles SVG viewBox dimensions for accurate size detection

**TOKEN-08 Extractor (imagery-extractor.ts):**
- `extractImageryTokens`: Detects aspect ratios, treatment styles (rounded/circular/rectangular/masked), object-fit
- Normalizes aspect ratios to common formats (16:9, 4:3, 1:1, 3:2) with 5% tolerance
- Analyzes both img elements and background-image on elements

**Integration (extract-all.ts + index.ts):**
- `extractAllTokens`: Runs all 10 extractors concurrently via Promise.all, returns PageTokens
- Barrel index exports all extractors from Plans 04 and 05 for single-import access

All extractors attach TokenEvidence with timestamp, selector, and computedStyles for traceability.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification steps passed:
- `npx tsc --noEmit` compiled with zero errors
- All extractors importable from src/extractors/index.ts
- extractAllTokens function typed correctly with PageTokens return type
- Type definitions match Plan 01 token types

## Key Technical Decisions

**Z-index stacking context (Rule 1 - simplification):** Research identified z-index without stacking context awareness as pitfall #7. Implemented simplified heuristic using selector depth (≤2 levels = global, >2 = local context). This catches major stacking context issues without full DOM tree analysis (deferred to Phase 2).

**Aspect ratio normalization:** Implemented common ratio matching with 5% tolerance to group visually equivalent imagery (16.1:9 → 16:9). Gracefully falls back to calculated ratio (width:height with GCD simplification) for non-standard ratios.

**Concurrent extraction:** extractAllTokens uses Promise.all for all 10 extractors. Safe because all extractors are read-only operations on the same page state - no conflicts.

## Integration Points

**Upstream dependencies:**
- Uses getAllVisibleElements, parseSizeToPixels from Plan 01 shared utilities
- Conforms to TokenEvidence structure from Plan 01 types
- Integrates with extractors from Plan 04 (color, typography, spacing, custom-properties)

**Downstream impact:**
- Phase 2 cross-page analysis will use extractAllTokens for comprehensive token collection
- Component inference (Phase 3) will leverage motion tokens for interaction patterns
- Icon/imagery tokens enable visual design system documentation

## Success Criteria Met

- [x] TOKEN-05: extractRadii, extractShadows, extractZIndexes return typed tokens with evidence
- [x] TOKEN-06: extractMotionTokens captures durations, easings, and keyframe names
- [x] TOKEN-07: extractIconTokens detects SVG stroke/fill style, stroke weight, and size
- [x] TOKEN-08: extractImageryTokens detects aspect ratios, treatments, and object-fit
- [x] All extractors handle errors gracefully (try-catch in page.evaluate contexts)
- [x] Barrel index provides single-import access to all extraction functions
- [x] extractAllTokens runs all extractors concurrently via Promise.all

## Self-Check: PASSED

All files created:
- FOUND: src/extractors/radius-shadow-zindex-extractor.ts
- FOUND: src/extractors/motion-extractor.ts
- FOUND: src/extractors/icon-extractor.ts
- FOUND: src/extractors/imagery-extractor.ts
- FOUND: src/extractors/extract-all.ts
- FOUND: src/extractors/index.ts

All commits exist:
- FOUND: 9a778ed (Task 1: radius/shadow/z-index extractors)
- FOUND: bf2749f (Task 2: motion/icon/imagery extractors)
- FOUND: 64221e1 (Task 3: extractAllTokens + barrel index)

All files modified as expected:
- FOUND: src/types/tokens.ts (PageTokens interface updated)
