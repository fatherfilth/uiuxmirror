# UIUX-Mirror ("uidna")

## What This Is

A TypeScript/Node CLI tool and MCP server that crawls a target website, extracts its UI/UX design DNA (tokens, components, interaction patterns, content rules, accessibility standards), and produces a portable design-system package. It can also synthesize new components in the brand's style using a hybrid inference engine (deterministic rules + Claude API), with confidence scoring and evidence citations back to the source site.

## Core Value

Every extracted standard and inferred component must trace back to observable evidence from the source site — no unanchored design guesses.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

- [ ] Crawl a site section (20-100 pages) respecting robots.txt and rate limits
- [ ] Extract CSS tokens (colors, typography, spacing, radii, shadows, z-index, motion)
- [ ] Mine components from DOM structures (buttons, inputs, cards, nav, modals) with variants and states
- [ ] Detect interaction patterns across pages (multi-step forms, search, filters, auth flows)
- [ ] Capture content standards (voice/tone, microcopy, CTA hierarchy, error grammar)
- [ ] Check accessibility (contrast, focus visibility, keyboard flows, ARIA patterns)
- [ ] Normalize raw observations into canonical token/component schemas with deduplication
- [ ] Store evidence (page URL, DOM selector, computed styles, screenshot crops, timestamps)
- [ ] Synthesize unknown components using extracted DNA as constraints (hybrid: rules + Claude)
- [ ] Emit confidence scores and evidence citations for all inferences
- [ ] Generate human-readable Brand/UI DNA Report (Markdown)
- [ ] Export machine-readable packages (tokens.json, components.json, patterns.json, content_style.json, evidence_index.json)
- [ ] Generate framework-agnostic component stubs (vanilla HTML/CSS)
- [ ] Provide CLI commands: crawl, extract, report, synth, export
- [ ] Serve as MCP server for AI agent queries against extracted DNA

### Out of Scope

- Vulnerability scanning — not a security tool
- Auth/paywall bypass — respects access boundaries
- Proprietary asset redistribution — exports exclude copyrighted assets by default
- Claiming brand intent without evidence — all inferences must be labeled
- Framework-specific output (React/Vue/Svelte adapters) — v1 is vanilla HTML/CSS only
- Database storage — v1 uses file-based JSON, no SQLite
- Full-site crawls (1000+ pages) — optimized for section-scoped crawling
- Mobile app — CLI and MCP server only

## Context

**Tech stack:**
- TypeScript/Node runtime
- Playwright for headless browser crawling (handles dynamic rendering, CSS-in-JS)
- Anthropic SDK (Claude API) for inference engine's LLM-driven design reasoning
- File-based storage: JSON files in output directory, git-friendly and portable

**Architecture (6 layers):**
1. **Crawler** — Playwright-based, seed URLs + domain allowlist + depth + rate limits
2. **Extractors** — CSS token extractor, component miner, pattern miner, content miner
3. **Normalizer** — Canonical schemas, deduplication, variant dimension detection
4. **Evidence Store** — File-based index linking every observation to source URL/selector/screenshot
5. **Inference Engine** — Hybrid: deterministic rules for structure/tokens, Claude for nuanced design decisions (motion, edge states, copy)
6. **Packager** — Generates docs/, tokens/, ui/ stubs, examples/

**Key design decisions:**
- Computed styles + DOM signatures over classnames (handles CSS-in-JS / hashed classes)
- Cross-page evidence thresholds before declaring something a "standard"
- Strict robots.txt mode defaults on

**Target users:**
- Designers reverse-engineering competitor UI systems
- Product teams benchmarking UX patterns
- Engineers generating token files and starter component libraries
- AI agents querying "How would brand X design component Y?"

## Constraints

- **Legal**: Must obey robots.txt (configurable strict mode), rate limits, and attribution requirements
- **Reproducibility**: Identical extraction outputs given same site snapshot (within tolerance)
- **Evidence threshold**: No standard declared without cross-page corroboration
- **Inference transparency**: All synthesized components must emit confidence + source evidence

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript/Node runtime | Playwright native, npm ecosystem, MCP server support | — Pending |
| Hybrid inference (rules + Claude) | Deterministic for tokens/structure, LLM for nuanced design judgment | — Pending |
| File-based storage (JSON) | Simple, portable, git-friendly; no database complexity for v1 | — Pending |
| Framework-agnostic output | Vanilla HTML/CSS by default; framework adapters are future work | — Pending |
| CLI + MCP server | Serves both human users and AI agent consumers | — Pending |
| Playwright for crawling | Handles dynamic rendering, CSS-in-JS, computed styles | — Pending |
| Section-scoped crawls (20-100 pages) | Balances coverage with speed and legal compliance | — Pending |

---
*Last updated: 2026-02-15 after initialization*
