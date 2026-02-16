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
  generateSkillMD,
  type DualLayerExport,
} from './formatters/index.js';

// Component stub generators
export {
  generateComponentStub,
  generateAllStubs,
  type TokenNameMap,
} from './stubs/index.js';

// Report generators
export {
  generateBrandDNAReport,
  generateContentStyleGuide,
  type BrandDNAReportParams,
  type ContentStyleGuideParams,
} from './reports/index.js';

// Export orchestrator - top-level export function
export {
  exportDesignDNA,
  generateExportSummary,
  type ExportInput,
  type ExportResult,
} from './export-orchestrator.js';
