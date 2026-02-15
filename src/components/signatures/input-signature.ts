/**
 * Input component signature
 * Detects input fields via tag name, ARIA role, or contenteditable
 */

import type { ComponentSignature, ElementData } from '../../types/components.js';

export const INPUT_SIGNATURE: ComponentSignature = {
  type: 'input',
  priority: 10,

  match(element: ElementData): boolean {
    const { tagName, role, attributes } = element;

    // Native input elements (exclude button types and hidden)
    if (tagName === 'input') {
      const type = attributes.type?.toLowerCase();
      // Exclude button types (handled by button signature)
      if (type === 'submit' || type === 'button' || type === 'reset' || type === 'hidden') {
        return false;
      }
      return true;
    }

    // Textarea and select elements
    if (tagName === 'textarea' || tagName === 'select') {
      return true;
    }

    // ARIA roles for input-like elements
    if (role === 'textbox' || role === 'combobox' || role === 'searchbox' ||
        role === 'spinbutton' || role === 'listbox') {
      return true;
    }

    // Contenteditable elements
    if (attributes.contenteditable === 'true') {
      return true;
    }

    return false;
  }
};
