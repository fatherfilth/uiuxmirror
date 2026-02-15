---
phase: 02-normalization-component-mining
plan: 02
subsystem: normalization
tags: [cross-page-validation, confidence-scoring, spacing-scale, tdd]

dependencies:
  requires:
    - src/types/tokens.ts (TokenEvidence interface)
    - src/types/evidence.ts (TokenEvidence, EvidenceEntry)
  provides:
    - Cross-page validation (3+ page threshold)
    - Confidence scoring (0-1 with density bonus)
    - GCD-based spacing scale detection
  affects:
    - Token normalization pipeline (NORM-04, NORM-05)
    - Component detection (uses confidence scores)

tech-stack:
  added:
    - GCD algorithm for base unit detection
  patterns:
    - Generic type constraints for token validation
    - Set-based unique page counting
    - Density bonus capping pattern

key-files:
  created:
    - src/normalization/cross-page-validator.ts
    - src/normalization/spacing-scale-detector.ts
    - src/scoring/token-scorer.ts
    - src/scoring/index.ts
    - tests/normalization/cross-page-validator.test.ts
    - tests/scoring/token-scorer.test.ts
  modified:
    - src/normalization/index.ts (added exports)

decisions:
  - key: "Cross-page threshold at 3 pages"
    rationale: "Balances noise filtering with design system discovery"
    alternatives: ["2 pages (too noisy)", "4+ pages (too strict)"]

  - key: "Density bonus formula: (avgOccurrences - 1) / 5, capped at +0.2"
    rationale: "Rewards tokens appearing multiple times per page without overwhelming page frequency"
    alternatives: ["Linear scaling (unbounded)", "Logarithmic scaling (too complex)"]

  - key: "Confidence levels: low <0.3, medium 0.3-0.6, high >0.6"
    rationale: "Three clear tiers for filtering and prioritization"
    alternatives: ["Five tiers (too granular)", "Binary (insufficient nuance)"]

  - key: "Spacing scale: try common bases [4,8,6,10] before falling back to GCD"
    rationale: "Prefers design-meaningful scales over pure mathematical GCD"
    alternatives: ["Pure GCD (finds base 2 too often)", "Fixed base 4 (misses 8px systems)"]

  - key: "baseUnit=1 reports coverage=0 to signal no meaningful scale"
    rationale: "Distinguishes 'mathematically correct' from 'design-meaningful'"
    alternatives: ["Report 100% coverage (misleading)", "Return null (breaks type safety)"]

metrics:
  duration_minutes: 8.8
  completed_date: 2026-02-15
  tasks_completed: 2
  tests_added: 21
  lines_of_code: ~350

---

# Phase 02 Plan 02: Cross-Page Validation & Confidence Scoring Summary

**One-liner:** GCD-based spacing scale detection, 3+ page validation threshold, and 0-1 confidence scoring with density bonus

## What Was Built

### Cross-Page Validator (`src/normalization/cross-page-validator.ts`)
- Validates tokens across pages with configurable threshold (default: 3)
- Extracts unique page URLs from evidence arrays
- Calculates raw confidence as `pageCount / totalPages`
- Marks tokens as standards if meeting threshold
- Returns ALL tokens with `isStandard` flag (no filtering)
- Sorts results by confidence descending

**Key Interface:**
```typescript
interface CrossPageResult<T> {
  token: T;
  pageUrls: Set<string>;
  occurrenceCount: number;
  confidence: number;
  isStandard: boolean;
}
```

### Spacing Scale Detector (`src/normalization/spacing-scale-detector.ts`)
- Implements Euclidean GCD algorithm for base unit detection
- Tries common design bases [4, 8, 6, 10] before falling back to GCD
- Generates scale array (unique multiples of base unit)
- Calculates coverage (% of values that are exact multiples)
- Special case: baseUnit=1 returns coverage=0 to signal "no meaningful scale"

**Algorithm:**
1. Round values to integers, filter positives
2. Calculate GCD of all values
3. Test common bases for better coverage
4. Prefer higher base if coverage is equal (design-meaningful)
5. Generate scale from unique value multiples
6. Report coverage metric

### Token Scorer (`src/scoring/token-scorer.ts`)
- Calculates 0-1 confidence score based on page frequency
- Applies density bonus for tokens appearing multiple times per page
- Density formula: `min((avgOccurrencesPerPage - 1) / 5, 0.2)`
- Only applies bonus if avgOccurrences > 1 (prevents bonus for single occurrences)
- Categorizes into levels: low (<0.3), medium (0.3-0.6), high (>0.6)
- Special handling: tokens below minPageThreshold always get 'low' level
- Generates reasoning string with page count and occurrences

**Confidence Formula:**
```
rawConfidence = pageCount / totalPages
densityBonus = avgOccurrences > 1 ? min((avgOccurrences - 1) / 5, 0.2) : 0
finalConfidence = min(rawConfidence + densityBonus, 1.0)
```

## Tests

### Cross-Page Validator Tests (12 tests)
- Token validation at various page thresholds (2, 3, 5 pages)
- Empty token list handling
- Results sorting by confidence
- Below-threshold tokens returned with isStandard=false
- Occurrence count tracking

