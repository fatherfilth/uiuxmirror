---
phase: 02-normalization-component-mining
plan: 03
subsystem: normalization
tags: [dtcg, w3c, output-format, pipeline, zod-validation]

dependencies:
  requires:
    - src/normalization/color-normalizer.ts (deduplicateColors)
    - src/normalization/unit-normalizer.ts (normalizeTypographyValues, normalizeSpacingValues)
    - src/normalization/cross-page-validator.ts (validateCrossPage)
    - src/normalization/spacing-scale-detector.ts (detectSpacingScale)
    - src/scoring/token-scorer.ts (ConfidenceScore)
  provides:
    - W3C DTCG format output with confidence metadata
    - Complete normalization pipeline (raw tokens -> validated DTCG)
    - Schema validation for DTCG format
  affects:
    - Design system export (NORM-02)
    - Component detection (uses normalized tokens)

tech-stack:
  added:
    - w3c-design-tokens-standard-schema (package exists but incompatible)
    - zod (custom DTCG schema validation)
  patterns:
    - Hierarchical token organization (colors.*, typography.*, spacing.*)
    - Extension-based metadata ($extensions['com.uiux-mirror'])
    - Pipeline pattern (compose multiple transformations)
    - Semantic name generation (color-1, heading-1, spacing-xs)

key-files:
  created:
    - src/output/dtcg-formatter.ts
    - src/output/schema-validator.ts
    - src/output/index.ts
    - src/normalization/normalize-pipeline.ts
    - tests/output/dtcg-formatter.test.ts
  modified:
    - src/normalization/index.ts (added pipeline exports)
    - package.json (added w3c-design-tokens-standard-schema)

decisions:
  - key: "Use custom zod schema instead of w3c-design-tokens-standard-schema"
    rationale: "w3c package uses different schema format (Standard Schema spec) incompatible with our validation needs"
    alternatives: ["Force compatibility with Standard Schema (breaking changes)", "Skip validation (unsafe)"]

  - key: "Store confidence metadata in $extensions['com.uiux-mirror']"
    rationale: "W3C DTCG spec allows vendor extensions with reverse domain notation"
    alternatives: ["Separate metadata file (loses traceability)", "Custom $confidence property (not spec-compliant)"]

  - key: "Semantic naming based on size/frequency (heading-1, spacing-xs)"
    rationale: "More meaningful than generic numeric names, follows design system conventions"
    alternatives: ["Pure numeric (color-1, color-2)", "Hash-based names (less readable)"]

  - key: "Validate DTCG output but warn instead of fail"
    rationale: "Pipeline should be robust even if output has minor validation issues"
    alternatives: ["Throw on validation error (brittle)", "Skip validation (no quality check)"]

metrics:
  duration_minutes: 6
  completed_date: 2026-02-15
  tasks_completed: 2
  tests_added: 14
  lines_of_code: ~450

---

# Phase 02 Plan 03: DTCG Output & Normalization Pipeline Summary

**One-liner:** W3C DTCG format output with zod validation, full normalization pipeline chaining deduplication/unit-normalization/cross-page-validation/DTCG-formatting

## What Was Built

### DTCG Formatter (`src/output/dtcg-formatter.ts`)

Transforms normalized tokens into W3C Design Token Community Group format.

**Token Formatters:**
- `formatColorToken()` - Outputs `$type: 'color'` with hex `$value`
- `formatTypographyToken()` - Outputs `$type: 'typography'` with font properties
- `formatSpacingToken()` - Outputs `$type: 'dimension'` with spacing value
- `formatRadiusToken()` - Outputs `$type: 'dimension'` for border radii
- `formatShadowToken()` - Outputs `$type: 'shadow'` with layer arrays
- `formatMotionToken()` - Outputs `$type: 'duration'` or `'cubicBezier'`
- `formatAllTokens()` - Orchestrates all formatters, organizes into groups

**DTCG Structure:**
```typescript
{
  colors: {
    "color-1": { $type: "color", $value: "#3b82f6", ... },
    "color-2": { $type: "color", $value: "#000000", ... }
  },
  typography: {
    "heading-1": { $type: "typography", $value: { fontFamily, fontSize, ... }, ... }
  },
  spacing: {
    "spacing-xs": { $type: "dimension", $value: "4px", ... },
    "spacing-sm": { $type: "dimension", $value: "8px", ... }
  }
}
```

