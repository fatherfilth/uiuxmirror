---
phase: 05-export-reporting
plan: 03
subsystem: export-formatters
tags: [css-variables, tailwind-config, figma-tokens, w3c-dtcg, semantic-naming]

dependency_graph:
  requires:
    - 05-01 (semantic naming and evidence linking utilities)
  provides:
    - CSS custom properties generator
    - Tailwind v3 config generator
    - Figma tokens plugin format generator
  affects:
    - Export layer (adds three format generators)

tech_stack:
  added:
    - CSS custom properties format
    - Tailwind v3 JavaScript config format
    - Figma tokens W3C DTCG format
  patterns:
    - Shared semantic naming across all formats
    - Evidence-based descriptions with page/element counts
    - Type prefix stripping for framework-native naming

key_files:
  created:
    - src/export/formatters/css-vars.ts
    - src/export/formatters/tailwind.ts
    - src/export/formatters/figma-tokens.ts
    - src/export/formatters/index.ts
  modified:
    - src/export/index.ts (added formatters barrel export)
    - src/export/formatters/json-layers.ts (bug fix)

decisions:
  - CSS vars use separate properties for typography (family, size, weight, line-height) instead of shorthand
  - Shadow values reconstructed as CSS shorthand from ShadowLayer properties with multi-layer comma separation
  - Tailwind format strips type prefixes for native naming (colors.primary not colors.color-primary)
  - Figma tokens include $description with evidence counts for designer context
  - All three formats use identical semantic names from shared semantic-namer module
  - Sort order: colors by occurrence desc, typography by size desc, spacing/radii by value asc

metrics:
  duration_minutes: 3
  tasks_completed: 2
  files_created: 4
  files_modified: 2
  commits: 2
  completed_date: 2026-02-16
---

# Phase 05 Plan 03: Export Format Generators Summary

**One-liner:** Three export format generators (CSS custom properties, Tailwind v3 config, Figma tokens) sharing semantic naming.

## Tasks Completed

### Task 1: Create CSS custom properties generator

**Files created:**
- `src/export/formatters/css-vars.ts`

**Implementation:**
- `generateCSSCustomProperties(result: NormalizationResult): string` function
- Generates `:root` block with all 6 token types (colors, typography, spacing, radii, shadows, motion)
- Uses semantic names from `generateSemanticColorName`, `generateSemanticTypographyName`, etc.
- Typography split into individual CSS variables: `--heading-1-family`, `--heading-1-size`, `--heading-1-weight`, `--heading-1-line-height`, `--heading-1-letter-spacing`
- Shadow values reconstructed as CSS shorthand: `offsetX offsetY blur spread color`, with multi-layer comma separation
- Consistent sorting: colors by occurrence descending, typography by size descending, spacing/radii by value ascending
- Section comments for readability
- ISO timestamp header with "Do not edit manually" warning

**Verification:** TypeScript compiles with zero errors.

**Commit:** d1febe9

---

### Task 2: Create Tailwind and Figma tokens generators, update barrels

**Files created:**
- `src/export/formatters/tailwind.ts`
- `src/export/formatters/figma-tokens.ts`
- `src/export/formatters/index.ts`

**Files modified:**
- `src/export/index.ts` (added formatters barrel export)
- `src/export/formatters/json-layers.ts` (bug fix)

**Implementation:**

**Tailwind generator (`tailwind.ts`):**
- `generateTailwindConfig(result: NormalizationResult): string` function
- Generates Tailwind v3 JavaScript config with `module.exports = { theme: { extend: { ... } } }`
- JSDoc comment: `/** @type {import('tailwindcss').Config} */` for IDE support
- Strips type prefixes for Tailwind-native naming:
  - `spacing-xs` → `spacing.xs`
  - `color-primary` → `colors.primary`
  - `radius-sm` → `borderRadius.sm`
  - `shadow-md` → `boxShadow.md`
- Typography uses Tailwind extended format: `[size, { lineHeight, fontWeight, letterSpacing }]`
- Shadow values reconstructed as CSS shorthand (same logic as CSS vars)
- JSON.stringify with 2-space indent

**Figma tokens generator (`figma-tokens.ts`):**
- `generateFigmaTokens(result: NormalizationResult): string` function
- W3C DTCG format with `$type`, `$value`, `$description`
- Groups tokens by type at top level: `color`, `typography`, `spacing`, `borderRadius`, `boxShadow`, `motion`
- Strips type prefixes within groups for cleaner Figma display
- Evidence-based descriptions: "Appears on X elements across Y pages"
- Shadow values use W3C DTCG shadow object format: `{ offsetX, offsetY, blur, spread, color }`
- Motion grouped into durations (`$type: "duration"`) and easings (`$type: "cubicBezier"`)
- Returns `JSON.stringify(figmaTokens, null, 2)`

