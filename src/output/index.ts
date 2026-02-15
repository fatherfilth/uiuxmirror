/**
 * Output module barrel export
 * W3C DTCG format output and validation
 */

export {
  formatColorToken,
  formatTypographyToken,
  formatSpacingToken,
  formatRadiusToken,
  formatShadowToken,
  formatMotionToken,
  formatAllTokens,
} from './dtcg-formatter.js';

export type {
  DTCGToken,
  DTCGTokenFile,
} from './dtcg-formatter.js';

export {
  validateDTCGOutput,
  validateDTCGOutputSync,
} from './schema-validator.js';
