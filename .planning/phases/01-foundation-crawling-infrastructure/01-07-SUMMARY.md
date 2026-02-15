---
phase: 01-foundation-crawling-infrastructure
plan: 07
subsystem: testing
tags: [vitest, playwright, integration-tests, unit-tests, pipeline-validation]

# Dependency graph
requires:
  - phase: 01-02
    provides: "Playwright crawler with page.evaluate() capabilities"
  - phase: 01-03
    provides: "EvidenceStore and ScreenshotManager"
  - phase: 01-04
    provides: "Color, typography, spacing, custom properties extractors"
  - phase: 01-05
    provides: "Radii, shadows, z-index, motion, icons, imagery extractors"
  - phase: 01-06
    provides: "Full pipeline orchestrator and token storage"
provides:
  - "Vitest test suite with 27 passing tests validating all extractors and pipeline"
  - "Unit tests for all 8 token extractors against fixture HTML"
  - "Integration tests for end-to-end pipeline execution"
  - "Human-verified token quality against real website (cooked.com)"
affects: [02-cross-page-analysis, 03-component-inference]

# Tech tracking
tech-stack:
  added: [vitest]
  patterns:
    - "Fixture-based unit testing with known design tokens"
    - "Playwright browser context testing for extractors"
    - "Integration testing with temporary output directories"
    - "Real-world validation against production websites"

key-files:
  created:
    - vitest.config.ts
    - tests/fixtures/sample-page.html
    - tests/unit/extractors.test.ts
    - tests/integration/pipeline.test.ts
  modified:
    - src/extractors/icon-extractor.ts
    - src/extractors/imagery-extractor.ts
    - src/extractors/motion-extractor.ts
    - src/extractors/radius-shadow-zindex-extractor.ts
    - src/extractors/shared/style-utils.ts

key-decisions:
  - "Vitest chosen for test framework (fast, ESM-native, Playwright-compatible)"
  - "Fixture HTML with known values for predictable extractor testing"
  - "Integration tests use example.com for stable baseline"
  - "String-based page.evaluate() to avoid esbuild __name decorator injection"
  - "Try/catch guards added to all extractors for robustness"

patterns-established:
  - "Test structure: beforeAll browser setup, afterAll cleanup, isolated tests"
  - "Evidence validation: Check selector, computedStyles, and pageUrl presence"
  - "Integration test cleanup: Remove temporary .uidna-test directories"
  - "Browser-context code isolation: Inline strings or string templates for page.evaluate()"

# Metrics
duration: 16min
completed: 2026-02-15
---

# Phase 01 Plan 07: Integration Tests & Pipeline Validation Summary

**Complete test suite with 27 passing tests validates all 8 extractors and end-to-end pipeline; esbuild __name bug fixed enabling real token extraction from production sites**

## Performance

- **Duration:** 16 min
- **Started:** 2026-02-15T10:33:33Z
- **Completed:** 2026-02-15T10:49:33Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Vitest test suite with 24 unit tests validating all 8 token extractors against fixture HTML with known design tokens
- 3 integration tests confirming end-to-end pipeline (crawl → extract → store → diff) works correctly
- Fixed critical esbuild `__name is not defined` bug by converting browser-context code to string-based evaluation
- Human verification confirmed pipeline extracts real data from cooked.com: 26 colors, 8 typography, 27 spacing, 10 custom properties, 6 border radii, 18 z-index, 60 motion, 28 icons, 7 imagery tokens
- All 27 tests passing, demonstrating Phase 1 foundation is complete and ready for Phase 2

## Task Commits

Each task was committed atomically:

1. **Task 1: Write unit and integration tests** - `6a0f9b2` (test)
2. **Bug fix: Resolve esbuild __name decorator leak** - `f4ca4b5` (fix) *(auto-fixed via deviation rules during checkpoint)*
3. **Task 2: Human verification** - *APPROVED by user*

## Files Created/Modified

