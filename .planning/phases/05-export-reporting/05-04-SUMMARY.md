---
phase: 05-export-reporting
plan: 04
subsystem: export-stubs
status: complete
completed: 2026-02-16T04:06:11Z
duration: 2.6 minutes
tags:
  - export
  - component-stubs
  - css-vars
  - html-generation
dependency_graph:
  requires:
    - 05-03 (CSS vars formatter for token name mapping)
    - 05-01 (Semantic namer for token names)
    - 02-06 (Component aggregator for canonical component data)
  provides:
    - Component stub generator (generateComponentStub)
    - Batch stub generator (generateAllStubs)
    - TokenNameMap builder for CSS var references
  affects:
    - Export pipeline (adds stub generation capability)
    - Developer workflow (copy-paste component starters)
tech_stack:
  added:
    - Component stub generation logic
    - CSS custom property mapping algorithm
    - Semantic HTML element selection
  patterns:
    - Single-file HTML stubs with embedded style blocks
    - CSS var() references instead of hard-coded values
    - BEM-style modifier classes for variants
    - Semantic HTML5 elements per component type
key_files:
  created:
    - src/export/stubs/stub-generator.ts (554 lines)
    - src/export/stubs/index.ts (barrel export)
  modified:
    - src/export/index.ts (added stubs re-export)
key_decisions:
  - decision: Generate HTML/CSS directly instead of reusing Handlebars synthesis templates
    rationale: Synthesis templates have complex context requirements and are designed for AI pipeline; stubs need simpler structure with CSS vars
    impact: Cleaner stub generation code, more maintainable
  - decision: Map styles to tokens with 2px tolerance for numeric values
    rationale: Small differences in computed styles shouldn't break token matching (browser rounding, inheritance)
    impact: Better token coverage in generated stubs
  - decision: Fallback to raw values with "Not tokenized" comment when no token match
    rationale: Ensures stubs always work even for properties without matching tokens
    impact: Stubs are always functional, comment guides future token improvements
  - decision: Use BEM-style modifier classes (e.g., button--secondary)
    rationale: Industry-standard CSS naming pattern, widely understood
    impact: Developer-friendly class names in generated stubs
metrics:
  tasks_completed: 2
  files_created: 2
  files_modified: 1
  typescript_errors: 0
  test_coverage: n/a (export utilities, tested in integration)
---

# Phase 05 Plan 04: Component Stub Generator Summary

**One-liner:** Framework-agnostic HTML component stubs with embedded CSS custom property references for copy-paste workflow

## Overview

Implemented component stub generation system that produces single-file HTML documents with embedded `<style>` blocks. Each stub uses CSS custom properties (`var()`) instead of hard-coded values, creating copy-paste ready starter code that connects to the design token system.

**Purpose:** Per user decision, stubs are NOT full frameworks or component libraries — they're working starter files developers can drop into a project and build on. Think of them as "here's what a button looks like in your design system, using your tokens."

## What Was Built

### Core Generator (`stub-generator.ts`)

**1. Token Name Mapping:**
- `buildTokenNameMap()` creates index->name mappings from NormalizationResult
- Matches sorting logic from CSS vars formatter for consistency
- Maps colors (by occurrence), typography (by size), spacing/radii (by value)

**2. Style to CSS Var Mapping:**
- `mapStyleToVar()` finds nearest matching token for canonical component styles
- Color matching: exact hex comparison (canonical + variants)
- Size matching: 2px tolerance for fontSize, spacing, borderRadius
- Font matching: family and weight comparison
- Returns `var(--token-name)` or null (fallback to raw value)

**3. Component-Specific HTML Generation:**
- `button` → `<button>` with primary/secondary/ghost variants
- `input` → `<input>` with label and placeholder
- `card` → `<div>` with BEM child structure (image, content, title, body, actions)
- `nav` → `<nav>` with semantic `<ul><li><a>` structure
- `modal` → `<dialog>` with header/body/footer sections

**4. State Styles:**
- Always includes `:hover`, `:focus`, `:active`, `:disabled` pseudo-classes
- Uses actual observed state styles from StateMapping when available
- Fallback to standard a11y states (focus outline, disabled opacity 0.5)
- Focus uses primary color outline with 2px offset for keyboard accessibility

**5. Variant Modifiers:**
- Size variants: `--small`, `--medium`, `--large` (based on detected variants)
- Emphasis variants: `--secondary`, `--tertiary`, `--ghost`
- BEM-style naming for readability

