/**
 * Synthesis module barrel export
 * Phase 3: Component inference and synthesis
 */

export {
  buildTokenMap,
  resolveTokenValue,
  validateTokenConstraints,
  type TokenCategory,
  type TokenMap,
} from './constraint-checker.js';

export {
  synthesizeStructure,
  resolveColorContrast,
} from './rule-engine.js';

export {
  compileTemplate,
  getAvailableTemplates,
} from './template-registry.js';

export {
  llmRefine,
  llmDecideMotionTiming,
  llmDecideEdgeStates,
} from './llm-refiner.js';

export {
  buildSystemPrompt,
  buildMotionPrompt,
  buildEdgeStatePrompt,
  buildMicrocopyPrompt,
  formatTokensForPrompt,
  formatComponentsForPrompt,
} from './prompt-builder.js';

export {
  generateAllStates,
  generateDefaultState,
  generateHoverState,
  generateActiveState,
  generateFocusState,
  generateDisabledState,
  generateLoadingState,
  generateErrorState,
  adjustColorBrightness,
  calculateContrastRatio,
} from './state-generator.js';

export {
  generateA11yBaseline,
} from './a11y-generator.js';

export {
  buildEvidenceChain,
  calculateOverallConfidence,
  mergeEvidenceChains,
  createTokenDecision,
  createStructuralDecision,
  createLLMDecision,
} from './evidence-tracker.js';

export {
  synthesizeComponent,
  mergeMotionIntoCSS,
  mergeEdgeStatesIntoStates,
} from './component-composer.js';
