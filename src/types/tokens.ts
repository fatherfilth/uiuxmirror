/**
 * Design token type definitions for UIUX-Mirror
 * Covers all 8 TOKEN requirements (TOKEN-01 through TOKEN-08)
 */

import type { TokenEvidence } from './evidence.js';

// TOKEN-01: Color tokens
export interface ColorToken {
  value: string;              // Normalized hex (#rrggbb)
  originalValue: string;      // As extracted (rgb, hsl, etc.)
  category: 'primary' | 'secondary' | 'accent' | 'neutral' | 'semantic' | 'unknown';
  context: 'background' | 'text' | 'border' | 'accent' | 'other';
  evidence: TokenEvidence[];
}

// TOKEN-02: Typography tokens
export interface TypographyToken {
  family: string;
  size: string;               // e.g. "16px" or "1rem"
  sizePixels: number;         // Always in px for comparison
  weight: number;             // 100-900
  lineHeight: string;
  letterSpacing: string;
  evidence: TokenEvidence[];
}

// TOKEN-03: Spacing tokens
export interface SpacingToken {
  value: string;              // Original value
  valuePixels: number;        // Normalized to px
  context: 'margin' | 'padding' | 'gap';
  evidence: TokenEvidence[];
}

// TOKEN-04: CSS Custom Property tokens
export interface CustomPropertyToken {
  name: string;               // --primary-color
  value: string;              // resolved value
  rawValue: string;           // may contain var() references
  category: 'color' | 'typography' | 'spacing' | 'radius' | 'shadow' | 'motion' | 'other';
  evidence: TokenEvidence[];
}

// TOKEN-05: Border radius tokens
export interface RadiusToken {
  value: string;
  valuePixels: number;
  evidence: TokenEvidence[];
}

// TOKEN-05: Shadow tokens
export interface ShadowLayer {
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string;
  inset: boolean;
}

export interface ShadowToken {
  value: string;
  layers: ShadowLayer[];
  evidence: TokenEvidence[];
}

// TOKEN-05: Z-index tokens
export interface ZIndexToken {
  value: number;
  stackingContext: string;
  evidence: TokenEvidence[];
}

// TOKEN-06: Motion/animation tokens
export interface MotionToken {
  property: 'duration' | 'easing' | 'keyframe';
  value: string;
  durationMs?: number;        // Normalized to ms
  evidence: TokenEvidence[];
}

// TOKEN-07: Icon tokens
export interface IconToken {
  style: 'stroke' | 'fill' | 'mixed';
  strokeWeight?: number;
  sizePixels: number;
  format: 'svg-inline' | 'svg-img' | 'icon-font' | 'img';
  evidence: TokenEvidence[];
}

// TOKEN-08: Imagery tokens
export interface ImageryToken {
  aspectRatio: string;        // e.g. "16:9"
  treatment: 'rounded' | 'circular' | 'rectangular' | 'masked';
  objectFit: string;
  evidence: TokenEvidence[];
}

// Union type for all tokens
export type DesignToken =
  | ColorToken
  | TypographyToken
  | SpacingToken
  | CustomPropertyToken
  | RadiusToken
  | ShadowToken
  | ZIndexToken
  | MotionToken
  | IconToken
  | ImageryToken;

// Grouped tokens extracted from a single page
export interface PageTokens {
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing: SpacingToken[];
  customProperties: CustomPropertyToken[];
  radii: RadiusToken[];
  shadows: ShadowToken[];
  zIndexes: ZIndexToken[];
  motion: MotionToken[];
  icons: IconToken[];
  imagery: ImageryToken[];
}
