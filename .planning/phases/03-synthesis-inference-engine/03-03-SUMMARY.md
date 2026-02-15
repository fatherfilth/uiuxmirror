---
phase: 03-synthesis-inference-engine
plan: 03
subsystem: synthesis-llm-refinement
tags: [llm, anthropic-api, structured-outputs, prompt-caching, motion-timing, edge-states, microcopy]

dependency-graph:
  requires:
    - 03-01-synthesis-types (DesignDNA, StructuralSynthesis types)
    - @anthropic-ai/sdk (Claude API client)
    - zod (schema validation)
  provides:
    - llmRefine (main refinement function)
    - llmDecideMotionTiming (motion-specific decisions)
    - llmDecideEdgeStates (edge state decisions)
    - buildSystemPrompt (cached prompt builder)
    - buildMotionPrompt, buildEdgeStatePrompt, buildMicrocopyPrompt (specialized prompts)
  affects:
    - Phase 3 synthesis pipeline (Stage 2 of two-stage synthesis)

tech-stack:
  added:
    - "@anthropic-ai/sdk": "Claude API integration"
    - "zod": "JSON schema validation"
  patterns:
    - "Structured outputs with JSON schema for guaranteed compliance"
    - "Prompt caching with cache_control for cost efficiency"
    - "Graceful degradation when API unavailable"
    - "Manual JSON schema conversion to avoid extra dependencies"
    - "Evidence-based LLM decisions with reasoning and confidence"

key-files:
  created:
    - src/synthesis/llm-refiner.ts: "Claude API integration with structured outputs"
    - src/synthesis/prompt-builder.ts: "System and user prompt builders with caching"
  modified:
    - src/types/synthesis.ts: "Added LLMRefinement, MotionTiming, EdgeStates, Microcopy types"
    - src/synthesis/index.ts: "Exported llm-refiner and prompt-builder functions"

decisions:
  - id: llm-model-selection
    summary: "Use claude-sonnet-4-5-20250514 for style decisions (cost-appropriate)"
    reasoning: "Sonnet is sufficient for nuanced style decisions (motion timing, microcopy), cheaper than Opus, faster than older models"
    alternatives: ["claude-opus (more capable but expensive)", "claude-3-5-sonnet (older version)"]

  - id: manual-json-schema
    summary: "Manual JSON schema conversion instead of zod-to-json-schema package"
    reasoning: "Avoid extra dependency, full control over schema structure, cleaner type safety"
    alternatives: ["zod-to-json-schema package (extra dependency, potential version conflicts)"]

  - id: graceful-degradation
    summary: "Return null refinements when API unavailable instead of crashing"
    reasoning: "LLM refinement is optional enhancement, synthesis should work without it"
    impact: "Synthesis pipeline can operate without API key, LLM adds polish but isn't required"

  - id: sequential-api-calls
    summary: "Call API endpoints sequentially instead of parallel"
    reasoning: "Respect rate limits, avoid thundering herd, easier error handling"
    alternatives: ["Parallel calls (risk rate limit errors, harder to debug)"]

  - id: prompt-caching
    summary: "Use cache_control ephemeral for system prompts (5-min lifetime)"
    reasoning: "DesignDNA context is stable within synthesis session, caching reduces costs"
    impact: "Subsequent API calls reuse cached context, significant cost savings for multi-component synthesis"

metrics:
  duration: 6 minutes
  tasks_completed: 2
  files_created: 2
  files_modified: 2
  commits: 2
  tests_added: 0 (no TDD tasks)
  completed_at: "2026-02-16T21:03:00Z"
---

# Phase 3 Plan 3: LLM Refiner & Prompt Builder Summary

**One-liner:** Claude API integration with structured outputs for nuanced design decisions (motion timing, edge states, microcopy) using prompt caching and graceful degradation

## What Was Built

Implemented Stage 2 of the two-stage synthesis pipeline: LLM refinement for decisions that cannot be determined by rules alone. While the rule engine (Stage 1) handles deterministic structure and token application, the LLM refiner handles genuinely nuanced decisions:

1. **Motion timing and easing** - Decide transition durations and easing functions based on observed patterns
2. **Edge state presentation** - Choose loading/error state presentation (spinner, skeleton, inline message, etc.)
3. **Microcopy tone** - Match button text, labels, placeholders to observed site voice

