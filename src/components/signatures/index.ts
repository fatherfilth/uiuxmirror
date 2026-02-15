/**
 * Component signatures barrel export
 * Exports all component signatures and the complete signature array
 */

export { BUTTON_SIGNATURE } from './button-signature.js';
export { INPUT_SIGNATURE } from './input-signature.js';
export { CARD_SIGNATURE } from './card-signature.js';
export { NAV_SIGNATURE } from './nav-signature.js';
export { MODAL_SIGNATURE } from './modal-signature.js';

import { BUTTON_SIGNATURE } from './button-signature.js';
import { INPUT_SIGNATURE } from './input-signature.js';
import { CARD_SIGNATURE } from './card-signature.js';
import { NAV_SIGNATURE } from './nav-signature.js';
import { MODAL_SIGNATURE } from './modal-signature.js';

// All signatures for use in component detector
export const ALL_SIGNATURES = [
  BUTTON_SIGNATURE,
  INPUT_SIGNATURE,
  CARD_SIGNATURE,
  NAV_SIGNATURE,
  MODAL_SIGNATURE
];
