---
phase: 03-synthesis-inference-engine
plan: 02
subsystem: synthesis
tags: [rule-engine, templates, handlebars, token-resolution, evidence-chain]
dependency_graph:
  requires:
    - 03-01 (synthesis types and constraint checker)
    - Phase 2 (normalized tokens and components)
  provides:
    - Rule-based structural synthesis engine
    - Template registry with Handlebars compilation
    - 6 component templates (button, card, input, data-table, modal, nav)
    - Token resolution and evidence chain generation
  affects:
    - synthesis/llm-refiner.ts (will consume StructuralSynthesis)
    - synthesis pipeline integration (future)
tech_stack:
  added:
    - handlebars: Template compilation for deterministic HTML/CSS generation
  patterns:
    - Two-stage synthesis: Rule engine (Stage 1) handles deterministic structure
    - Template caching for performance (avoid re-compilation)
    - Evidence chain tracking for full auditability
    - Token resolution with semantic naming (color.primary, spacing.md, etc.)
    - Contrast calculation for accessible color combinations
key_files:
  created:
    - src/synthesis/rule-engine.ts: "Core synthesis engine with token resolution"
    - src/synthesis/template-registry.ts: "Handlebars template loading and compilation"
    - src/synthesis/templates/button.hbs: "Button component template"
    - src/synthesis/templates/card.hbs: "Card component template"
    - src/synthesis/templates/input.hbs: "Input component template"
    - src/synthesis/templates/data-table.hbs: "Data table component template"
    - src/synthesis/templates/modal.hbs: "Modal dialog component template"
    - src/synthesis/templates/nav.hbs: "Navigation component template"
  modified:
    - src/types/synthesis.ts: "Added StructuralSynthesis interface"
    - src/synthesis/index.ts: "Added exports for rule-engine and template-registry"
decisions:
  - id: D03-02-01
    summary: "Template aliases for common variations (table->data-table, dialog->modal)"
    context: "Users may request components using different naming conventions"
    decision: "Added TEMPLATE_ALIASES map to normalize common variations"
    rationale: "Improves UX by accepting multiple valid names for the same template"
    alternatives:
      - "Strict template names only (poor UX)"
      - "LLM-based fuzzy matching (overkill, non-deterministic)"
  - id: D03-02-02
    summary: "Token coverage threshold of 50% required for synthesis"
    context: "Not all sites have complete design systems with all token types"
    decision: "Require minimum 50% token coverage, throw error if below threshold"
    rationale: "Prevents generating low-quality output when too many tokens are missing"
    alternatives:
      - "Allow any coverage (risk of fabricated values)"
      - "Higher threshold like 80% (too restrictive, many sites would fail)"
  - id: D03-02-03
    summary: "Handlebars custom helpers for token fallbacks and conditionals"
    context: "Templates need to handle missing tokens gracefully"
    decision: "Implemented fallback, ifEqual, and cssValue helpers"
    rationale: "Templates remain readable and handle edge cases without complex logic"
    alternatives:
      - "Pure Handlebars without helpers (verbose, hard to read)"
      - "JavaScript template literals (loses Handlebars ecosystem)"
  - id: D03-02-04
    summary: "WCAG 2.1 luminance calculation for color contrast"
    context: "Need to derive contrasting text colors for accessible UI"
    decision: "Implemented getRelativeLuminance with gamma correction"
    rationale: "Industry standard for color contrast, WCAG compliant"
    alternatives:
      - "Simple dark/light check without luminance (inaccurate)"
      - "External library for color math (added dependency)"
  - id: D03-02-05
    summary: "Template context includes both tokens and request constraints"
    context: "Users may want to override specific token values"
    decision: "Merge request.constraints into template context, allowing overrides"
    rationale: "Provides flexibility while maintaining token-first approach"
    alternatives:
      - "Tokens only, no overrides (too restrictive)"
      - "Constraints override all tokens (defeats purpose of extraction)"
metrics:
  duration: "5 minutes"
  completed_date: "2026-02-16"
  tasks_completed: 2
  files_created: 8
  files_modified: 2
  commits: 2
---

# Phase 3 Plan 2: Rule Engine & Templates Summary

**One-liner:** Rule-based synthesis engine generates HTML+CSS from Handlebars templates using only extracted design tokens, with full evidence chain tracking.

## What Was Built

Implemented Stage 1 of the two-stage synthesis pipeline: a deterministic rule engine that transforms ComponentRequests into StructuralSynthesis outputs using Handlebars templates and extracted design tokens.

### Core Components

**1. Template Registry (`template-registry.ts`)**
- Handlebars template loading from `src/synthesis/templates/` directory
- Template compilation with caching (avoid re-compilation on subsequent requests)
- Custom helpers:
  - `{{fallback primary secondary}}` - Use primary if exists, else secondary
  - `{{ifEqual a b}}` - Conditional equality check
  - `{{cssValue property value}}` - Wrap CSS property-value pair
- `getAvailableTemplates()` returns list of available template names

**2. Component Templates (6 templates)**
All templates use `{{tokens.*}}` placeholders exclusively - **zero hardcoded design values**.

- **button.hbs**: Size variants (small/medium/large), emphasis variants (primary/secondary/ghost)
- **card.hbs**: Card with optional header, body, footer
- **input.hbs**: Text input with label, placeholder, error state
- **data-table.hbs**: Table with header, body rows, hover state
- **modal.hbs**: Dialog with backdrop, header, body, actions
- **nav.hbs**: Navigation bar with links, active state

