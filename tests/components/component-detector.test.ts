/**
 * Component detector tests
 * Tests signature matching and priority resolution
 */

import { describe, it, expect } from 'vitest';
import type { ElementData } from '../../src/types/components.js';
import {
  BUTTON_SIGNATURE,
  INPUT_SIGNATURE,
  CARD_SIGNATURE,
  NAV_SIGNATURE,
  MODAL_SIGNATURE,
  ALL_SIGNATURES
} from '../../src/components/signatures/index.js';

// Helper to create mock ElementData
function createMockElement(overrides: Partial<ElementData>): ElementData {
  return {
    tagName: 'div',
    role: undefined,
    computedStyles: {},
    textContent: '',
    hasChildren: false,
    childCount: 0,
    selector: 'body > div',
    attributes: {},
    ...overrides
  };
}

describe('Button Signature', () => {
  it('should match native button element', () => {
    const element = createMockElement({ tagName: 'button' });
    expect(BUTTON_SIGNATURE.match(element)).toBe(true);
  });

  it('should match element with role=button', () => {
    const element = createMockElement({ role: 'button' });
    expect(BUTTON_SIGNATURE.match(element)).toBe(true);
  });

  it('should match styled link (button-like <a>)', () => {
    const element = createMockElement({
      tagName: 'a',
      computedStyles: {
        paddingTop: '10px',
        paddingLeft: '16px',
        borderRadius: '4px',
        backgroundColor: 'rgb(0, 123, 255)',
        display: 'inline-block'
      }
    });
    expect(BUTTON_SIGNATURE.match(element)).toBe(true);
  });

  it('should match styled link with border instead of background', () => {
    const element = createMockElement({
      tagName: 'a',
      computedStyles: {
        paddingTop: '8px',
        paddingLeft: '12px',
        borderRadius: '2px',
        border: '1px solid black',
        display: 'inline-block'
      }
    });
    expect(BUTTON_SIGNATURE.match(element)).toBe(true);
  });

  it('should NOT match regular inline link', () => {
    const element = createMockElement({
      tagName: 'a',
      computedStyles: {
        display: 'inline',
        paddingTop: '0px',
        color: 'blue'
      }
    });
    expect(BUTTON_SIGNATURE.match(element)).toBe(false);
  });

  it('should match input with type=submit', () => {
    const element = createMockElement({
      tagName: 'input',
      attributes: { type: 'submit' }
    });
    expect(BUTTON_SIGNATURE.match(element)).toBe(true);
  });

  it('should match input with type=button', () => {
    const element = createMockElement({
      tagName: 'input',
      attributes: { type: 'button' }
    });
    expect(BUTTON_SIGNATURE.match(element)).toBe(true);
  });
});

describe('Input Signature', () => {
  it('should match native input element', () => {
    const element = createMockElement({
      tagName: 'input',
      attributes: { type: 'text' }
    });
    expect(INPUT_SIGNATURE.match(element)).toBe(true);
  });

  it('should match textarea element', () => {
    const element = createMockElement({ tagName: 'textarea' });
    expect(INPUT_SIGNATURE.match(element)).toBe(true);
  });

  it('should match select element', () => {
    const element = createMockElement({ tagName: 'select' });
    expect(INPUT_SIGNATURE.match(element)).toBe(true);
  });

  it('should match element with role=textbox', () => {
    const element = createMockElement({ role: 'textbox' });
    expect(INPUT_SIGNATURE.match(element)).toBe(true);
  });

  it('should match contenteditable element', () => {
    const element = createMockElement({
      attributes: { contenteditable: 'true' }
    });
    expect(INPUT_SIGNATURE.match(element)).toBe(true);
  });

  it('should NOT match input with type=submit', () => {
    const element = createMockElement({
      tagName: 'input',
      attributes: { type: 'submit' }
    });
    expect(INPUT_SIGNATURE.match(element)).toBe(false);
  });

  it('should NOT match input with type=hidden', () => {
    const element = createMockElement({
      tagName: 'input',
      attributes: { type: 'hidden' }
    });
    expect(INPUT_SIGNATURE.match(element)).toBe(false);
  });
});

