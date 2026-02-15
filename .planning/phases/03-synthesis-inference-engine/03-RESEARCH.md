# Phase 3: Synthesis & Inference Engine - Research

**Researched:** 2026-02-16
**Domain:** Component synthesis, constraint-based generation, hybrid rule-based + LLM systems
**Confidence:** MEDIUM-HIGH

## Summary

Phase 3 synthesizes new components not observed in the source site using extracted design DNA as constraints. The architecture requires a hybrid approach: deterministic rules for structural composition and token application, with Claude API for nuanced design decisions (motion timing, edge states, microcopy). Every synthesized element must include confidence scores and evidence citations linking back to source observations.

The research confirms a "Rule Maker Pattern" architecture where rule-based engines handle deterministic structural synthesis, while LLMs handle probabilistic design judgment. This separation ensures auditability and reliability while leveraging LLM capabilities for nuanced decisions. The Anthropic SDK's structured outputs feature (November 2025) provides guaranteed JSON schema compliance, eliminating validation loops. Prompt caching reduces costs for repeated design DNA context.

**Primary recommendation:** Build a two-stage synthesis pipeline: (1) rule-based structural generator using template composition with design token constraints, (2) Claude API refinement for nuanced decisions with structured outputs. Track every decision with evidence citations using a provenance tracking system similar to research confidence scoring approaches.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.30.0 | Claude API access with structured outputs | Official Anthropic SDK with Opus 4.1/Sonnet 4.5 structured output support (Nov 2025) |
| zod | ^3.23.8 (already installed) | Schema definition and validation | Industry standard for TypeScript schema validation; generates JSON Schema for Claude structured outputs |
| handlebars | ^4.7.8 | Template-based code generation | Most popular logic-less templating; used by Plop and other scaffolding tools; proven for component generation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| kiwi.js | ^1.1.0 | Cassowary constraint solver | If implementing advanced constraint-based layout calculations (optional for v1) |
| @types/handlebars | ^4.1.0 | TypeScript types for Handlebars | Development-time type safety for template generation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Handlebars | Mustache | Handlebars is superset with helpers/partials - more powerful for complex templates |
| Handlebars | EJS | EJS uses JavaScript in templates (less safe), Handlebars is logic-less (safer, more maintainable) |
| Claude API | OpenAI GPT-4 | Project already uses Anthropic; Claude Opus 4.1 has stronger reasoning for design decisions |
| Zod | Pydantic (Python) | TypeScript codebase requires TypeScript-native solution |

**Installation:**
```bash
npm install @anthropic-ai/sdk handlebars
npm install --save-dev @types/handlebars
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── synthesis/
│   ├── rule-engine.ts           # Deterministic structural synthesis
│   ├── component-composer.ts    # Combines primitives into components
│   ├── constraint-checker.ts    # Validates token usage against extracted DNA
│   ├── llm-refiner.ts          # Claude API calls for nuanced decisions
│   ├── templates/              # Handlebars templates for components
│   │   ├── button.hbs
│   │   ├── input.hbs
│   │   ├── card.hbs
│   │   └── data-table.hbs
│   ├── prompts/                # Claude system prompts
│   │   ├── motion-timing.txt
│   │   ├── edge-states.txt
│   │   └── microcopy.txt
│   ├── state-generator.ts      # Generate hover/active/focus/disabled/loading/error states
│   ├── a11y-generator.ts       # Generate ARIA/keyboard/focus accessibility baseline
│   └── index.ts
├── provenance/
│   ├── confidence-scorer.ts    # Score synthesized components
│   ├── evidence-tracker.ts     # Link decisions to source observations
│   └── index.ts
└── types/
    └── synthesized-components.ts
```

### Pattern 1: Two-Stage Synthesis Pipeline

**What:** Separate deterministic structure generation from probabilistic refinement
**When to use:** All component synthesis operations
**Example:**
```typescript
// Stage 1: Rule-based structural synthesis
interface StructuralSynthesis {
  html: string;              // Generated from template
  css: string;               // Applied from extracted tokens
  tokens: TokenReferences;   // Which tokens were used
  evidence: EvidenceChain[]; // Why each decision was made
  confidence: number;        // Based on token availability
}

// Stage 2: LLM refinement for nuanced decisions
interface LLMRefinement {
  motionTimings: MotionDecision[];     // Claude decides transition durations
  edgeStates: StateStyleDecision[];    // Claude decides loading/error styling
  microcopy: CopyDecision[];           // Claude decides button text, labels
  ariaGuidance: A11yGuidance[];        // Claude suggests ARIA patterns
}

async function synthesizeComponent(
  request: ComponentRequest,
  extractedDNA: DesignDNA
): Promise<SynthesizedComponent> {
  // Stage 1: Deterministic structure
  const structure = await ruleBasedSynthesize(request, extractedDNA);

  // Stage 2: LLM refinement for nuances
  const refinements = await llmRefine(structure, extractedDNA);

  // Merge and track provenance
  return mergeWithProvenance(structure, refinements);
}
```

### Pattern 2: Template Composition with Token Constraints

