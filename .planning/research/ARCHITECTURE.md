# Architecture Research

**Domain:** UI/UX Design System Extraction & Inference Pipeline
**Researched:** 2026-02-15
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                          CLI / MCP Server                              │
│                     (Command orchestration layer)                      │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                      LAYER 1: Crawler                         │    │
│  │  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐      │    │
│  │  │ URL Queue  │→ │ Page Fetcher │→ │ Rate Limiter     │      │    │
│  │  │ Manager    │  │ (Playwright) │  │ & Robots.txt     │      │    │
│  │  └────────────┘  └──────────────┘  └──────────────────┘      │    │
│  │         ↓                                                      │    │
│  │  ┌────────────────────────────────────────────────────────┐   │    │
│  │  │        Raw Page Data (HTML, Computed Styles)            │   │    │
│  │  └────────────────────────────────────────────────────────┘   │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              ↓                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                   LAYER 2: Extractors                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │    │
│  │  │ Token    │  │Component │  │ Pattern  │  │ Content  │      │    │
│  │  │Extractor │  │  Miner   │  │ Detector │  │  Miner   │      │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │    │
│  │       │             │             │             │             │    │
│  │       ↓             ↓             ↓             ↓             │    │
│  │  ┌─────────────────────────────────────────────────────────┐  │    │
│  │  │      Raw Observations (undeduped, unnormalized)         │  │    │
│  │  └─────────────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              ↓                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                   LAYER 3: Normalizer                         │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │    │
│  │  │ Schema       │  │ Deduplicator │  │ Variant      │        │    │
│  │  │ Transformer  │  │ & Clusterer  │  │ Detector     │        │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │    │
│  │                          ↓                                    │    │
│  │  ┌─────────────────────────────────────────────────────────┐  │    │
│  │  │       Canonical Design Tokens & Component Specs         │  │    │
│  │  └─────────────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              ↓                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                 LAYER 4: Evidence Store                       │    │
│  │  ┌──────────────────────────────────────────────────────┐    │    │
│  │  │  File-Based Index (JSON + Screenshot crops)          │    │    │
│  │  │  evidence_index.json → { observation → sources[] }   │    │    │
│  │  └──────────────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              ↓                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                LAYER 5: Inference Engine                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │    │
│  │  │ Rule-Based   │  │ Claude API   │  │ Confidence   │        │    │
│  │  │ Synthesizer  │  │ Synthesizer  │  │ Scorer       │        │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │    │
│  │                          ↓                                    │    │
│  │  ┌─────────────────────────────────────────────────────────┐  │    │
│  │  │   Synthesized Components (with confidence + evidence)   │  │    │
│  │  └─────────────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                              ↓                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                    LAYER 6: Packager                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │    │
│  │  │ JSON         │  │ Markdown     │  │ Code Stub    │        │    │
│  │  │ Exporter     │  │ Report Gen   │  │ Generator    │        │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │    │
│  │                          ↓                                    │    │
│  │  ┌─────────────────────────────────────────────────────────┐  │    │
│  │  │  Output Package: tokens/ ui/ docs/ evidence/ examples/  │  │    │
│  │  └─────────────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **URL Queue Manager** | Seeds, discovered URLs, depth tracking, visited set | In-memory Set + priority queue, persistent checkpoint JSON |
| **Page Fetcher** | Navigate, wait for render, capture HTML + computed styles | Playwright Page with network idle wait, style computation via page.evaluate() |
| **Rate Limiter** | Enforce crawl delay, concurrent request limits | Bottleneck library or simple promise queue with configurable delays |
| **Robots.txt Parser** | Respect disallow rules, crawl-delay directives | robots-parser npm package, check before fetch |
| **Token Extractor** | Parse CSS vars, computed styles → design tokens | getComputedStyle() traversal, CSS variable detection, value clustering |
| **Component Miner** | DOM signatures → component types (button, card, etc.) | Heuristic rules (tag + role + class patterns), visual bounding box analysis |
| **Pattern Detector** | Cross-page interaction patterns (multi-step flows, filters) | State machine detection, form flow analysis, URL pattern correlation |
| **Content Miner** | Microcopy, voice/tone, error messages, CTAs | Text extraction + categorization (regex + optional LLM classification) |
| **Schema Transformer** | Raw observations → canonical token/component schemas | JSON schema validators, type coercion, unit normalization (px → rem) |
| **Deduplicator** | Merge similar observations, detect variants | Fuzzy matching (color distance, text similarity), clustering algorithms |
| **Variant Detector** | Identify dimensions (size, color, state) across instances | Statistical analysis of property variations, common property pattern detection |
| **Evidence Store** | Link every observation to source (URL, selector, screenshot) | File-based JSON index, screenshot crops saved as PNGs, SHA-256 content hashing |
| **Rule-Based Synthesizer** | Generate structural components from templates | Template engine (Handlebars/EJS) with token substitution |
| **Claude API Synthesizer** | Nuanced design decisions (motion, edge states, copy) | Anthropic SDK with structured prompts, JSON schema enforcement via tool use |
| **Confidence Scorer** | Assign reliability scores based on evidence strength | Evidence count + cross-page frequency + Claude confidence if LLM-inferred |
| **JSON Exporter** | Write tokens.json, components.json, patterns.json | fs-extra with atomic writes, JSON schema validation |
| **Markdown Report Gen** | Human-readable Brand DNA report | Template-based MD generation with charts (via mermaid syntax) |
| **Code Stub Generator** | Vanilla HTML/CSS component implementations | Template-based with token references, accessibility attributes |

