# Phase 4: Pattern Detection & Content Analysis - Research

**Researched:** 2026-02-16
**Domain:** Multi-page user flow detection, content style extraction, state transition analysis
**Confidence:** MEDIUM

## Summary

Phase 4 extracts cross-page interaction patterns (auth, checkout, onboarding, search/filter flows) and content style rules (voice/tone, CTA hierarchy, capitalization, error message grammar) from crawled websites. This phase builds on Phases 1-3 which provide raw page data, component detection, and evidence tracing infrastructure.

The technical domain requires two complementary capabilities: (1) **pattern detection** using state transition graphs to model multi-page flows, where nodes represent page states and edges represent user actions (form submissions, link clicks, button interactions), and (2) **content analysis** extracting linguistic patterns from microcopy using text pattern matching, NLP techniques for grammar/tone detection, and statistical analysis of capitalization rules.

For pattern detection, we build state-flow graphs by analyzing navigation patterns across crawled pages, detecting form submission flows, and identifying common interaction sequences. The existing component detection from Phase 2 (buttons, inputs, forms) provides the building blocks. For content analysis, we extract text from interactive elements (CTAs, error messages, form labels, tooltips) and analyze patterns using rule-based text matching and lightweight NLP.

**Primary recommendation:** Build a **pattern graph analyzer** using graph traversal algorithms (BFS/DFS) with the Graphology library to construct state-flow models from page navigation data, and create a **content pattern extractor** using Compromise.js for lightweight NLP analysis combined with regex-based pattern matching for capitalization/grammar rules. Store patterns in evidence-linked JSON following the existing project architecture.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| graphology | ^0.25.x | Graph data structure and algorithms | Robust, multipurpose Graph object for JavaScript/TypeScript with comprehensive standard library including traversals, cycles, paths |
| compromise | ^14.x | Lightweight NLP for JavaScript | Most popular JavaScript-native NLP library, handles sentence parsing, part-of-speech tagging, case detection without Python dependencies |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| graphology-shortest-path | ^2.x | Find shortest paths in graphs | Detecting common routes through multi-page flows |
| graphology-components | ^1.x | Detect strongly connected components | Identifying closed loops (e.g., multi-step forms with back buttons) |
| ts-pattern | ^5.x | Pattern matching for TypeScript | Categorizing page types and flow transitions cleanly |
| title-case | ^4.x | Capitalization detection and normalization | Analyzing CTA text capitalization patterns |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| graphology | cytoscape.js | Cytoscape is primarily for visualization; graphology better for analysis algorithms |
| compromise | natural (NLP library) | natural has more features but heavier; compromise lighter, sufficient for microcopy |
| regex patterns | Full LLM analysis | LLM expensive for every text snippet; regex + compromise handles 90% of patterns |
| In-memory graphs | Neo4j graph database | Neo4j overkill for 20-100 page crawls; in-memory sufficient for target scale |

**Installation:**
```bash
npm install graphology graphology-shortest-path graphology-components compromise ts-pattern title-case
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── patterns/                    # Pattern detection
│   ├── flow-detector.ts        # Multi-page flow detection
│   ├── state-graph-builder.ts  # Build state transition graphs
│   ├── transition-analyzer.ts  # Analyze edges (form submits, clicks)
│   └── flow-classifier.ts      # Classify flows (auth, checkout, etc.)
├── content/                     # Content analysis
│   ├── text-extractor.ts       # Extract microcopy from components
│   ├── voice-analyzer.ts       # Detect voice/tone patterns
│   ├── capitalization-analyzer.ts  # CTA capitalization rules
│   ├── grammar-analyzer.ts     # Error message grammar patterns
│   └── cta-hierarchy-analyzer.ts   # Button hierarchy (primary/secondary)
├── types/
│   ├── patterns.ts             # Flow, transition, pattern types
│   └── content-style.ts        # Voice, tone, grammar types
└── storage/
    └── pattern-store.ts        # Persist patterns with evidence
```

### Pattern 1: State-Flow Graph Construction