**What:** Use Handlebars templates with token constraint validation
**When to use:** Generating HTML/CSS structure for components
**Example:**
```typescript
// Template: templates/button.hbs
/*
<button class="btn btn-{{size}} btn-{{emphasis}}"
        style="
          background-color: {{tokens.color.primary}};
          color: {{tokens.color.onPrimary}};
          padding: {{tokens.spacing.md}} {{tokens.spacing.lg}};
          border-radius: {{tokens.radius.md}};
          font-size: {{tokens.typography.body.fontSize}};
        ">
  {{text}}
</button>
*/

interface TemplateContext {
  size: 'small' | 'medium' | 'large';
  emphasis: 'primary' | 'secondary' | 'ghost';
  text: string;
  tokens: {
    color: { primary: string; onPrimary: string };
    spacing: { md: string; lg: string };
    radius: { md: string };
    typography: { body: { fontSize: string } };
  };
  evidence: EvidenceReference[];
}

function compileComponentTemplate(
  templateName: string,
  context: TemplateContext,
  extractedDNA: DesignDNA
): StructuralSynthesis {
  // Validate all tokens exist in extracted DNA
  const validation = validateTokens(context.tokens, extractedDNA);
  if (!validation.valid) {
    throw new Error(`Missing tokens: ${validation.missing.join(', ')}`);
  }

  // Compile template
  const template = Handlebars.compile(readTemplate(templateName));
  const html = template(context);

  // Track evidence for each token used
  const evidence = buildEvidenceChain(context.tokens, extractedDNA);

  return { html, css: '', tokens: context.tokens, evidence, confidence: calculateConfidence(validation) };
}
```

### Pattern 3: Claude Structured Outputs for Design Decisions

**What:** Use Anthropic's structured outputs feature for guaranteed JSON schema compliance
**When to use:** All Claude API calls for design refinement
**Example:**
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

// Define schema for motion timing decisions
const MotionDecisionSchema = z.object({
  property: z.string(),
  duration: z.string(),
  easing: z.string(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string())
});

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function llmDecideMotionTiming(
  component: StructuralSynthesis,
  extractedDNA: DesignDNA
): Promise<z.infer<typeof MotionDecisionSchema>> {
  const response = await client.messages.create({
    model: 'claude-opus-4-1',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: buildMotionPrompt(component, extractedDNA)
    }],
    // Structured outputs with JSON schema from Zod
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'motion_decision',
        schema: zodToJsonSchema(MotionDecisionSchema),
        strict: true
      }
    }
  }, {
    headers: {
      'anthropic-beta': 'structured-outputs-2025-11-13'
    }
  });

  // Parse validated output (guaranteed to match schema)
  const decision = JSON.parse(response.content[0].text);
  return MotionDecisionSchema.parse(decision); // Redundant but safe
}
```

### Pattern 4: Prompt Caching for Design DNA Context

**What:** Cache extracted design DNA in system prompt to reduce costs
**When to use:** Multiple synthesis requests against same extracted DNA
**Example:**
```typescript
// Build cacheable system prompt with design DNA
function buildCachedSystemPrompt(extractedDNA: DesignDNA): Anthropic.Messages.MessageCreateParams {
  const systemPrompt = [
    {
      type: 'text',
      text: `You are a design system expert. You have access to extracted design DNA from a website.

Available tokens:
${formatTokensForPrompt(extractedDNA.tokens)}

Observed components:
${formatComponentsForPrompt(extractedDNA.components)}

Detected patterns:
${formatPatternsForPrompt(extractedDNA.patterns)}`,
      // Mark for caching (5 min lifetime, refreshed on each use)
      cache_control: { type: 'ephemeral' }
    }
  ];

  return { system: systemPrompt };
}

// Cache hierarchy: tools → system → messages
// Changes to tools or system invalidate cache
// Exact match required for cache hit
```

### Pattern 5: Confidence Scoring with Evidence Citations

**What:** Every synthesis decision tracked with confidence score and source evidence
**When to use:** All synthesis operations
**Example:**
```typescript
interface SynthesisDecision {
  type: 'token_application' | 'structural_choice' | 'llm_refinement';
  decision: string;
  confidence: number;
  evidenceChain: EvidenceLink[];
  reasoning: string;
}

interface EvidenceLink {
  sourceType: 'observed_token' | 'observed_component' | 'inferred_pattern' | 'llm_decision';
  reference: string;        // Token ID, component ID, or pattern ID
  pageUrl?: string;         // For observed evidence
  selector?: string;        // For observed evidence
  occurrenceCount?: number; // For observed evidence
  llmReasoning?: string;    // For LLM decisions
}

function calculateSynthesisConfidence(decisions: SynthesisDecision[]): number {
  // Weight by decision type
  const weights = {
    token_application: 1.0,    // High confidence - observed tokens
    structural_choice: 0.8,    // Medium-high - rule-based logic
    llm_refinement: 0.6        // Medium - probabilistic
  };

  const weightedSum = decisions.reduce((sum, d) => {
    return sum + (d.confidence * weights[d.type]);
  }, 0);

  const totalWeight = decisions.reduce((sum, d) => sum + weights[d.type], 0);

  return weightedSum / totalWeight;
}
```

### Pattern 6: Complete State Coverage Generation

**What:** Generate all interactive states (hover, active, focus, disabled, loading, error)
**When to use:** All interactive component synthesis
**Example:**
```typescript
interface ComponentState {
  name: 'default' | 'hover' | 'active' | 'focus' | 'disabled' | 'loading' | 'error';
  styles: Record<string, string>;
  ariaAttributes?: Record<string, string>;
  evidence: EvidenceLink[];
  confidence: number;
}