### Spacing Scale Tests (5 tests within cross-page-validator.test.ts)
- Base unit detection for clean scales ([4,8,12,16,24,32] → base 4)
- GCD fallback for mixed values ([4,8,10,12] → base 2)
- No clear scale detection ([7,13,23,41] → base 1, coverage 0)
- Empty array handling
- Coverage calculation accuracy

### Token Scorer Tests (9 tests)
- Confidence scores at various page frequencies (1/20, 10/20, 20/20)
- Confidence level categorization (low/medium/high)
- Density bonus application (50 occurrences on 5 pages)
- Density bonus capping at +0.2
- Page count below threshold always returns 'low' level
- Reasoning string format

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test expectations for spacing scale coverage**
- **Found during:** Task 1 (RED phase) verification
- **Issue:** Test expected coverage=0.75 for baseUnit=2 with values [4,8,10,12], but all values are divisible by 2 (coverage should be 1.0)
- **Fix:** Updated test expectations to match mathematical reality
  - `[4,8,10,12]` with base 2 → coverage 1.0 (was: 0.75)
  - `[7,13,23,41]` with base 1 → coverage 0 (was: <1.0)
- **Files modified:** `tests/normalization/cross-page-validator.test.ts`
- **Commit:** Included in GREEN phase commit

**2. [Rule 1 - Bug] Fixed density bonus formula to prevent bonus for single occurrences**
- **Found during:** Task 2 (GREEN phase) test execution
- **Issue:** Test expected minimal density bonus for 1 occurrence per page, but formula was applying full bonus
- **Fix:** Changed formula from `avgOccurrences / 5` to `(avgOccurrences - 1) / 5` with guard `avgOccurrences > 1`
- **Rationale:** Density bonus should only apply when tokens appear MULTIPLE times on same page (stronger pattern signal)
- **Files modified:** `src/scoring/token-scorer.ts`
- **Commit:** Included in GREEN phase commit

**3. [Rule 1 - Bug] Fixed floating point precision in test assertion**
- **Found during:** Task 2 test execution
- **Issue:** Test failed with "expected 0.30000000000000004 to be less than or equal to 0.3"
- **Fix:** Changed `toBeLessThanOrEqual(0.3)` to `toBeCloseTo(0.3, 2)` for floating point tolerance
- **Files modified:** `tests/scoring/token-scorer.test.ts`
- **Commit:** Included in GREEN phase commit

**4. [Rule 1 - Bug] Added baseUnit=1 special case for coverage reporting**
- **Found during:** Task 2 implementation
- **Issue:** When no meaningful scale exists (baseUnit=1), coverage was 100% (misleading - every int divides by 1)
- **Fix:** Return coverage=0 when baseUnit=1 to signal "no design scale detected"
- **Rationale:** Distinguishes "mathematically correct" from "design-meaningful"
- **Files modified:** `src/normalization/spacing-scale-detector.ts`
- **Commit:** Included in GREEN phase commit

## Verification

All verification criteria met:

- ✅ TypeScript compilation: `npx tsc --noEmit` passes
- ✅ All tests passing: 21/21 tests pass
- ✅ Cross-page validation: 3+ page threshold correctly enforced
- ✅ Confidence scores: Range 0-1, correct levels, density bonus applied
- ✅ Spacing scale detection: GCD-based with common base heuristics, correct coverage calculation

## Integration Points

### Upstream Dependencies
- `src/types/tokens.ts`: ColorToken, TypographyToken, SpacingToken interfaces
- `src/types/evidence.ts`: TokenEvidence interface with pageUrl field

### Downstream Consumers
- **NORM-04 pipeline**: Uses `validateCrossPage` to filter noise before normalizing
- **NORM-05 pipeline**: Uses `calculateTokenConfidence` for prioritization
- **Component detection**: Uses confidence scores to weight pattern matching
- **Design system export**: Only exports tokens with `isStandard=true`

### Module Exports
- `src/normalization/index.ts`: Exports `validateCrossPage`, `CrossPageResult`, `detectSpacingScale`, `SpacingScale`
- `src/scoring/index.ts`: Exports `calculateTokenConfidence`, `ConfidenceScore`

## Next Steps

1. **Plan 02-03**: Implement fuzzy matching for token deduplication (uses confidence scores)
2. **Plan 02-05**: Color palette clustering (uses cross-page validation)
3. **Plan 02-06**: Integration tests for normalization pipeline (tests all modules together)

## Self-Check

Verifying all claimed artifacts exist and tests pass:

- ✅ File exists: `src/normalization/cross-page-validator.ts`
- ✅ File exists: `src/normalization/spacing-scale-detector.ts`
- ✅ File exists: `src/scoring/token-scorer.ts`
- ✅ File exists: `src/scoring/index.ts`
- ✅ File exists: `tests/normalization/cross-page-validator.test.ts`
- ✅ File exists: `tests/scoring/token-scorer.test.ts`
- ✅ Tests pass: 21/21 passing
- ✅ TypeScript compiles: No errors

## Self-Check: PASSED

All files exist, all tests pass, TypeScript compiles successfully.