## Recommended Project Structure

```
src/
├── cli/                    # CLI entry point (commander.js)
│   ├── commands/           # crawl, extract, report, synth, export commands
│   └── index.ts            # CLI main
├── mcp-server/             # MCP server entry point
│   ├── tools/              # MCP tool definitions (query DNA, synthesize)
│   └── index.ts            # MCP server main
├── crawler/                # Layer 1: Crawler
│   ├── queue-manager.ts    # URL queue with depth tracking
│   ├── page-fetcher.ts     # Playwright wrapper
│   ├── rate-limiter.ts     # Rate limiting logic
│   ├── robots-parser.ts    # robots.txt compliance
│   └── types.ts            # CrawlConfig, PageData types
├── extractors/             # Layer 2: Extractors
│   ├── token-extractor.ts  # CSS tokens (colors, typography, spacing, etc.)
│   ├── component-miner.ts  # DOM → component detection
│   ├── pattern-detector.ts # Interaction patterns
│   ├── content-miner.ts    # Voice/tone/microcopy
│   ├── shared/             # Shared utilities (selectors, heuristics)
│   └── types.ts            # RawObservation types
├── normalizer/             # Layer 3: Normalizer
│   ├── schema-transformer.ts   # Raw → canonical schemas
│   ├── deduplicator.ts         # Merge similar observations
│   ├── variant-detector.ts     # Detect variant dimensions
│   ├── schemas/                # JSON schemas for tokens/components
│   └── types.ts                # CanonicalToken, CanonicalComponent types
├── evidence/               # Layer 4: Evidence Store
│   ├── evidence-store.ts   # File-based evidence index
│   ├── screenshot-manager.ts   # Crop and save evidence images
│   └── types.ts            # EvidenceEntry, EvidenceIndex types
├── inference/              # Layer 5: Inference Engine
│   ├── rule-synthesizer.ts     # Template-based synthesis
│   ├── claude-synthesizer.ts   # LLM-based synthesis
│   ├── confidence-scorer.ts    # Scoring logic
│   ├── prompts/                # Claude prompt templates
│   └── types.ts                # SynthesisRequest, InferredComponent types
├── packager/               # Layer 6: Packager
│   ├── json-exporter.ts    # tokens.json, components.json, etc.
│   ├── report-generator.ts # Markdown Brand DNA report
│   ├── stub-generator.ts   # Vanilla HTML/CSS stubs
│   ├── templates/          # Report and stub templates
│   └── types.ts            # PackageConfig types
├── shared/                 # Shared utilities
│   ├── logger.ts           # Winston or Pino logger
│   ├── config.ts           # Configuration loader
│   ├── errors.ts           # Custom error classes
│   └── utils.ts            # Common helpers
└── index.ts                # Library entry point (for programmatic use)
```

