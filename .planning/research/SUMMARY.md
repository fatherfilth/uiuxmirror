# Research Summary: UIUX-Mirror (uidna)

**Domain:** UI/UX Design System Extraction & Inference Tools
**Researched:** 2026-02-15
**Overall Confidence:** MEDIUM

**Confidence Breakdown:**
- Stack recommendations: MEDIUM (training data through Jan 2025, versions should be verified)
- Architecture patterns: HIGH (established software patterns apply well)
- Feature landscape: MEDIUM (limited competitor verification)
- Pitfalls: MEDIUM (based on web scraping domain knowledge, not specific design extraction tools)

**Research Limitation:** Conducted without WebSearch/WebFetch access. Recommendations based on training data (current through January 2025) and established architectural patterns. Version numbers and emerging ecosystem changes should be verified against official sources.

---

## Executive Summary

UIUX-Mirror occupies a unique position in the design system tooling landscape: **extracting design systems FROM existing website implementations** rather than documenting manually-created systems (Storybook) or converting design files to code (Figma plugins). The core technical challenges are:

1. **Reliable extraction from modern web apps** - Handling CSS-in-JS, dynamic rendering, Shadow DOM, and anti-bot detection
2. **Cross-page pattern inference** - Distinguishing design system standards from one-off implementations
3. **Evidence-driven synthesis** - Using LLMs to generate new components while maintaining traceability to source evidence
4. **Legal and ethical compliance** - Respecting robots.txt, rate limits, and attribution requirements

The recommended stack centers on **Playwright** (only viable choice for computed styles), **TypeScript + Node.js** (ecosystem maturity), **Zod** (schema validation), **@anthropic-ai/sdk** (LLM integration), and **file-based JSON storage** (simplicity for v1 scope). The architecture follows a **6-layer pipeline** (Crawler → Extractors → Normalizer → Evidence Store → Inference Engine → Packager) with checkpointing for resilience.

**Critical success factors:**
- Computed styles over classnames (handles CSS-in-JS/hashed classes)
- Cross-page validation thresholds (prevents false positives)
- Evidence linking (every token/component traces to source)
- Hybrid inference (rules for structure, LLM for design judgment)

**Primary risks:**
- Dynamic content race conditions (CSS-in-JS injection timing)
- Anti-bot detection blocking crawls
- LLM hallucination in component naming
- Memory leaks on large crawls (100+ pages)

---

## Key Findings

### Stack
**Core:** Node.js 20.x LTS + TypeScript 5.4+ + tsx for zero-config execution. **Crawling:** Playwright (only tool with reliable computed style access). **CLI:** Commander.js (zero-bloat, excellent TS types). **LLM:** @anthropic-ai/sdk with prompt caching for token efficiency. **Validation:** Zod for runtime schema enforcement. **Testing:** Vitest (fastest TS test runner) + Playwright Test for e2e.

**Key decision:** File-based JSON storage over database for v1. Git-friendly, portable, sufficient for section-scoped crawls (20-100 pages).

### Architecture
**6-layer pipeline:** Crawler → Extractors → Normalizer → Evidence Store → Inference Engine → Packager. Each layer writes checkpoints to disk for fault tolerance. Evidence-driven schema: every observation links to source (URL, selector, screenshot, timestamp). Hybrid inference: deterministic rules for structural components, Claude API for nuanced design decisions.

**Key pattern:** Stream processing with backpressure. Process pages as crawled, not batch-load-then-process. Prevents memory bloat on large crawls.

### Critical Pitfall
**Dynamic content race conditions** - Modern sites use CSS-in-JS (styled-components, emotion, Stitches) that inject styles asynchronously. Naive `page.goto()` + immediate extraction misses styles. Must wait for library-specific markers (`[data-styled]`, `[data-emotion]`) and verify computed styles stabilize. **This breaks the entire tool if not handled in Phase 1.**

---

## Implications for Roadmap

The research reveals a clear dependency structure that drives phase ordering:

### Recommended Phase Structure

#### **Phase 1: Foundational Crawling & Core Extraction** (Must-Have Foundation)
**Rationale:** Everything depends on reliable page capture and computed style access. Dynamic content handling, anti-bot detection, and robots.txt compliance CANNOT be retrofitted—they must be architectural from day one.

