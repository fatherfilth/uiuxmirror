/**
 * Navigation component signature
 * Detects navigation via nav tag or ARIA role
 */

import type { ComponentSignature, ElementData } from '../../types/components.js';

export const NAV_SIGNATURE: ComponentSignature = {
  type: 'nav',
  priority: 10,

  match(element: ElementData): boolean {
    const { tagName, role } = element;

    // Native nav element
    if (tagName === 'nav') {
      return true;
    }

    // ARIA navigation role
    if (role === 'navigation') {
      return true;
    }

    // ARIA menubar role
    if (role === 'menubar') {
      return true;
    }

    // Note: Detection of elements containing 3+ links happens in the detector,
    // not in the signature match function, as it requires DOM traversal

    return false;
  }
};