function generateComponentStates(
  baseComponent: StructuralSynthesis,
  extractedDNA: DesignDNA
): ComponentState[] {
  const states: ComponentState[] = [];

  // Default state (from base component)
  states.push({
    name: 'default',
    styles: baseComponent.tokens,
    evidence: baseComponent.evidence,
    confidence: baseComponent.confidence
  });

  // Hover state - deterministic rules with observed patterns
  const hoverEvidence = findHoverPatterns(extractedDNA);
  states.push({
    name: 'hover',
    styles: applyHoverRules(baseComponent.tokens, hoverEvidence),
    evidence: hoverEvidence.evidence,
    confidence: hoverEvidence.confidence
  });

  // Focus state - accessibility-first, WCAG 2.1 compliant
  states.push({
    name: 'focus',
    styles: generateFocusState(baseComponent.tokens, extractedDNA),
    ariaAttributes: { 'aria-describedby': 'focus-hint' },
    evidence: [{ sourceType: 'inferred_pattern', reference: 'wcag-focus-visible' }],
    confidence: 0.95 // High confidence - standard pattern
  });

  // Disabled state - reduce opacity, cursor not-allowed
  states.push({
    name: 'disabled',
    styles: generateDisabledState(baseComponent.tokens),
    ariaAttributes: { 'aria-disabled': 'true' },
    evidence: [{ sourceType: 'inferred_pattern', reference: 'standard-disabled' }],
    confidence: 0.9
  });

  // Loading and error states - LLM decides nuances
  const llmStates = await llmGenerateEdgeStates(baseComponent, extractedDNA);
  states.push(...llmStates);

  return states;
}
```

### Pattern 7: Accessibility Baseline Generation

**What:** Generate keyboard navigation, focus management, and ARIA guidance
**When to use:** All synthesized components
**Example:**
```typescript
interface A11yBaseline {
  keyboardNavigation: KeyboardGuidance;
  focusManagement: FocusGuidance;
  ariaPattern: AriaGuidance;
  confidence: number;
  wcagLevel: 'A' | 'AA' | 'AAA';
}

interface KeyboardGuidance {
  keys: { key: string; action: string }[];
  tabIndex: number;
  example: string;
}

interface FocusGuidance {
  focusIndicator: string; // CSS for focus ring
  focusOrder: string;     // Tab order guidance
  focusTrap?: boolean;    // For modals
}

interface AriaGuidance {
  role: string;
  requiredAttributes: Record<string, string>;
  optionalAttributes: Record<string, string>;
  liveRegion?: 'polite' | 'assertive';
}

function generateA11yBaseline(
  componentType: ComponentType,
  structure: StructuralSynthesis
): A11yBaseline {
  // Use W3C ARIA Authoring Practices Guide patterns
  const ariaPattern = ARIA_PATTERNS[componentType];

  // Generate keyboard navigation per APG
  const keyboard: KeyboardGuidance = {
    keys: ariaPattern.keys,
    tabIndex: ariaPattern.tabIndex,
    example: generateKeyboardExample(componentType)
  };

  // Generate focus management
  const focus: FocusGuidance = {
    focusIndicator: generateWCAGFocusIndicator(structure.tokens),
    focusOrder: 'Sequential based on DOM order',
    focusTrap: componentType === 'modal'
  };

  // Generate ARIA attributes
  const aria: AriaGuidance = {
    role: ariaPattern.role,
    requiredAttributes: ariaPattern.required,
    optionalAttributes: ariaPattern.optional,
    liveRegion: componentType === 'error' ? 'assertive' : undefined
  };

  return {
    keyboardNavigation: keyboard,
    focusManagement: focus,
    ariaPattern: aria,
    confidence: 0.95, // High confidence - W3C standards
    wcagLevel: 'AA'
  };
}

