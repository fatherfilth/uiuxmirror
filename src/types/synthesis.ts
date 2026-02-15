/**
 * Synthesis type definitions for UIUX-Mirror Phase 3
 * Implements synthesis pipeline types for component inference
 */

import type { NormalizationResult } from '../normalization/normalize-pipeline.js';
import type { AggregatedComponent } from '../components/component-aggregator.js';

/**
 * DesignDNA - The complete extracted design DNA from Phases 1-2
 * Wraps NormalizationResult + AggregatedComponent[] for synthesis
 */
export interface DesignDNA {
  tokens: NormalizationResult;
  components: AggregatedComponent[];
  metadata: {
    sourceUrl: string;
    crawlDate: string;
    totalPages: number;
  };
}

/**
 * ComponentRequest - What the user asks to synthesize
 */
export interface ComponentRequest {
  type: string;                    // e.g., "data-table", "search-bar", "pagination"
  description?: string;            // Optional user description
  constraints?: Record<string, string>; // Optional token overrides
}

/**
 * EvidenceLink - Links a synthesis decision to source evidence
 */
export interface EvidenceLink {
  sourceType: 'observed_token' | 'observed_component' | 'inferred_pattern' | 'llm_decision';
  reference: string;               // Token ID, component type, or pattern name
  pageUrl?: string;
  selector?: string;
  occurrenceCount?: number;
  llmReasoning?: string;
}

/**
 * SynthesisDecision - A single decision in the synthesis process
 */
export interface SynthesisDecision {
  type: 'token_application' | 'structural_choice' | 'llm_refinement';
  property: string;                // CSS property or structural element
  value: string;                   // Chosen value
  confidence: number;              // 0-1
  evidence: EvidenceLink[];
  reasoning: string;
}

/**
 * ComponentState - A single interactive state
 */
export interface ComponentState {
  name: 'default' | 'hover' | 'active' | 'focus' | 'disabled' | 'loading' | 'error';
  styles: Record<string, string>;
  ariaAttributes?: Record<string, string>;
  evidence: EvidenceLink[];
  confidence: number;
}

/**
 * KeyboardGuidance - Keyboard navigation guidance
 */
export interface KeyboardGuidance {
  keys: Array<{ key: string; action: string }>;
  tabIndex: number;
  example: string;
}

/**
 * FocusGuidance - Focus management guidance
 */
export interface FocusGuidance {
  focusIndicator: string;
  focusOrder: string;
  focusTrap?: boolean;
}

/**
 * AriaGuidance - ARIA pattern guidance
 */
export interface AriaGuidance {
  role: string;
  requiredAttributes: Record<string, string>;
  optionalAttributes: Record<string, string>;
  liveRegion?: 'polite' | 'assertive';
}

/**
 * A11yBaseline - Accessibility guidance for a component
 */
export interface A11yBaseline {
  keyboardNavigation: KeyboardGuidance;
  focusManagement: FocusGuidance;
  ariaPattern: AriaGuidance;
  confidence: number;
  wcagLevel: 'A' | 'AA' | 'AAA';
}

/**
 * SynthesizedComponent - The final output
 */
export interface SynthesizedComponent {
  type: string;
  html: string;
  css: string;
  states: ComponentState[];
  accessibility: A11yBaseline;
  decisions: SynthesisDecision[];
  confidence: number;              // Overall confidence (0-1)
  confidenceLevel: 'low' | 'medium' | 'high';
  evidence: EvidenceLink[];
}

/**
 * TokenConstraintResult - Result of token validation
 */
export interface TokenConstraintResult {
  valid: boolean;
  resolved: Record<string, string>; // property -> resolved token value
  missing: string[];                // properties with no matching token
  confidence: number;               // 0-1 based on coverage
}

/**
 * StructuralSynthesis - Output of rule-based template synthesis
 * Stage 1 of the two-stage synthesis pipeline
 */
export interface StructuralSynthesis {
  html: string;                     // Generated HTML structure
  css: string;                      // Generated CSS styles
  templateName: string;             // Template used
  tokenMap: Record<string, string>; // All resolved token values used
  decisions: SynthesisDecision[];   // Structural decisions made
  evidence: EvidenceLink[];         // Evidence chain for token usage
  confidence: number;               // 0-1 based on token coverage
}

/**
 * Motion timing decision from LLM
 */
export interface MotionTiming {
  transitions: Array<{
    property: string;
    duration: string;
    timingFunction: string;
    reasoning: string;
    confidence: number;
    evidenceIds: string[];
  }>;
}

/**
 * Edge state decision from LLM (loading/error states)
 */
export interface EdgeStates {
  loadingState: {
    presentation: 'spinner' | 'skeleton' | 'text-change' | 'progress-bar';
    styles: Record<string, string>;
    ariaAttributes: Record<string, string>;
    reasoning: string;
    confidence: number;
  };
  errorState: {
    presentation: 'inline-message' | 'toast' | 'banner' | 'icon';
    styles: Record<string, string>;
    ariaAttributes: Record<string, string>;
    reasoning: string;
    confidence: number;
  };
}

/**
 * Microcopy decision from LLM
 */
export interface Microcopy {
  labels: Record<string, string>;
  placeholders: Record<string, string>;
  buttonText?: string;
  errorMessages?: Record<string, string>;
  reasoning: string;
  confidence: number;
}

/**
 * LLMRefinement - Output of LLM-based refinement
 * Stage 2 of the two-stage synthesis pipeline
 */
export interface LLMRefinement {
  motionTimings: MotionTiming | null;
  edgeStates: EdgeStates | null;
  microcopy: Microcopy | null;
  decisions: SynthesisDecision[];
  evidence: EvidenceLink[];
}
