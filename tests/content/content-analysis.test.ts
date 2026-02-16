/**
 * Content analysis unit tests
 * Tests content analysis pipeline for voice/tone, capitalization, error grammar, and CTA hierarchy
 */

import { describe, it, expect } from 'vitest';
import type { DetectedComponent } from '../../src/types/components.js';
import type { TextSample } from '../../src/types/content-style.js';
import {
  extractTextSamples,
  analyzeVoiceTone,
  analyzeCapitalization,
  analyzeErrorMessages,
  analyzeCTAHierarchy,
} from '../../src/content/index.js';

// Mock HTML content with various text patterns
const mockHtml = `
<!DOCTYPE html>
<html>
<head><title>Example Page</title></head>
<body>
  <h1>Welcome to Our Platform</h1>
  <h2>Get Started Today</h2>

  <button class="primary">Sign Up</button>
  <button class="secondary">Learn More</button>
  <button class="ghost">Cancel</button>
  <button class="cta">Buy Now</button>
  <button class="action">Get Started</button>

  <a href="/features">View Features</a>
  <a href="/pricing">See Pricing</a>

  <label for="email">Email Address</label>
  <input type="email" id="email" placeholder="Enter your email" />

  <label for="password">Password</label>
  <input type="password" id="password" placeholder="Enter password" />

  <div class="error">Sorry, that email is already taken. Please try another.</div>
  <div class="error">Invalid password</div>
  <div class="error">Error: Connection failed</div>
  <div class="error">Please enter a valid email address</div>

  <div class="tooltip" title="Your account settings">Settings</div>
</body>
</html>
`;

// Mock DetectedComponent[] for CTA hierarchy analysis
const mockComponents: DetectedComponent[] = [
  // Primary button
  {
    type: 'button',
    selector: 'button.primary',
    element: {
      tagName: 'button',
      computedStyles: {},
      textContent: 'Sign Up',
      hasChildren: false,
      childCount: 0,
      selector: 'button.primary',
      attributes: {},
    },
    evidence: [],
    computedStyles: {
      backgroundColor: '#2563eb',
      fontWeight: '700',
      borderWidth: '0',
      color: '#ffffff',
    },
    pageUrl: 'https://example.com/page1',
  },
  // Secondary button
  {
    type: 'button',
    selector: 'button.secondary',
    element: {
      tagName: 'button',
      computedStyles: {},
      textContent: 'Learn More',
      hasChildren: false,
      childCount: 0,
      selector: 'button.secondary',
      attributes: {},
    },
    evidence: [],
    computedStyles: {
      backgroundColor: 'transparent',
      fontWeight: '400',
      borderWidth: '1px',
      borderColor: '#2563eb',
      color: '#2563eb',
    },
    pageUrl: 'https://example.com/page1',
  },
  // Ghost button
  {
    type: 'button',
    selector: 'button.ghost',
    element: {
      tagName: 'button',
      computedStyles: {},
      textContent: 'Cancel',
      hasChildren: false,
      childCount: 0,
      selector: 'button.ghost',
      attributes: {},
    },
    evidence: [],
    computedStyles: {
      backgroundColor: 'transparent',
      fontWeight: '400',
      borderWidth: '0',
      color: '#6b7280',
    },
    pageUrl: 'https://example.com/page1',
  },
  // Primary CTA (Buy Now)
  {
    type: 'button',
    selector: 'button.cta',
    element: {
      tagName: 'button',
      computedStyles: {},
      textContent: 'Buy Now',
      hasChildren: false,
      childCount: 0,
      selector: 'button.cta',
      attributes: {},
    },
    evidence: [],
    computedStyles: {
      backgroundColor: '#dc2626',
      fontWeight: '700',
      borderWidth: '0',
      color: '#ffffff',
    },
    pageUrl: 'https://example.com/page2',
  },
  // Another primary button on different page
  {
    type: 'button',
    selector: 'button.action',
    element: {
      tagName: 'button',
      computedStyles: {},
      textContent: 'Get Started',
      hasChildren: false,
      childCount: 0,
      selector: 'button.action',
      attributes: {},
    },
    evidence: [],
    computedStyles: {
      backgroundColor: '#2563eb',
      fontWeight: '700',
      borderWidth: '0',
      color: '#ffffff',
    },
    pageUrl: 'https://example.com/page2',
  },
];