**What:** Build a directed graph where nodes are page states (URLs + DOM snapshots) and edges are user actions (clicks, form submissions)
**When to use:** Detecting multi-page flows from crawled page data
**Example:**
```typescript
// Source: Graph theory + web application crawling research
import Graph from 'graphology';
import type { Page } from 'playwright';

interface PageState {
  url: string;
  pageId: string;
  title: string;
  formElements: string[];        // Form selectors
  interactiveElements: string[]; // Button/link selectors
  evidenceId: string;
}

interface Transition {
  fromState: string;   // source page ID
  toState: string;     // destination page ID
  action: {
    type: 'click' | 'submit' | 'navigation';
    selector?: string;
    method?: 'GET' | 'POST';
    formData?: Record<string, string>;
  };
  evidence: {
    pageUrl: string;
    timestamp: string;
    screenshotPath?: string;
  };
}

function buildStateFlowGraph(
  crawledPages: Map<string, PageData>
): Graph<PageState, Transition> {
  const graph = new Graph<PageState, Transition>();

  // Add nodes for each crawled page
  for (const [pageId, pageData] of crawledPages) {
    const state: PageState = {
      url: pageData.url,
      pageId,
      title: pageData.title,
      formElements: pageData.forms.map(f => f.selector),
      interactiveElements: pageData.buttons.concat(pageData.links),
      evidenceId: pageData.evidenceId
    };
    graph.addNode(pageId, state);
  }

  // Add edges for discovered links
  for (const [pageId, pageData] of crawledPages) {
    for (const link of pageData.discoveredLinks) {
      const targetPageId = findPageByUrl(link.href, crawledPages);
      if (targetPageId && graph.hasNode(targetPageId)) {
        graph.addDirectedEdge(pageId, targetPageId, {
          fromState: pageId,
          toState: targetPageId,
          action: {
            type: 'click',
            selector: link.selector
          },
          evidence: {
            pageUrl: pageData.url,
            timestamp: pageData.crawledAt
          }
        });
      }
    }

    // Add edges for form submissions
    for (const form of pageData.forms) {
      const targetUrl = form.action || pageData.url;
      const targetPageId = findPageByUrl(targetUrl, crawledPages);
      if (targetPageId && graph.hasNode(targetPageId)) {
        graph.addDirectedEdge(pageId, targetPageId, {
          fromState: pageId,
          toState: targetPageId,
          action: {
            type: 'submit',
            selector: form.selector,
            method: form.method || 'POST'
          },
          evidence: {
            pageUrl: pageData.url,
            timestamp: pageData.crawledAt
          }
        });
      }
    }
  }

  return graph;
}
```

### Pattern 2: Flow Classification with Path Analysis

**What:** Identify common flow types (auth, checkout, onboarding) by analyzing graph paths and page characteristics
**When to use:** Categorizing detected flows for documentation
**Example:**
```typescript
// Source: User flow analysis + graph traversal algorithms
import { bfs } from 'graphology-traversal';
import { bidirectional } from 'graphology-shortest-path';

type FlowType = 'auth' | 'checkout' | 'onboarding' | 'search-filter' | 'multi-step-form' | 'unknown';

interface DetectedFlow {
  type: FlowType;
  entryPoint: string;    // page ID
  exitPoint: string;     // page ID
  path: string[];        // page IDs in sequence
  transitions: Transition[];
  confidence: number;
  evidence: string[];
  characteristics: {
    hasFormSubmission: boolean;
    requiresAuth: boolean;
    stepCount: number;
    commonKeywords: string[];
  };
}

function classifyFlow(
  graph: Graph<PageState, Transition>,
  path: string[]
): FlowType {
  const pages = path.map(nodeId => graph.getNodeAttributes(nodeId));

  // Check for auth flow patterns
  const hasLoginKeywords = pages.some(p =>
    /login|sign[ -]?in|authenticate/i.test(p.title) ||
    /login|sign[ -]?in/i.test(p.url)
  );
  const hasPasswordField = pages.some(p =>
    p.formElements.some(selector => /password|pwd/i.test(selector))
  );
  if (hasLoginKeywords && hasPasswordField) {
    return 'auth';
  }

  // Check for checkout flow patterns
  const hasCheckoutKeywords = pages.some(p =>
    /checkout|cart|payment|shipping|billing/i.test(p.title) ||
    /checkout|cart|pay/i.test(p.url)
  );
  const hasPaymentField = pages.some(p =>
    p.formElements.some(selector => /card|payment|cvv|billing/i.test(selector))
  );
  if (hasCheckoutKeywords && hasPaymentField) {
    return 'checkout';
  }

  // Check for onboarding flow patterns
  const hasOnboardingKeywords = pages.some(p =>
    /welcome|getting[ -]?started|setup|onboard/i.test(p.title)
  );
  const isMultiStep = path.length >= 3;
  if (hasOnboardingKeywords && isMultiStep) {
    return 'onboarding';
  }

  // Check for search/filter flow
  const hasSearchKeywords = pages.some(p =>
    /search|filter|results|query/i.test(p.title)
  );
  const hasSearchInput = pages.some(p =>
    p.formElements.some(selector => /search|query|filter/i.test(selector))
  );
  if (hasSearchKeywords && hasSearchInput) {
    return 'search-filter';
  }

  // Multi-step form (generic)
  const hasMultipleForms = pages.filter(p => p.formElements.length > 0).length >= 2;
  if (hasMultipleForms && isMultiStep) {
    return 'multi-step-form';
  }

  return 'unknown';
}

function detectFlows(
  graph: Graph<PageState, Transition>
): DetectedFlow[] {
  const flows: DetectedFlow[] = [];
  const visited = new Set<string>();

  // Find all paths between nodes with forms
  const formPages = graph.filterNodes((node, attrs) =>
    attrs.formElements.length > 0
  );

  for (const startNode of formPages) {
    if (visited.has(startNode)) continue;

    // BFS to find connected form sequences
    const sequence: string[] = [];
    bfs(graph, startNode, (node) => {
      sequence.push(node);
      visited.add(node);
    });

    if (sequence.length >= 2) {
      const flowType = classifyFlow(graph, sequence);
      const transitions = extractTransitions(graph, sequence);

      flows.push({
        type: flowType,
        entryPoint: sequence[0],
        exitPoint: sequence[sequence.length - 1],
        path: sequence,
        transitions,
        confidence: calculateFlowConfidence(flowType, sequence, graph),
        evidence: sequence.map(nodeId =>
          graph.getNodeAttributes(nodeId).evidenceId
        ),
        characteristics: analyzeFlowCharacteristics(sequence, graph)
      });
    }
  }

  return flows;
}
```

