/**
 * State-flow graph builder for UIUX-Mirror
 * Phase 4: Constructs directed graph from crawled page data
 */

import Graph from 'graphology';
import type { PageData } from '../types/crawl-config.js';
import type { PageState, Transition, TransitionAction } from '../types/patterns.js';

/**
 * Extracted page elements from HTML content
 */
interface PageElements {
  formElements: string[];
  interactiveElements: string[];
  links: Array<{ href: string; selector: string }>;
  forms: Array<{ action?: string; method?: string; selector: string }>;
}

/**
 * Build state-flow graph from crawled pages
 *
 * Creates a directed Graphology graph where:
 * - Nodes = page states (URL, title, forms, interactive elements)
 * - Edges = transitions (clicks, form submissions)
 *
 * Navigation links appearing on >80% of pages are marked as universal nav (not flow edges)
 */
export function buildStateFlowGraph(
  pages: PageData[],
  htmlContents: Map<string, string>
): Graph<PageState, Transition> {
  const graph = new Graph<PageState, Transition>({ type: 'directed' });

  // Track link frequency across pages for navigation filtering
  const linkFrequency = new Map<string, number>();
  const totalPages = pages.length;

  // First pass: extract elements and track link frequency
  const pageElementsMap = new Map<string, PageElements>();

  for (const page of pages) {
    const htmlContent = htmlContents.get(page.url) || '';
    const elements = extractPageElements(htmlContent);
    pageElementsMap.set(page.url, elements);

    // Track link frequency
    for (const link of elements.links) {
      linkFrequency.set(link.href, (linkFrequency.get(link.href) || 0) + 1);
    }
  }

  // Calculate navigation threshold (80% of pages)
  const navThreshold = totalPages * 0.8;
  const universalNavLinks = new Set(
    Array.from(linkFrequency.entries())
      .filter(([_, count]) => count >= navThreshold)
      .map(([href]) => href)
  );

  // Second pass: add nodes to graph
  for (const page of pages) {
    const elements = pageElementsMap.get(page.url)!;
    const pageId = generatePageId(page.url);
    const evidenceId = `${page.timestamp}-${hashUrl(page.url)}`;

    const state: PageState = {
      url: page.url,
      pageId,
      title: page.title,
      formElements: elements.formElements,
      interactiveElements: elements.interactiveElements,
      evidenceId,
    };

    graph.addNode(pageId, state);
  }

  // Third pass: add edges for transitions
  for (const page of pages) {
    const elements = pageElementsMap.get(page.url)!;
    const fromPageId = generatePageId(page.url);
    const baseUrl = new URL(page.url);

    // Add edges for link navigation
    for (const link of elements.links) {
      const resolvedUrl = resolveUrl(baseUrl.href, link.href);
      const toPageId = generatePageId(resolvedUrl);

      // Only add edge if target page exists in graph
      if (graph.hasNode(toPageId)) {
        const isNavigation = universalNavLinks.has(link.href);
        const action: TransitionAction = {
          type: 'click',
          selector: link.selector,
        };

        const transition: Transition = {
          fromState: fromPageId,
          toState: toPageId,
          action,
          evidence: {
            pageUrl: page.url,
            timestamp: page.timestamp,
            screenshotPath: page.screenshotPath,
          },
        };

        // Add edge with navigation flag in attributes
        try {
          graph.addDirectedEdge(fromPageId, toPageId, {
            ...transition,
            isNavigation,
          } as any);
        } catch (err) {
          // Edge might already exist, skip
        }
      }
    }

    // Add edges for form submissions
    for (const form of elements.forms) {
      const formAction = form.action || page.url; // Default to current page if no action
      const resolvedUrl = resolveUrl(baseUrl.href, formAction);
      const toPageId = generatePageId(resolvedUrl);

      if (graph.hasNode(toPageId)) {
        const action: TransitionAction = {
          type: 'submit',
          selector: form.selector,
          method: (form.method?.toUpperCase() as 'GET' | 'POST') || 'POST',
        };

        const transition: Transition = {
          fromState: fromPageId,
          toState: toPageId,
          action,
          evidence: {
            pageUrl: page.url,
            timestamp: page.timestamp,
            screenshotPath: page.screenshotPath,
          },
        };

        try {
          graph.addDirectedEdge(fromPageId, toPageId, {
            ...transition,
            isNavigation: false,
          } as any);
        } catch (err) {
          // Edge might already exist, skip
        }
      }
    }
  }

  return graph;
}