// Multiple page URLs for cross-page evidence
const pageUrls = [
  'https://example.com/page1',
  'https://example.com/page2',
  'https://example.com/page3',
  'https://example.com/page4',
];

describe('extractTextSamples', () => {
  it('extracts button text', () => {
    const samples = extractTextSamples(mockHtml, pageUrls[0]);
    const buttonSamples = samples.filter(s => s.context === 'button');

    expect(buttonSamples.length).toBeGreaterThan(0);
    expect(buttonSamples.some(s => s.text.includes('Sign Up'))).toBe(true);
  });

  it('extracts heading text', () => {
    const samples = extractTextSamples(mockHtml, pageUrls[0]);
    const headingSamples = samples.filter(s => s.context === 'heading');

    expect(headingSamples.length).toBeGreaterThan(0);
    expect(headingSamples.some(s => s.text.includes('Welcome'))).toBe(true);
  });

  it('extracts error messages', () => {
    const samples = extractTextSamples(mockHtml, pageUrls[0]);
    const errorSamples = samples.filter(s => s.context === 'error');

    expect(errorSamples.length).toBeGreaterThan(0);
    expect(errorSamples.some(s => s.text.includes('already taken'))).toBe(true);
  });

  it('extracts placeholder text', () => {
    const samples = extractTextSamples(mockHtml, pageUrls[0]);
    const placeholderSamples = samples.filter(s => s.context === 'placeholder');

    expect(placeholderSamples.length).toBeGreaterThan(0);
    expect(placeholderSamples.some(s => s.text.includes('Enter your email'))).toBe(true);
  });

  it('strips HTML tags from text', () => {
    const nestedHtml = '<button><span>Click <strong>Here</strong></span></button>';
    const samples = extractTextSamples(nestedHtml, pageUrls[0]);
    const buttonSample = samples.find(s => s.context === 'button');

    // Should extract text without HTML tags
    expect(buttonSample?.text).toBeDefined();
    expect(buttonSample?.text).not.toContain('<');
    expect(buttonSample?.text).not.toContain('>');
  });

  it('filters empty text', () => {
    const emptyButtonHtml = '<button></button><button>   </button>';
    const samples = extractTextSamples(emptyButtonHtml, pageUrls[0]);

    // Empty buttons should produce no samples
    expect(samples.every(s => s.text.trim().length > 0)).toBe(true);
  });

  it('includes pageUrl and selector', () => {
    const samples = extractTextSamples(mockHtml, pageUrls[0]);

    samples.forEach(sample => {
      expect(sample.pageUrl).toBe(pageUrls[0]);
      expect(sample.selector).toBeDefined();
      expect(sample.selector.length).toBeGreaterThan(0);
    });
  });
});