### Pattern 3: Content Pattern Extraction with NLP

**What:** Extract text from interactive elements and analyze for voice, tone, capitalization patterns
**When to use:** Analyzing microcopy and content style rules
**Example:**
```typescript
// Source: Compromise NLP + text pattern analysis
import nlp from 'compromise';
import { titleCase } from 'title-case';

interface TextSample {
  text: string;
  context: 'button' | 'link' | 'label' | 'error' | 'tooltip' | 'heading';
  selector: string;
  pageUrl: string;
  evidenceId: string;
}

interface CapitalizationPattern {
  style: 'sentence-case' | 'title-case' | 'uppercase' | 'lowercase' | 'mixed';
  examples: string[];
  frequency: number;
  contexts: string[];
  confidence: number;
}

function analyzeCapitalization(samples: TextSample[]): CapitalizationPattern[] {
  const patterns = new Map<string, CapitalizationPattern>();

  for (const sample of samples) {
    const style = detectCapitalizationStyle(sample.text);
    const key = `${style}-${sample.context}`;

    if (!patterns.has(key)) {
      patterns.set(key, {
        style,
        examples: [],
        frequency: 0,
        contexts: [],
        confidence: 0
      });
    }

    const pattern = patterns.get(key)!;
    pattern.examples.push(sample.text);
    pattern.frequency++;
    if (!pattern.contexts.includes(sample.context)) {
      pattern.contexts.push(sample.context);
    }
  }

  // Calculate confidence based on consistency
  for (const pattern of patterns.values()) {
    const totalSamples = samples.filter(s =>
      pattern.contexts.includes(s.context)
    ).length;
    pattern.confidence = pattern.frequency / totalSamples;
  }

  return Array.from(patterns.values())
    .sort((a, b) => b.frequency - a.frequency);
}

function detectCapitalizationStyle(text: string): CapitalizationPattern['style'] {
  if (text === text.toUpperCase()) return 'uppercase';
  if (text === text.toLowerCase()) return 'lowercase';

  const words = text.split(/\s+/);
  const capitalizedWords = words.filter(w =>
    w.length > 0 && w[0] === w[0].toUpperCase()
  );

  // Title case: most words capitalized
  if (capitalizedWords.length / words.length > 0.7) {
    return 'title-case';
  }

  // Sentence case: only first word capitalized
  if (capitalizedWords.length === 1 && capitalizedWords[0] === words[0]) {
    return 'sentence-case';
  }

  return 'mixed';
}

interface VoicePattern {
  tone: 'formal' | 'casual' | 'professional' | 'friendly' | 'urgent';
  tense: 'imperative' | 'present' | 'future';
  perspective: 'first-person' | 'second-person' | 'third-person';
  examples: string[];
  confidence: number;
}

function analyzeVoiceTone(ctaTexts: TextSample[]): VoicePattern[] {
  const patterns: VoicePattern[] = [];

  for (const sample of ctaTexts) {
    const doc = nlp(sample.text);

    // Detect tense
    const hasImperative = doc.verbs().isImperative().found;
    const hasFuture = doc.verbs().isFuture().found;
    const tense = hasImperative ? 'imperative' :
                  hasFuture ? 'future' : 'present';

    // Detect tone markers
    const isFormal = /please|kindly|would you|could you/i.test(sample.text);
    const isCasual = /hey|yeah|cool|awesome|grab|check out/i.test(sample.text);
    const isUrgent = /now|today|don't miss|limited|hurry|act fast/i.test(sample.text);

    const tone = isFormal ? 'formal' :
                 isCasual ? 'casual' :
                 isUrgent ? 'urgent' : 'professional';

    // Detect perspective
    const hasFirstPerson = /\b(i|we|our|my)\b/i.test(sample.text);
    const hasSecondPerson = /\b(you|your)\b/i.test(sample.text);
    const perspective = hasFirstPerson ? 'first-person' :
                       hasSecondPerson ? 'second-person' : 'third-person';

    patterns.push({
      tone,
      tense,
      perspective,
      examples: [sample.text],
      confidence: 0.7 // Base confidence, adjusted by frequency
    });
  }

  // Cluster similar patterns
  return clusterVoicePatterns(patterns);
}
```