**Metadata Storage:**
All tokens include confidence metadata in `$extensions['com.uiux-mirror']`:
- `confidence`: 0-1 score
- `level`: 'low' | 'medium' | 'high'
- `occurrences`: Total usage count
- `variants`: Color variants in cluster (colors only)
- `evidenceCount`: Number of evidence items
- `normalizedValuePixels`: Pixel conversion (spacing/radii)
- `normalizedSizePixels`: Pixel conversion (typography)

**Semantic Naming:**
- Colors: `color-1`, `color-2`, ... (sorted by frequency)
- Typography: `heading-1`, `subheading-1`, `body-1`, ... (sorted by size descending)
- Spacing: `spacing-xs`, `spacing-sm`, `spacing-md`, ... (sorted by size ascending)
- Others: `radius-1`, `shadow-1`, `motion-1`, ... (numeric)

### Schema Validator (`src/output/schema-validator.ts`)

Validates DTCG output against W3C specification.

**Validation Rules:**
1. Every token node must have `$type` and `$value`
2. `$type` must be one of: color, dimension, typography, shadow, duration, cubicBezier, number, fontFamily, fontWeight, strokeStyle, border, transition, gradient
3. Group nodes (no `$type`) must only contain token nodes or other group nodes
4. Group nodes cannot have `$` properties (reserved for tokens)

**Implementation:**
- Uses zod for recursive schema validation
- Additional custom validation for W3C-specific rules
- Two functions: `validateDTCGOutput()` (main), `validateDTCGOutputSync()` (explicit sync)
- Returns `{ valid: boolean, errors: string[] }`

**w3c-design-tokens-standard-schema Package:**
- Package exists on npm (0.0.7)
- Uses Standard Schema spec (different from zod)
- Not directly compatible with our validation needs
- Decision: Use custom zod schema based on W3C spec (deviation documented)

### Normalization Pipeline (`src/normalization/normalize-pipeline.ts`)

End-to-end pipeline from raw `PageTokens` to validated DTCG output.

**Pipeline Steps:**
1. **Aggregate** - Merge all tokens across pages
2. **Deduplicate** - CIEDE2000 color clustering (color-normalizer)
3. **Normalize Units** - Convert rem/em/pt to px (unit-normalizer)
4. **Detect Scale** - Find spacing base unit and scale (spacing-scale-detector)
5. **Cross-Page Validate** - Filter tokens by page threshold (cross-page-validator)
6. **Confidence Scores** - Calculate confidence with density bonus (token-scorer via cross-page-validator)
7. **DTCG Format** - Transform to W3C format (dtcg-formatter)
8. **Validate** - Check DTCG output (schema-validator)
9. **Return** - Complete NormalizationResult

**Configuration Options:**
```typescript
interface NormalizationOptions {
  minPageThreshold?: number;      // Default: 3
  baseFontSize?: number;           // Default: 16
  colorDistanceThreshold?: number; // Default: 2.3
}
```

**Result Structure:**
```typescript
interface NormalizationResult {
  colors: { clusters, standards, all };
  typography: { normalized, standards, all };
  spacing: { normalized, scale, standards, all };
  radii: { standards, all };
  shadows: { standards, all };
  motion: { standards, all };
  dtcg: DTCGTokenFile;
  metadata: { totalPages, minPageThreshold, baseFontSize, timestamp };
}
```

Provides both:
- `standards` - Tokens meeting page threshold (for export)
- `all` - All tokens with confidence scores (for analysis)

## Tests

### DTCG Formatter Tests (14 tests)
- `formatColorToken()` - Correct `$type`, `$value`, `$description`, `$extensions`
- `formatTypographyToken()` - Font properties in `$value`, normalized size in extensions
- `formatSpacingToken()` - Dimension type, original value, normalized pixels in extensions
- `formatRadiusToken()` - Dimension type with radius values
- `formatShadowToken()` - Shadow type with layer objects, multi-layer array handling
- `formatMotionToken()` - Duration/cubicBezier types based on property
- `formatAllTokens()` - Hierarchical group structure, validates against schema
- Confidence metadata - Extensions include confidence score and level
- Schema validation - All generated DTCG output passes validation

