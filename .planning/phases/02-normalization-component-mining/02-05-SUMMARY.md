---
phase: 02-normalization-component-mining
plan: 05
subsystem: components
tags: [variant-detection, state-mapping, interactive-states, percentile-clustering]
dependencies:
  requires: [02-04-component-detection]
  provides: [variant-analyzer, state-mapper]
  affects: [component-mining, normalization]
tech_stack:
  added: []
  patterns: [percentile-based-clustering, opportunistic-detection, interaction-triggering]
key_files:
  created:
    - src/components/variant-analyzer.ts
    - src/components/state-mapper.ts
    - tests/components/variant-analyzer.test.ts
    - tests/components/state-mapper.test.ts
  modified:
    - src/types/components.ts
    - src/components/index.ts
decisions:
  - Size variants use percentile-based clustering (33rd/66th percentiles) to avoid fixed thresholds
  - Two-value distributions use median split (small/large), single values default to medium
  - Emphasis detection via background/border heuristics (primary=solid bg, secondary=border-only, ghost=text-only, tertiary=other)
  - Shape detection via borderRadius analysis (pill=50% or >height/2, rounded=>0, square=0)
  - Hover state captured via locator.hover() with 150ms transition wait
  - Focus state captured via locator.focus() with 100ms wait
  - Disabled state captured via temporary DOM attribute manipulation (button/input/select only)
  - Loading state detected opportunistically via aria-busy=true or loading/spinner classes
  - Error state detected opportunistically via aria-invalid=true, error/invalid classes, or red-ish border (R>180, G<80, B<80)
  - State mapping returns only properties that differ from default (null if no changes)
  - State capture limited to 20 components per type to avoid excessive interaction time
  - Try/catch wrappers ensure interaction failures never crash pipeline
metrics:
  duration_minutes: 4
  tasks_completed: 2
  files_created: 4
  files_modified: 2
  tests_added: 30
  completed_date: 2026-02-15
---

# Phase 02 Plan 05: Variant Detection & State Mapping Summary

**One-liner:** Percentile-based variant detection (size/emphasis/shape) and Playwright-driven interactive state mapping (hover/focus/disabled) with opportunistic loading/error state detection.

## Tasks Completed

### Task 1: Implement variant analyzer with percentile-based dimension detection
**Commit:** `e006607`

Created comprehensive variant analysis system:

**Type definitions added to `src/types/components.ts`:**
- `ComponentVariant`: size, emphasis, shape dimensions with evidence
- `VariantDimension`: distribution tracking (name, values, counts)
- `AnalyzedComponent`: extends DetectedComponent with variant data

**Implemented `src/components/variant-analyzer.ts`:**

**Size detection** (`detectSizeVariant`):
- Percentile-based clustering for 3+ distinct padding values
  - Calculate 33rd and 66th percentiles from sorted padding values
  - Bottom third = 'small', middle third = 'medium', top third = 'large'
- Simple binning for 2 distinct values (split at median: small/large)
- Single value defaults to 'medium'
- Records distribution counts for each size

**Emphasis detection** (`detectEmphasisVariant`):
- Primary: solid backgroundColor (not transparent)
- Secondary: transparent bg + visible border
- Ghost: transparent bg + no border (text-only)
- Tertiary: everything else

**Shape detection** (`detectShapeVariant`):
- Pill: borderRadius === '50%' OR borderRadius >= height/2
- Rounded: borderRadius > 0
- Square: borderRadius === 0

**Main function** (`analyzeVariants`):
- Groups components by type
- Analyzes each group independently
- Returns AnalyzedComponent[] with variant dimensions attached
- Each component gets size, emphasis, shape classification
- Distribution data shows counts across all instances

**Created `tests/components/variant-analyzer.test.ts` (13 tests):**
- Size detection with 3 padding values (4/8/16px) → small/medium/large
- Size detection with 2 values → median split to small/large
- Single component → defaults to medium
- Distribution count accuracy
- Primary emphasis from solid background
- Secondary emphasis from border-only
- Ghost emphasis from text-only
- Pill shape from 50% borderRadius
- Pill shape from radius > height/2
- Rounded shape from non-zero borderRadius
- Square shape from zero borderRadius
- Multi-type grouping (components analyzed separately by type)
- Empty input handling