### Pattern 4: CTA Hierarchy Detection

**What:** Analyze button hierarchy (primary, secondary, tertiary) based on visual prominence and usage patterns
**When to use:** Documenting button style standards
**Example:**
```typescript
// Source: Design system CTA hierarchy research
import type { DetectedComponent } from '../types/components.js';

interface CTAHierarchy {
  level: 'primary' | 'secondary' | 'tertiary' | 'ghost';
  characteristics: {
    hasBackground: boolean;
    hasBorder: boolean;
    textColor: string;
    backgroundColor?: string;
    borderColor?: string;
    fontWeight: string;
    usageContexts: string[];
  };
  examples: {
    text: string;
    pageUrl: string;
    selector: string;
  }[];
  frequency: number;
  confidence: number;
}

function analyzeCTAHierarchy(
  buttons: DetectedComponent[]
): CTAHierarchy[] {
  const hierarchies: CTAHierarchy[] = [];

  for (const button of buttons) {
    const styles = button.computedStyles;
    const bgColor = styles.backgroundColor;
    const hasSolidBg = bgColor && bgColor !== 'transparent' &&
                       !bgColor.startsWith('rgba(0, 0, 0, 0)');
    const hasBorder = parseFloat(styles.borderWidth || '0') > 0;
    const fontWeight = parseInt(styles.fontWeight || '400', 10);

    // Classify hierarchy level by visual prominence
    let level: CTAHierarchy['level'];
    if (hasSolidBg && fontWeight >= 600) {
      level = 'primary';
    } else if (hasBorder && !hasSolidBg) {
      level = 'secondary';
    } else if (!hasBorder && !hasSolidBg) {
      level = 'ghost';
    } else {
      level = 'tertiary';
    }

    // Group by level
    let hierarchy = hierarchies.find(h => h.level === level);
    if (!hierarchy) {
      hierarchy = {
        level,
        characteristics: {
          hasBackground: hasSolidBg,
          hasBorder,
          textColor: styles.color || '',
          backgroundColor: hasSolidBg ? bgColor : undefined,
          borderColor: hasBorder ? styles.borderColor : undefined,
          fontWeight: styles.fontWeight || '',
          usageContexts: []
        },
        examples: [],
        frequency: 0,
        confidence: 0
      };
      hierarchies.push(hierarchy);
    }

    hierarchy.examples.push({
      text: button.element.textContent,
      pageUrl: button.pageUrl,
      selector: button.selector
    });
    hierarchy.frequency++;

    // Track usage contexts
    const context = classifyButtonContext(button);
    if (!hierarchy.characteristics.usageContexts.includes(context)) {
      hierarchy.characteristics.usageContexts.push(context);
    }
  }

  // Calculate confidence based on consistency within level
  for (const hierarchy of hierarchies) {
    const examples = hierarchy.examples;
    const bgColorConsistency = calculateColorConsistency(
      examples.map(e => e.selector) // Would extract actual colors
    );
    hierarchy.confidence = bgColorConsistency;
  }

  return hierarchies.sort((a, b) => b.frequency - a.frequency);
}

function classifyButtonContext(button: DetectedComponent): string {
  const text = button.element.textContent.toLowerCase();

  if (/submit|send|save|create|add|post/i.test(text)) return 'form-submit';
  if (/sign[ -]?in|log[ -]?in|sign[ -]?up|register/i.test(text)) return 'auth';
  if (/buy|purchase|checkout|add to cart/i.test(text)) return 'commerce';
  if (/learn more|read|view|see/i.test(text)) return 'informational';
  if (/cancel|close|dismiss|skip/i.test(text)) return 'dismissal';

  return 'general';
}
```

### Pattern 5: Error Message Grammar Analysis

