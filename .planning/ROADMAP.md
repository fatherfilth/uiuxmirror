# Roadmap: UIUX-Mirror (uidna)

## Overview

UIUX-Mirror extracts design DNA from live websites through a 6-phase journey: establish reliable Playwright-based crawling with computed style extraction (Phase 1), normalize raw observations into canonical design tokens and mine component patterns (Phase 2), build the hybrid inference engine for AI-powered component synthesis (Phase 3), detect cross-page interaction and content patterns (Phase 4), generate comprehensive export packages and reports (Phase 5), and deliver the complete CLI/MCP interface for human and agent users (Phase 6). Each phase builds evidence-driven capabilities that trace every design decision back to observable source material.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Crawling Infrastructure** - Playwright crawler with dynamic content handling and core token extraction
- [x] **Phase 2: Normalization & Component Mining** - Transform raw observations into canonical tokens and identify component patterns
- [ ] **Phase 3: Synthesis & Inference Engine** - Hybrid AI-powered component generation with evidence citations
- [ ] **Phase 4: Pattern Detection & Content Analysis** - Extract interaction flows and content style standards
- [ ] **Phase 5: Export & Reporting** - Generate human-readable reports and machine-readable packages
- [ ] **Phase 6: CLI & MCP Integration** - Complete user interface with command-line tools and MCP server

## Phase Details

### Phase 1: Foundation & Crawling Infrastructure
**Goal**: User can crawl a target website section and extract reliable design tokens with full evidence tracing
**Depends on**: Nothing (first phase)
**Requirements**: CRAWL-01, CRAWL-02, CRAWL-03, CRAWL-04, CRAWL-05, CRAWL-06, TOKEN-01, TOKEN-02, TOKEN-03, TOKEN-04, TOKEN-05, TOKEN-06, TOKEN-07, TOKEN-08, NORM-03
**Success Criteria** (what must be TRUE):
  1. User can crawl 20-100 pages from seed URL respecting robots.txt and rate limits
  2. Crawler handles dynamic content (CSS-in-JS, framework-specific rendering) without missing styles
  3. Extracted tokens (colors, typography, spacing, radii, shadows, z-index, motion, icons, imagery) match computed styles from browser
  4. Every extracted observation links to evidence (page URL, DOM selector, timestamp, screenshot crop)
  5. User can re-crawl a site and see diff of what changed since last crawl
**Plans:** 7 plans

Plans:
- [ ] 01-01-PLAN.md — Project scaffolding, TypeScript types, and shared utilities
- [ ] 01-02-PLAN.md — Playwright crawler with Crawlee, stealth, robots.txt, and wait strategies
- [ ] 01-03-PLAN.md — Evidence store and screenshot management
- [ ] 01-04-PLAN.md — Token extractors: colors, typography, spacing, CSS custom properties
- [ ] 01-05-PLAN.md — Token extractors: radii, shadows, z-index, motion, icons, imagery
- [ ] 01-06-PLAN.md — Pipeline orchestration, token persistence, and re-crawl diff tracking
- [ ] 01-07-PLAN.md — Tests and human verification of output quality

### Phase 2: Normalization & Component Mining
**Goal**: Raw observations are transformed into canonical design tokens and component patterns are identified
**Depends on**: Phase 1
**Requirements**: NORM-01, NORM-02, NORM-04, NORM-05, COMP-01, COMP-02, COMP-03, COMP-04
**Success Criteria** (what must be TRUE):
  1. Tokens are deduplicated with fuzzy matching (color distance, unit normalization) and output in W3C Design Token format
  2. Only values appearing across 3+ pages are declared as standards (cross-page validation threshold enforced)
  3. Common components (buttons, inputs, cards, nav, modals) are identified from DOM signatures with variant dimensions detected
  4. Interactive states (hover, active, focus, disabled, loading, error) are mapped per component
  5. Every token and component has confidence score based on evidence count and cross-page frequency
**Plans:** 6 plans

Plans:
- [ ] 02-01-PLAN.md — Token normalization: CIEDE2000 color deduplication and unit conversion (TDD)
- [ ] 02-02-PLAN.md — Cross-page validation, spacing scale detection, and confidence scoring (TDD)
- [ ] 02-03-PLAN.md — W3C DTCG output formatting and normalization pipeline
- [ ] 02-04-PLAN.md — Component detection from DOM signatures (buttons, inputs, cards, nav, modals)
- [ ] 02-05-PLAN.md — Component variant analysis and interactive state mapping
- [ ] 02-06-PLAN.md — Component scoring, cross-page aggregation, and integration tests