### Task 2: Implement state mapper with Playwright interaction triggering
**Commit:** `46ff7d7` (committed early with 02-03 DTCG formatter)

Created interactive state mapping system:

**Type definitions:**
- `StateMapping`: default + optional hover/focus/active/disabled/loading/error states
- `StateDiff`: property/defaultValue/stateValue for change tracking

**Implemented `src/components/state-mapper.ts`:**

**Core function** (`mapComponentStates`):
1. **Default state:** Extract all tracked properties via page.evaluate()
   - Tracked properties: backgroundColor, color, borderColor, opacity, cursor, outline, outlineColor, outlineWidth, boxShadow, transform, textDecoration

2. **Hover state:**
   - `await page.locator(selector).hover()`
   - Wait 150ms for CSS transitions
   - Read tracked properties
   - Compare to default, include only if properties differ
   - Reset: mouse.move(0, 0)

3. **Focus state:**
   - `await page.locator(selector).focus()`
   - Wait 100ms for focus styles
   - Read tracked properties
   - Compare to default, include only if properties differ
   - Reset: blur via page.evaluate()

4. **Disabled state:**
   - Check element is button/input/select
   - Temporarily set `disabled=true` via page.evaluate()
   - Read tracked properties
   - Restore original disabled state
   - Compare to default, include only if properties differ

5. **Loading state (opportunistic):**
   - Detect via `detectLoadingState()`:
     - Check `aria-busy="true"` attribute
     - Check element or ancestor has class containing 'loading' or 'spinner' (up to 3 levels)
   - If detected: read styles, compare to default
   - If NOT detected: skip (no loading key in StateMapping)

6. **Error state (opportunistic):**
   - Detect via `detectErrorState()`:
     - Check `aria-invalid="true"` attribute
     - Check element has class containing 'error' or 'invalid'
     - Check borderColor is red-ish (R > 180 && G < 80 && B < 80)
   - If detected: read styles, compare to default
   - If NOT detected: skip (no error key in StateMapping)

7. **Resilience:**
   - Entire function wrapped in try/catch
   - Individual state captures wrapped in try/catch
   - Failures return default-only mapping (never crashes)

**Batch function** (`mapAllComponentStates`):
- Groups components by type
- Limits to first 20 per type (avoids excessive interaction time)
- Returns Map<selector, StateMapping>
- Logs progress per component type

**Created `tests/components/state-mapper.test.ts` (17 tests):**
- Identical styles → null diff
- backgroundColor change on hover → includes backgroundColor in diff
- outline change on focus → includes outline + outlineWidth in diff
- Multiple property changes → all included in diff
- Loading detection from aria-busy="true"
- Loading detection from 'loading' class
- Loading detection from 'spinner' class
- No loading indicators → not detected
- Error detection from aria-invalid="true"
- Error detection from 'error' class
- Error detection from 'invalid' class
- Error detection from red-ish border (rgb(220,38,38))
- Non-red border → not detected as error
- No error indicators → not detected
- StateMapping always includes default
- Hover included only if properties differ
- Hover NOT included if no properties differ

**Updated `src/components/index.ts`:**
- Export analyzeVariants from variant-analyzer
- Export mapComponentStates, mapAllComponentStates from state-mapper

## Verification Results

All verification criteria met:
- `npx tsc --noEmit`: PASSED (no errors in variant-analyzer or state-mapper)
- `npx vitest run tests/components/`: PASSED (57/57 tests)
- Size variants use percentile-based clustering (not fixed thresholds)
- Emphasis variants detected from background/border patterns
- Hover/focus/disabled states captured via Playwright interaction
- Loading/error states detected opportunistically
- States only recorded when properties differ from default
- State mapping is resilient (try/catch, never crashes)