describe('analyzeVoiceTone', () => {
  it('detects imperative tense in CTAs', () => {
    const samples: TextSample[] = [
      {
        text: 'Sign Up',
        context: 'button',
        selector: 'button.cta1',
        pageUrl: pageUrls[0],
        evidenceId: 'ev1',
      },
      {
        text: 'Get Started',
        context: 'button',
        selector: 'button.cta2',
        pageUrl: pageUrls[1],
        evidenceId: 'ev2',
      },
      {
        text: 'Learn More',
        context: 'button',
        selector: 'button.cta3',
        pageUrl: pageUrls[2],
        evidenceId: 'ev3',
      },
    ];

    const patterns = analyzeVoiceTone(samples);

    // Should detect imperative patterns
    expect(patterns.length).toBeGreaterThan(0);
    const imperativePattern = patterns.find(p => p.tense === 'imperative');
    expect(imperativePattern).toBeDefined();
  });

  it('detects urgent tone', () => {
    const samples: TextSample[] = [
      {
        text: 'Buy Now',
        context: 'button',
        selector: 'button.urgent1',
        pageUrl: pageUrls[0],
        evidenceId: 'ev1',
      },
      {
        text: 'Act Fast',
        context: 'button',
        selector: 'button.urgent2',
        pageUrl: pageUrls[1],
        evidenceId: 'ev2',
      },
      {
        text: 'Limited Time',
        context: 'button',
        selector: 'button.urgent3',
        pageUrl: pageUrls[2],
        evidenceId: 'ev3',
      },
    ];

    const patterns = analyzeVoiceTone(samples);

    // Should detect urgent or professional tone
    expect(patterns.some(p => p.tone === 'urgent' || p.tone === 'professional')).toBe(true);
  });

  it('detects perspective', () => {
    const samples: TextSample[] = [
      {
        text: 'Your Account',
        context: 'button',
        selector: 'button.account',
        pageUrl: pageUrls[0],
        evidenceId: 'ev1',
      },
      {
        text: 'View Your Profile',
        context: 'button',
        selector: 'button.profile',
        pageUrl: pageUrls[1],
        evidenceId: 'ev2',
      },
    ];

    const patterns = analyzeVoiceTone(samples);

    // Should detect second-person perspective
    expect(patterns.some(p => p.perspective === 'second-person')).toBe(true);
  });

  it('clusters similar voice patterns', () => {
    const samples: TextSample[] = Array.from({ length: 15 }, (_, i) => ({
      text: i % 3 === 0 ? 'Sign Up' : i % 3 === 1 ? 'Get Started' : 'Learn More',
      context: 'button',
      selector: `button.btn${i}`,
      pageUrl: pageUrls[i % pageUrls.length],
      evidenceId: `ev${i}`,
    }));

    const patterns = analyzeVoiceTone(samples);

    // Should cluster similar imperative patterns
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.length).toBeLessThan(samples.length); // Clustered, not one pattern per sample
  });

  it('calculates confidence based on frequency', () => {
    const samples: TextSample[] = Array.from({ length: 20 }, (_, i) => ({
      text: i < 15 ? 'Sign Up' : 'Your account',
      context: 'button',
      selector: `button.btn${i}`,
      pageUrl: pageUrls[i % pageUrls.length],
      evidenceId: `ev${i}`,
    }));

    const patterns = analyzeVoiceTone(samples);

    // Dominant pattern (75% frequency) should have higher confidence
    const dominantPattern = patterns.reduce((max, p) => p.confidence > max.confidence ? p : max);
    expect(dominantPattern.confidence).toBeGreaterThan(0.5);
  });
});

describe('analyzeCapitalization', () => {
  it('detects title case', () => {
    const samples: TextSample[] = Array.from({ length: 6 }, (_, i) => ({
      text: 'Sign Up Now',
      context: 'button',
      selector: `button.btn${i}`,
      pageUrl: pageUrls[i % pageUrls.length],
      evidenceId: `ev${i}`,
    }));

    const patterns = analyzeCapitalization(samples);
    const buttonPatterns = patterns.filter(p => p.contexts.includes('button'));

    expect(buttonPatterns.some(p => p.style === 'title-case')).toBe(true);
  });

  it('detects sentence case', () => {
    const samples: TextSample[] = Array.from({ length: 6 }, (_, i) => ({
      text: 'Learn more about our services',
      context: 'button',
      selector: `button.btn${i}`,
      pageUrl: pageUrls[i % pageUrls.length],
      evidenceId: `ev${i}`,
    }));

    const patterns = analyzeCapitalization(samples);
    const buttonPatterns = patterns.filter(p => p.contexts.includes('button'));

    expect(buttonPatterns.some(p => p.style === 'sentence-case')).toBe(true);
  });

  it('detects uppercase', () => {
    const samples: TextSample[] = Array.from({ length: 6 }, (_, i) => ({
      text: 'SUBMIT',
      context: 'button',
      selector: `button.btn${i}`,
      pageUrl: pageUrls[i % pageUrls.length],
      evidenceId: `ev${i}`,
    }));

    const patterns = analyzeCapitalization(samples);
    const buttonPatterns = patterns.filter(p => p.contexts.includes('button'));

    expect(buttonPatterns.some(p => p.style === 'uppercase')).toBe(true);
  });

  it('handles acronyms in text', () => {
    const samples: TextSample[] = Array.from({ length: 6 }, (_, i) => ({
      text: 'View API Docs',
      context: 'button',
      selector: `button.btn${i}`,
      pageUrl: pageUrls[i % pageUrls.length],
      evidenceId: `ev${i}`,
    }));

    const patterns = analyzeCapitalization(samples);

    // Should not falsely classify as uppercase due to "API"
    expect(patterns.some(p => p.style === 'title-case')).toBe(true);
  });

  it('groups by context', () => {
    const samples: TextSample[] = [
      ...Array.from({ length: 6 }, (_, i) => ({
        text: 'Sign Up',
        context: 'button' as const,
        selector: `button.btn${i}`,
        pageUrl: pageUrls[i % pageUrls.length],
        evidenceId: `ev-btn${i}`,
      })),
      ...Array.from({ length: 6 }, (_, i) => ({
        text: 'Welcome to our platform',
        context: 'heading' as const,
        selector: `h1.heading${i}`,
        pageUrl: pageUrls[i % pageUrls.length],
        evidenceId: `ev-h${i}`,
      })),
    ];

    const patterns = analyzeCapitalization(samples);

    // Should have separate patterns for button and heading contexts
    const buttonPattern = patterns.find(p => p.contexts.includes('button'));
    const headingPattern = patterns.find(p => p.contexts.includes('heading'));

    expect(buttonPattern).toBeDefined();
    expect(headingPattern).toBeDefined();
    expect(buttonPattern?.style).not.toBe(headingPattern?.style);
  });

  it('enforces minimum sample threshold', () => {
    // Only 3 samples (less than minimum of 5)
    const samples: TextSample[] = Array.from({ length: 3 }, (_, i) => ({
      text: 'Sign Up',
      context: 'button',
      selector: `button.btn${i}`,
      pageUrl: pageUrls[i],
      evidenceId: `ev${i}`,
    }));

    const patterns = analyzeCapitalization(samples);

    // Should return empty or have very low confidence patterns
    if (patterns.length > 0) {
      expect(patterns.every(p => p.frequency < 5)).toBe(true);
    }
  });
});

