/**
 * Text extraction from HTML content
 * Extracts text samples from interactive and content elements
 */

import { createHash } from 'crypto';
import type { TextSample, TextContext } from '../types/content-style.js';

/**
 * Extracts text samples from raw HTML content
 * Identifies interactive and content elements and extracts their text with context
 */
export function extractTextSamples(htmlContent: string, pageUrl: string): TextSample[] {
  const samples: TextSample[] = [];

  // Extract buttons
  const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi;
  let match: RegExpExecArray | null;
  while ((match = buttonRegex.exec(htmlContent)) !== null) {
    const text = stripHtml(match[1]);
    if (isValidText(text)) {
      samples.push(createSample(text, 'button', 'button', pageUrl));
    }
  }

  // Extract submit inputs
  const submitRegex = /<input[^>]*type=["']submit["'][^>]*value=["']([^"']+)["'][^>]*>/gi;
  while ((match = submitRegex.exec(htmlContent)) !== null) {
    const text = match[1].trim();
    if (isValidText(text)) {
      samples.push(createSample(text, 'button', 'input[type="submit"]', pageUrl));
    }
  }

  // Extract links
  const linkRegex = /<a[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = linkRegex.exec(htmlContent)) !== null) {
    const text = stripHtml(match[1]);
    if (isValidText(text)) {
      samples.push(createSample(text, 'link', 'a', pageUrl));
    }
  }

  // Extract labels
  const labelRegex = /<label[^>]*>([\s\S]*?)<\/label>/gi;
  while ((match = labelRegex.exec(htmlContent)) !== null) {
    const text = stripHtml(match[1]);
    if (isValidText(text)) {
      samples.push(createSample(text, 'label', 'label', pageUrl));
    }
  }

  // Extract error messages (elements with error-related classes/ids)
  const errorRegex = /<[^>]+(class|id)=["'][^"']*(?:error|alert|warning|invalid)[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi;
  while ((match = errorRegex.exec(htmlContent)) !== null) {
    const text = stripHtml(match[2]);
    if (isValidText(text)) {
      samples.push(createSample(text, 'error', '[class*="error"]', pageUrl));
    }
  }

  // Extract tooltips from title attributes
  const titleAttrRegex = /<[^>]+title=["']([^"']+)["'][^>]*>/gi;
  while ((match = titleAttrRegex.exec(htmlContent)) !== null) {
    const text = match[1].trim();
    if (isValidText(text)) {
      samples.push(createSample(text, 'tooltip', '[title]', pageUrl));
    }
  }

  // Extract tooltips from data-tooltip attributes
  const dataTooltipRegex = /<[^>]+data-tooltip=["']([^"']+)["'][^>]*>/gi;
  while ((match = dataTooltipRegex.exec(htmlContent)) !== null) {
    const text = match[1].trim();
    if (isValidText(text)) {
      samples.push(createSample(text, 'tooltip', '[data-tooltip]', pageUrl));
    }
  }

  // Extract tooltips from role="tooltip"
  const tooltipRoleRegex = /<[^>]+role=["']tooltip["'][^>]*>([\s\S]*?)<\/[^>]+>/gi;
  while ((match = tooltipRoleRegex.exec(htmlContent)) !== null) {
    const text = stripHtml(match[1]);
    if (isValidText(text)) {
      samples.push(createSample(text, 'tooltip', '[role="tooltip"]', pageUrl));
    }
  }

  // Extract headings (h1-h6)
  for (let level = 1; level <= 6; level++) {
    const headingRegex = new RegExp(`<h${level}[^>]*>([\\s\\S]*?)<\\/h${level}>`, 'gi');
    while ((match = headingRegex.exec(htmlContent)) !== null) {
      const text = stripHtml(match[1]);
      if (isValidText(text)) {
        samples.push(createSample(text, 'heading', `h${level}`, pageUrl));
      }
    }
  }

  // Extract placeholders
  const placeholderRegex = /<[^>]+placeholder=["']([^"']+)["'][^>]*>/gi;
  while ((match = placeholderRegex.exec(htmlContent)) !== null) {
    const text = match[1].trim();
    if (isValidText(text)) {
      samples.push(createSample(text, 'placeholder', '[placeholder]', pageUrl));
    }
  }

  return samples;
}

/**
 * Strip HTML tags from text content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim();
}

/**
 * Check if text is valid (not empty and at least 2 characters)
 */
function isValidText(text: string): boolean {
  return text.length >= 2;
}

/**
 * Create a TextSample object with evidenceId
 */
function createSample(
  text: string,
  context: TextContext,
  selector: string,
  pageUrl: string
): TextSample {
  // Generate evidenceId from hash of pageUrl + selector + text
  const evidenceId = createHash('sha256')
    .update(`${pageUrl}::${selector}::${text}`)
    .digest('hex')
    .slice(0, 16);

  return {
    text,
    context,
    selector,
    pageUrl,
    evidenceId,
  };
}