// W3C ARIA patterns reference
const ARIA_PATTERNS: Record<ComponentType, any> = {
  button: {
    role: 'button',
    required: {},
    optional: { 'aria-pressed': 'boolean', 'aria-expanded': 'boolean' },
    keys: [
      { key: 'Enter', action: 'Activate button' },
      { key: 'Space', action: 'Activate button' }
    ],
    tabIndex: 0
  },
  modal: {
    role: 'dialog',
    required: { 'aria-modal': 'true', 'aria-labelledby': 'id' },
    optional: { 'aria-describedby': 'id' },
    keys: [
      { key: 'Escape', action: 'Close dialog' },
      { key: 'Tab', action: 'Cycle focus within dialog (focus trap)' }
    ],
    tabIndex: -1
  }
  // ... other patterns from W3C APG
};
```

### Anti-Patterns to Avoid

- **Hallucinated tokens:** Never generate design tokens not observed in source site. All tokens must reference extracted DNA with evidence.
- **Unanchored design guesses:** All synthesis decisions must either use observed patterns or be explicitly labeled as LLM inference with confidence score.
- **Missing provenance:** Every CSS property, every token value, every structural decision must trace back to evidence.
- **Incomplete state coverage:** Shipping interactive components without hover/focus/disabled/error states creates accessibility barriers.
- **Ignoring WCAG:** Accessibility is not optional. Focus indicators, keyboard navigation, and ARIA must meet WCAG 2.1 Level AA minimum.
- **Over-reliance on LLM:** Use rules for deterministic decisions (structure, token application). Reserve LLM for genuinely nuanced decisions (motion timing, microcopy tone).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Template engine | Custom string interpolation | Handlebars | Handles escaping, partials, helpers, iteration - battle-tested for code generation |
| Constraint solving | Custom layout calculator | kiwi.js (if needed) | Cassowary algorithm is complex; 30+ years of research; handles edge cases |
| Schema validation | Manual JSON validation | Zod | Type-safe schemas, automatic inference, proven with Claude structured outputs |
| Claude API retry logic | Custom exponential backoff | @anthropic-ai/sdk built-in | SDK handles rate limits, retries, error cases correctly |
| ARIA patterns | Custom accessibility rules | W3C ARIA Authoring Practices | 15+ years of standards work, tested with assistive tech |
| Focus management | Custom focus trap | Existing patterns (roving tabindex, aria-activedescendant) | Keyboard navigation is subtle; wrong implementation breaks accessibility |

**Key insight:** Component synthesis requires both creativity (LLM) and correctness (rules). Don't hand-roll the correctness layer - use proven solutions for templates, schemas, and accessibility. Save LLM tokens for genuinely creative decisions.

## Common Pitfalls

### Pitfall 1: Token Hallucination

**What goes wrong:** LLM generates plausible-looking tokens (e.g., `#3B82F6`) that don't exist in extracted DNA
**Why it happens:** LLMs are trained on design systems and will confidently suggest "reasonable" values
**How to avoid:**
- Constraint validation layer between LLM output and final synthesis
- Require LLM to reference evidence IDs for all token usage
- Use structured outputs with enum constraints for token IDs
**Warning signs:** Synthesized components with colors/spacing not in DTCG token file; missing evidence citations

### Pitfall 2: Confidence Score Inflation

**What goes wrong:** All synthesized components report 0.9+ confidence despite weak evidence
**Why it happens:** Developers want to appear confident; scoring formula weighted incorrectly
**How to avoid:**
- Use DARPA SCORE-style confidence: account for evidence strength, cross-page frequency, LLM uncertainty
- Separate confidence by decision type: observed tokens (high), structural rules (medium), LLM nuances (variable)
- External validation: human review of low-confidence synthesis
**Warning signs:** No low-confidence components; confidence scores don't correlate with synthesis quality

### Pitfall 3: State Coverage Gaps

**What goes wrong:** Synthesized components work in default state but break when disabled/loading/error
**Why it happens:** Developers test happy path only; state generation is an afterthought
**How to avoid:**
- State generation is mandatory, not optional
- Integration tests that render all states
- Visual regression testing for all state combinations
**Warning signs:** Components missing disabled state; no loading indicators; errors cause layout shifts

### Pitfall 4: ARIA Anti-Patterns

**What goes wrong:** Synthesized components have incorrect ARIA (e.g., `role="button"` without keyboard support)
**Why it happens:** LLM trained on poor accessibility examples; developers unfamiliar with ARIA
**How to avoid:**
- Use W3C ARIA Authoring Practices Guide as single source of truth
- Generate ARIA + keyboard + focus as atomic unit (not separate)
- Validate against axe-core or similar accessibility testing tool
**Warning signs:** `role` attributes without corresponding keyboard handlers; missing `aria-label` on icon buttons; focus indicators below 3:1 contrast

### Pitfall 5: Prompt Cache Invalidation Cascade

**What goes wrong:** Minor changes to system prompt invalidate entire cache; costs spike
**Why it happens:** Cache requires 100% exact match; hierarchy is tools → system → messages
**How to avoid:**
- Place static design DNA in cache_control marked section
- Put variable data (component request) in user message only
- Use 5-minute ephemeral cache for exploratory work; upgrade to 1-hour for batch synthesis
**Warning signs:** Cache hit rate <50%; costs higher than expected; different results for same input

### Pitfall 6: Evidence Chain Breaks

**What goes wrong:** Synthesized component has evidence citations but chain doesn't trace to source
**Why it happens:** Evidence tracking is verbose; developers skip for speed
**How to avoid:**
- Evidence tracking is built into synthesis functions, not manual
- Every token reference automatically links to PageTokens evidence
- Integration tests verify evidence completeness
**Warning signs:** `evidence: []` in synthesized components; citations missing pageUrl/selector; cannot reproduce synthesis

### Pitfall 7: LLM Over-Reliance

**What goes wrong:** Using Claude for decisions that should be deterministic (e.g., "should I use spacing-md or spacing-lg?")
**Why it happens:** LLM seems easier than writing rules; uncertainty about what's deterministic
**How to avoid:**
- Clear division: rules for structure/tokens, LLM for timing/tone/edge-cases
- Cost analysis: LLM calls should be <20% of synthesis operations
- Hybrid pattern: rules propose options, LLM chooses between them
**Warning signs:** High Claude API costs; slow synthesis; non-deterministic output for same input

## Code Examples

Verified patterns from research and standards:

### Example 1: Basic Component Synthesis Flow

