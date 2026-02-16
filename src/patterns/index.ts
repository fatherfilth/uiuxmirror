/**
 * Pattern detection barrel export
 * Phase 4: Multi-page flow detection
 */

// State-flow graph builder
export { buildStateFlowGraph } from './state-graph-builder.js';

// Flow classifier
export {
  classifyFlow,
  calculateFlowConfidence,
  analyzeFlowCharacteristics,
} from './flow-classifier.js';

// Flow detector (primary entry point)
export { detectFlows } from './flow-detector.js';