describe('analyzeErrorMessages', () => {
  it('detects reason-suggestion structure', () => {
    const samples: TextSample[] = [
      {
        text: 'Sorry, that email is already taken. Please try another.',
        context: 'error',
        selector: 'div.error1',
        pageUrl: pageUrls[0],
        evidenceId: 'ev1',
      },
      {
        text: 'Invalid username. Please choose a different one.',
        context: 'error',
        selector: 'div.error2',
        pageUrl: pageUrls[1],
        evidenceId: 'ev2',
      },
      {
        text: 'Password too short. Try at least 8 characters.',
        context: 'error',
        selector: 'div.error3',
        pageUrl: pageUrls[2],
        evidenceId: 'ev3',
      },
    ];

    const patterns = analyzeErrorMessages(samples);

    expect(patterns.some(p => p.structure === 'reason-suggestion')).toBe(true);
  });

  it('detects prefix-reason structure', () => {
    const samples: TextSample[] = [
      {
        text: 'Error: Connection failed',
        context: 'error',
        selector: 'div.error1',
        pageUrl: pageUrls[0],
        evidenceId: 'ev1',
      },
      {
        text: 'Error: Invalid credentials',
        context: 'error',
        selector: 'div.error2',
        pageUrl: pageUrls[1],
        evidenceId: 'ev2',
      },
      {
        text: 'Warning: Session expired',
        context: 'error',
        selector: 'div.error3',
        pageUrl: pageUrls[2],
        evidenceId: 'ev3',
      },
    ];

    const patterns = analyzeErrorMessages(samples);

    expect(patterns.some(p => p.structure === 'prefix-reason')).toBe(true);
  });

  it('detects apologetic tone', () => {
    const samples: TextSample[] = [
      {
        text: 'Sorry, something went wrong',
        context: 'error',
        selector: 'div.error1',
        pageUrl: pageUrls[0],
        evidenceId: 'ev1',
      },
      {
        text: 'Oops! That didn\'t work',
        context: 'error',
        selector: 'div.error2',
        pageUrl: pageUrls[1],
        evidenceId: 'ev2',
      },
      {
        text: 'We apologize for the inconvenience',
        context: 'error',
        selector: 'div.error3',
        pageUrl: pageUrls[2],
        evidenceId: 'ev3',
      },
    ];

    const patterns = analyzeErrorMessages(samples);

    expect(patterns.some(p => p.tone === 'apologetic')).toBe(true);
  });

  it('detects technical tone', () => {
    const samples: TextSample[] = [
      {
        text: 'Invalid password',
        context: 'error',
        selector: 'div.error1',
        pageUrl: pageUrls[0],
        evidenceId: 'ev1',
      },
      {
        text: 'Validation failed',
        context: 'error',
        selector: 'div.error2',
        pageUrl: pageUrls[1],
        evidenceId: 'ev2',
      },
      {
        text: 'Authentication error',
        context: 'error',
        selector: 'div.error3',
        pageUrl: pageUrls[2],
        evidenceId: 'ev3',
      },
    ];

    const patterns = analyzeErrorMessages(samples);

    expect(patterns.some(p => p.tone === 'technical' || p.tone === 'neutral')).toBe(true);
  });

  it('extracts common prefixes', () => {
    const samples: TextSample[] = [
      {
        text: 'Error: Connection failed',
        context: 'error',
        selector: 'div.error1',
        pageUrl: pageUrls[0],
        evidenceId: 'ev1',
      },
      {
        text: 'Error: Invalid input',
        context: 'error',
        selector: 'div.error2',
        pageUrl: pageUrls[1],
        evidenceId: 'ev2',
      },
      {
        text: 'Error: Not found',
        context: 'error',
        selector: 'div.error3',
        pageUrl: pageUrls[2],
        evidenceId: 'ev3',
      },
    ];

    const patterns = analyzeErrorMessages(samples);

    expect(patterns.some(p => p.commonPrefixes.includes('Error:'))).toBe(true);
  });

  it('returns empty for insufficient samples', () => {
    // Only 2 samples (less than minimum of 3)
    const samples: TextSample[] = [
      {
        text: 'Error: Failed',
        context: 'error',
        selector: 'div.error1',
        pageUrl: pageUrls[0],
        evidenceId: 'ev1',
      },
      {
        text: 'Invalid input',
        context: 'error',
        selector: 'div.error2',
        pageUrl: pageUrls[1],
        evidenceId: 'ev2',
      },
    ];

    const patterns = analyzeErrorMessages(samples);

    // Should return empty array or have warning
    expect(patterns.length).toBe(0);
  });
});

