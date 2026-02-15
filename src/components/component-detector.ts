/**
 * Component detector orchestrator
 * Scans DOM elements and applies component signatures to identify components
 */

import type { Page } from 'playwright';
import type { DetectedComponent, ElementData } from '../types/components.js';
import type { TokenEvidence } from '../types/evidence.js';
import { ALL_SIGNATURES } from './signatures/index.js';

/**
 * Browser-side script for extracting element data.
 * Defined as a string to prevent esbuild/tsx from injecting __name decorators.
 */
const EXTRACT_ELEMENTS_SCRIPT = `(() => {
  var buildSelector = function(element) {
    if (element.id) {
      return '#' + element.id;
    }
    var path = [];
    var current = element;
    var depth = 0;
    while (current && current !== document.documentElement && depth < 5) {
      var selector = current.tagName.toLowerCase();
      var parent = current.parentElement;
      if (parent) {
        var currentTagName = current.tagName;
        var siblings = Array.from(parent.children).filter(
          function(child) { return child.tagName === currentTagName; }
        );
        if (siblings.length > 1) {
          var index = siblings.indexOf(current) + 1;
          selector += ':nth-child(' + index + ')';
        }
      }
      path.unshift(selector);
      current = parent;
      depth++;
    }
    return path.join(' > ');
  };

  var allElements = Array.from(document.querySelectorAll('*'));
  var visibleElements = allElements
    .filter(function(element) {
      var rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })
    .slice(0, 500);

  var results = [];
  for (var i = 0; i < visibleElements.length; i++) {
    var element = visibleElements[i];
    var styles = window.getComputedStyle(element);

    // Extract attributes
    var attrs = {};
    var attrNames = ['type', 'contenteditable', 'aria-modal', 'aria-expanded', 'aria-haspopup', 'href'];
    for (var j = 0; j < attrNames.length; j++) {
      var attrName = attrNames[j];
      var attrValue = element.getAttribute(attrName);
      if (attrValue !== null) {
        attrs[attrName] = attrValue;
      }
    }

    // Get computed styles
    var computedStyles = {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      border: styles.border,
      borderTopWidth: styles.borderTopWidth,
      borderRadius: styles.borderRadius,
      paddingTop: styles.paddingTop,
      paddingLeft: styles.paddingLeft,
      position: styles.position,
      zIndex: styles.zIndex,
      display: styles.display,
      width: styles.width,
      height: styles.height,
      cursor: styles.cursor
    };

    var textContent = element.textContent ? element.textContent.trim().substring(0, 100) : '';
    var childCount = element.children.length;

    results.push({
      tagName: element.tagName.toLowerCase(),
      role: element.getAttribute('role'),
      computedStyles: computedStyles,
      textContent: textContent,
      hasChildren: childCount > 0,
      childCount: childCount,
      selector: buildSelector(element),
      attributes: attrs
    });
  }
  return results;
})()`;

/**
 * Detect components from a page using signature matching
 * @param page - Playwright page instance
 * @param pageUrl - URL of the page being analyzed
 * @returns Array of detected components with evidence
 */
export async function detectComponents(
  page: Page,
  pageUrl: string
): Promise<DetectedComponent[]> {
  try {
    // Extract element data from page
    const elements = await page.evaluate(EXTRACT_ELEMENTS_SCRIPT) as ElementData[];

    const detected: DetectedComponent[] = [];
    const componentCounts: Record<string, number> = {};

    // Test each element against all signatures
    for (const element of elements) {
      let matchedSignature = null;
      let highestPriority = -1;

      // Find the highest priority signature that matches
      for (const signature of ALL_SIGNATURES) {
        if (signature.match(element)) {
          if (signature.priority > highestPriority) {
            matchedSignature = signature;
            highestPriority = signature.priority;
          }
        }
      }

      // If a signature matched, create a DetectedComponent
      if (matchedSignature) {
        const timestamp = new Date().toISOString();
        const evidence: TokenEvidence[] = [{
          pageUrl,
          selector: element.selector,
          timestamp,
          computedStyles: element.computedStyles
        }];

        detected.push({
          type: matchedSignature.type,
          selector: element.selector,
          element,
          evidence,
          computedStyles: element.computedStyles,
          pageUrl
        });

        // Track counts
        componentCounts[matchedSignature.type] = (componentCounts[matchedSignature.type] || 0) + 1;
      }
    }

    // Log detection results
    console.log(`[Component Detector] Detected ${detected.length} components on ${pageUrl}`);
    for (const [type, count] of Object.entries(componentCounts)) {
      console.log(`  - ${type}: ${count}`);
    }

    return detected;
  } catch (error) {
    console.error('[Component Detector] Error detecting components:', error);
    return [];
  }
}
