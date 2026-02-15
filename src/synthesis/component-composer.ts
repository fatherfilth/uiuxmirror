/**
 * Component composer - top-level orchestrator for synthesis pipeline
 * Combines rule-based synthesis, LLM refinement, state generation, and accessibility
 * This is the primary entry point for Phase 3 synthesis
 */

import type {
  ComponentRequest,
  DesignDNA,
  SynthesizedComponent,
  ComponentState,
  SynthesisDecision,
} from '../types/synthesis.js';
import { synthesizeStructure } from './rule-engine.js';
import { llmRefine } from './llm-refiner.js';
import { generateAllStates } from './state-generator.js';
import { generateA11yBaseline } from './a11y-generator.js';
import { buildEvidenceChain, calculateOverallConfidence } from './evidence-tracker.js';
import type { MotionTiming, EdgeStates } from '../types/synthesis.js';

/**
 * Merge motion timings into CSS
 * Adds transition properties to base CSS
 *
 * @param css - Base CSS from structural synthesis
 * @param motionTimings - LLM motion timing decisions
 * @returns Enhanced CSS with transitions
 */
export function mergeMotionIntoCSS(css: string, motionTimings: MotionTiming): string {
  if (!motionTimings || motionTimings.transitions.length === 0) {
    return css;
  }

  // Build transition CSS property
  const transitionValues = motionTimings.transitions
    .map((t) => `${t.property} ${t.duration} ${t.timingFunction}`)
    .join(', ');

  // Find the last closing brace and insert transition before it
  // Simple heuristic: add to the first CSS rule block
  const firstRuleMatch = css.match(/([^}]*)\{([^}]*)\}/);
  if (firstRuleMatch) {
    const selector = firstRuleMatch[1];
    const rules = firstRuleMatch[2];
    const enhanced = `${selector} {\n${rules}\n  transition: ${transitionValues};\n}`;
    return css.replace(firstRuleMatch[0], enhanced);
  }

  // Fallback: append as new rule
  return css + `\n\n/* Motion timings from LLM */\n* {\n  transition: ${transitionValues};\n}`;
}

/**
 * Merge edge states (loading/error) into component states
 * Replaces skeleton loading/error states with LLM-refined versions
 *
 * @param states - All component states from state generator
 * @param edgeStates - LLM edge state decisions
 * @returns Enhanced states with LLM refinements
 */
export function mergeEdgeStatesIntoStates(
  states: ComponentState[],
  edgeStates: EdgeStates
): ComponentState[] {
  if (!edgeStates) {
    return states;
  }

  return states.map((state) => {
    if (state.name === 'loading' && edgeStates.loadingState) {
      // Replace skeleton loading with LLM-refined version
      return {
        ...state,
        styles: {
          ...state.styles,
          ...edgeStates.loadingState.styles,
        },
        ariaAttributes: {
          ...state.ariaAttributes,
          ...edgeStates.loadingState.ariaAttributes,
        },
        confidence: edgeStates.loadingState.confidence,
      };
    }

    if (state.name === 'error' && edgeStates.errorState) {
      // Replace skeleton error with LLM-refined version
      return {
        ...state,
        styles: {
          ...state.styles,
          ...edgeStates.errorState.styles,
        },
        ariaAttributes: {
          ...state.ariaAttributes,
          ...edgeStates.errorState.ariaAttributes,
        },
        confidence: edgeStates.errorState.confidence,
      };
    }

    // Preserve deterministic states unchanged
    return state;
  });
}

/**
 * Primary synthesis API
 * Orchestrates the full two-stage synthesis pipeline
 *
 * Pipeline stages:
 * 1. Rule-based structural synthesis (HTML + CSS from templates)
 * 2. State generation (all 7 states: default, hover, active, focus, disabled, loading, error)
 * 3. Accessibility baseline (WCAG-compliant keyboard/focus/ARIA guidance)
 * 4. LLM refinement (optional - motion timing, edge states, microcopy)
 * 5. Evidence assembly (complete provenance chain)
 * 6. Final component assembly
 *
 * @param request - Component type and constraints
 * @param designDNA - Extracted design DNA (tokens + components)
 * @returns Complete SynthesizedComponent with HTML, CSS, states, accessibility, evidence
 */
export async function synthesizeComponent(
  request: ComponentRequest,
  designDNA: DesignDNA
): Promise<SynthesizedComponent> {
  // Stage 1: Rule-based structural synthesis
  const structure = synthesizeStructure(request, designDNA);

  // Stage 2: State generation
  const states = generateAllStates(structure.tokenMap, designDNA);

  // Stage 3: Accessibility baseline
  const accessibility = generateA11yBaseline(request.type, structure.tokenMap);

  // Stage 4: LLM refinement (optional - gracefully degrades if API unavailable)
  const refinement = await llmRefine(structure, designDNA);

  // Initialize final HTML and CSS
  let html = structure.html;
  let css = structure.css;
  let enhancedStates = states;

  // Merge LLM refinements if available
  if (refinement.motionTimings) {
    css = mergeMotionIntoCSS(css, refinement.motionTimings);
  }

  if (refinement.edgeStates) {
    enhancedStates = mergeEdgeStatesIntoStates(states, refinement.edgeStates);
  }

  // Microcopy refinement (if available)
  // For now, just log it - full HTML replacement would need template-specific logic
  if (refinement.microcopy) {
    // Future: merge microcopy into HTML
    // This requires template-aware string replacement or DOM manipulation
    // For v1, structural synthesis already includes sensible defaults
  }

  // Stage 5: Evidence assembly
  const allDecisions: SynthesisDecision[] = [
    ...structure.decisions,
    ...refinement.decisions,
  ];

  const evidenceChain = buildEvidenceChain(allDecisions);
  const overallConfidence = calculateOverallConfidence(allDecisions);

  // Stage 6: Final assembly
  const synthesized: SynthesizedComponent = {
    type: request.type,
    html,
    css,
    states: enhancedStates,
    accessibility,
    decisions: allDecisions,
    confidence: overallConfidence.value,
    confidenceLevel: overallConfidence.level,
    evidence: evidenceChain,
  };

  return synthesized;
}
