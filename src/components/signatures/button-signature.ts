/**
 * Button component signature
 * Detects buttons via tag name, ARIA role, or styled-link heuristic
 */

import type { ComponentSignature, ElementData } from '../../types/components.js';

export const BUTTON_SIGNATURE: ComponentSignature = {
  type: 'button',
  priority: 10,

  match(element: ElementData): boolean {
    const { tagName, role, computedStyles, attributes } = element;

    // Native button element
    if (tagName === 'button') {
      return true;
    }

    // ARIA role=button
    if (role === 'button') {
      return true;
    }

    // Input buttons (exclude hidden)
    if (tagName === 'input') {
      const type = attributes.type?.toLowerCase();
      if (type === 'submit' || type === 'button' || type === 'reset') {
        return true;
      }
    }

    // Styled link heuristic (button-like <a> tags)
    if (tagName === 'a') {
      // Exclude regular inline links with no padding
      if (computedStyles.display === 'inline' &&
          (!computedStyles.paddingTop || computedStyles.paddingTop === '0px')) {
        return false;
      }

      // Check for button-like styling
      const paddingTop = parseFloat(computedStyles.paddingTop || '0');
      const paddingLeft = parseFloat(computedStyles.paddingLeft || '0');
      const borderRadius = parseFloat(computedStyles.borderRadius || '0');
      const backgroundColor = computedStyles.backgroundColor;
      const border = computedStyles.border || computedStyles.borderTopWidth;

      // Has padding + border-radius + (background or border)
      if (paddingTop >= 6 && paddingLeft >= 12 && borderRadius > 0) {
        if (backgroundColor && backgroundColor !== 'transparent' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          return true;
        }
        if (border && border !== 'none' && border !== '0px') {
          return true;
        }
      }
    }

    return false;
  }
};
