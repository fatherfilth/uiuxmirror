# Requirements: UIUX-Mirror (uidna)

**Defined:** 2026-02-15
**Core Value:** Every extracted standard and inferred component must trace back to observable evidence from the source site

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Crawling & Compliance

- [ ] **CRAWL-01**: User can crawl a site section (20-100 pages) from seed URLs with configurable depth
- [ ] **CRAWL-02**: Crawler respects robots.txt with configurable strict mode
- [ ] **CRAWL-03**: Crawler enforces rate limiting and request throttling
- [ ] **CRAWL-04**: Crawler handles dynamic content (CSS-in-JS wait strategies, framework-specific markers)
- [ ] **CRAWL-05**: Crawler uses anti-bot stealth configuration (user-agent rotation, timing jitter)
- [ ] **CRAWL-06**: User can re-crawl a site and see diff of what changed since last crawl

### Token Extraction

- [ ] **TOKEN-01**: Extract color palette with semantic grouping (primary, secondary, accent, neutral)
- [ ] **TOKEN-02**: Extract typography scale (families, sizes, weights, line-heights)
- [ ] **TOKEN-03**: Extract spacing/sizing scale with base unit detection
- [ ] **TOKEN-04**: Parse CSS custom properties and map to token categories
- [ ] **TOKEN-05**: Extract border radii, elevation/shadow, and z-index scales
- [ ] **TOKEN-06**: Extract motion/animation tokens (durations, easings, keyframes)
- [ ] **TOKEN-07**: Analyze icon style (stroke weight, fill patterns, size conventions)
- [ ] **TOKEN-08**: Detect imagery patterns (aspect ratios, treatment styles, placeholder conventions)

### Component Mining

- [ ] **COMP-01**: Identify common components from DOM structures (buttons, inputs, cards, nav, modals)
- [ ] **COMP-02**: Detect variant dimensions per component (size, color, emphasis)
- [ ] **COMP-03**: Map interactive states per component (hover, active, focus, disabled, loading, error)
- [ ] **COMP-04**: Score component consistency across pages (statistical confidence)

### Pattern Detection

- [ ] **PATT-01**: Detect multi-page interaction patterns (auth flows, checkout, onboarding, search/filter)
- [ ] **PATT-02**: Extract content/microcopy rules (voice/tone, CTA hierarchy, capitalization, error message grammar)

### Normalization & Evidence

- [ ] **NORM-01**: Deduplicate extracted values with fuzzy matching (color distance, unit normalization)
- [ ] **NORM-02**: Output tokens in standard JSON format (W3C Design Token spec compatible)
- [ ] **NORM-03**: Store evidence per observation (page URL, DOM selector, screenshot crop, computed styles, timestamp)
- [ ] **NORM-04**: Enforce cross-page validation thresholds before declaring a value a "standard"
- [ ] **NORM-05**: Assign confidence scores to every extracted token and component

### Inference Engine

- [ ] **INFER-01**: Synthesize unknown component structure using rule-based composition of observed primitives
- [ ] **INFER-02**: Use Claude API for nuanced design judgment (motion, edge states, copy decisions)
- [ ] **INFER-03**: Emit confidence score and evidence citations for every inference
- [ ] **INFER-04**: Generate complete state coverage (hover, active, focus, disabled, loading, error)
- [ ] **INFER-05**: Generate accessibility baseline per synthesized component (keyboard, focus, ARIA guidance)

### Reporting & Export

- [ ] **EXPORT-01**: Generate human-readable Brand DNA Report (Markdown)
- [ ] **EXPORT-02**: Export tokens.json (colors, typography, spacing, radii, shadows, z-index, motion)
- [ ] **EXPORT-03**: Export components.json (observed components, variants, states)
- [ ] **EXPORT-04**: Export patterns.json (detected interaction flows)
- [ ] **EXPORT-05**: Export content_style.json (microcopy rules and examples)
- [ ] **EXPORT-06**: Export evidence_index.json (URLs, DOM selectors, screenshots, timestamps, confidence)
- [ ] **EXPORT-07**: Generate framework-agnostic component stubs (vanilla HTML/CSS)
- [ ] **EXPORT-08**: Support multiple export formats (CSS variables, Tailwind config, Figma tokens)

### CLI & MCP Interface