### Structure Rationale

- **Layer-based organization:** Mirrors the 6-layer architecture, clear data flow from crawl → extract → normalize → store → infer → package
- **Extractors as plugins:** Each extractor is independent, can be enabled/disabled, tested in isolation
- **Evidence co-located:** Evidence store is its own layer, all other layers reference it
- **Inference separated from extraction:** Rule-based and LLM-based synthesis are distinct but share confidence scoring
- **CLI and MCP separate entry points:** Both consume the same core libraries, different interfaces

## Architectural Patterns

### Pattern 1: Pipeline with Checkpointing

**What:** Each layer writes intermediate results to disk, enabling resume-from-checkpoint on failure

**When to use:** Always for web crawling (network failures, rate limits), especially for large crawls

**Trade-offs:**
- **Pros:** Resilient to failures, debuggable (inspect intermediate data), parallelizable
- **Cons:** More I/O overhead, need disk space management

**Example:**
```typescript
// After each crawl batch
async function crawlBatch(urls: string[], checkpoint: CrawlCheckpoint) {
  for (const url of urls) {
    const pageData = await fetchPage(url);
    await saveRawPage(pageData); // Write to disk
    checkpoint.visited.add(url);
    await saveCheckpoint(checkpoint); // Update checkpoint
  }
}

// Resume from checkpoint
const checkpoint = await loadCheckpoint() ?? createNewCheckpoint();
const remainingUrls = allUrls.filter(u => !checkpoint.visited.has(u));
await crawlBatch(remainingUrls, checkpoint);
```

### Pattern 2: Evidence-Driven Schema

**What:** Every normalized observation includes `evidenceIds: string[]` linking to raw source data

**When to use:** Always for this domain — traceability is a core requirement

**Trade-offs:**
- **Pros:** Audit trail, confidence scoring, debugging, legal compliance (attribution)
- **Cons:** Larger output files, need evidence garbage collection strategy

**Example:**
```typescript
interface CanonicalToken {
  type: 'color' | 'typography' | 'spacing';
  name: string;
  value: string;
  evidenceIds: string[]; // ["evidence-abc123", "evidence-def456"]
  confidence: number;
}

interface EvidenceEntry {
  id: string;
  pageUrl: string;
  selector: string;
  timestamp: string;
  screenshotPath?: string;
  computedStyles: Record<string, string>;
}
```

### Pattern 3: Hybrid Inference (Rules + LLM)

**What:** Use deterministic rules for structural/token synthesis, delegate nuanced decisions to Claude

**When to use:** When you need both speed (rules) and design judgment (LLM)

**Trade-offs:**
- **Pros:** Fast for common cases, smart for edge cases, cost-efficient (minimize API calls)
- **Cons:** Need clear boundary between rule-based and LLM-based, potential inconsistency

**Example:**
```typescript
async function synthesizeComponent(request: SynthesisRequest): Promise<InferredComponent> {
  // Try rule-based first
  if (isStructuralComponent(request.type)) {
    const component = ruleSynthesizer.synthesize(request);
    return { ...component, confidence: 0.9, method: 'rule-based' };
  }

  // Fall back to Claude for nuanced cases
  const component = await claudeSynthesizer.synthesize(request);
  return { ...component, confidence: 0.7, method: 'llm' };
}

function isStructuralComponent(type: string): boolean {
  // Simple structural components can be rule-based
  return ['button', 'input', 'card', 'badge'].includes(type);
}
```

### Pattern 4: Stream Processing with Backpressure

**What:** Process pages as they're crawled (streaming), not batch-load-then-process

**When to use:** For crawls with >50 pages, to avoid memory bloat

**Trade-offs:**
- **Pros:** Constant memory usage, early results, better for large crawls
- **Cons:** More complex error handling, harder to parallelize extraction

