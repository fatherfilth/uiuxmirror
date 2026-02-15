/**
 * Type definitions barrel export for UIUX-Mirror
 */

// Token types
export type {
  ColorToken,
  TypographyToken,
  SpacingToken,
  CustomPropertyToken,
  RadiusToken,
  ShadowToken,
  ShadowLayer,
  ZIndexToken,
  MotionToken,
  IconToken,
  ImageryToken,
  DesignToken,
  PageTokens,
} from './tokens.js';

// Evidence types
export type {
  TokenEvidence,
  EvidenceEntry,
  EvidenceIndex,
} from './evidence.js';

// Crawl configuration and result types
export type {
  WaitStrategy,
  CrawlConfig,
  Framework,
  CssInJsLibrary,
  PageData,
  CrawlResult,
  CrawlSnapshot,
  DiffResult,
} from './crawl-config.js';

// Synthesis types
export type {
  DesignDNA,
  ComponentRequest,
  EvidenceLink,
  SynthesisDecision,
  ComponentState,
  KeyboardGuidance,
  FocusGuidance,
  AriaGuidance,
  A11yBaseline,
  SynthesizedComponent,
  TokenConstraintResult,
} from './synthesis.js';
