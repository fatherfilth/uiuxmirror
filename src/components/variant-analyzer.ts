/**
 * Component variant analyzer
 * Detects variant dimensions (size, emphasis, shape) from component instances
 * using percentile-based clustering and CSS heuristics
 */

import type { DetectedComponent, AnalyzedComponent, ComponentVariant, VariantDimension } from '../types/components.js';

/**
 * Parse a CSS value to numeric pixels
 */
function parsePixels(value: string): number {
  if (!value || value === 'auto' || value === 'none') return 0;
  const match = value.match(/^([\d.]+)px$/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Detect size variant from padding distribution
 * Uses percentile-based clustering to avoid fixed thresholds
 */
function detectSizeVariant(
  components: DetectedComponent[]
): { variants: Map<string, 'small' | 'medium' | 'large'>, dimension: VariantDimension } {
  const paddingValues = components.map(c =>
    parsePixels(c.computedStyles.paddingTop || '0')
  );

  const uniquePaddings = Array.from(new Set(paddingValues)).sort((a, b) => a - b);
  const variants = new Map<string, 'small' | 'medium' | 'large'>();
  const distribution: Record<string, number> = { small: 0, medium: 0, large: 0 };

  // If fewer than 3 distinct values, use simple binning
  if (uniquePaddings.length < 3) {
    if (uniquePaddings.length === 1) {
      // All same size - call it medium
      components.forEach(c => variants.set(c.selector, 'medium'));
      distribution.medium = components.length;
    } else {
      // Two values - split at median
      const median = (uniquePaddings[0] + uniquePaddings[1]) / 2;
      components.forEach(c => {
        const padding = parsePixels(c.computedStyles.paddingTop || '0');
        const size = padding < median ? 'small' : 'large';
        variants.set(c.selector, size);
        distribution[size]++;
      });
    }
  } else {
    // Use percentile-based clustering
    const sorted = [...paddingValues].sort((a, b) => a - b);
    const p33 = percentile(sorted, 33);
    const p66 = percentile(sorted, 66);

    components.forEach(c => {
      const padding = parsePixels(c.computedStyles.paddingTop || '0');
      let size: 'small' | 'medium' | 'large';

      if (padding <= p33) {
        size = 'small';
      } else if (padding <= p66) {
        size = 'medium';
      } else {
        size = 'large';
      }

      variants.set(c.selector, size);
      distribution[size]++;
    });
  }

  return {
    variants,
    dimension: {
      name: 'size',
      values: Object.keys(distribution).filter(k => distribution[k] > 0),
      distribution
    }
  };
}

/**
 * Check if a color is transparent
 */
function isTransparent(color: string): boolean {
  if (!color) return true;
  // Check for rgba with alpha 0, transparent keyword, or initial
  return color === 'transparent' ||
         color === 'rgba(0, 0, 0, 0)' ||
         color.includes('rgba') && color.includes(', 0)') ||
         color === 'initial' ||
         color === 'inherit';
}

/**
 * Check if border is visible
 */
function hasBorder(element: DetectedComponent): boolean {
  const borderWidth = parsePixels(element.computedStyles.borderTopWidth || '0');
  const borderColor = element.computedStyles.color || '';
  return borderWidth > 0 && !isTransparent(borderColor);
}

/**
 * Detect emphasis variant from background/border styling
 */
function detectEmphasisVariant(
  components: DetectedComponent[]
): { variants: Map<string, 'primary' | 'secondary' | 'tertiary' | 'ghost'>, dimension: VariantDimension } {
  const variants = new Map<string, 'primary' | 'secondary' | 'tertiary' | 'ghost'>();
  const distribution: Record<string, number> = { primary: 0, secondary: 0, tertiary: 0, ghost: 0 };

  components.forEach(c => {
    const bgColor = c.computedStyles.backgroundColor || '';
    const hasSolidBg = !isTransparent(bgColor);
    const hasVisibleBorder = hasBorder(c);

    let emphasis: 'primary' | 'secondary' | 'tertiary' | 'ghost';

    if (hasSolidBg) {
      emphasis = 'primary';
    } else if (hasVisibleBorder) {
      emphasis = 'secondary';
    } else if (!hasSolidBg && !hasVisibleBorder) {
      emphasis = 'ghost';
    } else {
      emphasis = 'tertiary';
    }

    variants.set(c.selector, emphasis);
    distribution[emphasis]++;
  });

  return {
    variants,
    dimension: {
      name: 'emphasis',
      values: Object.keys(distribution).filter(k => distribution[k] > 0),
      distribution
    }
  };
}

/**
 * Detect shape variant from border radius
 */
function detectShapeVariant(
  components: DetectedComponent[]
): { variants: Map<string, 'rounded' | 'pill' | 'square'>, dimension: VariantDimension } {
  const variants = new Map<string, 'rounded' | 'pill' | 'square'>();
  const distribution: Record<string, number> = { rounded: 0, pill: 0, square: 0 };

  components.forEach(c => {
    const borderRadius = c.computedStyles.borderRadius || '0';
    const height = parsePixels(c.computedStyles.height || '0');
    const radiusPx = parsePixels(borderRadius);

    let shape: 'rounded' | 'pill' | 'square';

    // Check for pill (50% or radius > height/2)
    if (borderRadius.includes('%') && parseFloat(borderRadius) >= 50) {
      shape = 'pill';
    } else if (radiusPx > 0 && height > 0 && radiusPx >= height / 2) {
      shape = 'pill';
    } else if (radiusPx > 0) {
      shape = 'rounded';
    } else {
      shape = 'square';
    }

    variants.set(c.selector, shape);
    distribution[shape]++;
  });

  return {
    variants,
    dimension: {
      name: 'shape',
      values: Object.keys(distribution).filter(k => distribution[k] > 0),
      distribution
    }
  };
}

/**
 * Analyze variant dimensions across a group of components
 * Returns analyzed components with variant information
 */
export function analyzeVariants(components: DetectedComponent[]): AnalyzedComponent[] {
  if (components.length === 0) return [];

  // Group components by type
  const byType = new Map<string, DetectedComponent[]>();
  components.forEach(c => {
    const existing = byType.get(c.type) || [];
    existing.push(c);
    byType.set(c.type, existing);
  });

  const analyzed: AnalyzedComponent[] = [];

  // Analyze each group
  for (const [, group] of byType.entries()) {
    const sizeResult = detectSizeVariant(group);
    const emphasisResult = detectEmphasisVariant(group);
    const shapeResult = detectShapeVariant(group);

    // Create analyzed components
    group.forEach(component => {
      const variant: ComponentVariant = {
        size: sizeResult.variants.get(component.selector),
        emphasis: emphasisResult.variants.get(component.selector),
        shape: shapeResult.variants.get(component.selector),
        evidence: component.evidence
      };

      analyzed.push({
        ...component,
        variant,
        variantDimensions: [
          sizeResult.dimension,
          emphasisResult.dimension,
          shapeResult.dimension
        ]
      });
    });
  }

  return analyzed;
}
