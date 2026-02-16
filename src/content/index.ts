/**
 * Content analysis barrel export
 * Exposes all content pattern detection functions
 */

export { extractTextSamples } from './text-extractor.js';
export { analyzeVoiceTone } from './voice-analyzer.js';
export { analyzeCapitalization, detectCapitalizationStyle } from './capitalization-analyzer.js';
export { analyzeErrorMessages } from './grammar-analyzer.js';
export { analyzeCTAHierarchy } from './cta-hierarchy-analyzer.js';