- [ ] **CLI-01**: `uidna crawl <url>` command with depth, page limit, and domain allowlist options
- [ ] **CLI-02**: `uidna extract` command to run extraction pipeline on crawled data
- [ ] **CLI-03**: `uidna report` command to generate Brand DNA Report
- [ ] **CLI-04**: `uidna synth <component>` command to synthesize a new component
- [ ] **CLI-05**: `uidna export` command with format flag (tokens, figma, tailwind, cssvars, json)
- [ ] **CLI-06**: MCP server mode exposing design DNA as queryable tools/resources
- [ ] **CLI-07**: Configuration via `uidna.config.json` (depth, limits, allowlist/denylist, strict robots, viewport sizes)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Accessibility Extraction

- **A11Y-01**: Extract ARIA patterns observed across pages
- **A11Y-02**: Detect focus visibility and keyboard navigation patterns
- **A11Y-03**: Check contrast ratios against WCAG standards
- **A11Y-04**: Map heading hierarchy and landmark usage

### Multi-Site Analysis

- **MULTI-01**: Extract common patterns across multiple domains
- **MULTI-02**: Differentiate shared vs site-specific design standards

### Advanced Export

- **ADV-01**: Design-to-code validation (compare extracted system against Figma designs)
- **ADV-02**: Visual regression test generation from extracted system
- **ADV-03**: Token usage analytics (where each token appears across site)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Vulnerability scanning | Not a security tool — extraction only |
| Auth/paywall bypass | Respects access boundaries and legal compliance |
| Proprietary asset redistribution | Exports exclude copyrighted assets by default |
| Uncited brand intent claims | All inferences must be labeled with confidence and evidence |
| Framework-specific component output (React/Vue/Svelte) | v1 outputs vanilla HTML/CSS; framework adapters are future work |
| Database storage (SQLite/Postgres) | v1 uses file-based JSON — simple, portable, git-friendly |
| Full-site crawls (1000+ pages) | Optimized for section-scoped crawling (20-100 pages) |
| Real-time live preview | Massive complexity; scheduled re-crawls with diff instead |
| In-browser design system editor | Read-only extraction; users edit output files directly |
| Automated design system governance | Can detect violations but can't enforce on external sites |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CRAWL-01 | Phase 1 | Pending |
| CRAWL-02 | Phase 1 | Pending |
| CRAWL-03 | Phase 1 | Pending |
| CRAWL-04 | Phase 1 | Pending |
| CRAWL-05 | Phase 1 | Pending |
| CRAWL-06 | Phase 1 | Pending |
| TOKEN-01 | Phase 1 | Pending |
| TOKEN-02 | Phase 1 | Pending |
| TOKEN-03 | Phase 1 | Pending |
| TOKEN-04 | Phase 1 | Pending |
| TOKEN-05 | Phase 1 | Pending |
| TOKEN-06 | Phase 1 | Pending |
| TOKEN-07 | Phase 1 | Pending |
| TOKEN-08 | Phase 1 | Pending |
| NORM-03 | Phase 1 | Pending |
| NORM-01 | Phase 2 | Pending |
| NORM-02 | Phase 2 | Pending |
| NORM-04 | Phase 2 | Pending |
| NORM-05 | Phase 2 | Pending |
| COMP-01 | Phase 2 | Pending |
| COMP-02 | Phase 2 | Pending |
| COMP-03 | Phase 2 | Pending |
| COMP-04 | Phase 2 | Pending |
| INFER-01 | Phase 3 | Pending |
| INFER-02 | Phase 3 | Pending |
| INFER-03 | Phase 3 | Pending |
| INFER-04 | Phase 3 | Pending |
| INFER-05 | Phase 3 | Pending |
| PATT-01 | Phase 4 | Pending |
| PATT-02 | Phase 4 | Pending |
| EXPORT-01 | Phase 5 | Pending |
| EXPORT-02 | Phase 5 | Pending |
| EXPORT-03 | Phase 5 | Pending |
| EXPORT-04 | Phase 5 | Pending |
| EXPORT-05 | Phase 5 | Pending |
| EXPORT-06 | Phase 5 | Pending |
| EXPORT-07 | Phase 5 | Pending |
| EXPORT-08 | Phase 5 | Pending |
| CLI-01 | Phase 6 | Pending |
| CLI-02 | Phase 6 | Pending |
| CLI-03 | Phase 6 | Pending |
| CLI-04 | Phase 6 | Pending |
| CLI-05 | Phase 6 | Pending |
| CLI-06 | Phase 6 | Pending |
| CLI-07 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-15 after roadmap creation*