**Example:**
```typescript
import { pipeline } from 'stream/promises';

const crawlStream = createCrawlStream(seedUrls);
const extractStream = createExtractStream();
const normalizeStream = createNormalizeStream();
const evidenceStream = createEvidenceStoreStream();

await pipeline(
  crawlStream,
  extractStream,
  normalizeStream,
  evidenceStream
);
```

### Pattern 5: Feature Extraction with Dimensionality Reduction

**What:** Extract many DOM/style features, then cluster to find canonical patterns

**When to use:** Component variant detection, deduplication

**Trade-offs:**
- **Pros:** Handles CSS-in-JS, hashed classes, finds variants automatically
- **Cons:** Complex, may need tuning thresholds, false positives possible

**Example:**
```typescript
interface DOMSignature {
  tagName: string;
  role?: string;
  computedStyles: Record<string, string>;
  childCount: number;
  textContent: string;
  visualMetrics: { width: number; height: number; aspectRatio: number };
}

function clusterSimilarComponents(signatures: DOMSignature[]): ComponentCluster[] {
  // Extract feature vectors
  const vectors = signatures.map(s => [
    tagNameHash(s.tagName),
    colorDistance(s.computedStyles.color, baseColor),
    s.visualMetrics.aspectRatio,
    // ... other features
  ]);

  // Cluster using k-means or DBSCAN
  const clusters = kmeans(vectors, { k: 'auto' });

  // Each cluster = one component with N variants
  return clusters.map(c => ({
    componentType: inferComponentType(c.centroid),
    variants: c.members.map(m => signatures[m])
  }));
}
```

## Data Flow

### End-to-End Flow

```
1. CLI Command (e.g., `uidna crawl https://example.com/docs`)
    ↓
2. Crawler Layer
    ├─ Seed URL → URL Queue
    ├─ Fetch pages (Playwright) → Raw HTML + Computed Styles
    ├─ Discover new URLs → Back to Queue (if within depth/domain)
    └─ Save raw page data → .uidna/raw/{page-id}.json
    ↓
3. Extractor Layer (per page)
    ├─ Token Extractor → Raw color/typography/spacing observations
    ├─ Component Miner → Raw component signatures (DOM patterns)
    ├─ Pattern Detector → Raw interaction patterns
    └─ Content Miner → Raw microcopy/voice observations
    ↓ (all extractors write to)
    .uidna/observations/{page-id}-{extractor}.json
    ↓
4. Normalizer Layer (across all pages)
    ├─ Load all observations
    ├─ Schema Transformer → Canonical schemas
    ├─ Deduplicator → Merge similar observations
    ├─ Variant Detector → Identify variant dimensions
    └─ Write normalized data → .uidna/normalized/{tokens,components,patterns}.json
    ↓
5. Evidence Store (parallel with normalization)
    ├─ For each observation → Create evidence entry
    ├─ Link observation → [page URLs, selectors]
    ├─ Crop screenshots for visual evidence
    └─ Write evidence index → .uidna/evidence/index.json + screenshots/
    ↓
6. Inference Engine (optional, user-triggered)
    ├─ Load normalized data as constraints
    ├─ User requests synthesis: "Generate loading spinner in brand style"
    ├─ Rule Synthesizer OR Claude Synthesizer
    ├─ Confidence Scorer → Assign score based on evidence strength
    └─ Return inferred component with citations
    ↓
7. Packager Layer
    ├─ JSON Exporter → tokens.json, components.json, patterns.json
    ├─ Report Generator → Brand_DNA_Report.md (with mermaid charts)
    ├─ Stub Generator → vanilla HTML/CSS components in ui/
    └─ Write package → output/{site-name}/
    ↓
8. Output Package
    output/example-com/
    ├── tokens/
    │   ├── colors.json
    │   ├── typography.json
    │   └── spacing.json
    ├── components/
    │   └── components.json
    ├── patterns/
    │   └── patterns.json
    ├── evidence/
    │   ├── index.json
    │   └── screenshots/
    ├── ui/
    │   ├── button.html
    │   └── card.html
    └── Brand_DNA_Report.md