- `vitest.config.ts` - Test configuration with 60s timeout for Playwright tests
- `tests/fixtures/sample-page.html` - Static HTML with known design tokens (colors, typography, spacing, custom properties, radii, shadows, transitions, SVG icons, images)
- `tests/unit/extractors.test.ts` - 24 unit tests validating all 8 extractors produce typed tokens with evidence
- `tests/integration/pipeline.test.ts` - 3 integration tests for full pipeline against example.com
- `src/extractors/shared/style-utils.ts` - Converted to string-based page.evaluate() to fix esbuild bug
- `src/extractors/icon-extractor.ts` - Converted browser context code to inline strings, added try/catch
- `src/extractors/imagery-extractor.ts` - Converted browser context code to inline strings, added try/catch
- `src/extractors/motion-extractor.ts` - Added try/catch guard
- `src/extractors/radius-shadow-zindex-extractor.ts` - Added try/catch guard

## Decisions Made

1. **Vitest for test framework:** Chosen for ESM-native support, fast execution, and excellent Playwright integration without additional adapters
2. **Fixture-based testing:** Created sample-page.html with known design tokens for predictable, repeatable unit tests
3. **Example.com for integration:** Used as stable baseline for integration tests (simple, reliable, publicly accessible)
4. **String-based page.evaluate():** Fixed esbuild `__name` decorator bug by inlining browser-context code as string templates instead of function references
5. **Defensive error handling:** Added try/catch to all extractors to handle edge cases gracefully without breaking pipeline

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed esbuild __name decorator injection breaking page.evaluate()**
- **Found during:** Task 2 (Human verification checkpoint - user reported extractors producing 0 tokens)
- **Issue:** Browser-side code in page.evaluate() callbacks was broken by esbuild/tsx injecting `__name()` decorators for function naming. Browser context doesn't have this decorator, causing "ReferenceError: __name is not defined". Affected style-utils.ts, icon-extractor.ts, and imagery-extractor.ts
- **Fix:** Converted browser-context utility functions to string-based evaluation using template literals. Refactored `getAllVisibleElements` and other shared utilities from imported functions to inline string code. Added try/catch guards to all extractors for defensive error handling
- **Files modified:** src/extractors/shared/style-utils.ts, src/extractors/icon-extractor.ts, src/extractors/imagery-extractor.ts, src/extractors/motion-extractor.ts, src/extractors/radius-shadow-zindex-extractor.ts
- **Verification:** Pipeline tested against cooked.com - all 8 token extractors now producing real data (101 evidence entries total)
- **Committed in:** f4ca4b5

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Critical bug fix required for extractors to work. Without this fix, Phase 1 would be non-functional. Auto-fix was necessary for correctness.

## Issues Encountered

**Esbuild decorator injection:** During checkpoint verification, user reported extractors were failing with "ReferenceError: __name is not defined". Investigation revealed esbuild/tsx was injecting `__name()` decorators into browser-context code for stack trace clarity. This is a known issue when transpiling code that runs in Playwright's page.evaluate() context. Resolution required architectural pattern change from imported functions to inline string-based evaluation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 1 (Foundation & Crawling Infrastructure) is now **COMPLETE** and ready for Phase 2:

- ✅ Crawler respects robots.txt and rate limits (20-100 pages)
- ✅ Dynamic content handling (CSS-in-JS, framework detection)
- ✅ All 8 token extractors producing typed output with evidence
- ✅ Evidence traceability (pageUrl, selector, timestamp, screenshot crops)
- ✅ Re-crawl diff detection working
- ✅ CLI entry point operational (`npx tsx src/cli.ts <url>`)
- ✅ Test suite validates correctness (27 tests passing)
- ✅ Human verification confirms real data extraction quality

**Ready for Phase 2: Cross-Page Analysis & Token Normalization**

Phase 2 can now leverage:
- Persistent token storage from TokenStore
- Evidence index for token provenance
- Test infrastructure for regression prevention
- Proven extraction quality from real-world sites

---
*Phase: 01-foundation-crawling-infrastructure*
*Completed: 2026-02-15*

## Self-Check: PASSED

**Files verified:**
- ✓ vitest.config.ts
- ✓ tests/fixtures/sample-page.html
- ✓ tests/unit/extractors.test.ts
- ✓ tests/integration/pipeline.test.ts

**Commits verified:**
- ✓ 6a0f9b2 (Task 1: Unit and integration tests)
- ✓ f4ca4b5 (Bug fix: esbuild __name decorator)

**Tests verified:**
- ✓ 27 tests passing (24 unit + 3 integration)
- ✓ All extractors producing valid tokens
- ✓ Evidence has required fields (selector, computedStyles, pageUrl)
- ✓ Pipeline creates expected output structure
