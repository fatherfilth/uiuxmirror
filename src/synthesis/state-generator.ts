/**
 * State generator for interactive component states
 * Generates all 7 states (default, hover, active, focus, disabled, loading, error)
 * with evidence tracing and confidence scoring
 */

import type { ComponentState, EvidenceLink, DesignDNA } from '../types/synthesis.js';

/**
 * Generate all 7 interactive states for a component
 */
export function generateAllStates(
  tokenMap: Record<string, string>,
  designDNA: DesignDNA
): ComponentState[] {
  return [
    generateDefaultState(tokenMap),
    generateHoverState(tokenMap, designDNA),
    generateActiveState(tokenMap, designDNA),
    generateFocusState(tokenMap, designDNA),
    generateDisabledState(tokenMap),
    generateLoadingState(tokenMap),
    generateErrorState(tokenMap, designDNA),
  ];
}

/**
 * Generate default state from token map
 */
export function generateDefaultState(tokenMap: Record<string, string>): ComponentState {
  const evidence: EvidenceLink[] = Object.entries(tokenMap).map(([property, value]) => ({
    sourceType: 'observed_token',
    reference: `${property}=${value}`,
  }));

  return {
    name: 'default',
    styles: tokenMap,
    evidence,
    confidence: 1.0,
  };
}

/**
 * Generate hover state using observed patterns or deterministic rules
 */
export function generateHoverState(
  tokenMap: Record<string, string>,
  designDNA: DesignDNA
): ComponentState {
  // Check for observed hover patterns in DesignDNA
  const hoverPatterns = designDNA.components
    .filter(c => c.states !== null && c.states.hover !== undefined)
    .map(c => c.states!.hover as Record<string, string>);

  if (hoverPatterns.length > 0) {
    // Use most common hover pattern (simplified - just use first found)
    const observedPattern = hoverPatterns[0];
    const evidence: EvidenceLink[] = [{
      sourceType: 'observed_component',
      reference: 'hover-state-from-dna',
      occurrenceCount: hoverPatterns.length,
    }];

    return {
      name: 'hover',
      styles: observedPattern,
      evidence,
      confidence: 0.9,
    };
  }

  // Fallback to deterministic rules
  const styles: Record<string, string> = {};
  const evidence: EvidenceLink[] = [{
    sourceType: 'inferred_pattern',
    reference: 'deterministic-hover-darken',
  }];

  if (tokenMap.backgroundColor) {
    styles.backgroundColor = adjustColorBrightness(tokenMap.backgroundColor, 0.9);
  }

  // Add subtle translateY if shadows are present in DNA
  const hasShadows = designDNA.tokens.shadows && Object.keys(designDNA.tokens.shadows).length > 0;
  if (hasShadows) {
    styles.transform = 'translateY(-1px)';
  }

  return {
    name: 'hover',
    styles,
    evidence,
    confidence: 0.7,
  };
}

/**
 * Generate active state using observed patterns or deterministic rules
 */
export function generateActiveState(
  tokenMap: Record<string, string>,
  designDNA: DesignDNA
): ComponentState {
  // Check for observed active patterns
  const activePatterns = designDNA.components
    .filter(c => c.states !== null && c.states.active !== undefined)
    .map(c => c.states!.active as Record<string, string>);

  if (activePatterns.length > 0) {
    const observedPattern = activePatterns[0];
    const evidence: EvidenceLink[] = [{
      sourceType: 'observed_component',
      reference: 'active-state-from-dna',
      occurrenceCount: activePatterns.length,
    }];

    return {
      name: 'active',
      styles: observedPattern,
      evidence,
      confidence: 0.85,
    };
  }

  // Fallback to deterministic rules
  const styles: Record<string, string> = {};
  const evidence: EvidenceLink[] = [{
    sourceType: 'inferred_pattern',
    reference: 'deterministic-active-press',
  }];

  if (tokenMap.backgroundColor) {
    styles.backgroundColor = adjustColorBrightness(tokenMap.backgroundColor, 0.85);
  }
  styles.transform = 'scale(0.98)';

  // Remove shadow on active
  if (tokenMap.boxShadow) {
    styles.boxShadow = 'none';
  }

  return {
    name: 'active',
    styles,
    evidence,
    confidence: 0.7,
  };
}

/**
 * Generate WCAG 2.1 Level AA compliant focus state
 */