```

### State Management

**Crawl State:**
```
{
  seed: string[],
  visited: Set<string>,
  queue: PriorityQueue<{ url: string, depth: number }>,
  failed: Map<string, Error>,
  checkpointPath: string
}
```

**Evidence State:**
```
{
  observations: Map<observationId, RawObservation>,
  evidence: Map<evidenceId, EvidenceEntry>,
  index: Map<observationId, evidenceId[]>
}
```

**Inference State:**
```
{
  extractedDNA: { tokens, components, patterns },
  synthesisCache: Map<requestHash, InferredComponent>,
  confidenceThreshold: number
}
```

### Key Data Flows

1. **Crawl → Extract:** Raw HTML + styles → Multiple extractors in parallel → Observations written to disk
2. **Extract → Normalize:** All observation files loaded → Deduplicated → Canonical schemas written
3. **Normalize → Evidence:** Observation IDs → Evidence entries with source links → Screenshot crops
4. **Evidence + DNA → Inference:** User query + extracted DNA as constraints → Claude API → Synthesized component + confidence
5. **All → Package:** Normalized data + evidence + inferred components → JSON + Markdown + HTML/CSS stubs

## Build Order & Dependencies

### Phase 1: Foundation (no inter-layer dependencies)
1. **Shared utilities** (`logger.ts`, `config.ts`, `errors.ts`) — needed by all layers
2. **Type definitions** (`types.ts` in each layer) — contracts between layers

### Phase 2: Crawler (depends on: Shared)
3. **Rate Limiter** — independent, testable
4. **Robots.txt Parser** — independent
5. **Page Fetcher** — uses Rate Limiter, Robots Parser
6. **URL Queue Manager** — uses Page Fetcher
7. **Crawler integration** — orchestrates all crawler components

### Phase 3: Extractors (depends on: Shared, Crawler for test data)
8. **Token Extractor** — independent, can test with static HTML
9. **Component Miner** — independent
10. **Pattern Detector** — may need cross-page data, but can start with single-page
11. **Content Miner** — independent

### Phase 4: Normalizer (depends on: Extractors)
12. **JSON Schemas** — define canonical formats first
13. **Schema Transformer** — uses schemas, transforms raw → canonical
14. **Deduplicator** — uses canonical schemas
15. **Variant Detector** — uses deduplicated data

### Phase 5: Evidence Store (depends on: Crawler for screenshots, Extractors for observations)
16. **Screenshot Manager** — independent, can test with static images
17. **Evidence Store** — uses Screenshot Manager, links to observations

### Phase 6: Inference Engine (depends on: Normalizer, Evidence)
18. **Confidence Scorer** — independent, testable with mock evidence
19. **Rule Synthesizer** — uses normalized tokens/components, templates
20. **Claude Synthesizer** — uses normalized DNA, Anthropic SDK
21. **Inference orchestrator** — coordinates rule vs. LLM decision

### Phase 7: Packager (depends on: all previous layers)
22. **JSON Exporter** — uses normalized data
23. **Markdown Report Generator** — uses all data (tokens, components, patterns, evidence)
24. **Code Stub Generator** — uses normalized components, templates

### Phase 8: Interfaces (depends on: all layers)
25. **CLI commands** — orchestrate full pipeline
26. **MCP server tools** — query DNA, invoke synthesis

### Dependency Graph

```
Shared Utilities (1)
    ↓
┌───┴───┬───────────┬──────────┬─────────┐
│       │           │          │         │
Crawler Extractors Normalizer Evidence Inference
(2)     (3)        (4→3)      (5→2,3)   (6→4,5)
│       │           │          │         │
└───┬───┴───────────┴──────────┴─────────┘
    ↓
Packager (7 → all)
    ↓