```typescript
// src/synthesis/component-composer.ts
import Handlebars from 'handlebars';
import type { DesignDNA, ComponentRequest, SynthesizedComponent } from '../types/index.js';

interface SynthesisContext {
  templateName: string;
  tokens: Record<string, any>;
  structure: Record<string, any>;
  evidence: EvidenceLink[];
}

export async function synthesizeComponent(
  request: ComponentRequest,
  designDNA: DesignDNA
): Promise<SynthesizedComponent> {
  // Step 1: Build context with token constraints
  const context = buildSynthesisContext(request, designDNA);

  // Step 2: Validate all tokens exist in design DNA
  const validation = validateTokenConstraints(context.tokens, designDNA);
  if (!validation.valid) {
    throw new Error(`Missing required tokens: ${validation.missing.join(', ')}`);
  }

  // Step 3: Compile template with validated tokens
  const template = Handlebars.compile(readTemplate(context.templateName));
  const html = template(context);

  // Step 4: Generate all states (hover, focus, disabled, etc.)
  const states = await generateAllStates(context, designDNA);

  // Step 5: Generate accessibility baseline
  const a11y = generateA11yBaseline(request.type, context);

  // Step 6: LLM refinement for nuanced decisions
  const refinements = await llmRefine(context, states, designDNA);

  // Step 7: Calculate confidence and build evidence chain
  const confidence = calculateSynthesisConfidence([
    ...context.evidence,
    ...states.flatMap(s => s.evidence),
    ...refinements.evidence
  ]);

  return {
    type: request.type,
    html,
    css: generateCSS(context, states),
    states,
    accessibility: a11y,
    refinements,
    confidence,
    evidence: buildEvidenceChain(context, states, refinements)
  };
}
```

### Example 2: Claude Structured Output for Motion Timing

```typescript
// src/synthesis/llm-refiner.ts
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const MotionTimingSchema = z.object({
  transitions: z.array(z.object({
    property: z.enum(['opacity', 'transform', 'background-color', 'color', 'border-color']),
    duration: z.string().regex(/^\d+m?s$/), // e.g., "200ms", "0.3s"
    timingFunction: z.enum(['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear']),
    reasoning: z.string(),
    confidence: z.number().min(0).max(1),
    evidenceIds: z.array(z.string())
  }))
});

type MotionTiming = z.infer<typeof MotionTimingSchema>;

export async function llmDecideMotionTiming(
  component: StructuralSynthesis,
  designDNA: DesignDNA
): Promise<MotionTiming> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Build prompt with observed motion patterns
  const observedMotion = designDNA.tokens.motion.standards.map(m =>
    `- ${m.token.property}: ${m.token.value} (observed on ${m.pageUrls.size} pages)`
  ).join('\n');

  const prompt = `You are a design system expert. Based on the observed motion patterns below, decide appropriate transition timings for a ${component.type} component.

Observed motion patterns:
${observedMotion}

Component structure:
${component.html}

Rules:
1. Only use durations/easings observed in the design DNA
2. Provide evidence IDs for each decision
3. Rate your confidence (0-1) for each transition
4. Explain your reasoning

Return a structured JSON response with transitions.`;

  const response = await client.messages.create({
    model: 'claude-opus-4-1',
    max_tokens: 2048,
    system: buildCachedSystemPrompt(designDNA),
    messages: [{ role: 'user', content: prompt }],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'motion_timing',
        schema: zodToJsonSchema(MotionTimingSchema),
        strict: true
      }
    }
  }, {
    headers: { 'anthropic-beta': 'structured-outputs-2025-11-13' }
  });

  // Parse and validate (guaranteed to match schema due to structured outputs)
  const result = JSON.parse(response.content[0].text);
  return MotionTimingSchema.parse(result);
}
```

### Example 3: Handlebars Template with Token Constraints

```typescript
// src/synthesis/templates/data-table.hbs
/*
<div class="data-table" role="table" aria-label="{{ariaLabel}}">
  <div class="table-header" role="rowgroup">
    <div class="table-row" role="row">
      {{#each columns}}
      <div class="table-cell table-header-cell" role="columnheader"
           style="
             font-weight: {{../tokens.typography.heading.fontWeight}};
             font-size: {{../tokens.typography.body.fontSize}};
             color: {{../tokens.color.textPrimary}};
             padding: {{../tokens.spacing.md}};
             border-bottom: 1px solid {{../tokens.color.border}};
           ">
        {{this.label}}
      </div>
      {{/each}}
    </div>
  </div>
  <div class="table-body" role="rowgroup">
    {{#each rows}}
    <div class="table-row" role="row"
         style="
           border-bottom: 1px solid {{../tokens.color.border}};
         "
         {{#if @index}}
         tabindex="0"
         {{/if}}>
      {{#each ../columns}}
      <div class="table-cell" role="cell"
           style="
             padding: {{../../tokens.spacing.md}};
             color: {{../../tokens.color.textSecondary}};
           ">
        {{lookup ../../this this.key}}
      </div>
      {{/each}}
    </div>
    {{/each}}
  </div>
</div>

<style>
.table-row:hover {
  background-color: {{tokens.color.backgroundHover}};
}

.table-row:focus {
  outline: 2px solid {{tokens.color.focusRing}};
  outline-offset: -2px;
}

.table-row[aria-selected="true"] {
  background-color: {{tokens.color.backgroundSelected}};
}
</style>
*/

// Token context validation
interface DataTableContext {
  ariaLabel: string;
  columns: Array<{ label: string; key: string }>;
  rows: Array<Record<string, any>>;
  tokens: {
    typography: {
      heading: { fontWeight: string };
      body: { fontSize: string };
    };
    color: {
      textPrimary: string;
      textSecondary: string;
      border: string;
      backgroundHover: string;
      backgroundSelected: string;
      focusRing: string;
    };
    spacing: {
      md: string;
    };
  };
}

// Compile with validation
function compileDataTable(
  context: DataTableContext,
  designDNA: DesignDNA
): StructuralSynthesis {
  // Validate required tokens exist in design DNA
  const requiredTokens = [
    'typography.heading.fontWeight',
    'typography.body.fontSize',
    'color.textPrimary',
    'color.textSecondary',
    'color.border',
    'spacing.md'
  ];

  const validation = validateTokenPaths(requiredTokens, designDNA.tokens);

  // If backgroundHover not observed, infer from primary with opacity
  if (!hasToken('color.backgroundHover', designDNA)) {
    context.tokens.color.backgroundHover = inferHoverColor(
      context.tokens.color.textPrimary,
      designDNA
    );
  }

  // Compile template
  const template = Handlebars.compile(readTemplate('data-table'));
  const html = template(context);

  return {
    html,
    css: extractStyleBlock(html),
    tokens: context.tokens,
    evidence: buildEvidenceChain(requiredTokens, designDNA),
    confidence: validation.confidence
  };
}
```

