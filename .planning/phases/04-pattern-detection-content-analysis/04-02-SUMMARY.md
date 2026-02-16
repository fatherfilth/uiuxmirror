---
phase: 04-pattern-detection-content-analysis
plan: 02
subsystem: pattern-detection
tags: [flow-detection, state-graph, multi-page-flows, graphology]
dependency-graph:
  requires: [crawl-data, page-data, graphology]
  provides: [flow-detection-pipeline, state-graph-builder, flow-classifier]
  affects: [pattern-storage, evidence-linking]
tech-stack:
  added: [graphology-traversal]
  patterns: [bfs-traversal, graph-construction, flow-classification]
key-files:
  created:
    - src/patterns/state-graph-builder.ts
    - src/patterns/flow-classifier.ts
    - src/patterns/flow-detector.ts
    - src/patterns/index.ts
  modified: []
decisions:
  - Universal navigation filtering at 80% page occurrence threshold
  - Dead-end flows reduce confidence by 0.2
  - Flow deduplication at >70% path overlap
  - Valid flows require 2+ pages with forms or state changes
  - Manual BFS implementation for path tracking (graphology-traversal not used)
metrics:
  duration: 3.5 min
  tasks: 2
  files: 4
  commits: 2
  completed: 2026-02-16
---

# Phase 04 Plan 02: Flow Detection Pipeline Summary

**One-liner:** State-flow graph construction and multi-page flow detection using Graphology with auth/checkout/onboarding/search-filter classification

## What Was Built

Implemented the complete flow detection pipeline that constructs state-flow graphs from crawled page data and detects multi-page interaction patterns (auth flows, checkout, onboarding, search/filter).

**Architecture:**
- **State Graph Builder** (`state-graph-builder.ts`): Constructs directed Graphology graph with PageState nodes and Transition edges from crawled pages
- **Flow Classifier** (`flow-classifier.ts`): Categorizes flow paths into auth/checkout/onboarding/search-filter types with confidence scoring
- **Flow Detector** (`flow-detector.ts`): Entry point that orchestrates graph building, flow discovery, and classification
- **Barrel Export** (`index.ts`): Exposes all pattern detection functions

**Key Features:**
- **Navigation Filtering:** Links appearing on >80% of pages marked as universal navigation (not flow edges)
- **Flow Classification:** Pattern matching on URLs, titles, and form fields to identify flow types
- **Confidence Scoring:** Base confidence by type, adjusted for path length, form submissions, URL consistency
- **Dead-end Detection:** Flows ending on form pages with no exit have reduced confidence (-0.2)
- **Deduplication:** Removes duplicate flows sharing >70% of path nodes, keeping higher confidence version

## Tasks Completed

### Task 1: Build state-flow graph from crawled pages and classify flows
**Files:** `src/patterns/state-graph-builder.ts`, `src/patterns/flow-classifier.ts`
**Commit:** `3392605`

Created `buildStateFlowGraph()` that:
- Constructs directed Graphology graph with PageState nodes and Transition edges
- Extracts form elements, links, buttons from HTML using regex (no full DOM parser)
- Resolves relative URLs against base page URL
- Filters universal navigation links (>80% page occurrence) to avoid classifying nav as flows
- Generates deterministic page IDs from URL pathname + search params

Created `classifyFlow()`, `calculateFlowConfidence()`, and `analyzeFlowCharacteristics()`:
- Classifies flows based on URL/title keywords and form field patterns
- Auth: login/sign-in keywords + password fields
- Checkout: cart/payment keywords + card/billing fields
- Onboarding: welcome/setup keywords + 3+ steps
- Search-filter: search/filter keywords + query fields
- Multi-step-form: 2+ form pages fallback
- Confidence scoring considers path length (2-6 sweet spot), form submissions, URL patterns
- Characteristics extraction: form submissions, auth requirement, step count, common keywords

**Verification:** TypeScript compilation passed with zero errors.

### Task 2: Implement flow detector and create barrel export
**Files:** `src/patterns/flow-detector.ts`, `src/patterns/index.ts`
**Commit:** `ca3eec9`

Created `detectFlows()` that:
- Builds state-flow graph from PageData and htmlContents
- Identifies entry points: forms with low in-degree (<= 2) or flow-start keywords
- Custom BFS traversal to find connected page sequences (path tracking)
- Filters non-flow sequences: requires 2+ pages AND (form submission OR form elements)
- Classifies each valid flow and calculates confidence
- Detects dead-end flows (form page with no exit) and reduces confidence by 0.2
- Deduplicates flows with >70% path overlap, keeping higher confidence version
- Returns DetectedFlow[] sorted by confidence descending

