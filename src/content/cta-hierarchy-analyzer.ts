/**
 * CTA (Call-to-Action) hierarchy analysis
 * Classifies button prominence levels based on visual characteristics
 */

import type { DetectedComponent } from '../types/components.js';
import type { CTAHierarchy, CTALevel } from '../types/content-style.js';

/**
 * Analyzes CTA hierarchy from detected button components
 * Classifies buttons into primary/secondary/tertiary/ghost based on visual prominence
 */
export function analyzeCTAHierarchy(components: DetectedComponent[]): CTAHierarchy[] {
  // Filter to buttons only
  const buttons = components.filter(c => c.type === 'button');

  if (buttons.length === 0) {
    return [];
  }

  // Classify each button by hierarchy level
  const byLevel = new Map<CTALevel, DetectedComponent[]>();

  for (const button of buttons) {
    const level = classifyHierarchy(button);

    if (!byLevel.has(level)) {
      byLevel.set(level, []);
    }

    byLevel.get(level)!.push(button);
  }

  // Build CTAHierarchy objects
  const hierarchies: CTAHierarchy[] = [];

  for (const [level, levelButtons] of Array.from(byLevel.entries())) {
    // Extract examples
    const examples = levelButtons.slice(0, 10).map(btn => ({
      text: btn.element.textContent,
      pageUrl: btn.pageUrl,
      selector: btn.selector,
    }));

    // Determine usage contexts from button text
    const contexts = new Set<string>();
    for (const btn of levelButtons) {
      const context = classifyButtonContext(btn.element.textContent);
      contexts.add(context);
    }

    // Calculate confidence based on style consistency within level
    const confidence = calculateStyleConsistency(levelButtons);

    // Extract common characteristics from first button (representative)
    const representative = levelButtons[0];
    const styles = representative.computedStyles;

    const characteristics = {
      hasBackground: hasSolidBackground(styles.backgroundColor || ''),
      hasBorder: hasBorder(styles.borderWidth || '0'),
      textColor: styles.color || '',
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      fontWeight: styles.fontWeight || 'normal',
      usageContexts: Array.from(contexts),
    };

    hierarchies.push({
      level,
      characteristics,
      examples,
      frequency: levelButtons.length,
      confidence,
    });
  }

  // Sort by frequency descending
  return hierarchies.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Classify button hierarchy level based on visual characteristics
 */
function classifyHierarchy(button: DetectedComponent): CTALevel {
  const styles = button.computedStyles;

  const hasBackground = hasSolidBackground(styles.backgroundColor || '');
  const hasBorderStyle = hasBorder(styles.borderWidth || '0');
  const isBold = isBoldFont(styles.fontWeight || 'normal');

  // Primary: solid background AND bold font weight
  if (hasBackground && isBold) {
    return 'primary';
  }

  // Secondary: has border AND no solid background
  if (hasBorderStyle && !hasBackground) {
    return 'secondary';
  }

  // Ghost: no border AND no solid background (text-only)
  if (!hasBorderStyle && !hasBackground) {
    return 'ghost';
  }

  // Tertiary: everything else (e.g., has background but not bold)
  return 'tertiary';
}

/**
 * Check if background color is solid (not transparent)
 */
function hasSolidBackground(bgColor: string): boolean {
  if (!bgColor || bgColor === 'transparent') {
    return false;
  }

  // Check for rgba with 0 alpha
  if (/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)/.test(bgColor)) {
    return false;
  }

  return true;
}

/**
 * Check if element has a border
 */
function hasBorder(borderWidth: string): boolean {
  const width = parseFloat(borderWidth);
  return !isNaN(width) && width > 0;
}

/**
 * Check if font weight is bold (>=600)
 */
function isBoldFont(fontWeight: string): boolean {
  const weight = parseInt(fontWeight, 10);
  return !isNaN(weight) && weight >= 600;
}

/**
 * Classify button context from text content
 */
function classifyButtonContext(text: string): string {
  const lowerText = text.toLowerCase();

  // Form submission
  if (/submit|send|save|create|add|post/.test(lowerText)) {
    return 'form-submit';
  }

  // Authentication
  if (/sign in|log in|sign up|register/.test(lowerText)) {
    return 'auth';
  }

  // Commerce
  if (/buy|purchase|checkout|add to cart/.test(lowerText)) {
    return 'commerce';
  }

  // Informational
  if (/learn more|read|view|see/.test(lowerText)) {
    return 'informational';
  }

  // Dismissal
  if (/cancel|close|dismiss|skip/.test(lowerText)) {
    return 'dismissal';
  }

  // General
  return 'general';
}

/**
 * Calculate style consistency within a level
 * Returns confidence score based on how uniform the styles are
 */
function calculateStyleConsistency(buttons: DetectedComponent[]): number {
  if (buttons.length === 0) {
    return 0;
  }

  // For now, use a simple heuristic based on frequency
  // More buttons at same level = higher confidence
  const baseConfidence = Math.min(buttons.length / 20, 1.0);

  // Could be enhanced to check variance in actual style values
  // For v1, frequency-based confidence is sufficient

  return baseConfidence;
}