**What:** Extract error messages and analyze grammar patterns, tone, and structure
**When to use:** Documenting error message style guide
**Example:**
```typescript
// Source: NLP grammar analysis + error message UX patterns
interface ErrorMessagePattern {
  structure: 'prefix-reason' | 'reason-only' | 'reason-suggestion' | 'question-format';
  tone: 'apologetic' | 'neutral' | 'instructive' | 'technical';
  examples: string[];
  commonPrefixes: string[];
  suggestsAction: boolean;
  frequency: number;
}

function analyzeErrorMessages(
  errorTexts: TextSample[]
): ErrorMessagePattern[] {
  const patterns: ErrorMessagePattern[] = [];

  for (const sample of errorTexts) {
    const doc = nlp(sample.text);

    // Detect structure
    const sentences = doc.sentences().out('array');
    const hasApology = /sorry|apologies|oops|unfortunately/i.test(sample.text);
    const hasSuggestion = /please|try|should|can you|make sure/i.test(sample.text);
    const isQuestion = sample.text.trim().endsWith('?');

    let structure: ErrorMessagePattern['structure'];
    if (sentences.length > 1 && hasSuggestion) {
      structure = 'reason-suggestion';
    } else if (hasApology || /error:|warning:|invalid:/i.test(sample.text)) {
      structure = 'prefix-reason';
    } else if (isQuestion) {
      structure = 'question-format';
    } else {
      structure = 'reason-only';
    }

    // Detect tone
    const tone = hasApology ? 'apologetic' :
                 hasSuggestion ? 'instructive' :
                 /error|invalid|failed|cannot/i.test(sample.text) ? 'technical' :
                 'neutral';

    // Extract common prefixes
    const prefixMatch = sample.text.match(/^(error|warning|invalid|oops|sorry)[:\s]/i);
    const prefix = prefixMatch ? prefixMatch[1].toLowerCase() : '';

    patterns.push({
      structure,
      tone,
      examples: [sample.text],
      commonPrefixes: prefix ? [prefix] : [],
      suggestsAction: hasSuggestion,
      frequency: 1
    });
  }

  // Cluster and aggregate
  return aggregateErrorPatterns(patterns);
}

function aggregateErrorPatterns(patterns: ErrorMessagePattern[]): ErrorMessagePattern[] {
  const grouped = new Map<string, ErrorMessagePattern>();

  for (const pattern of patterns) {
    const key = `${pattern.structure}-${pattern.tone}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        ...pattern,
        examples: [],
        commonPrefixes: [],
        frequency: 0
      });
    }

    const group = grouped.get(key)!;
    group.examples.push(...pattern.examples);
    group.commonPrefixes.push(...pattern.commonPrefixes);
    group.frequency++;
  }

  return Array.from(grouped.values())
    .map(g => ({
      ...g,
      commonPrefixes: [...new Set(g.commonPrefixes)]
    }))
    .sort((a, b) => b.frequency - a.frequency);
}
```

### Anti-Patterns to Avoid

- **Single-page pattern claims:** Don't declare a pattern after seeing one instance. Require cross-page evidence (3+ pages) like token detection.
- **Ignoring failed navigations:** Forms might submit to URLs not crawled. Track these as partial flows with lower confidence.
- **Overfitting to specific site quirks:** A custom onboarding flow isn't a universal pattern. Mark site-specific patterns clearly.
- **Text analysis without context:** "Submit" button text means different things in checkout vs. contact form. Track context.
- **Missing evidence links:** Every pattern must link back to observed pages/elements with screenshots.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Graph algorithms | Custom DFS/BFS | **graphology-traversal** | Handles directed graphs, cycles, weighted paths; battle-tested |
| Text parsing | String split/regex spaghetti | **compromise** | Handles sentence boundaries, contractions, parts of speech correctly |
| Pattern matching | Nested if/switch | **ts-pattern** | Exhaustive matching, type safety, cleaner code |
| Shortest paths | Manual path finding | **graphology-shortest-path** | Dijkstra and bidirectional search optimized |
| Capitalization rules | Manual regex | **title-case** with detection | Handles edge cases (acronyms, articles, prepositions) |

**Key insight:** Graph theory and NLP are research-grade domains with subtle edge cases. Use established libraries for foundations. Focus custom code on domain-specific heuristics (flow classification, context detection) where design system knowledge adds value.

## Common Pitfalls

### Pitfall 1: Incomplete Flow Detection Due to Partial Crawls

**What goes wrong:** Auth flow detected as 3 steps (login → loading → dashboard) but actually 4 steps with email verification page not crawled due to auth requirements.
**Why it happens:** Crawler can't pass login walls or email verification steps, so flow graph is incomplete.
**How to avoid:**
- Mark flows as "partial" when end state is unknown (dead-end in graph)
- Detect authentication boundaries (login forms) and flag flows as "requires-auth"
- Lower confidence for partial flows
- Document limitations in flow evidence
**Warning signs:** Many flows end on form submission pages with no exit. Flows with single-page loops.

### Pitfall 2: Misclassifying Navigation as Flows

**What goes wrong:** Regular site navigation (header links) detected as a "flow" when it's just standard nav.
**Why it happens:** Any connected sequence of pages looks like a flow to graph algorithm.
**How to avoid:**
- Filter out universal navigation (links present on every page in same position)
- Require forms or state changes for flow classification
- Use heuristics: flows have <7 steps, navigation is unlimited
- Check for form submissions as flow indicators
**Warning signs:** "Flows" with 10+ steps. Every page linked to every other page.

### Pitfall 3: Overfitting Content Patterns to Small Samples

**What goes wrong:** 5 buttons say "Get Started" in title case → declare "all CTAs use title case" as pattern, but 50 other buttons use sentence case.
**Why it happens:** Early patterns seem consistent, but sample size too small.
**How to avoid:**
- Require minimum sample size (10+ examples) before declaring pattern
- Calculate confidence as (pattern_count / total_count) not binary yes/no
- Report multiple patterns with frequency distribution
- Cross-validate: does pattern hold across different page sections?
**Warning signs:** Patterns with 100% confidence. Only one pattern detected per category.

### Pitfall 4: Ignoring Context in Text Analysis

**What goes wrong:** "Submit" classified as imperative-urgent tone, but appears in neutral form contexts.
**Why it happens:** NLP analyzes text in isolation without surrounding DOM context.
**How to avoid:**
- Always include context field (button, link, error, label)
- Analyze patterns separately per context
- Weight patterns by usage frequency in specific contexts
- Check visual prominence (primary vs secondary buttons) as context
**Warning signs:** Same text classified differently. Tone inconsistent with visual design.

### Pitfall 5: Missing State Transitions in SPAs

**What goes wrong:** Single-page app changes content without URL changes, so flow graph shows one node with no transitions.
**Why it happens:** SPA navigation via JavaScript doesn't create new page requests crawler can detect.
**How to avoid:**
- Phase 1 crawler already handles dynamic content with wait strategies
- Detect hash/fragment changes in URLs (#step-2, #checkout)
- Look for route changes in history API usage (Phase 1 may need enhancement)
- Mark as limitation if SPA routing is undetectable
**Warning signs:** Large complex sites with single-page nodes. Many interactive elements but no transitions.

### Pitfall 6: Capitalization Detection Confused by Acronyms

**What goes wrong:** "View API Docs" classified as title case, but "API" is acronym, not title-cased word.
**Why it happens:** Simple word-by-word capitalization check doesn't handle acronyms.
**How to avoid:**
- Use title-case library which handles common acronyms
- Detect all-caps words separately from title case
- Allow mixed patterns (sentence case with acronyms)
- Report acronym usage as separate pattern
**Warning signs:** Every button with acronym marked as "mixed case". Inconsistent classification.

### Pitfall 7: Error Messages Not Found

**What goes wrong:** Error message analysis returns empty because errors only appear on validation failures.
**Why it happens:** Static crawl doesn't trigger validation errors.
**How to avoid:**
- Search for error-related CSS classes/data attributes in forms
- Look for hidden error message elements in DOM
- Extract placeholder/default error text from aria-describedby
- Check for error state component variants from Phase 2
- Mark as "low-coverage" when few examples found
**Warning signs:** Zero error messages detected on sites with many forms. Missing error patterns.

## Code Examples

Verified patterns from research and established libraries:

### Flow Detection with Graphology

```typescript
// Source: graphology documentation + state-flow analysis patterns
import Graph from 'graphology';
import { bfs } from 'graphology-traversal';
import { bidirectional } from 'graphology-shortest-path';