**6. HTML Document Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="tokens.css">
  <style>/* Component styles with var() refs */</style>
</head>
<body>
  <h1>Component Name</h1>
  <!-- Component markup with variants and states -->
</body>
</html>
```

### Export Integration

- Created `src/export/stubs/index.ts` barrel export
- Updated `src/export/index.ts` to re-export `generateComponentStub`, `generateAllStubs`, `TokenNameMap`
- Functions now accessible from main export API

## Deviations from Plan

### Auto-fixed Issues

**None** - Plan executed exactly as written.

## Success Criteria Met

- [x] Each component type produces complete HTML5 document with embedded style
- [x] Styles map canonical values to closest CSS custom property via `var()`
- [x] All stubs include standard accessibility states (focus with outline, disabled with opacity)
- [x] Card stub has child structure (image, heading, body, actions)
- [x] Modal stub uses `<dialog>` element
- [x] Nav stub uses `nav/ul/li/a` semantic structure
- [x] Stubs are genuinely copy-paste ready (valid HTML, linked to tokens.css)
- [x] `npx tsc --noEmit --skipLibCheck` passes (0 errors)
- [x] `generateComponentStub` and `generateAllStubs` compile with correct types

## Technical Details

### Token Matching Algorithm

**Color matching:**
```typescript
// Exact hex comparison (case-insensitive)
cluster.canonical.toLowerCase() === normalizedValue
// Also checks all variants for match
```

**Numeric matching (spacing, typography, radii):**
```typescript
const diff = Math.abs(tokenValue - componentValue);
if (diff <= 2) { // 2px tolerance
  return `var(--${name})`;
}
```

**Why 2px tolerance:** Browser computed styles can differ slightly from authored styles due to rounding, inheritance, or zoom levels. 2px is small enough to ensure visual consistency but large enough to handle browser quirks.

### HTML Element Selection

| Component | Element | Rationale |
|-----------|---------|-----------|
| button | `<button>` | Semantic, keyboard accessible by default |
| input | `<input>` | Standard form element |
| card | `<div>` | Generic container with BEM structure |
| nav | `<nav>` | Semantic landmark for navigation |
| modal | `<dialog>` | HTML5 native modal with backdrop support |

### CSS Var Naming Examples

From canonical component style `backgroundColor: #3b82f6`:
1. Find matching color cluster with canonical `#3b82f6`
2. Look up semantic name from TokenNameMap (e.g., "primary")
3. Generate CSS var reference: `var(--primary)`

From canonical component style `fontSize: 16px`:
1. Find closest typography token (within 2px): `16.5px` matches
2. Look up semantic name: "body-1"
3. Generate CSS var reference: `var(--body-1-size)`

## Impact

**For developers:**
- Copy-paste ready component starters
- Automatic connection to design token system
- All states and variants included in one file
- Works immediately when paired with tokens.css export

**For design system:**
- Components reference tokens, not hard-coded values
- Easy to see which tokens a component uses
- Stubs serve as documentation of component patterns

**For workflow:**
- No build tools required for stubs (plain HTML/CSS)
- Can be used in any framework or vanilla JS project
- Clear separation between "starter" (stub) and "production" (synthesis)

## Testing

**Verification completed:**
- TypeScript compilation: 0 errors
- generateComponentStub signature verified with AggregatedComponent input
- generateAllStubs returns Map<ComponentType, string>
- All imports resolve correctly through barrel exports
- Integration with semantic-namer functions confirmed

## Next Steps

Referenced in plan 05-05 (Brand DNA markdown report) which will document the stub generation process and provide usage examples.

---

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1: Create stub generator | 842fc42 | src/export/stubs/stub-generator.ts |
| 2: Integrate into export | d1d468a | src/export/stubs/index.ts, src/export/index.ts |

## Self-Check: PASSED

**Created files verified:**
```bash
✓ src/export/stubs/stub-generator.ts exists (554 lines)
✓ src/export/stubs/index.ts exists
✓ src/export/index.ts modified
```

**Commits verified:**
```bash
✓ 842fc42 exists: feat(05-04): create component stub generator
✓ d1d468a exists: feat(05-04): integrate stubs into export barrel
```

**Functionality verified:**
- TypeScript compilation: 0 errors
- All exports accessible from src/export/index.ts
- Token name mapping builds correctly
- Style to var mapping implements tolerance logic
- HTML generation uses semantic elements
