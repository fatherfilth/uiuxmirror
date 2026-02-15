/**
 * Component detection type definitions for UIUX-Mirror
 * Implements COMP-01 requirements (component identification from DOM structures)
 */

import type { TokenEvidence } from './evidence.js';

// Component types we detect
export type ComponentType = 'button' | 'input' | 'card' | 'nav' | 'modal';

// Extracted element data for signature matching
export interface ElementData {
  tagName: string;
  role?: string;
  computedStyles: Record<string, string>;
  textContent: string;
  hasChildren: boolean;
  childCount: number;
  selector: string;
  attributes: Record<string, string>;
}

// Component signature interface - each signature implements this
export interface ComponentSignature {
  type: ComponentType;
  match(element: ElementData): boolean;
  priority: number;  // Higher = wins if element matches multiple signatures
}

// Detected component with evidence
export interface DetectedComponent {
  type: ComponentType;
  selector: string;
  element: ElementData;
  evidence: TokenEvidence[];
  computedStyles: Record<string, string>;
  pageUrl: string;
}

// Component instance with optional variants and states
export interface ComponentInstance extends DetectedComponent {
  variants?: Record<string, string>;
  states?: Record<string, Record<string, string>>;
}