describe('Card Signature', () => {
  it('should match div with background, padding, border-radius, and children', () => {
    const element = createMockElement({
      tagName: 'div',
      computedStyles: {
        backgroundColor: 'rgb(255, 255, 255)',
        paddingTop: '16px',
        paddingLeft: '16px',
        borderRadius: '8px',
        width: '300px',
        height: '200px'
      },
      hasChildren: true,
      childCount: 3
    });
    expect(CARD_SIGNATURE.match(element)).toBe(true);
  });

  it('should match article tag with children', () => {
    const element = createMockElement({
      tagName: 'article',
      hasChildren: true,
      childCount: 2
    });
    expect(CARD_SIGNATURE.match(element)).toBe(true);
  });

  it('should match element with role=article', () => {
    const element = createMockElement({
      role: 'article',
      hasChildren: true,
      childCount: 2
    });
    expect(CARD_SIGNATURE.match(element)).toBe(true);
  });

  it('should NOT match flat div without styling', () => {
    const element = createMockElement({
      tagName: 'div',
      computedStyles: {
        backgroundColor: 'transparent'
      },
      hasChildren: true,
      childCount: 2
    });
    expect(CARD_SIGNATURE.match(element)).toBe(false);
  });

  it('should NOT match element that is too small', () => {
    const element = createMockElement({
      computedStyles: {
        backgroundColor: 'rgb(255, 255, 255)',
        paddingTop: '16px',
        paddingLeft: '16px',
        borderRadius: '8px',
        width: '50px',
        height: '50px'
      },
      hasChildren: true,
      childCount: 2
    });
    expect(CARD_SIGNATURE.match(element)).toBe(false);
  });
});

describe('Nav Signature', () => {
  it('should match nav tag', () => {
    const element = createMockElement({ tagName: 'nav' });
    expect(NAV_SIGNATURE.match(element)).toBe(true);
  });

  it('should match element with role=navigation', () => {
    const element = createMockElement({ role: 'navigation' });
    expect(NAV_SIGNATURE.match(element)).toBe(true);
  });

  it('should match element with role=menubar', () => {
    const element = createMockElement({ role: 'menubar' });
    expect(NAV_SIGNATURE.match(element)).toBe(true);
  });
});

describe('Modal Signature', () => {
  it('should match element with role=dialog', () => {
    const element = createMockElement({ role: 'dialog' });
    expect(MODAL_SIGNATURE.match(element)).toBe(true);
  });

  it('should match element with role=alertdialog', () => {
    const element = createMockElement({ role: 'alertdialog' });
    expect(MODAL_SIGNATURE.match(element)).toBe(true);
  });

  it('should match element with aria-modal=true', () => {
    const element = createMockElement({
      attributes: { 'aria-modal': 'true' }
    });
    expect(MODAL_SIGNATURE.match(element)).toBe(true);
  });

  it('should match element with structural modal heuristic', () => {
    const element = createMockElement({
      computedStyles: {
        position: 'fixed',
        zIndex: '1000',
        width: '400px',
        height: '300px'
      }
    });
    expect(MODAL_SIGNATURE.match(element)).toBe(true);
  });
});

describe('Priority Resolution', () => {
  it('should resolve button over card when both match', () => {
    const element = createMockElement({
      tagName: 'button',
      computedStyles: {
        backgroundColor: 'rgb(0, 123, 255)',
        paddingTop: '12px',
        paddingLeft: '16px',
        borderRadius: '4px',
        width: '200px',
        height: '100px'
      },
      hasChildren: true,
      childCount: 2
    });

    // Both should match
    expect(BUTTON_SIGNATURE.match(element)).toBe(true);
    expect(CARD_SIGNATURE.match(element)).toBe(true);

    // But button has higher priority
    expect(BUTTON_SIGNATURE.priority).toBeGreaterThan(CARD_SIGNATURE.priority);

    // Simulate priority resolution
    let matchedType = null;
    let highestPriority = -1;

    for (const signature of ALL_SIGNATURES) {
      if (signature.match(element)) {
        if (signature.priority > highestPriority) {
          matchedType = signature.type;
          highestPriority = signature.priority;
        }
      }
    }

    expect(matchedType).toBe('button');
  });
});
