/**
 * UIUX-Mirror - Extract design tokens and infer components from live websites
 * Main entry point
 */

// Export all types
export type * from './types/index.js';

// Export shared utilities
export * from './shared/index.js';

// Export crawler
export * from './crawler/index.js';

// Export extractors
export * from './extractors/index.js';

// Export evidence store
export * from './evidence/index.js';

// Export storage
export * from './storage/index.js';

// Export orchestrator
export { runPipeline } from './orchestrator.js';
export type { PipelineOptions, PipelineResult } from './orchestrator.js';

// Phase 2: Normalization and Component Mining
export * from './normalization/index.js';
export * from './components/index.js';
export * from './scoring/index.js';
export * from './output/index.js';

// Phase 3: Synthesis and Inference Engine
export * from './synthesis/index.js';

// Phase 4: Pattern Detection & Content Analysis
export * from './patterns/index.js';
export * from './content/index.js';