// Build flow graph from crawled pages
const flowGraph = new Graph({ type: 'directed' });

// Add pages as nodes
crawledPages.forEach(page => {
  flowGraph.addNode(page.id, {
    url: page.url,
    title: page.title,
    hasForms: page.forms.length > 0,
    hasAuth: /login|sign-in/i.test(page.url)
  });
});

// Add navigation as edges
crawledPages.forEach(page => {
  page.links.forEach(link => {
    const targetPage = findPageByUrl(link.href);
    if (targetPage) {
      flowGraph.addEdge(page.id, targetPage.id, {
        action: 'click',
        selector: link.selector
      });
    }
  });
});

// Find all paths from entry points (landing pages)
const entryPages = flowGraph.filterNodes((node, attrs) =>
  flowGraph.inDegree(node) === 0
);

const flows: DetectedFlow[] = [];
entryPages.forEach(entry => {
  // BFS to find all reachable pages
  const path: string[] = [];
  bfs(flowGraph, entry, (node) => {
    path.push(node);
  });

  if (path.length >= 2) {
    flows.push({
      type: classifyFlow(flowGraph, path),
      entryPoint: entry,
      path,
      confidence: calculateConfidence(path, flowGraph)
    });
  }
});
```

### Content Analysis with Compromise

```typescript
// Source: compromise documentation + NLP text analysis
import nlp from 'compromise';

// Extract and analyze CTA text
const ctaTexts = buttons.map(b => b.element.textContent);