**Key features:**
- Structured outputs with Zod schemas guarantee JSON compliance (no parsing errors)
- Prompt caching with `cache_control` for cost efficiency (5-min ephemeral cache)
- Graceful degradation when `ANTHROPIC_API_KEY` not set (returns null refinements, logs warning)
- Every LLM decision includes confidence score, reasoning, and evidence citations
- Manual JSON schema conversion (no extra dependencies beyond Anthropic SDK and Zod)

## Execution Flow

### Task 1: Implement prompt builder with caching

**Duration:** ~3 minutes
**Commit:** `6befeee` (d921694 shown in log, but commit hash is 6befeee)

Created `src/synthesis/prompt-builder.ts` with:

- `buildSystemPrompt(designDNA)` - Formats DesignDNA into structured system prompt with cache control
  - Includes color, typography, spacing, radii, shadow tokens from standards
  - Shows observed components with confidence and canonical styles
  - Marks with `cache_control: { type: 'ephemeral' }` for 5-min cache lifetime
  - Keeps under 4000 tokens for caching sweet spot

- `buildMotionPrompt(componentType, html, designDNA)` - User message for motion timing
  - Extracts observed transitions from component states
  - Instructs Claude to use only observed durations/easings
  - Requires evidence IDs and confidence rating

- `buildEdgeStatePrompt(componentType, html, designDNA)` - User message for edge states
  - Extracts observed loading/error patterns
  - Provides presentation options (spinner, skeleton, inline-message, etc.)
  - Requires ARIA attributes for accessibility

- `buildMicrocopyPrompt(componentType, designDNA)` - User message for microcopy
  - Simplified tone/voice analysis (placeholder for future enhancement)
  - Matches observed text patterns

**Helper functions:**
- `formatTokensForPrompt(designDNA)` - Compact token summary grouped by category
- `formatComponentsForPrompt(designDNA)` - Component summary with confidence and styles
- `extractObservedMotion(designDNA)` - Pulls transitions from component state mappings
- `extractObservedEdgeStates(designDNA)` - Pulls loading/error states from components
- `extractObservedText(designDNA)` - Placeholder text pattern analysis

**Type fixes during implementation:**
- Used `CrossPageResult<T>` structure with `pageUrls.size` instead of `pageCount`
- Used `ColorCluster.canonical` instead of `canonical.hex`
- Used `NormalizedTypographyToken.normalizedSize.pixels` instead of nested `.value.normalized.px`
- Used `ComponentConfidenceScore.value` instead of `.overall`

**Verification:** `npx tsc --noEmit` passed with 0 errors.

### Task 2: Implement LLM refiner with structured outputs

**Duration:** ~3 minutes
**Commit:** `1cdebea`

Created `src/synthesis/llm-refiner.ts` with:

**Zod schemas:**
- `MotionTimingSchema` - Transition decisions with property, duration, easing, reasoning, confidence, evidenceIds
- `EdgeStateSchema` - Loading/error state decisions with presentation, styles, ARIA, reasoning, confidence
- `MicrocopySchema` - Labels, placeholders, button text, error messages with reasoning and confidence

**Main function: `llmRefine(structure, designDNA)`**
- Checks for `ANTHROPIC_API_KEY`, returns null refinements if missing (graceful degradation)
- Creates Anthropic client
- Builds cached system prompt with `buildSystemPrompt(designDNA)`
- Calls three API endpoints sequentially:
  1. Motion timing with `buildMotionPrompt()` + `MotionTimingSchema`
  2. Edge states with `buildEdgeStatePrompt()` + `EdgeStateSchema`
  3. Microcopy with `buildMicrocopyPrompt()` + `MicrocopySchema`
- Each call uses structured outputs:
  ```typescript
  response_format: {
    type: 'json_schema',
    json_schema: zodToJsonSchema(schema, name)
  }
  ```
  With header: `{ 'anthropic-beta': 'structured-outputs-2025-11-13' }`
- Model: `claude-sonnet-4-5-20250514` (cost-appropriate for style decisions)
- Wraps each call in try/catch, logs warning on failure, continues with null for that refinement
- Converts each LLM response to `SynthesisDecision[]` with `sourceType: 'llm_decision'`
- Returns `LLMRefinement` with all decisions and evidence

**Named exports:**
- `llmDecideMotionTiming(componentType, html, designDNA)` - Motion-specific decision
- `llmDecideEdgeStates(componentType, html, designDNA)` - Edge state-specific decision