export function generateFocusState(
  tokenMap: Record<string, string>,
  designDNA: DesignDNA
): ComponentState {
  const backgroundColor = tokenMap.backgroundColor || '#ffffff';

  // Try to use primary color from DTCG tokens (semantic names)
  let focusColor = '#005FCC'; // Safe default
  if (designDNA.tokens.dtcg && designDNA.tokens.dtcg.color) {
    // Look for primary colors in DTCG structure (color-primary-*, color-1, etc.)
    const colorGroup = designDNA.tokens.dtcg.color as Record<string, any>;
    for (const [name, token] of Object.entries(colorGroup)) {
      if (
        (name.includes('primary') || name.includes('1')) &&
        token.$value &&
        typeof token.$value === 'string'
      ) {
        const contrast = calculateContrastRatio(token.$value, backgroundColor);
        if (contrast >= 3.0) {
          focusColor = token.$value;
          break;
        }
      }
    }
  }

  const styles: Record<string, string> = {
    outline: `2px solid ${focusColor}`,
    outlineOffset: '2px',
  };

  const evidence: EvidenceLink[] = [{
    sourceType: 'inferred_pattern',
    reference: 'wcag-2.1-focus-visible',
  }];

  return {
    name: 'focus',
    styles,
    evidence,
    confidence: 0.95,
  };
}

/**
 * Generate disabled state with standard opacity pattern
 */
export function generateDisabledState(_tokenMap: Record<string, string>): ComponentState {
  const styles: Record<string, string> = {
    opacity: '0.5',
    cursor: 'not-allowed',
    pointerEvents: 'none',
  };

  const ariaAttributes: Record<string, string> = {
    'aria-disabled': 'true',
  };

  const evidence: EvidenceLink[] = [{
    sourceType: 'inferred_pattern',
    reference: 'standard-disabled-opacity',
  }];

  return {
    name: 'disabled',
    styles,
    ariaAttributes,
    evidence,
    confidence: 0.9,
  };
}

/**
 * Generate loading state skeleton (LLM will refine)
 */
export function generateLoadingState(_tokenMap: Record<string, string>): ComponentState {
  const styles: Record<string, string> = {
    cursor: 'wait',
    opacity: '0.7',
  };

  const ariaAttributes: Record<string, string> = {
    'aria-busy': 'true',
    'aria-live': 'polite',
  };

  const evidence: EvidenceLink[] = [{
    sourceType: 'inferred_pattern',
    reference: 'standard-loading-skeleton',
  }];

  return {
    name: 'loading',
    styles,
    ariaAttributes,
    evidence,
    confidence: 0.5,
  };
}

/**
 * Generate error state using error tokens or fallback
 */
export function generateErrorState(
  _tokenMap: Record<string, string>,
  designDNA: DesignDNA
): ComponentState {
  let errorColor = '#DC2626'; // Fallback
  let confidence = 0.5;
  const evidence: EvidenceLink[] = [];

  // Check if error color exists in DTCG tokens
  if (designDNA.tokens.dtcg && designDNA.tokens.dtcg.color) {
    const colorGroup = designDNA.tokens.dtcg.color as Record<string, any>;
    for (const [name, token] of Object.entries(colorGroup)) {
      if (
        (name.includes('error') || name.includes('danger')) &&
        token.$value &&
        typeof token.$value === 'string'
      ) {
        errorColor = token.$value;
        confidence = 0.7;
        evidence.push({
          sourceType: 'observed_token',
          reference: `error-color-${name}`,
        });
        break;
      }
    }
  }

  if (evidence.length === 0) {
    evidence.push({
      sourceType: 'inferred_pattern',
      reference: 'standard-error-red',
    });
  }

  const styles: Record<string, string> = {
    borderColor: errorColor,
    color: errorColor,
  };

  const ariaAttributes: Record<string, string> = {
    'aria-invalid': 'true',
    'aria-live': 'assertive',
  };

  return {
    name: 'error',
    styles,
    ariaAttributes,
    evidence,
    confidence,
  };
}

/**
 * Helper: Adjust color brightness
 * factor < 1.0 = darken, factor > 1.0 = lighten
 */
export function adjustColorBrightness(hex: string, factor: number): string {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Parse RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Adjust brightness
  const newR = Math.max(0, Math.min(255, Math.round(r * factor)));
  const newG = Math.max(0, Math.min(255, Math.round(g * factor)));
  const newB = Math.max(0, Math.min(255, Math.round(b * factor)));

  // Convert back to hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Helper: Calculate WCAG contrast ratio
 */
export function calculateContrastRatio(hex1: string, hex2: string): number {
  const getLuminance = (hex: string): number => {
    const cleanHex = hex.replace(/^#/, '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

    // Convert to linear RGB
    const toLinear = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

    const rLinear = toLinear(r);
    const gLinear = toLinear(g);
    const bLinear = toLinear(b);

    // Calculate relative luminance
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  };

  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}