ctaTexts.forEach(text => {
  const doc = nlp(text);

  // Detect imperative verbs
  const verbs = doc.verbs().out('array');
  const isImperative = doc.verbs().isImperative().found;

  // Detect tense
  const isPast = doc.verbs().toPastTense().found;
  const isFuture = doc.verbs().isFuture().found;

  // Detect tone markers
  const hasUrgency = /now|today|limited|hurry/i.test(text);
  const hasPoliteness = /please|kindly/i.test(text);

  patterns.push({
    text,
    verbs,
    tense: isImperative ? 'imperative' :
           isPast ? 'past' :
           isFuture ? 'future' : 'present',
    tone: hasUrgency ? 'urgent' :
          hasPoliteness ? 'polite' : 'neutral'
  });
});

// Aggregate patterns
const tenseDistribution = patterns.reduce((acc, p) => {
  acc[p.tense] = (acc[p.tense] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
```

### Capitalization Pattern Detection

```typescript
// Source: title-case library + capitalization analysis
import { titleCase } from 'title-case';

function detectCapStyle(text: string) {
  if (text === text.toUpperCase()) return 'UPPERCASE';
  if (text === text.toLowerCase()) return 'lowercase';

  const words = text.split(/\s+/);
  const titleCased = titleCase(text);

  if (text === titleCased) return 'Title Case';

  // Sentence case: first word capital, rest lowercase (except acronyms)
  const isSentenceCase = words.length > 0 &&
    words[0][0] === words[0][0].toUpperCase() &&
    words.slice(1).every(w =>
      w === w.toLowerCase() || w === w.toUpperCase() // lowercase or acronym
    );

  if (isSentenceCase) return 'Sentence case';

  return 'Mixed case';
}

// Analyze all CTAs
const capPatterns = new Map<string, number>();
buttons.forEach(btn => {
  const style = detectCapStyle(btn.textContent);
  capPatterns.set(style, (capPatterns.get(style) || 0) + 1);
});

// Report most common pattern
const mostCommon = [...capPatterns.entries()]
  .sort((a, b) => b[1] - a[1])[0];
```

### Pattern Storage with Evidence

```typescript
// Source: Project architecture + evidence tracking
interface StoredPattern {
  id: string;
  type: 'flow' | 'voice-tone' | 'capitalization' | 'error-grammar' | 'cta-hierarchy';
  pattern: DetectedFlow | VoicePattern | CapitalizationPattern | ErrorMessagePattern | CTAHierarchy;
  evidence: {
    pageUrls: string[];
    selectors: string[];
    screenshotPaths: string[];
    occurrenceCount: number;
    crossPageCount: number;
  };
  confidence: number;
  detectedAt: string;
}

async function storePattern(
  pattern: DetectedFlow | VoicePattern,
  type: StoredPattern['type'],
  evidenceStore: EvidenceStore
): Promise<void> {
  const evidence = gatherEvidence(pattern);

  const storedPattern: StoredPattern = {
    id: generatePatternId(type, pattern),
    type,
    pattern,
    evidence: {
      pageUrls: evidence.map(e => e.pageUrl),
      selectors: evidence.map(e => e.selector),
      screenshotPaths: evidence.map(e => e.screenshotPath).filter(Boolean),
      occurrenceCount: evidence.length,
      crossPageCount: new Set(evidence.map(e => e.pageUrl)).size
    },
    confidence: calculatePatternConfidence(pattern, evidence),
    detectedAt: new Date().toISOString()
  };

  await writeJSON(
    `.uidna/patterns/${type}/${storedPattern.id}.json`,
    storedPattern
  );

  // Update evidence index
  await evidenceStore.linkPattern(storedPattern.id, evidence);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual flow documentation | Automated state-flow graphs | Academic research 2010s, production tools 2020s | Detects flows automatically; reduces documentation burden |
| Regex-only text analysis | Lightweight NLP (compromise) | JavaScript NLP maturity ~2018 | Better grammar detection; handles contractions, tense, voice |
| Fixed pattern templates | Statistical pattern detection | Design system research 2020+ | Adapts to site conventions; doesn't force predetermined patterns |
| Single-page evidence | Cross-page validation thresholds | Same as Phase 2 (token normalization) | Higher confidence; filters one-off variations |
| Manual graph traversal | Graphology standard library | Graphology maturity ~2020 | Reliable algorithms; handles cycles, shortest paths correctly |

**Deprecated/outdated:**
- **Crawljax-style UI state detection:** Designed for testing AJAX apps, overkill for design pattern extraction; simpler graph models sufficient
- **Full LLM for all text analysis:** Expensive per-token cost for bulk text; compromise + regex handles 90% of patterns
- **Fixed flow templates (hardcoded auth/checkout steps):** Sites vary; statistical detection more flexible

## Open Questions

1. **How to handle authentication-required flows?**
   - What we know: Crawler stops at login walls, flows incomplete
   - What's unclear: Should we attempt basic auth with user-provided credentials, or mark as partial?
   - Recommendation: Mark as "requires-auth" with partial flow graph; document limitation. Future: optional credential config.

2. **Should we detect dark patterns (manipulative UX)?**
   - What we know: Some flows use urgent language, hidden costs, forced actions
   - What's unclear: Is pattern detection scope, or separate ethics layer?
   - Recommendation: Out of scope for v1; focus on descriptive extraction not prescriptive judgment. Future: add dark pattern flags.

3. **How granular should content patterns be?**
   - What we know: Can analyze at word, sentence, paragraph level
   - What's unclear: Is "error messages use apologetic tone" sufficient, or need per-field specifics?
   - Recommendation: Aggregate patterns at component level (all errors, all CTAs) with examples. Don't over-specify.

4. **How to handle internationalization?**
   - What we know: Compromise is English-only
   - What's unclear: Should we detect language and skip non-English, or attempt basic pattern matching?
   - Recommendation: Detect language (simple heuristic or library), mark non-English content as "language: [code]" without NLP analysis. Document limitation.

5. **Should flow detection include JavaScript interactions?**
   - What we know: Phase 1 crawler handles dynamic content but may miss client-side routing
   - What's unclear: Can we detect SPA route changes, modal flows, accordion interactions?
   - Recommendation: Start with URL-based transitions (what Phase 1 provides). If evidence shows missing flows, enhance crawler in v2 to detect client-side state changes.

## Sources

### Primary (HIGH confidence)

- **Graphology Documentation** - [https://graphology.github.io/](https://graphology.github.io/) - Graph data structure, traversal algorithms, shortest paths
- **Compromise NLP** - [https://github.com/spencermountain/compromise](https://github.com/spencermountain/compromise) - JavaScript NLP for text analysis, verb tense, parts of speech
- **W3C ARIA APG** (already used in Phase 3) - ARIA roles help identify interactive elements for flow transitions
- **Design System Content Guidelines** - [https://help.zeroheight.com/hc/en-us/articles/36473980511771-Content-Guidelines-in-your-Design-System](https://help.zeroheight.com/hc/en-us/articles/36473980511771-Content-Guidelines-in-your-Design-System) - Voice/tone patterns in design systems

### Secondary (MEDIUM confidence)

- [Crawl-Based Analysis of Web Applications](https://www.researchgate.net/publication/268079927_Crawl-Based_Analysis_of_Web_Applications_Prospects_and_Challenges) - Academic research on state-flow graph construction
- [Crawljax: AJAX Application Crawling](https://www.researchgate.net/publication/254007517_Crawling_AJAX-Based_Web_Applications_through_Dynamic_Analysis_of_User_Interface_State_Changes) - State-centric web application analysis
- [User Flow Diagram Examples](https://swetrix.com/blog/user-flow-diagram-examples) - Common flow patterns (auth, checkout, onboarding)
- [Microcopy UX Writing](https://userpilot.com/blog/microcopy-ux/) - Microcopy patterns and best practices
- [CTA Button Design Hierarchy](https://nerdcow.co.uk/blog/cta-hierarchy/) - Button hierarchy (primary/secondary) patterns
- [Atlassian Voice & Tone](https://atlassian.design/content/voice-and-tone-principles/) - Design system voice/tone documentation example
- [Content Guidelines - Polaris by Shopify](https://polaris.shopify.com/content/actionable-language) - Comprehensive content style guide

### Tertiary (LOW confidence - requires validation)

- **Flow classification heuristics:** Synthesized from user flow research; no authoritative pattern detection standard
- **Capitalization rules:** Best practices from style guides, not algorithmically validated
- **Error message tone patterns:** Inferred from UX writing research, not rigorously tested across sites

## Metadata

**Confidence breakdown:**
- Standard stack: **MEDIUM-HIGH** - Graphology and Compromise are mature libraries with good documentation; pattern detection domain less standardized
- Architecture: **MEDIUM** - Flow graph construction well-established in academia; content analysis more heuristic
- Pitfalls: **MEDIUM** - Based on web crawling research and NLP limitations; some pattern-specific pitfalls are novel
- Don't hand-roll: **HIGH** - Graph algorithms and NLP are proven complex domains requiring libraries

**Research date:** 2026-02-16
**Valid until:** ~30 days (March 2026) for library versions; ~6 months for pattern detection approaches (stable domain)
**Fast-moving areas:** NLP libraries evolve quarterly; flow detection patterns relatively stable

**Phase dependencies:**
- **Depends on Phase 1:** Crawled page data with URL graph, form elements, interactive components
- **Depends on Phase 2:** Component detection (buttons, inputs, forms) provides elements for content analysis
- **Depends on Phase 3:** Evidence tracking infrastructure for linking patterns to source pages
- **Consumed by Phase 5:** Patterns exported in patterns.json and content_style.json
