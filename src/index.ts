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