**Addresses:**
- Playwright-based crawler with rate limiting and robots.txt compliance
- Dynamic content wait strategies (CSS-in-JS detection, framework-specific markers)
- Anti-bot stealth configuration (User-agent randomization, timing jitter)
- CSS token extraction (colors, typography, spacing via computed styles)
- File-based evidence storage (page URL, selector, timestamp)
- Memory management patterns (page.close() in finally blocks, stream processing)

**Avoids:**
- Dynamic content race conditions (Pitfall #1)
- Hashed classname brittleness (Pitfall #2)
- Anti-bot detection (Pitfall #3)
- Robots.txt parsing edge cases (Pitfall #7)
- Memory leaks (Pitfall #8)

**Deliverable:** `uidna crawl <url> --pages 50` produces `.uidna/raw/` with page data and `.uidna/observations/` with extracted tokens.

---

#### **Phase 2: Normalization & Cross-Page Validation** (Core Value)
**Rationale:** Raw observations are noisy (browser defaults, one-offs, slight variations). Normalization + deduplication transforms raw data into canonical design tokens. Cross-page validation distinguishes standards from outliers.

**Addresses:**
- Schema transformer (raw observations → canonical tokens/components)
- Deduplicator with fuzzy matching (color distance, unit normalization)
- Variant detector (identify size/color/state dimensions)
- Cross-page consistency thresholds (require 3+ instances before declaring standard)
- Evidence index linking observations to sources

**Avoids:**
- Computed style context loss (Pitfall #4)
- Cross-page consistency threshold tuning (Pitfall #6)
- Evidence quality vs. quantity tradeoff (Pitfall #9)

**Deliverable:** `.uidna/normalized/tokens.json` with canonical design tokens + evidence citations.

---

#### **Phase 3: Component Mining & Basic Synthesis** (Differentiation)
**Rationale:** Token extraction is table stakes. Component identification + LLM-powered synthesis is what differentiates UIUX-Mirror from simple CSS scrapers.

**Addresses:**
- Component miner (DOM signatures → buttons, cards, inputs)
- Rule-based synthesizer (template-based component generation)
- Claude API synthesizer (nuanced design decisions)
- Confidence scoring (evidence count + cross-page frequency + LLM certainty)
- Human-readable report (Markdown with token tables, component catalog)

**Avoids:**
- LLM hallucination in component naming (Pitfall #5)
- Shadow DOM blind spots (Pitfall #10) - if Web Components detected

**Deliverable:** `uidna report` generates Brand_DNA_Report.md + `uidna synth <component>` generates vanilla HTML/CSS stub.

---

#### **Phase 4: MCP Server & Advanced Extraction** (Polish & Ecosystem)
**Rationale:** With core extraction and synthesis proven, add AI agent integration (MCP) and advanced extractors (interaction patterns, content style, a11y).

**Addresses:**
- MCP server mode (expose design DNA as tools/resources)
- Interaction pattern detector (multi-page flows, auth sequences)
- Content style miner (voice/tone, microcopy patterns)
- Accessibility auditor (ARIA patterns, contrast ratios)
- Vanilla HTML/CSS stub generator

**Delivers:** Full feature set from PROJECT.md requirements.

---

### Phase Ordering Rationale

**Why this order:**

1. **Phase 1 before Phase 2:** Can't normalize data you don't have. Crawling foundation must handle dynamic content and anti-bot detection from start.

2. **Phase 2 before Phase 3:** Component mining depends on normalized tokens. Synthesis requires canonical design system as constraints.

3. **Phase 3 before Phase 4:** MCP server exposes synthesis capabilities, so synthesis must exist first. Advanced extractors are polish on proven foundation.

**Critical path:** Phase 1 (Crawling) → Phase 2 (Normalization) → Phase 3 (Synthesis)

**Parallel work possible:**
- Phase 2 (Normalizer) and Evidence Store can develop in parallel (both depend on Phase 1)
- Phase 4 extractors (interaction patterns, content, a11y) can develop in parallel (all consume crawled pages)

---

### Research Flags for Phases

**Phase 1: Likely needs deeper research**
- **CSS-in-JS library detection patterns** - Each framework (emotion, styled-components, Stitches, Panda CSS) has different injection markers. Need library-specific wait strategies.
- **Playwright stealth best practices 2026** - Anti-bot detection evolves rapidly. Verify current stealth configurations against Cloudflare, DataDome.
- **robots.txt compliance edge cases** - Verify `robots-parser` library handles wildcard matching, User-agent precedence, Crawl-delay correctly.

**Phase 2: Likely needs deeper research**
- **Design token semantic clustering** - Threshold tuning (color distance, size tolerance, spacing clusters) needs mathematical foundation, not guesswork. Research k-means, DBSCAN for style clustering.
- **Browser default style catalogs** - Need comprehensive list of browser defaults per property to filter from extracted tokens.

**Phase 3: Likely needs deeper research**
- **LLM prompt engineering for grounded inference** - Claude API capabilities may have evolved since Jan 2025 training cutoff. Verify structured output options, prompt caching API, tool use for component specs.
- **Component classification confidence scoring** - Need statistical approach to confidence (not arbitrary thresholds). Research evidence strength metrics.

**Phase 4: Standard patterns, unlikely to need research**
- MCP SDK integration follows standard patterns (tool definitions, resource exposure)
- Advanced extractors use same Playwright APIs as Phase 1, just different analysis logic

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | MEDIUM | Core choices (Playwright, TypeScript, Node) are HIGH confidence. Specific version numbers need verification (npm view). MCP SDK API may have evolved since Jan 2025. |
| **Features** | MEDIUM | Table stakes features (token extraction, evidence linking) are HIGH confidence based on domain expertise. Differentiators (AI synthesis, MCP) are MEDIUM confidence without current competitor analysis. |
| **Architecture** | HIGH | 6-layer pipeline, evidence-driven schema, hybrid inference are established patterns with strong rationale. Project structure and data flow well-defined. |
| **Pitfalls** | MEDIUM | Critical pitfalls (dynamic content, anti-bot, memory leaks) are HIGH confidence based on web scraping domain knowledge. Domain-specific pitfalls (design extraction nuances) are MEDIUM confidence without real-world postmortems. |

**Overall:** Research provides **actionable recommendations** with clear rationale. Primary limitation is inability to verify against current (2026) ecosystem state. Recommend validation during implementation:
- npm view for package versions
- Official docs for Playwright, Anthropic SDK, MCP SDK
- Test against real sites (CSS-in-JS, Web Components, anti-bot protection)

---

## Gaps to Address

### Research Gaps (Could Not Verify)

1. **Current state of AI design system tools (2026)** - Unknown if new competitors emerged since Jan 2025. Search "AI design system generation tools 2026" to assess landscape.

2. **MCP SDK API surface** - Model Context Protocol is relatively new (late 2024). API may have stabilized or changed. Verify official docs at modelcontextprotocol.io.

3. **W3C Design Token Spec updates** - Design Token Community Group may have published new standards. Check github.com/design-tokens/community-group for current format.

4. **Playwright anti-bot stealth (2026)** - Detection techniques evolve. Verify current best practices for Cloudflare, DataDome, custom bot detection.

5. **CSS-in-JS ecosystem (2026)** - New libraries may have emerged (Panda CSS, Vanilla Extract matured). Verify current library markers and injection patterns.

### Known Unknowns (Need Empirical Testing)

1. **Optimal evidence-to-accuracy ratio** - Unknown if screenshots improve LLM inference quality enough to justify storage cost. Need A/B testing: inference with vs. without screenshots.

2. **Cross-framework compatibility** - Unknown how well computed styles approach works on Svelte, SolidJS, Qwik. Limited test coverage in training data.

3. **Legal compliance beyond robots.txt** - Unknown if design system extraction constitutes fair use, derivative work, or copyright violation. Needs legal review for commercial use.

4. **Threshold tuning automation** - Unknown if unsupervised clustering (k-means, DBSCAN) can auto-determine deduplication thresholds without manual tuning. May need human-in-the-loop.

5. **Scale limits** - Unknown at what page count (500? 1000?) file-based architecture breaks and requires database. Needs load testing.

### Phase-Specific Research Needs

| Phase | What to Research | When | Why |
|-------|------------------|------|-----|
| **Phase 1** | CSS-in-JS library markers | Before implementation | Each library has different injection patterns - need library-specific wait strategies |
| **Phase 1** | Playwright stealth config | Before implementation | Anti-bot detection blocks entire tool if not handled correctly |
| **Phase 2** | Clustering algorithms for tokens | During implementation | Mathematical foundation for threshold tuning, not guesswork |
| **Phase 2** | Browser default styles catalog | During implementation | Must filter defaults from extracted tokens for quality |
| **Phase 3** | Claude API structured output | Before implementation | Verify current capabilities (may have evolved since Jan 2025) |
| **Phase 3** | Evidence-driven prompting | During implementation | Grounding LLM inference in visual evidence, not semantic guesses |
| **Phase 4** | MCP SDK tool definition patterns | Before implementation | Verify current API for exposing design DNA as tools/resources |

---

## Validation Checklist

Before starting implementation, validate these assumptions:

### Stack Validation
- [ ] Verify Playwright latest version supports all required features (computed styles, Shadow DOM, stealth)
- [ ] Check @anthropic-ai/sdk current version and prompt caching API
- [ ] Verify @modelcontextprotocol/sdk stability and tool definition patterns
- [ ] Confirm Zod, Commander, Vitest latest versions and compatibility

### Architecture Validation
- [ ] Test file-based storage performance with 100-page crawl (evidence index size, query speed)
- [ ] Verify stream processing pattern works with Playwright (async page iteration + extraction pipeline)
- [ ] Test checkpoint/resume pattern on network failure scenarios

### Feature Validation
- [ ] Identify 3-5 competitor tools (if any exist) and analyze feature gaps
- [ ] Validate W3C Design Token format is current standard (or if new format emerged)
- [ ] Check if Figma Dev Mode or Storybook added design extraction features

### Pitfall Validation
- [ ] Test on CSS-in-JS site (e.g., styled-components) to validate dynamic content handling
- [ ] Test on Cloudflare-protected site to validate anti-bot detection avoidance
- [ ] Test on Web Component site (Shoelace) to validate Shadow DOM extraction
- [ ] Profile memory usage on 100+ page crawl to validate no leaks

---

## Recommended Next Steps

1. **Validate stack versions** - Run `npm view <package> version` for all recommended packages
2. **Set up test site matrix** - Identify representative sites for each challenge:
   - CSS-in-JS: styled-components example site
   - Web Components: Shoelace docs
   - Anti-bot: Cloudflare-protected site
   - Large crawl: 100+ page documentation site
3. **Verify MCP SDK docs** - Check modelcontextprotocol.io for current API patterns
4. **Prototype Phase 1 critical path** - Playwright setup + dynamic content detection + computed style extraction
5. **Test evidence storage pattern** - Verify file-based index performance with realistic data volumes

---

## Sources

### Training Data Sources (MEDIUM Confidence)
- Playwright documentation and ecosystem patterns (playwright.dev)
- TypeScript/Node.js tooling standards (typescriptlang.org, nodejs.org)
- Web scraping best practices (general domain knowledge)
- Design system tooling landscape (Storybook, Style Dictionary, Figma plugins)
- LLM integration patterns (Anthropic SDK, structured output)
- CSS-in-JS ecosystem characteristics (styled-components, emotion, etc.)

### Project-Specific Sources (HIGH Confidence)
- UIUX-Mirror PROJECT.md (requirements, constraints, architecture decisions)
- Project context provided by orchestrator (greenfield, TypeScript/Node, CLI + MCP)

### Verification Needed
- [ ] Playwright current version and features (playwright.dev/docs)
- [ ] Anthropic SDK current version and API (docs.anthropic.com)
- [ ] Model Context Protocol SDK (modelcontextprotocol.io)
- [ ] npm registry for package versions (npm view <package>)
- [ ] W3C Design Token spec (github.com/design-tokens/community-group)
- [ ] CSS-in-JS library current markers (styled-components, emotion, Stitches docs)

**Overall Confidence:** MEDIUM - Architectural recommendations are sound and well-reasoned, but ecosystem-specific details (versions, APIs, competitors) require verification against current sources. Research provides strong foundation for roadmap creation despite verification limitations.

---

*Research Summary for: UIUX-Mirror (uidna)*
*Researched: 2026-02-15*
*Mode: Comprehensive project research (Stack, Features, Architecture, Pitfalls)*
*Researcher: GSD Project Researcher Agent*
