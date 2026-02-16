/**
 * Content and style pattern type definitions for UIUX-Mirror
 * Phase 4: Voice, tone, capitalization, and CTA hierarchy analysis
 */

// Context where text appears
export type TextContext =
  | 'button'
  | 'link'
  | 'label'
  | 'error'
  | 'tooltip'
  | 'heading'
  | 'placeholder';

// Sample of text with metadata
export interface TextSample {
  text: string;
  context: TextContext;
  selector: string;
  pageUrl: string;
  evidenceId: string;
}

// Capitalization styles
export type CapitalizationStyle =
  | 'sentence-case'
  | 'title-case'
  | 'uppercase'
  | 'lowercase'
  | 'mixed';

// Detected capitalization pattern
export interface CapitalizationPattern {
  style: CapitalizationStyle;
  examples: string[];
  frequency: number;                  // Number of occurrences
  contexts: TextContext[];            // Where this style is used
  confidence: number;                 // 0-1 confidence score
}

// Voice tone characteristics
export type ToneType = 'formal' | 'casual' | 'professional' | 'friendly' | 'urgent';

// Grammatical tense
export type TenseType = 'imperative' | 'present' | 'future';

// Perspective/point of view
export type PerspectiveType = 'first-person' | 'second-person' | 'third-person';

// Detected voice pattern
export interface VoicePattern {
  tone: ToneType;
  tense: TenseType;
  perspective: PerspectiveType;
  examples: string[];
  confidence: number;
}

// CTA (Call-to-Action) hierarchy levels
export type CTALevel = 'primary' | 'secondary' | 'tertiary' | 'ghost';

// Visual characteristics of a CTA
export interface CTACharacteristics {
  hasBackground: boolean;
  hasBorder: boolean;
  textColor: string;
  backgroundColor?: string;
  borderColor?: string;
  fontWeight: string;
  usageContexts: string[];            // Contexts where this level is used
}

// Detected CTA hierarchy pattern
export interface CTAHierarchy {
  level: CTALevel;
  characteristics: CTACharacteristics;
  examples: Array<{
    text: string;
    pageUrl: string;
    selector: string;
  }>;
  frequency: number;
  confidence: number;
}

// Error message structure patterns
export type ErrorStructure =
  | 'prefix-reason'                   // "Error: Invalid email"
  | 'reason-only'                     // "Invalid email"
  | 'reason-suggestion'               // "Invalid email. Please use format: user@domain.com"
  | 'question-format';                // "Is this email correct?"

// Error message tone
export type ErrorTone =
  | 'apologetic'                      // "Sorry, that didn't work"
  | 'neutral'                         // "Invalid input"
  | 'instructive'                     // "Please enter a valid email"
  | 'technical';                      // "Validation failed: email format"

// Detected error message pattern
export interface ErrorMessagePattern {
  structure: ErrorStructure;
  tone: ErrorTone;
  examples: string[];
  commonPrefixes: string[];           // Common error prefixes like "Error:", "Warning:"
  suggestsAction: boolean;            // Whether errors suggest corrective action
  frequency: number;
}

// Complete content style analysis result
export interface ContentStyleResult {
  voicePatterns: VoicePattern[];
  capitalizationPatterns: CapitalizationPattern[];
  ctaHierarchy: CTAHierarchy[];
  errorPatterns: ErrorMessagePattern[];
  totalSamples: number;
  confidence: number;                 // Overall confidence in analysis
}
