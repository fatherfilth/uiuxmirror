/**
 * Flow classifier for UIUX-Mirror
 * Phase 4: Classifies flow paths into auth/checkout/onboarding/search-filter types
 */

import type Graph from 'graphology';
import type { PageState, FlowType, FlowCharacteristics, Transition } from '../types/patterns.js';

/**
 * Classify flow based on path characteristics
 *
 * Examines page titles, URLs, and form elements to determine flow type:
 * - auth: login, sign-in, register, password fields
 * - checkout: cart, payment, shipping, card fields
 * - onboarding: welcome, setup, tutorial, multi-step
 * - search-filter: search, filter, results, query fields
 * - multi-step-form: multiple form pages
 * - unknown: doesn't match any pattern
 */
export function classifyFlow(
  graph: Graph<PageState, Transition>,
  path: string[]
): FlowType {
  if (path.length === 0) return 'unknown';

  const pages = path.map(pageId => graph.getNodeAttributes(pageId));

  // Check for auth flow indicators
  const hasAuthKeywords = pages.some(p =>
    /login|sign-?in|register|sign-?up|authenticate|forgot-?password|reset-?password/i.test(p.title) ||
    /login|sign-?in|register|auth/i.test(p.url)
  );
  const hasPasswordField = pages.some(p =>
    p.formElements.some(selector => /password|pwd/i.test(selector))
  );
  if (hasAuthKeywords && hasPasswordField) {
    return 'auth';
  }

  // Check for checkout flow indicators
  const hasCheckoutKeywords = pages.some(p =>
    /checkout|cart|payment|shipping|billing|order/i.test(p.title) ||
    /checkout|cart|payment|pay/i.test(p.url)
  );
  const hasPaymentField = pages.some(p =>
    p.formElements.some(selector => /card|payment|cvv|billing|credit/i.test(selector))
  );
  if (hasCheckoutKeywords && hasPaymentField) {
    return 'checkout';
  }

  // Check for onboarding flow indicators
  const hasOnboardingKeywords = pages.some(p =>
    /welcome|getting-?started|setup|onboard|tutorial/i.test(p.title) ||
    /welcome|onboard|setup/i.test(p.url)
  );
  const isMultiStep = path.length >= 3;
  if (hasOnboardingKeywords && isMultiStep) {
    return 'onboarding';
  }

  // Check for search/filter flow indicators
  const hasSearchKeywords = pages.some(p =>
    /search|filter|results|query|browse/i.test(p.title) ||
    /search|filter|results/i.test(p.url)
  );
  const hasSearchInput = pages.some(p =>
    p.formElements.some(selector => /search|query|filter/i.test(selector))
  );
  if (hasSearchKeywords && hasSearchInput) {
    return 'search-filter';
  }

  // Multi-step form (generic)
  const pagesWithForms = pages.filter(p => p.formElements.length > 0);
  if (pagesWithForms.length >= 2 && isMultiStep) {
    return 'multi-step-form';
  }

  return 'unknown';
}

/**
 * Calculate confidence score for detected flow
 *
 * Base confidence varies by flow type, then adjusted for:
 * - Path length (2-6 steps is sweet spot)
 * - Form submissions in path
 * - URL pattern consistency
 *
 * Returns 0-1 confidence score
 */
export function calculateFlowConfidence(
  flowType: FlowType,
  path: string[],
  graph: Graph<PageState, Transition>
): number {
  // Base confidence by flow type
  const baseConfidence: Record<FlowType, number> = {
    'auth': 0.8,
    'checkout': 0.8,
    'onboarding': 0.7,
    'search-filter': 0.75,
    'multi-step-form': 0.5,
    'unknown': 0.3,
  };

  let confidence = baseConfidence[flowType];

  // Adjust for path length
  const pathLength = path.length;
  if (pathLength >= 2 && pathLength <= 6) {
    // Sweet spot: moderate length flows
    confidence += 0.1;
  } else if (pathLength > 7) {
    // Very long paths likely navigation, not flows
    confidence -= 0.2;
  } else if (pathLength === 1) {
    // Single page is not really a flow
    confidence -= 0.3;
  }

  // Adjust for form submissions
  let formSubmissionCount = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const fromPageId = path[i];
    const toPageId = path[i + 1];

    // Check if edge exists and has submit action
    if (graph.hasEdge(fromPageId, toPageId)) {
      const edgeAttrs = graph.getEdgeAttributes(fromPageId, toPageId) as any;
      if (edgeAttrs.action?.type === 'submit') {
        formSubmissionCount++;
      }
    }
  }

  if (formSubmissionCount > 0) {
    confidence += 0.1; // Bonus for having form submissions
  }

  // Adjust for URL pattern consistency
  const pages = path.map(pageId => graph.getNodeAttributes(pageId));
  const urls = pages.map(p => p.url);
  const hasConsistentPattern = checkUrlPatternConsistency(urls);
  if (hasConsistentPattern) {
    confidence += 0.05;
  }

  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Analyze flow characteristics
 *
 * Extracts:
 * - hasFormSubmission: any submit edge in path
 * - requiresAuth: auth-related keywords or password fields
 * - stepCount: number of pages in path
 * - commonKeywords: keywords from page titles
 */
export function analyzeFlowCharacteristics(
  path: string[],
  graph: Graph<PageState, Transition>
): FlowCharacteristics {
  const pages = path.map(pageId => graph.getNodeAttributes(pageId));

  // Check for form submissions in edges
  let hasFormSubmission = false;
  for (let i = 0; i < path.length - 1; i++) {
    const fromPageId = path[i];
    const toPageId = path[i + 1];

    if (graph.hasEdge(fromPageId, toPageId)) {
      const edgeAttrs = graph.getEdgeAttributes(fromPageId, toPageId) as any;
      if (edgeAttrs.action?.type === 'submit') {
        hasFormSubmission = true;
        break;
      }
    }
  }

  // Check if requires auth
  const requiresAuth = pages.some(p =>
    /login|sign-?in|authenticate|auth/i.test(p.title) ||
    /login|sign-?in|auth/i.test(p.url) ||
    p.formElements.some(selector => /password|pwd/i.test(selector))
  );

  // Extract common keywords from titles
  const allKeywords: string[] = [];
  for (const page of pages) {
    const titleWords = page.title
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3); // Filter short words
    allKeywords.push(...titleWords);
  }

  // Count keyword frequency
  const keywordFrequency = new Map<string, number>();
  for (const keyword of allKeywords) {
    keywordFrequency.set(keyword, (keywordFrequency.get(keyword) || 0) + 1);
  }

  // Get keywords that appear in multiple pages
  const commonKeywords = Array.from(keywordFrequency.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) // Top 5 keywords
    .map(([keyword]) => keyword);

  return {
    hasFormSubmission,
    requiresAuth,
    stepCount: path.length,
    commonKeywords,
  };
}

/**
 * Check if URLs follow a consistent pattern
 * e.g., /checkout/step-1, /checkout/step-2, /checkout/step-3
 */
function checkUrlPatternConsistency(urls: string[]): boolean {
  if (urls.length < 2) return false;

  try {
    const paths = urls.map(url => new URL(url).pathname);

    // Extract common prefix
    let commonPrefix = paths[0];
    for (const path of paths) {
      while (!path.startsWith(commonPrefix) && commonPrefix.length > 0) {
        commonPrefix = commonPrefix.slice(0, -1);
      }
    }

    // If common prefix covers at least 50% of first path, consider consistent
    return commonPrefix.length >= paths[0].length * 0.5;
  } catch {
    return false;
  }
}
