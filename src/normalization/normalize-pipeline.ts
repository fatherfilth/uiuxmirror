/**
 * Full normalization pipeline
 * Chains all Phase 2 normalization modules: deduplication -> unit normalization ->
 * cross-page validation -> confidence scoring -> DTCG formatting
 */

import type { PageTokens, ColorToken, TypographyToken, SpacingToken, RadiusToken, ShadowToken, MotionToken } from '../types/tokens.js';
import type { ColorCluster, NormalizedTypographyToken, NormalizedSpacingToken } from '../types/normalized-tokens.js';
import type { CrossPageResult } from './cross-page-validator.js';
import type { SpacingScale } from './spacing-scale-detector.js';
import type { DTCGTokenFile } from '../output/dtcg-formatter.js';

import { deduplicateColors } from './color-normalizer.js';
import { normalizeTypographyValues, normalizeSpacingValues } from './unit-normalizer.js';
import { validateCrossPage } from './cross-page-validator.js';
import { detectSpacingScale } from './spacing-scale-detector.js';
import { formatAllTokens } from '../output/dtcg-formatter.js';
import { validateDTCGOutput } from '../output/schema-validator.js';

/**
 * Complete normalization result from pipeline
 */
export interface NormalizationResult {
  colors: {
    clusters: ColorCluster[];
    standards: CrossPageResult<ColorCluster>[];
    all: CrossPageResult<ColorCluster>[];
  };
  typography: {
    normalized: NormalizedTypographyToken[];
    standards: CrossPageResult<NormalizedTypographyToken>[];
    all: CrossPageResult<NormalizedTypographyToken>[];
  };
  spacing: {
    normalized: NormalizedSpacingToken[];
    scale: SpacingScale;
    standards: CrossPageResult<NormalizedSpacingToken>[];
    all: CrossPageResult<NormalizedSpacingToken>[];
  };
  radii: {
    standards: CrossPageResult<RadiusToken>[];
    all: CrossPageResult<RadiusToken>[];
  };
  shadows: {
    standards: CrossPageResult<ShadowToken>[];
    all: CrossPageResult<ShadowToken>[];
  };
  motion: {
    standards: CrossPageResult<MotionToken>[];
    all: CrossPageResult<MotionToken>[];
  };
  dtcg: DTCGTokenFile;
  metadata: {
    totalPages: number;
    minPageThreshold: number;
    baseFontSize: number;
    timestamp: string;
  };
}

/**
 * Pipeline configuration options
 */
export interface NormalizationOptions {
  /** Minimum pages required for a token to be considered a standard (default: 3) */
  minPageThreshold?: number;
  /** Base font size for rem/em conversions (default: 16) */
  baseFontSize?: number;
  /** Color distance threshold for CIEDE2000 clustering (default: 2.3) */
  colorDistanceThreshold?: number;
}

/**
 * Run the complete normalization pipeline
 *
 * Pipeline steps:
 * 1. Aggregate all tokens across pages (merge evidence)
 * 2. Deduplicate colors using CIEDE2000 (color-normalizer)
 * 3. Normalize typography and spacing units (unit-normalizer)
 * 4. Detect spacing scale (spacing-scale-detector)
 * 5. Run cross-page validation on all token types (cross-page-validator)
 * 6. Calculate confidence scores (token-scorer)
 * 7. Format to DTCG output (dtcg-formatter)
 * 8. Validate DTCG output (schema-validator)
 * 9. Return NormalizationResult with all intermediate data
 *
 * @param allPageTokens - Map of page URL to extracted tokens
 * @param options - Pipeline configuration options
 * @returns Complete normalization result
 */
export function normalizePipeline(
  allPageTokens: Record<string, PageTokens>,
  options: NormalizationOptions = {}
): NormalizationResult {
  // Extract options with defaults
  const minPageThreshold = options.minPageThreshold ?? 3;
  const baseFontSize = options.baseFontSize ?? 16;
  const colorDistanceThreshold = options.colorDistanceThreshold ?? 2.3;

  // Step 1: Aggregate all tokens across pages
  const allColors: ColorToken[] = [];
  const allTypography: TypographyToken[] = [];
  const allSpacing: SpacingToken[] = [];
  const allRadii: RadiusToken[] = [];
  const allShadows: ShadowToken[] = [];
  const allMotion: MotionToken[] = [];

  const totalPages = Object.keys(allPageTokens).length;

  for (const [_pageUrl, tokens] of Object.entries(allPageTokens)) {
    allColors.push(...tokens.colors);
    allTypography.push(...tokens.typography);
    allSpacing.push(...tokens.spacing);
    allRadii.push(...tokens.radii);
    allShadows.push(...tokens.shadows);
    allMotion.push(...tokens.motion);
  }

  // Step 2: Deduplicate colors using CIEDE2000
  const colorClusters = deduplicateColors(allColors, colorDistanceThreshold);

  // Step 3: Normalize typography and spacing units
  const normalizedTypography = normalizeTypographyValues(allTypography, baseFontSize);
  const normalizedSpacing = normalizeSpacingValues(allSpacing, baseFontSize);

  // Step 4: Detect spacing scale
  const spacingValues = normalizedSpacing.map(s => s.normalizedValue.pixels);
  const spacingScale = detectSpacingScale(spacingValues);

  // Step 5 & 6: Cross-page validation and confidence scoring
  // Colors
  const colorResults = validateCrossPage(colorClusters, minPageThreshold, totalPages);
  const colorStandards = colorResults.filter(r => r.isStandard);

  // Typography
  const typographyResults = validateCrossPage(normalizedTypography, minPageThreshold, totalPages);
  const typographyStandards = typographyResults.filter(r => r.isStandard);

  // Spacing
  const spacingResults = validateCrossPage(normalizedSpacing, minPageThreshold, totalPages);
  const spacingStandards = spacingResults.filter(r => r.isStandard);

  // Radii
  const radiiResults = validateCrossPage(allRadii, minPageThreshold, totalPages);
  const radiiStandards = radiiResults.filter(r => r.isStandard);

  // Shadows
  const shadowResults = validateCrossPage(allShadows, minPageThreshold, totalPages);
  const shadowStandards = shadowResults.filter(r => r.isStandard);

  // Motion
  const motionResults = validateCrossPage(allMotion, minPageThreshold, totalPages);
  const motionStandards = motionResults.filter(r => r.isStandard);

  // Step 7: Build normalized result structure (needed for formatAllTokens)
  const normalizedResult: NormalizationResult = {
    colors: {
      clusters: colorClusters,
      standards: colorStandards,
      all: colorResults,
    },
    typography: {
      normalized: normalizedTypography,
      standards: typographyStandards,
      all: typographyResults,
    },
    spacing: {
      normalized: normalizedSpacing,
      scale: spacingScale,
      standards: spacingStandards,
      all: spacingResults,
    },
    radii: {
      standards: radiiStandards,
      all: radiiResults,
    },
    shadows: {
      standards: shadowStandards,
      all: shadowResults,
    },
    motion: {
      standards: motionStandards,
      all: motionResults,
    },
    dtcg: {}, // Populated next
    metadata: {
      totalPages,
      minPageThreshold,
      baseFontSize,
      timestamp: new Date().toISOString(),
    },
  };

  // Step 8: Format to DTCG output
  const dtcgTokens = formatAllTokens(normalizedResult);

  // Step 9: Validate DTCG output
  const validation = validateDTCGOutput(dtcgTokens);
  if (!validation.valid) {
    console.warn('DTCG validation warnings:', validation.errors);
  }

  // Update result with DTCG output
  normalizedResult.dtcg = dtcgTokens;

  return normalizedResult;
}
