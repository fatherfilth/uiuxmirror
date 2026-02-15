/**
 * Card component signature
 * Detects cards via structural heuristic (background + padding + border-radius + children)
 */

import type { ComponentSignature, ElementData } from '../../types/components.js';

export const CARD_SIGNATURE: ComponentSignature = {
  type: 'card',
  priority: 5,  // Lower priority - cards are more generic

  match(element: ElementData): boolean {
    const { tagName, role, computedStyles, childCount } = element;

    // ARIA role article with children
    if (role === 'article' && childCount >= 2) {
      return true;
    }

    // Semantic article tag with children
    if (tagName === 'article' && childCount >= 2) {
      return true;
    }

    // Structural heuristic: background + padding + border-radius + multiple children
    const backgroundColor = computedStyles.backgroundColor;
    const hasBackground = backgroundColor &&
                         backgroundColor !== 'transparent' &&
                         backgroundColor !== 'rgba(0, 0, 0, 0)';

    if (!hasBackground || childCount < 2) {
      return false;
    }

    const paddingTop = parseFloat(computedStyles.paddingTop || '0');
    const paddingLeft = parseFloat(computedStyles.paddingLeft || '0');
    const borderRadius = parseFloat(computedStyles.borderRadius || '0');

    // Check for card-like styling
    const hasPadding = paddingTop >= 12 || paddingLeft >= 12;
    const hasRoundedCorners = borderRadius > 0;

    if (hasPadding && hasRoundedCorners) {
      // Exclude elements that are too small (likely not cards)
      const width = parseFloat(computedStyles.width || '0');
      const height = parseFloat(computedStyles.height || '0');

      if (width > 0 && width < 100) return false;
      if (height > 0 && height < 80) return false;

      return true;
    }

    return false;
  }
};