/**
 * Extract page elements from HTML content
 * Uses simple regex/string extraction - no full DOM parser needed
 */
function extractPageElements(htmlContent: string): PageElements {
  const formElements: string[] = [];
  const interactiveElements: string[] = [];
  const links: Array<{ href: string; selector: string }> = [];
  const forms: Array<{ action?: string; method?: string; selector: string }> = [];

  // Extract form elements
  const inputMatches = htmlContent.matchAll(/<input[^>]*>/gi);
  for (const match of inputMatches) {
    const inputHtml = match[0];
    const nameMatch = inputHtml.match(/name=["']([^"']+)["']/i);
    const typeMatch = inputHtml.match(/type=["']([^"']+)["']/i);
    const name = nameMatch ? nameMatch[1] : 'unknown';
    const type = typeMatch ? typeMatch[1] : 'text';
    formElements.push(`input[name="${name}"][type="${type}"]`);
  }

  const selectMatches = htmlContent.matchAll(/<select[^>]*name=["']([^"']+)["'][^>]*>/gi);
  for (const match of selectMatches) {
    formElements.push(`select[name="${match[1]}"]`);
  }

  const textareaMatches = htmlContent.matchAll(/<textarea[^>]*name=["']([^"']+)["'][^>]*>/gi);
  for (const match of textareaMatches) {
    formElements.push(`textarea[name="${match[1]}"]`);
  }

  // Extract links
  const linkMatches = htmlContent.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi);
  for (const match of linkMatches) {
    const href = match[1];
    // Skip anchors, javascript:, mailto:, tel:
    if (href && !href.startsWith('#') && !href.startsWith('javascript:') &&
        !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      links.push({
        href,
        selector: `a[href="${href}"]`,
      });
    }
  }

  // Extract buttons
  const buttonMatches = htmlContent.matchAll(/<button[^>]*>/gi);
  let buttonIndex = 0;
  for (const _ of buttonMatches) {
    interactiveElements.push(`button:nth-of-type(${buttonIndex + 1})`);
    buttonIndex++;
  }

  // Extract forms
  const formMatches = htmlContent.matchAll(/<form[^>]*>/gi);
  let formIndex = 0;
  for (const match of formMatches) {
    const formHtml = match[0];
    const actionMatch = formHtml.match(/action=["']([^"']+)["']/i);
    const methodMatch = formHtml.match(/method=["']([^"']+)["']/i);

    forms.push({
      action: actionMatch ? actionMatch[1] : undefined,
      method: methodMatch ? methodMatch[1] : undefined,
      selector: `form:nth-of-type(${formIndex + 1})`,
    });
    formIndex++;
  }

  return {
    formElements,
    interactiveElements,
    links,
    forms,
  };
}

/**
 * Resolve relative URL against base URL
 */
function resolveUrl(base: string, relative: string): string {
  try {
    const resolved = new URL(relative, base);
    // Normalize by removing hash and trailing slash
    return resolved.origin + resolved.pathname.replace(/\/$/, '') + resolved.search;
  } catch {
    // Invalid URL, return as-is
    return relative;
  }
}

/**
 * Generate deterministic page ID from URL
 * Uses pathname + search params hash
 */
function generatePageId(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, '') || '/';
    const search = parsed.search;
    return hashUrl(path + search);
  } catch {
    // Invalid URL, use raw hash
    return hashUrl(url);
  }
}

/**
 * Simple hash function for URLs
 */
function hashUrl(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
