---
phase: 03-synthesis-inference-engine
plan: 04
subsystem: synthesis
tags: [state-generation, accessibility, wcag, aria, w3c-apg]
completed: 2026-02-16

dependencies:
  requires:
    - 03-01: "Synthesis type definitions (ComponentState, A11yBaseline)"
  provides:
    - state-generator: "All 7 interactive state generation with evidence tracing"
    - a11y-generator: "W3C ARIA APG-based accessibility baselines"
  affects:
    - synthesis-pipeline: "Will use these generators in component synthesis"

tech-stack:
  added:
    - W3C ARIA Authoring Practices Guide patterns
    - WCAG 2.1 Level AA focus indicator standards
  patterns:
    - Deterministic state generation with observed pattern fallback
    - CIEDE2000-based contrast ratio calculation for accessibility
    - Pattern database with graceful fallback for unknown types

key-files:
  created:
    - src/synthesis/state-generator.ts: "7-state generator with evidence links"
    - src/synthesis/a11y-generator.ts: "ARIA APG baseline generator"
  modified:
    - src/synthesis/index.ts: "Added state and a11y generator exports"

decisions:
  - id: "03-04-01"
    summary: "Use DTCG formatted tokens for semantic color lookup"
    rationale: "ColorCluster in NormalizationResult lacks semantic categories; DTCG tokens have semantic names like 'color-primary-1'"
    alternatives: ["Use ColorCluster.canonical directly", "Add category to ColorCluster"]
    impact: "State generator can intelligently select focus/error colors based on semantics"

  - id: "03-04-02"
    summary: "Inline ARIA pattern database instead of external file"
    rationale: "6 patterns totaling ~150 lines is manageable inline; avoids file I/O and parsing overhead"
    alternatives: ["JSON file", "YAML file", "Separate TypeScript module"]
    impact: "Faster initialization, simpler deployment, easier to maintain"

  - id: "03-04-03"
    summary: "Component type aliases for common naming variations"
    rationale: "Users may request 'table' instead of 'data-table', 'dialog' instead of 'modal'"
    alternatives: ["Strict type matching only", "Fuzzy string matching"]
    impact: "More flexible API, better user experience"

metrics:
  duration: 4
  tasks_completed: 2
  files_created: 2
  files_modified: 1
  commits: 2
---

# Phase 3 Plan 4: State & Accessibility Generator Summary

**One-liner:** 7-state generator with observed pattern fallback + W3C ARIA APG baseline generator for 6 component types

## What Was Built

Implemented comprehensive state generation and accessibility baseline generation for synthesized components:

**State Generator (`state-generator.ts`):**
- Generates all 7 interactive states (default, hover, active, focus, disabled, loading, error)
- Uses observed patterns from DesignDNA when available (hover/active states)
- Falls back to deterministic rules when no patterns observed
- WCAG 2.1 Level AA compliant focus state (2px outline, 3:1 contrast minimum)
- Evidence tracing for every state decision
- Helper functions for color brightness adjustment and contrast ratio calculation

**Accessibility Generator (`a11y-generator.ts`):**
- W3C ARIA APG pattern database covering 6 component types:
  - Button: Enter/Space activation, optional aria-pressed/aria-expanded
  - Input: Tab navigation, aria-label/aria-describedby support
  - Card: Article role, typically not focusable
  - Nav: Navigation role with Tab/Arrow key support
  - Modal: Dialog role with Escape close and focus trap
  - Data-table: Table role with Arrow key cell navigation
- Component type aliases for common variations (table→data-table, dialog→modal)
- WCAG-compliant focus ring generation with contrast validation
- Graceful fallback to generic baseline for unknown types (confidence 0.6, Level A)

## Tasks Completed

### Task 1: Implement state generator for all 7 interactive states

**Commit:** 620e828

**Files:**
- Created `src/synthesis/state-generator.ts`

**Implementation:**
- `generateAllStates()`: Returns array of 7 ComponentState objects
- `generateDefaultState()`: Confidence 1.0 (directly from tokenMap)
- `generateHoverState()`: Checks DesignDNA for observed patterns, falls back to 10% darken
- `generateActiveState()`: Similar to hover, 15% darken with scale(0.98)
- `generateFocusState()`: WCAG 2.1 AA compliant (2px outline, 3:1 contrast), confidence 0.95
- `generateDisabledState()`: Standard opacity 0.5 + aria-disabled, confidence 0.9
- `generateLoadingState()`: Skeleton structure with aria-busy for LLM refinement, confidence 0.5
- `generateErrorState()`: Looks up error color from DTCG tokens, fallback #DC2626, confidence 0.5-0.7
- Helper: `adjustColorBrightness()` for color manipulation
- Helper: `calculateContrastRatio()` for WCAG compliance validation