**Barrel updates:**
- Created `src/export/formatters/index.ts` exporting all three generators
- Updated `src/export/index.ts` to export formatters barrel

**Bug fix (Rule 1 - auto-fix):**
- Fixed `json-layers.ts` from plan 05-02 where code accessed `token.cluster.*` when `token` is already a `ColorCluster`
- Changed `b.token.cluster.occurrences` → `b.token.occurrences`
- Changed `token.cluster.canonical` → `cluster.canonical` (renamed variable for clarity)
- Added type annotations to motion filter lambdas: `(cp: any)`, `(crossPageToken: any, index: number)`

**Verification:** TypeScript compiles with zero errors after bug fix.

**Commit:** d580a92

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ColorCluster access pattern in json-layers.ts**
- **Found during:** Task 2 TypeScript verification
- **Issue:** Previous plan (05-02) created `json-layers.ts` with incorrect property access. Code assumed `CrossPageResult<ColorCluster>` had nested `.token.cluster` structure, but `token` is already a `ColorCluster`.
- **Fix:** Changed all instances of `token.cluster.*` to direct property access on `cluster` (renamed variable). Added type annotations to motion filter lambdas.
- **Files modified:** `src/export/formatters/json-layers.ts`
- **Commit:** d580a92 (combined with Task 2)
- **Reasoning:** This was a blocking bug preventing TypeScript compilation, which would prevent completing Task 2 verification.

---

## Verification Results

**Overall verification:**
- ✅ `npx tsc --noEmit --skipLibCheck` passes with zero errors
- ✅ CSS vars generator produces `:root { ... }` block
- ✅ Tailwind config produces `module.exports = { theme: { extend: { ... } } }`
- ✅ Figma tokens produces valid JSON with `$type` and `$value`
- ✅ All three use identical semantic token names (via shared semantic-namer)

**Success criteria:**
- ✅ CSS file has section comments and all 6 token groups (colors, typography, spacing, radii, shadows, motion)
- ✅ Tailwind strips type prefix for Tailwind-native naming (colors.primary not colors.color-primary)
- ✅ Figma tokens include $description with evidence-based descriptions
- ✅ All three formats produce parseable output (valid CSS, valid JS, valid JSON)

---

## Key Technical Decisions

1. **CSS typography split into individual properties** instead of CSS shorthand, allowing granular overrides: `--heading-1-family`, `--heading-1-size`, `--heading-1-weight`, `--heading-1-line-height`

2. **Tailwind type prefix stripping** for framework-native naming improves developer UX. Semantic names like "primary" and "neutral-1" preserved for colors, but "spacing-xs" becomes "xs" within spacing group.

3. **Shadow reconstruction** uses consistent CSS shorthand format across all three generators, handling multi-layer shadows with comma separation.

4. **Evidence-based descriptions** in Figma tokens provide designer context about token usage patterns without overwhelming the format.

5. **Shared semantic naming** ensures consistency: all three formats reference the same color as "primary", the same typography as "heading-1", etc.

---

## Integration Points

**Imports from:**
- `src/export/semantic-namer.ts` (all six naming functions)
- `src/output/dtcg-formatter.ts` (NormalizationResult type)
- `src/types/normalized-tokens.ts` (ColorCluster, NormalizedTypographyToken, NormalizedSpacingToken)
- `src/types/tokens.ts` (RadiusToken, ShadowToken, MotionToken)

**Exports to:**
- `src/export/index.ts` (public API for all formatters)

**Used by:**
- Later plans in Phase 05 (export orchestration)

---

## Self-Check: PASSED

**Created files exist:**
```
FOUND: src/export/formatters/css-vars.ts
FOUND: src/export/formatters/tailwind.ts
FOUND: src/export/formatters/figma-tokens.ts
FOUND: src/export/formatters/index.ts
```

**Modified files exist:**
```
FOUND: src/export/index.ts
FOUND: src/export/formatters/json-layers.ts
```

**Commits exist:**
```
FOUND: d1febe9 (Task 1 - CSS vars generator)
FOUND: d580a92 (Task 2 - Tailwind, Figma, barrels, bug fix)
```

**All files created, all commits present, TypeScript compiles cleanly.**

---

## Notes

- All three format generators are pure functions that take `NormalizationResult` and return formatted strings
- No file I/O in formatters (writing to disk happens in later export orchestration plans)
- Semantic naming consistency is the foundation for all export formats
- Bug fix in json-layers.ts was necessary for TypeScript compilation, demonstrating importance of verification step
- Total execution time: 3 minutes for 2 tasks, 4 files created, 2 files modified, 2 commits