### Example 4: Accessibility Baseline Generation

```typescript
// src/synthesis/a11y-generator.ts
import type { ComponentType, StructuralSynthesis, A11yBaseline } from '../types/index.js';

// W3C ARIA Authoring Practices Guide patterns
// Source: https://www.w3.org/WAI/ARIA/apg/
const ARIA_APG_PATTERNS: Record<ComponentType, any> = {
  button: {
    role: 'button',
    tabIndex: 0,
    keys: [
      { key: 'Enter', action: 'Activates the button' },
      { key: 'Space', action: 'Activates the button' }
    ],
    aria: {
      required: {},
      optional: {
        'aria-pressed': 'For toggle buttons (true/false/mixed)',
        'aria-expanded': 'If button controls disclosure widget (true/false)',
        'aria-label': 'If button has no visible text (icon-only)'
      }
    },
    focus: {
      indicator: '2px solid with 3:1 contrast ratio (WCAG 2.1 Level AA)',
      management: 'Receives focus naturally via tabindex'
    }
  },

  modal: {
    role: 'dialog',
    tabIndex: -1,
    keys: [
      { key: 'Escape', action: 'Closes the dialog' },
      { key: 'Tab', action: 'Moves focus to next focusable element inside dialog (focus trap)' },
      { key: 'Shift+Tab', action: 'Moves focus to previous focusable element inside dialog' }
    ],
    aria: {
      required: {
        'aria-modal': 'true',
        'aria-labelledby': 'ID of dialog title element'
      },
      optional: {
        'aria-describedby': 'ID of dialog description element'
      }
    },
    focus: {
      indicator: '2px solid with 3:1 contrast ratio',
      management: 'Focus moves to dialog on open; returns to trigger on close; focus trapped within dialog'
    }
  },

  // Card doesn't have standard ARIA pattern - use article or region
  card: {
    role: 'article', // or 'region' with aria-label
    tabIndex: -1, // unless interactive
    keys: [],
    aria: {
      required: {},
      optional: {
        'aria-label': 'If card is a region landmark',
        'aria-labelledby': 'Reference to card title'
      }
    },
    focus: {
      indicator: 'Only if card is interactive',
      management: 'Typically not focusable unless contains interactive elements'
    }
  }
};

export function generateA11yBaseline(
  componentType: ComponentType,
  structure: StructuralSynthesis,
  tokens: DesignTokens
): A11yBaseline {
  const pattern = ARIA_APG_PATTERNS[componentType];

  if (!pattern) {
    throw new Error(`No ARIA pattern for component type: ${componentType}`);
  }

  // Generate keyboard navigation guidance
  const keyboard: KeyboardGuidance = {
    keys: pattern.keys,
    tabIndex: pattern.tabIndex,
    example: generateKeyboardExample(componentType, pattern.keys)
  };

  // Generate focus management with WCAG-compliant focus indicator
  const focus: FocusGuidance = {
    focusIndicator: generateWCAGFocusRing(tokens),
    focusOrder: 'Sequential following DOM order',
    focusTrap: componentType === 'modal'
  };

  // Generate ARIA attributes
  const aria: AriaGuidance = {
    role: pattern.role,
    requiredAttributes: pattern.aria.required,
    optionalAttributes: pattern.aria.optional,
    liveRegion: componentType === 'modal' ? 'polite' : undefined
  };

  return {
    keyboardNavigation: keyboard,
    focusManagement: focus,
    ariaPattern: aria,
    confidence: 0.95, // High - based on W3C standards
    wcagLevel: 'AA'
  };
}

function generateWCAGFocusRing(tokens: DesignTokens): string {
  // WCAG 2.1 Level AA: Focus indicator must have 3:1 contrast with adjacent colors
  const focusColor = tokens.color.focusRing || tokens.color.primary;

  return `outline: 2px solid ${focusColor}; outline-offset: 2px;`;
}

function generateKeyboardExample(type: ComponentType, keys: any[]): string {
  return keys.map(k => `- ${k.key}: ${k.action}`).join('\n');
}
```