CLI / MCP (8 → all)
```

**Critical path:** Shared → Crawler → Extractors → Normalizer → Packager → CLI

**Parallel workstreams:**
- Evidence Store can be built in parallel with Normalizer (both depend on Extractors)
- Inference Engine can be started once Normalizer schemas are stable

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 20-100 pages (target) | Default architecture works. Single-threaded crawler with queue is sufficient. Evidence store in JSON files is fine. |
| 100-500 pages | Add parallel page fetching (5-10 concurrent Playwright contexts). Implement evidence pagination (split evidence index by page range). |
| 500-1000 pages | Stream processing (don't load all observations into memory). Compress evidence screenshots. Consider SQLite for evidence index (faster queries). |
| 1000+ pages | Out of scope for v1, but would need: distributed crawl (multiple workers), database storage (PostgreSQL), incremental extraction (only re-extract changed pages). |

### Scaling Priorities

1. **First bottleneck:** Playwright page fetching (slow, ~1-2s per page)
   - **Fix:** Parallel fetching (multiple browser contexts), but respect rate limits (default: 5 concurrent max)

2. **Second bottleneck:** Evidence storage I/O (many small screenshot files)
   - **Fix:** Batch writes, compress PNGs, lazy-load screenshots on demand

3. **Third bottleneck:** LLM API calls during inference (if synthesizing many components)
   - **Fix:** Batch synthesis requests, cache results, prefer rule-based when possible

## Anti-Patterns

### Anti-Pattern 1: Classname-Dependent Extraction

**What people do:** Parse CSS class names to infer component types (e.g., `btn-primary` → "button")

**Why it's wrong:** Breaks with CSS-in-JS (hashed classes like `css-1x7f3k2`), Tailwind (utility classes), scoped styles

**Do this instead:** Use computed styles + DOM structure + ARIA roles. Example:
```typescript
// BAD
if (element.className.includes('btn')) return 'button';

// GOOD
const role = element.getAttribute('role');
const tag = element.tagName.toLowerCase();
const styles = getComputedStyle(element);
const isInteractive = styles.cursor === 'pointer';
if ((tag === 'button' || role === 'button') && isInteractive) {
  return { type: 'button', variant: inferVariant(styles) };
}
```

### Anti-Pattern 2: Single-Page Evidence

**What people do:** Declare a color as "brand primary" after seeing it once

**Why it's wrong:** Could be a one-off accent, error state, or outlier. No confidence in cross-page consistency.

**Do this instead:** Require cross-page threshold (e.g., seen on ≥3 pages) before declaring a "standard":
```typescript
interface ObservationFrequency {
  value: string;
  pages: Set<string>;
}

function isStandard(obs: ObservationFrequency, threshold = 3): boolean {
  return obs.pages.size >= threshold;
}
```

### Anti-Pattern 3: Blocking Crawl for Extraction

**What people do:** Fetch page → extract → normalize → fetch next page (sequential)

**Why it's wrong:** Slow. Network I/O and computation should be pipelined.

**Do this instead:** Stream processing — crawl and extract in parallel:
```typescript
// BAD (sequential)
for (const url of urls) {
  const page = await crawl(url);
  const observations = await extract(page);
}

// GOOD (pipelined)
const crawlStream = createCrawlStream(urls);
const extractStream = createExtractStream();
await pipeline(crawlStream, extractStream);
```

### Anti-Pattern 4: In-Memory Accumulation

**What people do:** Load all observations into memory, then deduplicate

**Why it's wrong:** Runs out of memory on large crawls (100+ pages × 4 extractors × 50 observations/page = 20k+ objects)

**Do this instead:** Write observations to disk incrementally, stream-load for normalization:
```typescript
// BAD
const allObservations = [];
for (const page of pages) {
  allObservations.push(...extract(page)); // OOM risk
}
deduplicate(allObservations);

// GOOD
for (const page of pages) {
  const observations = extract(page);
  await writeObservations(observations); // disk-backed
}
// Later: stream-load for deduplication
const deduped = await streamDeduplicate(observationFiles);
```

### Anti-Pattern 5: Ignoring Evidence Provenance

**What people do:** Export `tokens.json` without source attribution

**Why it's wrong:** User can't verify claims, legal risk (unlicensed design reuse), debugging impossible

**Do this instead:** Always link to evidence:
```typescript
// BAD
{ "primaryColor": "#3b82f6" }

