/**
 * Modal component signature
 * Detects modals via ARIA role dialog/alertdialog or structural heuristic
 */

import type { ComponentSignature, ElementData } from '../../types/components.js';

export const MODAL_SIGNATURE: ComponentSignature = {
  type: 'modal',
  priority: 10,

  match(element: ElementData): boolean {
    const { role, attributes, computedStyles } = element;

    // ARIA dialog roles
    if (role === 'dialog' || role === 'alertdialog') {
      return true;
    }

    // aria-modal attribute
    if (attributes['aria-modal'] === 'true') {
      return true;
    }

    // Structural heuristic: position fixed/absolute + high z-index + reasonable size
    const position = computedStyles.position;
    const zIndex = parseInt(computedStyles.zIndex || '0', 10);
    const width = parseFloat(computedStyles.width || '0');
    const height = parseFloat(computedStyles.height || '0');

    if ((position === 'fixed' || position === 'absolute') &&
        zIndex > 100 &&
        width > 200 &&
        height > 200) {
      return true;
    }

    return false;
  }
};