describe('analyzeCTAHierarchy', () => {
  it('classifies primary buttons', () => {
    const hierarchy = analyzeCTAHierarchy(mockComponents);

    const primaryButtons = hierarchy.filter(h => h.level === 'primary');
    expect(primaryButtons.length).toBeGreaterThan(0);

    // Primary should have solid background + bold
    const primary = primaryButtons[0];
    expect(primary.characteristics.hasBackground).toBe(true);
    expect(parseInt(primary.characteristics.fontWeight) >= 600 || primary.characteristics.fontWeight === 'bold').toBe(true);
  });

  it('classifies secondary buttons', () => {
    const hierarchy = analyzeCTAHierarchy(mockComponents);

    const secondaryButtons = hierarchy.filter(h => h.level === 'secondary');
    expect(secondaryButtons.length).toBeGreaterThan(0);

    // Secondary should have border but transparent background
    const secondary = secondaryButtons[0];
    expect(secondary.characteristics.hasBorder).toBe(true);
    expect(secondary.characteristics.backgroundColor).toContain('transparent');
  });

  it('classifies ghost buttons', () => {
    const hierarchy = analyzeCTAHierarchy(mockComponents);

    const ghostButtons = hierarchy.filter(h => h.level === 'ghost');
    expect(ghostButtons.length).toBeGreaterThan(0);

    // Ghost should have no border and no background
    const ghost = ghostButtons[0];
    expect(ghost.characteristics.hasBackground).toBe(false);
    expect(ghost.characteristics.hasBorder).toBe(false);
  });

  it('includes usage context', () => {
    const hierarchy = analyzeCTAHierarchy(mockComponents);

    hierarchy.forEach(h => {
      expect(h.characteristics.usageContexts).toBeDefined();
      expect(Array.isArray(h.characteristics.usageContexts)).toBe(true);
    });
  });

  it('calculates frequency', () => {
    const hierarchy = analyzeCTAHierarchy(mockComponents);

    hierarchy.forEach(h => {
      expect(h.frequency).toBeGreaterThan(0);
      expect(h.frequency).toBeLessThanOrEqual(mockComponents.length);
    });
  });
});