### Phase 3: Synthesis & Inference Engine
**Goal**: Unknown components can be synthesized using extracted design DNA as constraints
**Depends on**: Phase 2
**Requirements**: INFER-01, INFER-02, INFER-03, INFER-04, INFER-05
**Success Criteria** (what must be TRUE):
  1. User can request synthesis of component not observed in source site (e.g., "data table")
  2. Synthesized component uses only tokens and patterns from extracted DNA (no unanchored design guesses)
  3. Rule-based synthesizer generates structural components from observed primitives
  4. Claude API handles nuanced design decisions (motion timing, edge state styling, microcopy tone)
  5. Every synthesized element includes confidence score and evidence citations linking back to source observations
  6. Generated components include complete state coverage and accessibility baseline (keyboard, focus, ARIA guidance)
**Plans:** 6 plans

Plans:
- [ ] 03-01-PLAN.md — Synthesis types, dependency install, and constraint checker
- [ ] 03-02-PLAN.md — Rule-based synthesis engine with Handlebars templates
- [ ] 03-03-PLAN.md — LLM refiner with Claude structured outputs
- [ ] 03-04-PLAN.md — State generator and accessibility baseline generator
- [ ] 03-05-PLAN.md — Evidence tracker and component composer orchestrator
- [ ] 03-06-PLAN.md — Unit tests and integration tests for synthesis pipeline

### Phase 4: Pattern Detection & Content Analysis
**Goal**: Cross-page interaction patterns and content style rules are extracted
**Depends on**: Phase 3
**Requirements**: PATT-01, PATT-02
**Success Criteria** (what must be TRUE):
  1. Multi-page interaction flows (auth, checkout, onboarding, search/filter) are detected and documented
  2. Content standards are extracted (voice/tone, CTA hierarchy, capitalization rules, error message grammar)
  3. Pattern detection identifies state transitions and flow dependencies across pages
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 5: Export & Reporting
**Goal**: Design DNA is packaged in human-readable and machine-readable formats
**Depends on**: Phase 4
**Requirements**: EXPORT-01, EXPORT-02, EXPORT-03, EXPORT-04, EXPORT-05, EXPORT-06, EXPORT-07, EXPORT-08
**Success Criteria** (what must be TRUE):
  1. Brand DNA Report (Markdown) is generated with token tables, component catalog, and pattern documentation
  2. Machine-readable JSON files are exported (tokens.json, components.json, patterns.json, content_style.json, evidence_index.json)
  3. Framework-agnostic component stubs (vanilla HTML/CSS) are generated for all observed and synthesized components
  4. Export supports multiple formats (CSS variables, Tailwind config, Figma tokens plugin format)
  5. All exports maintain evidence traceability (links back to source observations)
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 6: CLI & MCP Integration
**Goal**: Complete user interface enables both human CLI usage and AI agent queries
**Depends on**: Phase 5
**Requirements**: CLI-01, CLI-02, CLI-03, CLI-04, CLI-05, CLI-06, CLI-07
**Success Criteria** (what must be TRUE):
  1. User can run `uidna crawl <url>` with depth, page limit, and domain allowlist options
  2. User can run `uidna extract`, `uidna report`, `uidna synth <component>`, and `uidna export` commands
  3. Configuration is managed via `uidna.config.json` (depth, limits, allowlist/denylist, strict robots, viewport sizes)
  4. MCP server mode exposes design DNA as queryable tools and resources for AI agents
  5. All commands provide clear progress feedback and error messages
**Plans**: TBD

Plans:
- [ ] TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Crawling Infrastructure | 7/7 | Complete | 2026-02-15 |
| 2. Normalization & Component Mining | 6/6 | Complete | 2026-02-16 |
| 3. Synthesis & Inference Engine | 0/6 | Not started | - |
| 4. Pattern Detection & Content Analysis | 0/TBD | Not started | - |
| 5. Export & Reporting | 0/TBD | Not started | - |
| 6. CLI & MCP Integration | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-15*
*Last updated: 2026-02-16 — Phase 3 planned (6 plans in 4 waves)*