## Deviations from Plan

### Auto-committed Files

**1. [State-mapper committed in 02-03 plan]**
- **Found during:** Task 2 commit attempt
- **Issue:** state-mapper.ts and tests were already committed in 46ff7d7 alongside DTCG formatter from plan 02-03
- **Impact:** Non-blocking - state-mapper functionality is complete and correct, all tests pass
- **Resolution:** Tracked commit 46ff7d7 for Task 2 instead of creating separate commit
- **Note:** Files appear to have been worked on across plans, but implementation matches Task 2 requirements exactly

This appears to be a case of files being committed in the wrong plan, but since the implementation is correct and complete, no changes needed.

## Success Criteria Validation

- [x] Size variants use percentile-based clustering (not fixed thresholds)
- [x] Emphasis variants detected from background/border/text styling patterns
- [x] Hover, focus, disabled states captured via Playwright interaction
- [x] Loading state detected opportunistically via aria-busy="true" or loading/spinner classes
- [x] Error state detected opportunistically via aria-invalid="true", error/invalid classes, or red-ish border color
- [x] States only recorded when at least one property differs from default
- [x] State mapping is resilient (try/catch, never crashes pipeline)

## Key Technical Decisions

1. **Percentile-based size clustering:** Avoids brittle fixed thresholds. Adapts to actual padding distribution in the design system. Uses 33rd/66th percentiles for 3-way split.

2. **Median split for two values:** Simple, deterministic binning when only two distinct padding values exist.

3. **Single-value default to medium:** When all components have same padding, classify as 'medium' rather than artificially creating size variants.

4. **Emphasis heuristic hierarchy:** Primary (solid bg) → Secondary (border-only) → Ghost (text-only) → Tertiary (other). Covers common button variant patterns.

5. **Shape from borderRadius:** Pill detection handles both percentage-based (50%) and pixel-based (>height/2) implementations.

6. **150ms hover wait, 100ms focus wait:** Allows CSS transitions to complete before capturing styles. Hover typically has longer transitions.

7. **Temporary disabled attribute:** Cleanly captures disabled styles without affecting page state permanently. Only applies to interactive elements (button/input/select).

8. **Opportunistic loading/error detection:** Captures these states when present, but doesn't fail if absent. Many components won't have these states in crawled pages.

9. **Diff-only state mapping:** Dramatically reduces data size. Only stores changed properties, making state differences explicit.

10. **20-component-per-type limit:** Balances comprehensive state coverage with execution time. Prevents spending minutes on interaction for large component sets.

11. **Multi-level try/catch:** Outer catch prevents total failure, inner catches allow graceful degradation (skip hover if it fails, still capture focus).

12. **Mouse/focus reset:** Ensures clean state between interactions. Prevents cascading state issues.

## Integration Points

**Consumes from Phase 2:**
- DetectedComponent from component-detector (02-04)
- Playwright Page instances for interaction
- TokenEvidence for variant evidence tracking

**Provides for Phase 2:**
- AnalyzedComponent with variant dimensions
- StateMapping for interactive state capture
- Foundation for component mining and normalization

**Design decisions:**
- Percentile-based clustering adaptable to any design system
- Opportunistic detection pattern reusable for other states
- Diff-only storage efficient for large component sets

## Self-Check: PASSED

**Created files verification:**
```bash
FOUND: src/components/variant-analyzer.ts
FOUND: src/components/state-mapper.ts
FOUND: tests/components/variant-analyzer.test.ts
FOUND: tests/components/state-mapper.test.ts
```

**Modified files verification:**
```bash
FOUND: src/types/components.ts (ComponentVariant, VariantDimension, AnalyzedComponent added)
FOUND: src/components/index.ts (exports added)
```

**Commits verification:**
```bash
FOUND: e006607 (Task 1 - variant analyzer)
FOUND: 46ff7d7 (Task 2 - state mapper, committed with 02-03)
```

All claimed files exist and all commits are present in repository.