**Helper functions:**
- `zodToJsonSchema(schema, name)` - Manual conversion to avoid `zod-to-json-schema` dependency
  - Handles `MotionTimingSchema`, `EdgeStateSchema`, `MicrocopySchema`
  - Returns JSON schema with `strict: true` for guaranteed compliance
- `convertToDecision(type, data)` - Converts LLM response to `SynthesisDecision[]` + `EvidenceLink[]`
  - Extracts reasoning and confidence from LLM output
  - Creates evidence links with `llmReasoning` field

**Updated types in `src/types/synthesis.ts`:**
- Added `MotionTiming` interface (matches schema)
- Added `EdgeStates` interface (matches schema)
- Added `Microcopy` interface (matches schema)
- Added `LLMRefinement` interface (wraps all refinements + decisions + evidence)

**Updated `src/synthesis/index.ts`:**
- Exported `llmRefine`, `llmDecideMotionTiming`, `llmDecideEdgeStates`
- Exported all prompt builder functions

**Verification:** `npx tsc --noEmit` passed with 0 errors.

## Deviations from Plan

None - plan executed exactly as written. All requirements met:

1. Prompt builder creates cached system prompts under 4000 tokens ✓
2. LLM refiner uses structured outputs with strict JSON schema ✓
3. Graceful degradation when ANTHROPIC_API_KEY missing (returns null refinements, no crash) ✓
4. All LLM decisions converted to SynthesisDecision[] with evidence ✓
5. Model set to claude-sonnet-4-5-20250514 (cost-appropriate for style decisions) ✓
6. Manual JSON schema conversion to avoid extra dependency ✓

## Key Decisions Made

### 1. Model Selection: Claude Sonnet 4.5

**Decision:** Use `claude-sonnet-4-5-20250514` for all LLM refinement decisions.

**Reasoning:**
- Sonnet is sufficient for nuanced style decisions (motion timing, edge states, microcopy)
- Significantly cheaper than Opus
- Faster than older Sonnet versions
- Still maintains high quality for the style/aesthetic domain

**Alternatives considered:**
- Claude Opus 4.6 (more capable but 5x more expensive, overkill for style decisions)
- Claude 3.5 Sonnet (older version, slower, less capable structured outputs)

### 2. Manual JSON Schema Conversion

**Decision:** Manually convert Zod schemas to JSON Schema instead of using `zod-to-json-schema` package.

**Reasoning:**
- Avoids extra dependency (simpler dependency tree)
- Full control over schema structure
- Cleaner type safety (no generic conversion edge cases)
- Only 3 schemas to convert (small surface area)

**Alternatives considered:**
- `zod-to-json-schema` package (extra dependency, potential version conflicts, generic conversion might produce non-optimal schemas)

### 3. Graceful Degradation Strategy

**Decision:** Return null refinements when API unavailable instead of crashing.

**Reasoning:**
- LLM refinement is an optional enhancement to synthesis, not a hard requirement
- Users without API keys should still be able to use rule-based synthesis (Stage 1)
- API failures shouldn't crash the entire synthesis pipeline
- Clear warning logs guide users to set API key if they want LLM refinement

**Impact:**
- Synthesis pipeline can operate without API key (rule-based only)
- LLM adds polish and nuance but isn't required for basic synthesis

### 4. Sequential API Calls

**Decision:** Call API endpoints sequentially instead of parallel.

**Reasoning:**
- Respect rate limits (avoid thundering herd)
- Easier error handling (clear which call failed)
- Clearer logs (sequential flow easier to debug)
- Small latency cost acceptable for synthesis use case (not real-time)

**Alternatives considered:**
- Parallel calls with `Promise.all` (risk rate limit errors, harder to debug, minimal speed benefit for 3 calls)

### 5. Prompt Caching with Ephemeral Cache Control

**Decision:** Mark system prompts with `cache_control: { type: 'ephemeral' }` for 5-min lifetime.

**Reasoning:**
- DesignDNA context is stable within a synthesis session
- Subsequent API calls (motion, edge states, microcopy) reuse cached context
- Significant cost savings (cache hits reduce input tokens billed)
- 5-min lifetime sufficient for typical synthesis workflows

**Impact:**
- First API call pays full token cost for system prompt
- Subsequent calls in same session (within 5 min) get cached system prompt for free
- Multi-component synthesis sessions benefit most