### Example 5: State Coverage Generation

```typescript
// src/synthesis/state-generator.ts
import type { ComponentState, StructuralSynthesis, DesignDNA } from '../types/index.js';

export async function generateAllStates(
  base: StructuralSynthesis,
  designDNA: DesignDNA
): Promise<ComponentState[]> {
  const states: ComponentState[] = [];

  // Default state (from base)
  states.push({
    name: 'default',
    styles: base.tokens,
    evidence: base.evidence,
    confidence: base.confidence
  });

  // Hover state - deterministic rules
  const hoverState = generateHoverState(base, designDNA);
  states.push(hoverState);

  // Active/pressed state
  const activeState = generateActiveState(base, designDNA);
  states.push(activeState);

  // Focus state - WCAG compliant
  const focusState = generateFocusState(base, designDNA);
  states.push(focusState);

  // Disabled state - standard pattern
  const disabledState = generateDisabledState(base, designDNA);
  states.push(disabledState);

  // Loading state - LLM decides presentation
  const loadingState = await llmGenerateLoadingState(base, designDNA);
  states.push(loadingState);

  // Error state - LLM decides styling
  const errorState = await llmGenerateErrorState(base, designDNA);
  states.push(errorState);

  return states;
}

function generateHoverState(
  base: StructuralSynthesis,
  designDNA: DesignDNA
): ComponentState {
  // Look for observed hover patterns
  const observedHovers = findObservedHoverPatterns(designDNA);

  if (observedHovers.length > 0) {
    // Use most common observed pattern
    const mostCommon = observedHovers.sort((a, b) => b.frequency - a.frequency)[0];
    return {
      name: 'hover',
      styles: applyHoverPattern(base.tokens, mostCommon),
      evidence: mostCommon.evidence,
      confidence: mostCommon.confidence
    };
  }

  // Fallback: deterministic hover rules
  // Common pattern: slightly darken background, subtle scale/shadow
  return {
    name: 'hover',
    styles: {
      ...base.tokens,
      backgroundColor: darkenColor(base.tokens.backgroundColor, 0.1),
      transform: 'translateY(-1px)',
      boxShadow: designDNA.tokens.shadows.standards[0]?.token.layers || 'none'
    },
    evidence: [{ sourceType: 'inferred_pattern', reference: 'standard-hover-darken' }],
    confidence: 0.7
  };
}

function generateFocusState(
  base: StructuralSynthesis,
  designDNA: DesignDNA
): ComponentState {
  // WCAG 2.1 Level AA: Focus indicator with 3:1 contrast
  const focusRingColor = designDNA.tokens.color.standards.find(
    c => c.token.canonical.includes('focus') || c.token.canonical.includes('primary')
  )?.token.canonical || '#0066FF';

  return {
    name: 'focus',
    styles: {
      ...base.tokens,
      outline: `2px solid ${focusRingColor}`,
      outlineOffset: '2px'
    },
    ariaAttributes: {
      'aria-describedby': 'focus-hint'
    },
    evidence: [{ sourceType: 'inferred_pattern', reference: 'wcag-2.1-focus-visible' }],
    confidence: 0.95 // High - standard pattern
  };
}

function generateDisabledState(
  base: StructuralSynthesis,
  designDNA: DesignDNA
): ComponentState {
  // Standard disabled pattern: reduced opacity, not-allowed cursor
  return {
    name: 'disabled',
    styles: {
      ...base.tokens,
      opacity: '0.5',
      cursor: 'not-allowed',
      pointerEvents: 'none'
    },
    ariaAttributes: {
      'aria-disabled': 'true'
    },
    evidence: [{ sourceType: 'inferred_pattern', reference: 'standard-disabled-opacity' }],
    confidence: 0.9
  };
}

async function llmGenerateLoadingState(
  base: StructuralSynthesis,
  designDNA: DesignDNA
): Promise<ComponentState> {
  // LLM decides: spinner vs. skeleton vs. progress bar vs. text change
  const decision = await llmDecideLoadingPresentation(base, designDNA);

  return {
    name: 'loading',
    styles: decision.styles,
    ariaAttributes: {
      'aria-busy': 'true',
      'aria-live': 'polite'
    },
    evidence: [{
      sourceType: 'llm_decision',
      reference: decision.decisionId,
      llmReasoning: decision.reasoning
    }],
    confidence: decision.confidence
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual JSON validation | Anthropic Structured Outputs | Nov 2025 | Eliminates validation loops, guaranteed schema compliance |
| Organization-level prompt cache | Workspace-level cache isolation | Feb 2026 | Better data separation, prevents cross-workspace leakage |
| GPT-4 for design decisions | Claude Opus 4.1 | Oct 2025 | Stronger reasoning for nuanced design decisions |
| Custom template engines | Handlebars 4.7+ | Stable | Proven for component scaffolding, large ecosystem |
| Manual constraint solving | Cassowary (kiwi.js) | Stable | 30+ years of layout constraint research |
| Custom ARIA patterns | W3C ARIA APG 1.3 | Jan 2025 | Updated patterns for modern components |

**Deprecated/outdated:**
- OpenAI function calling: Replaced by Anthropic structured outputs with strict schema enforcement
- Manual retry logic for LLM: SDK handles this with backoff
- String-based JSON parsing with try/catch: Structured outputs eliminate parse errors

## Open Questions

1. **Should synthesis support composition of multiple primitives?**
   - What we know: Phase 2 detects button, input, card, nav, modal
   - What's unclear: Can we synthesize "search bar" (input + button) or "card grid" (multiple cards + layout)?
   - Recommendation: Start with single-component synthesis in v1; add composition in v2 if demand exists

2. **How to handle edge cases where no similar tokens exist?**
   - What we know: Data table might need tokens not observed on landing pages
   - What's unclear: Should synthesis fail hard, use LLM to infer, or prompt user to add tokens manually?
   - Recommendation: Fail with clear error + suggestion (e.g., "Missing 'border' color - consider crawling table-heavy pages")

3. **Should LLM refinement be optional for faster/cheaper synthesis?**
   - What we know: LLM calls add latency and cost
   - What's unclear: Can users opt-out of LLM and accept deterministic-only synthesis?
   - Recommendation: Provide `--fast` flag for rule-based only; default to hybrid for quality

4. **How to version synthesized components for reproducibility?**
   - What we know: LLM outputs can drift over time with model updates
   - What's unclear: Should we snapshot LLM decisions or accept evolution?
   - Recommendation: Store LLM reasoning + timestamp in evidence; warn if re-synthesis produces different output

5. **Should accessibility baseline be customizable (WCAG A vs AA vs AAA)?**
   - What we know: Level AA is standard for public websites
   - What's unclear: Should enterprise users be able to enforce Level AAA?
   - Recommendation: Default to AA, allow `--wcag-level=AAA` flag for stricter compliance

## Sources

### Primary (HIGH confidence)

- **Anthropic Structured Outputs** (Nov 2025): [https://platform.claude.com/docs/en/build-with-claude/structured-outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - Official documentation for structured outputs with JSON schema compliance
- **Anthropic Prompt Caching**: [https://platform.claude.com/docs/en/build-with-claude/prompt-caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) - Official caching documentation with hierarchy (tools → system → messages)
- **W3C ARIA Authoring Practices Guide (APG)**: [https://www.w3.org/WAI/ARIA/apg/](https://www.w3.org/WAI/ARIA/apg/) - Official W3C patterns for keyboard navigation and ARIA
- **Handlebars Official Docs**: [https://handlebarsjs.com/](https://handlebarsjs.com/) - Template engine documentation
- **Zod Documentation**: Already in project (v3.23.8) - Schema validation with TypeScript
- **kiwi.js GitHub**: [https://github.com/IjzerenHein/kiwi.js/](https://github.com/IjzerenHein/kiwi.js/) - TypeScript Cassowary constraint solver

### Secondary (MEDIUM confidence)

- **Hybrid Intelligence: Marrying Deterministic Code with LLMs**: [https://blog.newmathdata.com/hybrid-intelligence-marrying-deterministic-code-with-llms-for-robust-software-development-b92bf949257c](https://blog.newmathdata.com/hybrid-intelligence-marrying-deterministic-code-with-llms-for-robust-software-development-b92bf949257c) - Pattern for separating deterministic and probabilistic logic
- **The Rule Maker Pattern**: [https://tessl.io/blog/the-rule-maker-pattern/](https://tessl.io/blog/the-rule-maker-pattern/) - AI generates rules that run deterministically
- **Component-Based Synthesis Using SMT**: [https://www.researchgate.net/publication/281455238_Component-Based_Synthesis_of_Embedded_Systems_Using_Satisfiability_Modulo_Theories](https://www.researchgate.net/publication/281455238_Component-Based_Synthesis_of_Embedded_Systems_Using_Satisfiability_Modulo_Theories) - Constraint-based component synthesis patterns
- **DARPA SCORE Program**: [https://www.darpa.mil/research/programs/systematizing-confidence-in-open-research-and-evidence](https://www.darpa.mil/research/programs/systematizing-confidence-in-open-research-and-evidence) - Confidence scoring methodology
- **Material Design Interaction States**: [https://m2.material.io/design/interaction/states.html](https://m2.material.io/design/interaction/states.html) - State patterns (hover, focus, active, disabled)
- **Storybook MCP with Claude**: [https://tympanus.net/codrops/2025/12/09/supercharge-your-design-system-with-llms-and-storybook-mcp/](https://tympanus.net/codrops/2025/12/09/supercharge-your-design-system-with-llms-and-storybook-mcp/) - LLM + design system integration

### Tertiary (LOW confidence)

- **llm-exe Prompt Templates**: [https://medium.com/llm-exe/llm-exe-prompt-create-typed-modular-prompt-templates-in-typescript-3d9d40dc923d](https://medium.com/llm-exe/llm-exe-prompt-create-typed-modular-prompt-templates-in-typescript-3d9d40dc923d) - TypeScript prompt engineering patterns
- **Plop Code Scaffolding**: Uses Handlebars for component generation (mentioned in research)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Anthropic SDK, Zod, Handlebars all have official docs and proven usage
- Architecture: MEDIUM-HIGH - Hybrid rule-based + LLM pattern well-established; specific implementation for design synthesis is novel
- Pitfalls: MEDIUM - Common anti-patterns documented; some specific to design synthesis are extrapolated

**Research date:** 2026-02-16
**Valid until:** ~30 days (March 2026) - Stable domain, but Anthropic SDK and Claude models evolve monthly