Each template includes embedded `<style>` block with CSS, using BEM-style class names (`synth-button`, `synth-button--primary`, `synth-card__header`).

**3. Rule Engine (`rule-engine.ts`)**

Main function: `synthesizeStructure(request: ComponentRequest, designDNA: DesignDNA): StructuralSynthesis`

**Implementation flow:**
1. **Template selection**: Match `request.type` to available templates, handle aliases (e.g., "table" → "data-table")
2. **Token map building**: Use `buildTokenMap()` from constraint-checker to create flat lookup
3. **Token resolution**: Resolve template placeholders from DesignDNA:
   - `tokens.color.*` → from `designDNA.tokens.colors.standards` (canonical hex from ColorCluster)
   - `tokens.spacing.*` → from `designDNA.tokens.spacing.standards` (pixel values)
   - `tokens.typography.*` → from `designDNA.tokens.typography.standards`
   - `tokens.radius.*` → from `designDNA.tokens.radii.standards`
   - `tokens.shadow.*` → from `designDNA.tokens.shadows.standards`
   - `tokens.color.onPrimary` → derived via `resolveColorContrast()` using WCAG luminance
4. **Token coverage validation**: Calculate coverage ratio, throw error if <50%
5. **Template compilation**: Use cached compiled template from registry
6. **HTML/CSS extraction**: Split rendered output at `<style>` tag boundary
7. **Evidence chain building**: Create EvidenceLink for each resolved token with `sourceType: 'observed_token'`
8. **Confidence calculation**: Based on token resolution coverage (resolved / total)
9. **Return StructuralSynthesis** with all data

**Helper: `resolveColorContrast(backgroundColor: string): string`**
- Implements WCAG 2.1 relative luminance calculation with gamma correction
- Returns `#000000` (dark text) for light backgrounds, `#ffffff` (light text) for dark backgrounds
- Ensures accessible text-on-background color combinations

### Type Additions

Added `StructuralSynthesis` interface to `src/types/synthesis.ts`:
```typescript
interface StructuralSynthesis {
  html: string;                     // Generated HTML structure
  css: string;                      // Generated CSS styles
  templateName: string;             // Template used
  tokenMap: Record<string, string>; // All resolved token values used
  decisions: SynthesisDecision[];   // Structural decisions made
  evidence: EvidenceLink[];         // Evidence chain for token usage
  confidence: number;               // 0-1 based on token coverage
}
```

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

**Inputs:**
- `ComponentRequest` (type, description, optional constraints)
- `DesignDNA` (normalized tokens + aggregated components from Phase 2)

**Outputs:**
- `StructuralSynthesis` (HTML, CSS, evidence chain, confidence)

**Dependencies:**
- `buildTokenMap()` from constraint-checker (token lookup map construction)
- Handlebars for template compilation

**Consumers:**
- LLM refiner (Stage 2) will consume `StructuralSynthesis` and add motion, edge states, microcopy
- Full synthesis pipeline will orchestrate rule engine → LLM refiner → final SynthesizedComponent

## Verification Results

**TypeScript compilation:** ✅ PASS (0 errors in new files)

**Files created:**
- ✅ `src/synthesis/template-registry.ts` (95 lines)
- ✅ `src/synthesis/rule-engine.ts` (381 lines)
- ✅ `src/synthesis/templates/button.hbs`
- ✅ `src/synthesis/templates/card.hbs`
- ✅ `src/synthesis/templates/input.hbs`
- ✅ `src/synthesis/templates/data-table.hbs`
- ✅ `src/synthesis/templates/modal.hbs`
- ✅ `src/synthesis/templates/nav.hbs`

**Exports verified:**
- ✅ `synthesizeStructure` exported from `src/synthesis/index.ts`
- ✅ `resolveColorContrast` exported from `src/synthesis/index.ts`
- ✅ `compileTemplate` exported from `src/synthesis/index.ts`
- ✅ `getAvailableTemplates` exported from `src/synthesis/index.ts`

**Template features:**
- ✅ All 6 templates use `{{tokens.*}}` placeholders
- ✅ Zero hardcoded colors, sizes, or fonts
- ✅ BEM-style class naming
- ✅ Embedded `<style>` blocks

**Rule engine features:**
- ✅ Template selection with aliases
- ✅ Token resolution from DesignDNA (never fabricates values)
- ✅ Evidence chain creation for each token application
- ✅ Confidence score reflects token coverage
- ✅ 50% minimum coverage threshold
- ✅ WCAG-compliant color contrast calculation

## Next Steps

1. **Plan 03-03**: Implement LLM refiner (Stage 2) to add motion timings, edge states, microcopy
2. **Plan 03-04**: Create full synthesis pipeline orchestrating rule engine → LLM refiner
3. **Plan 03-05**: Add integration tests for end-to-end synthesis flow

## Self-Check: PASSED

**Files verified:**
- ✅ FOUND: src/synthesis/rule-engine.ts
- ✅ FOUND: src/synthesis/template-registry.ts
- ✅ FOUND: src/synthesis/templates/button.hbs
- ✅ FOUND: src/synthesis/templates/card.hbs
- ✅ FOUND: src/synthesis/templates/input.hbs
- ✅ FOUND: src/synthesis/templates/data-table.hbs
- ✅ FOUND: src/synthesis/templates/modal.hbs
- ✅ FOUND: src/synthesis/templates/nav.hbs

**Commits verified:**
- ✅ FOUND: d639526 (Task 1: template registry and templates)
- ✅ FOUND: ca40032 (Task 2: rule-based synthesis engine)

All claimed files exist and commits are present in git history.