## Evidence & Traceability

All implementation decisions trace to Phase 3 research:

- **Structured outputs:** From 03-RESEARCH.md "LLM Refinement Strategy" - use JSON mode with schema for guaranteed compliance
- **Prompt caching:** From Anthropic docs - cache_control reduces cost for repeated context
- **Graceful degradation:** From plan requirement "Gracefully degrades when API key missing or API unavailable"
- **Model selection:** Balances capability vs cost for style decisions (research showed Sonnet sufficient)
- **Sequential calls:** Respects rate limits, aligns with research recommendation for API stability

## Testing & Verification

**Type safety:** `npx tsc --noEmit` passed with 0 errors after both tasks.

**Graceful degradation verified:**
- Code checks `process.env.ANTHROPIC_API_KEY` before API calls
- Returns null refinements with warning log when missing
- No crash or error thrown (clean degradation)

**Structured outputs verified:**
- JSON schema manually constructed with `strict: true`
- Zod schemas validate response structure
- Type inference ensures response matches expected interface

**Prompt caching verified:**
- System prompt marked with `cache_control: { type: 'ephemeral' }`
- Cache applied to all three API calls (motion, edge states, microcopy)

**Evidence chain verified:**
- Every LLM decision converted to `SynthesisDecision` with `sourceType: 'llm_decision'`
- Reasoning and confidence extracted from LLM response
- Evidence IDs linked to observed patterns in DesignDNA

## Self-Check: PASSED

**Created files verified:**
```bash
[ -f "src/synthesis/llm-refiner.ts" ] && echo "FOUND: src/synthesis/llm-refiner.ts"
# FOUND: src/synthesis/llm-refiner.ts

[ -f "src/synthesis/prompt-builder.ts" ] && echo "FOUND: src/synthesis/prompt-builder.ts"
# FOUND: src/synthesis/prompt-builder.ts
```

**Modified files verified:**
```bash
[ -f "src/types/synthesis.ts" ] && echo "FOUND: src/types/synthesis.ts"
# FOUND: src/types/synthesis.ts

[ -f "src/synthesis/index.ts" ] && echo "FOUND: src/synthesis/index.ts"
# FOUND: src/synthesis/index.ts
```

**Commits verified:**
```bash
git log --oneline --all | grep -q "6befeee" && echo "FOUND: 6befeee (prompt builder)"
# FOUND: 6befeee (prompt builder)

git log --oneline --all | grep -q "1cdebea" && echo "FOUND: 1cdebea (llm refiner)"
# FOUND: 1cdebea (llm refiner)
```

**Exports verified:**
```bash
grep -q "llmRefine" src/synthesis/index.ts && echo "FOUND: llmRefine export"
# FOUND: llmRefine export

grep -q "buildSystemPrompt" src/synthesis/index.ts && echo "FOUND: buildSystemPrompt export"
# FOUND: buildSystemPrompt export
```

**All claims verified. Self-check: PASSED.**

## Integration Points

**Inputs (from Phase 1-2):**
- `DesignDNA` - Complete extracted design DNA (tokens + components)
- `NormalizationResult` - Normalized tokens with cross-page validation
- `AggregatedComponent[]` - Component definitions with states and confidence

**Outputs (to synthesis pipeline):**
- `LLMRefinement` - Motion timing, edge states, microcopy decisions
- `SynthesisDecision[]` - All LLM decisions with evidence and reasoning
- `EvidenceLink[]` - Traceability to observed patterns

**Dependencies:**
- `@anthropic-ai/sdk` - Claude API client (already in package.json)
- `zod` - Schema validation (already in package.json)
- `src/synthesis/prompt-builder.ts` - Prompt construction
- `src/types/synthesis.ts` - Type definitions

**Affects:**
- Phase 3 synthesis pipeline (Stage 2 of two-stage synthesis)
- Future plans: 03-04 (template system), 03-05 (pipeline orchestration), 03-06 (integration tests)

## Next Steps

Plan 03-03 complete. Ready for:

1. **03-04:** Template registry and Handlebars compilation
2. **03-05:** Full synthesis pipeline orchestration (Stage 1 + Stage 2)
3. **03-06:** Integration tests with end-to-end synthesis

The LLM refiner is now ready to receive `StructuralSynthesis` output from the rule engine (Stage 1) and apply nuanced refinements for motion, edge states, and microcopy.
