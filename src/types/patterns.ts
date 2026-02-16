/**
 * Pattern detection type definitions for UIUX-Mirror
 * Phase 4: Flow detection and state transition analysis
 */

// State representation in flow graphs
export interface PageState {
  url: string;
  pageId: string;                    // Unique identifier for this state
  title: string;
  formElements: string[];             // Selectors for form inputs
  interactiveElements: string[];      // Selectors for buttons, links, etc.
  evidenceId: string;                 // Reference to TokenEvidence
}

// Action that triggers a state transition
export interface TransitionAction {
  type: 'click' | 'submit' | 'navigation';
  selector?: string;                  // Element that triggers transition
  method?: 'GET' | 'POST';            // HTTP method for navigation
}

// Edge in the state flow graph
export interface Transition {
  fromState: string;                  // Source page ID
  toState: string;                    // Destination page ID
  action: TransitionAction;
  evidence: {
    pageUrl: string;
    timestamp: string;
    screenshotPath?: string;
  };
}

// Common flow patterns
export type FlowType =
  | 'auth'
  | 'checkout'
  | 'onboarding'
  | 'search-filter'
  | 'multi-step-form'
  | 'unknown';

// Flow characteristics for classification
export interface FlowCharacteristics {
  hasFormSubmission: boolean;
  requiresAuth: boolean;
  stepCount: number;
  commonKeywords: string[];           // Keywords found in page titles/headings
}

// Detected flow pattern
export interface DetectedFlow {
  type: FlowType;
  entryPoint: string;                 // Starting page ID
  exitPoint: string;                  // Ending page ID
  path: string[];                     // Sequence of page IDs
  transitions: Transition[];
  confidence: number;                 // 0-1 confidence score
  evidence: string[];                 // Evidence IDs supporting this flow
  characteristics: FlowCharacteristics;
}

// Stored pattern in database
export interface StoredPattern {
  id: string;
  type: 'flow' | 'voice-tone' | 'capitalization' | 'error-grammar' | 'cta-hierarchy';
  pattern: DetectedFlow | any;       // Type varies by pattern type
  evidence: {
    pageUrls: string[];
    selectors: string[];
    screenshotPaths: string[];
    occurrenceCount: number;
    crossPageCount: number;
  };
  confidence: number;
  detectedAt: string;                 // ISO 8601 timestamp
}
