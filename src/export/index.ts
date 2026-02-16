/**
 * Export module barrel
 * Central export point for all shared export utilities
 * Will be extended in later plans as more export modules are added
 */

// Evidence linking utilities
export {
  formatEvidenceCitation,
  formatEvidenceSummary,
  formatEvidenceForJSON,
} from './evidence-linker.js';

// Semantic naming utilities
export {
  generateSemanticColorName,
  generateSemanticTypographyName,
  generateSemanticSpacingName,
  generateRadiusName,
  generateShadowName,
  generateMotionName,
  generateTokenVarName,
} from './semantic-namer.js';

// Markdown generation utilities
export {
  generateTable,
  codeBlock,
  heading,
  bold,
  inlineCode,
  link,
  section,
} from './reports/markdown-utils.js';

// Format generators
export {
  generateCSSCustomProperties,
  generateTailwindConfig,
  generateFigmaTokens,
  generateTokensJSON,
  generateComponentsJSON,
  generatePatternsJSON,
  generateContentStyleJSON,
  generateEvidenceIndexJSON,
  type DualLayerExport,
} from './formatters/index.js';
