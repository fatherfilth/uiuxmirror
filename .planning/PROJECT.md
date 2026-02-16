# UIUX-Mirror ("uidna")

## What This Is

A TypeScript/Node CLI tool and MCP server that crawls a target website, extracts its complete UI/UX design DNA (tokens, components, interaction patterns, content rules), and produces a portable design-system package. It synthesizes new components in the brand's style using a hybrid inference engine (deterministic rules + Claude API), with confidence scoring and evidence citations tracing every decision back to the source site.

## Core Value

Every extracted standard and inferred component must trace back to observable evidence from the source site — no unanchored design guesses.

## Requirements

### Validated

- ✓ Crawl a site section (20-100 pages) respecting robots.txt and rate limits — v1.0
- ✓ Extract CSS tokens (colors, typography, spacing, radii, shadows, z-index, motion, icons, imagery) — v1.0
- ✓ Mine components from DOM structures with variants and interactive states — v1.0
- ✓ Detect interaction patterns across pages (multi-step forms, search, filters, auth flows) — v1.0
- ✓ Capture content standards (voice/tone, microcopy, CTA hierarchy, error grammar) — v1.0
- ✓ Normalize raw observations into canonical token/component schemas with deduplication — v1.0
- ✓ Store evidence (page URL, DOM selector, computed styles, screenshot crops, timestamps) — v1.0
- ✓ Synthesize unknown components using extracted DNA as constraints (hybrid: rules + Claude) — v1.0
- ✓ Emit confidence scores and evidence citations for all inferences — v1.0
- ✓ Generate human-readable Brand DNA Report and Content Style Guide — v1.0
- ✓ Export machine-readable packages (tokens.json, components.json, patterns.json, content_style.json, evidence_index.json) — v1.0
- ✓ Generate framework-agnostic component stubs (vanilla HTML/CSS) — v1.0
- ✓ Export multiple formats (CSS variables, Tailwind config, Figma tokens) — v1.0
- ✓ Provide CLI commands: crawl, extract, report, synth, export — v1.0
- ✓ Serve as MCP server for AI agent queries against extracted DNA — v1.0

### Active

- [ ] Extract ARIA patterns and focus/keyboard navigation patterns observed across pages
- [ ] Check contrast ratios against WCAG standards
- [ ] Map heading hierarchy and landmark usage
- [ ] Extract common patterns across multiple domains
- [ ] Design-to-code validation (compare extracted system against Figma designs)

### Out of Scope

- Vulnerability scanning — not a security tool
- Auth/paywall bypass — respects access boundaries
- Proprietary asset redistribution — exports exclude copyrighted assets by default
- Claiming brand intent without evidence — all inferences must be labeled
- Framework-specific output (React/Vue/Svelte adapters) — vanilla HTML/CSS only for now
- Database storage — file-based JSON, no SQLite
- Full-site crawls (1000+ pages) — optimized for section-scoped crawling
- Mobile app — CLI and MCP server only
- Real-time live preview — re-crawl with diff instead
- Offline mode — evidence traceability is core value

## Context

**Shipped v1.0 with 27,137 LOC TypeScript.**

**Tech stack:**
- TypeScript/Node runtime (ESM-only)
- Playwright for headless browser crawling (handles dynamic rendering, CSS-in-JS)
- Crawlee for crawl orchestration
- Anthropic SDK (Claude Sonnet 4.5) for inference engine's LLM-driven design reasoning
- culori for perceptual color distance (CIEDE2000)
- Graphology for interaction flow graph analysis
- Compromise NLP for voice/tone analysis
- Handlebars for component template rendering
- Zod for schema validation
- File-based storage: JSON files in .uidna/ directory, git-friendly and portable

**Architecture (6 layers):**
1. **Crawler** — Playwright-based, seed URLs + domain allowlist + depth + rate limits + stealth
2. **Extractors** — 8 token extractors (colors, typography, spacing, custom props, radii, shadows, z-index, motion, icons, imagery) + component miner + pattern detector + content analyzer
3. **Normalizer** — CIEDE2000 color clustering, unit normalization, cross-page validation (3+ page threshold), W3C DTCG format, confidence scoring
4. **Evidence Store** — File-based index linking every observation to source URL/selector/screenshot with in-memory caching
5. **Inference Engine** — Hybrid: deterministic rules (6 Handlebars templates) for structure/tokens, Claude Sonnet for nuanced design decisions (motion, edge states, copy), anti-hallucination validation
6. **Packager** — 11+ export generators: dual-layer JSON, CSS vars, Tailwind config, Figma tokens, Brand DNA Report, Content Style Guide, component stubs

**Known tech debt (minor):**
- `totalPages` hardcoded to 1 in export/report/synth commands (cosmetic metadata only)
- Component detection skipped in `extract` command (detected during crawl phase instead)
- Visual CTA hierarchy and voice/tone accuracy need validation on real brand sites

## Constraints

- **Legal**: Must obey robots.txt (configurable strict mode), rate limits, and attribution requirements
- **Reproducibility**: Identical extraction outputs given same site snapshot (within tolerance)
- **Evidence threshold**: No standard declared without cross-page corroboration (3+ pages)
- **Inference transparency**: All synthesized components must emit confidence + source evidence
- **Anti-hallucination**: Every color/token value in synthesized output must trace to extracted DNA

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript/Node runtime | Playwright native, npm ecosystem, MCP server support | ✓ Good |
| ESM-only module system | Modern Node.js compatibility, tree-shaking | ✓ Good |
| Hybrid inference (rules + Claude) | Deterministic for tokens/structure, LLM for nuanced design judgment | ✓ Good |
| File-based storage (JSON) | Simple, portable, git-friendly; no database complexity for v1 | ✓ Good |
| Framework-agnostic output | Vanilla HTML/CSS by default; framework adapters are future work | ✓ Good |
| CLI + MCP server | Serves both human users and AI agent consumers | ✓ Good |
| Playwright for crawling | Handles dynamic rendering, CSS-in-JS, computed styles | ✓ Good |
| Section-scoped crawls (20-100 pages) | Balances coverage with speed and legal compliance | ✓ Good |
| CIEDE2000 color distance (culori) | Perceptual accuracy for color deduplication (JND threshold 2.3) | ✓ Good |
| W3C DTCG token format | Industry standard, interoperable with design tools | ✓ Good |
| Cross-page threshold (3+ pages) | Filters noise while catching genuine design patterns | ✓ Good |
| String-based page.evaluate() | Avoids esbuild __name decorator injection in browser context | ✓ Good — critical fix |
| Claude Sonnet for LLM refinement | Cost-appropriate for motion/microcopy decisions, graceful degradation without API key | ✓ Good |
| Vitest for testing | Fast, ESM-native, Playwright-compatible, 333 tests passing | ✓ Good |
| Dual-layer JSON exports | Quick layer for developers, rich layer for AI agents | ✓ Good |
| Anti-hallucination validation | All synthesized values traced to source DNA in integration tests | ✓ Good |

---
*Last updated: 2026-02-16 after v1.0 milestone*