**Verification:**
- TypeScript compilation passes with 0 errors
- All 7 states generated with appropriate confidence scores
- Focus state meets WCAG 2.1 AA requirements
- Evidence links present for all states

### Task 2: Implement accessibility baseline generator

**Commit:** d921694

**Files:**
- Created `src/synthesis/a11y-generator.ts`
- Modified `src/synthesis/index.ts` (exports)

**Implementation:**
- `ARIA_APG_PATTERNS`: Inline database with 6 component patterns
- Each pattern includes: role, tabIndex, keyboard keys, required/optional ARIA attributes, focus management
- `generateA11yBaseline()`: Main function mapping component type to W3C APG guidance
- Component type aliases: table→data-table, dialog→modal, etc.
- `generateWCAGFocusRing()`: Creates CSS with primary color validation
- Fallback baseline for unknown types (role='region', Tab-focusable, confidence 0.6)

**Verification:**
- TypeScript compilation passes with 0 errors
- All 6 component types covered (button, input, card, nav, modal, data-table)
- Unknown types handled gracefully with generic baseline
- WCAG 2.1 Level AA focus ring generated

## Deviations from Plan

**None - plan executed exactly as written.**

All requirements met:
- State generator produces all 7 states
- Deterministic states use observed patterns when available
- Focus state meets WCAG 2.1 AA (2px outline, 3:1 contrast)
- Accessibility baseline covers 6+ component types
- Unknown component types get generic baseline (not crash)

## Integration Points

**Imports:**
- `ComponentState`, `A11yBaseline`, `EvidenceLink` from `../types/synthesis.js`
- `DesignDNA` for accessing DesignDNA.tokens.dtcg and DesignDNA.components

**Exports (via `src/synthesis/index.ts`):**
- `generateAllStates()`, `generateDefaultState()`, `generateHoverState()`, `generateFocusState()`, `generateDisabledState()`
- `adjustColorBrightness()`, `calculateContrastRatio()`
- `generateA11yBaseline()`

**Next Steps:**
- Plan 03-05: Structural rule engine will use state generator for complete component definitions
- Plan 03-06: Template compiler will integrate a11y baselines into synthesized components

## Technical Decisions

**Decision 1: Use DTCG formatted tokens for semantic color lookup**
- ColorCluster in NormalizationResult has `canonical` string but no `category`
- DTCG tokens have semantic naming (e.g., `color-primary-1`, `color-error`)
- Allows intelligent focus/error color selection based on semantics
- Alternative considered: Add category to ColorCluster (would require Phase 2 changes)

**Decision 2: Inline ARIA pattern database**
- 6 patterns totaling ~150 lines of code
- No external file I/O required
- Faster initialization, simpler deployment
- Alternative considered: External JSON/YAML file (added complexity)

**Decision 3: Component type aliases**
- Users may use 'table' instead of 'data-table', 'dialog' instead of 'modal'
- Alias map provides flexible matching
- Alternative considered: Strict matching only (poor UX)

## Verification Results

1. TypeScript compilation: **PASSED** (0 errors)
2. State generator produces 7 states: **PASSED**
3. Focus state WCAG 2.1 AA compliant: **PASSED** (2px outline, 3:1 contrast)
4. Disabled state has aria-disabled: **PASSED**
5. Loading state has aria-busy: **PASSED**
6. A11y generator covers 6 types: **PASSED** (button, input, card, nav, modal, data-table)
7. Unknown types get generic baseline: **PASSED** (confidence 0.6, Level A)

## Self-Check: PASSED

**Created files exist:**
- FOUND: src/synthesis/state-generator.ts
- FOUND: src/synthesis/a11y-generator.ts

**Modified files exist:**
- FOUND: src/synthesis/index.ts

**Commits exist:**
- FOUND: 620e828 (feat: implement state generator for all 7 interactive states)
- FOUND: d921694 (feat: implement W3C ARIA APG-based accessibility baseline generator)

**Key exports available:**
- `generateAllStates()` - Main state generation function
- `generateA11yBaseline()` - Main accessibility baseline function
- Helper functions for color manipulation and contrast calculation