Created barrel export exposing:
- `buildStateFlowGraph`
- `classifyFlow`, `calculateFlowConfidence`, `analyzeFlowCharacteristics`
- `detectFlows` (primary entry point)

**Edge cases handled:**
- Empty input (no pages) → returns empty array
- Empty graph (no nodes) → returns empty array
- Cycles in graph → BFS handles with visited set
- Pages with no forms → skipped as entry points unless they match entry keywords
- Dead-end pages → marked as partial flows with reduced confidence

**Verification:** TypeScript compilation passed. All pattern detection functions properly exported.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Removed unused graphology-traversal import**
- **Found during:** Task 2 TypeScript compilation
- **Issue:** Imported `bfs` from graphology-traversal but implemented custom BFS for path tracking
- **Fix:** Removed unused import to fix TS6133 error
- **Files modified:** `src/patterns/flow-detector.ts`
- **Commit:** Included in `ca3eec9`

**Rationale:** Custom BFS was needed for path tracking (queue stores `{ node, path }` pairs). The graphology-traversal `bfs()` only provides node visitation callback without path context, so a custom implementation was necessary for flow detection requirements.

## Evidence & Verification

**TypeScript Compilation:**
```bash
$ npx tsc --noEmit
# Zero errors - all pattern detection files compile successfully
```

**Exports Verified:**
- `src/patterns/state-graph-builder.ts` exports `buildStateFlowGraph`
- `src/patterns/flow-classifier.ts` exports `classifyFlow`, `calculateFlowConfidence`, `analyzeFlowCharacteristics`
- `src/patterns/flow-detector.ts` exports `detectFlows` returning `DetectedFlow[]`
- `src/patterns/index.ts` barrel re-exports all functions

**Flow Detection Logic:**
- Navigation filtering: Links on >80% of pages marked with `isNavigation: true` flag
- Dead-end detection: Pages with forms but `outDegree === 0` reduce confidence by 0.2
- Deduplication: Flows sharing >70% of path nodes trigger overlap check, higher confidence wins

## Key Decisions

**1. Universal navigation filtering at 80% threshold**
- Links appearing on ≥80% of pages marked as navigation, not flow transitions
- Prevents header/footer links from being classified as flows
- Threshold balances noise reduction with flow discovery

**2. Dead-end flows reduce confidence by 0.2**
- Pages with forms but no outgoing edges likely incomplete flows
- Crawler can't pass login walls or form submissions
- Confidence penalty acknowledges incompleteness

**3. Flow deduplication at >70% path overlap**
- Prevents reporting multiple variations of same flow
- Keeps flow with higher confidence score
- 70% threshold balances duplicate removal with variant preservation

**4. Valid flows require 2+ pages with forms or state changes**
- Single-page paths rejected (not flows)
- Pure link navigation rejected (must have form submission OR form elements)
- Ensures flows represent actual user interactions, not just navigation

**5. Manual BFS implementation for path tracking**
- graphology-traversal `bfs()` only provides node callback, no path context
- Custom BFS maintains `{ node, path }` in queue for flow sequence tracking
- Decision: Implement custom BFS instead of using library (library insufficient for use case)

## Self-Check: PASSED

**Created files exist:**
```bash
$ [ -f "src/patterns/state-graph-builder.ts" ] && echo "FOUND"
FOUND
$ [ -f "src/patterns/flow-classifier.ts" ] && echo "FOUND"
FOUND
$ [ -f "src/patterns/flow-detector.ts" ] && echo "FOUND"
FOUND
$ [ -f "src/patterns/index.ts" ] && echo "FOUND"
FOUND
```

**Commits exist:**
```bash
$ git log --oneline --all | grep -q "3392605" && echo "FOUND: 3392605"
FOUND: 3392605
$ git log --oneline --all | grep -q "ca3eec9" && echo "FOUND: ca3eec9"
FOUND: ca3eec9
```

All files created and all commits verified.

## Next Steps

**For Phase 04-03 (Content Analysis):**
- Use `src/patterns/` as reference for content pattern structure
- Content analysis will extract text from interactive elements
- Voice/tone, capitalization, error grammar patterns
- Complement flow detection with content style rules

**Integration:**
- Flow detection pipeline ready for Phase 5 (export)
- DetectedFlow[] will be serialized to patterns.json
- Evidence IDs link flows to source pages with screenshots

---

**Summary created:** 2026-02-16
**Plan status:** COMPLETE
**All verification criteria met:** ✓