**All 14 tests passing.**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Critical Functionality] w3c-design-tokens-standard-schema package incompatible**
- **Found during:** Task 1 implementation
- **Issue:** Plan suggested using `w3c-design-tokens-standard-schema` npm package. Package exists but uses Standard Schema spec format instead of zod/traditional validation. Not directly compatible with our validation needs.
- **Fix:** Implemented custom zod schema based on W3C DTCG specification. Maintains same validation rules but uses zod for type safety and compatibility with existing codebase.
- **Rationale:** Plan explicitly stated "Do NOT fail the plan if the npm package doesn't work -- fall back to custom validation."
- **Files affected:** `src/output/schema-validator.ts`
- **Verification:** All 14 tests pass, DTCG output validates correctly

**Note:** Package was installed (`npm install w3c-design-tokens-standard-schema`) but not used. Documented as dependency in package.json for potential future integration if Standard Schema becomes more widely adopted in our stack.

## Verification

All verification criteria met:

- ✅ TypeScript compilation: `npx tsc --noEmit` passes (0 errors)
- ✅ All tests passing: 46/46 tests pass (14 new + 32 existing Phase 2 tests)
- ✅ DTCG output validates: Custom zod schema validates against W3C spec
- ✅ Normalization pipeline chains all modules: Deduplication -> Units -> Cross-page -> DTCG
- ✅ Confidence metadata preserved: $extensions['com.uiux-mirror'] includes all tracking data
- ✅ Hierarchical organization: colors.*, typography.*, spacing.* groups
- ✅ Semantic naming: heading-1, spacing-xs patterns generated

## Integration Points

### Upstream Dependencies
- `src/normalization/color-normalizer.ts` - Color deduplication
- `src/normalization/unit-normalizer.ts` - Unit conversion
- `src/normalization/cross-page-validator.ts` - Page threshold filtering
- `src/normalization/spacing-scale-detector.ts` - Scale detection
- `src/scoring/token-scorer.ts` - Confidence calculation
- `src/types/tokens.ts` - PageTokens, ColorToken, etc.
- `src/types/normalized-tokens.ts` - ColorCluster, NormalizedTypographyToken, etc.

### Downstream Consumers
- **Design System Export** - Uses DTCG format as output
- **Component Detection** - Uses normalized tokens with confidence scores
- **Analysis Tools** - Uses NormalizationResult intermediate data
- **Quality Metrics** - Uses confidence levels for filtering

### Module Exports
- `src/output/index.ts` - All DTCG formatters, DTCGToken/DTCGTokenFile types, validators
- `src/normalization/index.ts` - Added normalizePipeline, NormalizationResult, NormalizationOptions

## Key Patterns Established

**1. Extension-based Metadata**
Store vendor-specific data in `$extensions['com.uiux-mirror']` following W3C reverse domain notation. Allows spec-compliant custom metadata.

**2. Pipeline Composition**
Chain multiple transformations into single callable function. Each step uses previous step's output. Intermediate data preserved for debugging/analysis.

**3. Standards vs All Pattern**
Return both filtered standards (meeting threshold) and all tokens (with confidence scores). Enables flexible filtering downstream.

**4. Semantic Name Generation**
Generate meaningful names based on token characteristics (size, frequency). More usable than pure numeric or hash-based names.

## Next Steps

1. **Plan 02-05**: Loading and error state detection for components (revised)
2. **Plan 02-06**: Integration tests for normalization pipeline (tests all modules together)
3. **Phase 3**: Component hierarchy inference and variant detection

## Self-Check

Verifying all claimed artifacts exist and tests pass:

- ✅ File exists: `src/output/dtcg-formatter.ts`
- ✅ File exists: `src/output/schema-validator.ts`
- ✅ File exists: `src/output/index.ts`
- ✅ File exists: `src/normalization/normalize-pipeline.ts`
- ✅ File exists: `tests/output/dtcg-formatter.test.ts`
- ✅ Modified file: `src/normalization/index.ts`
- ✅ Tests pass: 46/46 passing (14 new, 32 existing)
- ✅ TypeScript compiles: 0 errors
- ✅ Git commits: 46ff7d7 (Task 1), 2dbfd59 (Task 2)

## Self-Check: PASSED

All files exist, all tests pass, TypeScript compiles successfully, both commits present.

---
*Phase: 02-normalization-component-mining*
*Completed: 2026-02-15T12:02:46Z*
*Duration: 6 minutes*