// GOOD
{
  "primaryColor": {
    "value": "#3b82f6",
    "evidenceIds": ["evidence-abc", "evidence-def"],
    "confidence": 0.95,
    "sources": [
      { "url": "https://example.com/pricing", "selector": ".cta-button" },
      { "url": "https://example.com/docs", "selector": ".primary-nav a.active" }
    ]
  }
}
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Playwright | Installed via npm, launched as subprocess | Use `playwright.chromium.launch()`, headless mode default, stealth plugins for bot detection |
| Claude API | @anthropic-ai/sdk, REST API | Use tools/JSON mode for structured component specs, implement retry with exponential backoff |
| File System | Node.js `fs/promises` | Use `fs-extra` for atomic writes (write temp → rename), respect OS path limits (Windows: 260 chars) |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Crawler ↔ Extractors | File-based (JSON) | Crawler writes `.uidna/raw/{page-id}.json`, extractors read on-demand or via stream |
| Extractors ↔ Normalizer | File-based (JSON) | Extractors write `.uidna/observations/`, normalizer loads all files at normalization phase |
| Normalizer ↔ Evidence | Shared data model | Normalizer assigns observation IDs, Evidence Store uses IDs to create index |
| Evidence ↔ Inference | Read-only query | Inference reads evidence index to gather source citations for confidence scoring |
| All ↔ Packager | Read-only query | Packager reads final normalized data + evidence, generates output files |
| CLI ↔ All Layers | Direct imports | CLI orchestrates pipeline: `await crawler.run()`, `await normalizer.normalize()`, etc. |
| MCP Server ↔ Inference | Direct imports | MCP tools expose inference engine via JSON-RPC: `queryDNA(componentType)`, `synthesizeComponent(spec)` |

### Configuration Flow

```
CLI args / .uidnarc.json
    ↓
Config Loader (shared/config.ts)
    ↓
Passed to each layer constructor
    ↓
Layer-specific config objects:
  - CrawlConfig (depth, rate limits, robots.txt mode)
  - ExtractConfig (extractors to enable)
  - NormalizeConfig (dedup thresholds, variant detection params)
  - InferenceConfig (confidence threshold, Claude model, rule-based vs LLM routing)
  - PackageConfig (output dir, export formats)
```

## Sources

**Confidence: MEDIUM** — Based on established software architecture patterns (ETL pipelines, web scraping, LLM integration) rather than domain-specific design-system-extraction tools (which are uncommon and often proprietary).

### Architecture Patterns
- ETL pipeline patterns: Stream processing, checkpointing, backpressure (standard data engineering)
- Web scraping architecture: robots.txt compliance, rate limiting, evidence preservation (Scrapy, Playwright patterns)
- Evidence-driven systems: Audit trails, provenance tracking (common in ML feature stores, data lineage tools)

### LLM Integration Patterns
- Hybrid inference (rules + LLM): Common in AI code generation tools (GitHub Copilot structure + GPT reasoning)
- Structured output via JSON mode: Anthropic API best practices (tools, JSON schema enforcement)

### Design System Patterns
- Token extraction: Design token specification (W3C Design Tokens Community Group format)
- Component mining: No established open-source standard — inference from general DOM analysis + accessibility patterns

### Limitations
- **WebSearch unavailable:** Could not verify current (2026) design-system-extraction tools or recent architecture trends
- **Domain-specific tools rare:** Most design-system extraction is manual or uses proprietary internal tools
- **Recommendations based on:** General pipeline architecture + web scraping best practices + LLM integration patterns

### Verification Needed
- Current state of design token extraction libraries (may have matured since training data)
- Whether Playwright is still the best choice vs. newer headless browsers
- Whether file-based storage is appropriate scale (vs. SQLite for 100+ page crawls)

---
*Architecture research for: UIUX-Mirror (uidna)*
*Researched: 2026-02-15*
