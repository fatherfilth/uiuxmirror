/**
 * Motion/animation token extractor (TOKEN-06)
 *
 * Extracts transition durations, easing functions, and animation keyframe names
 */

import type { Page } from 'playwright';
import type { MotionToken } from '../types/index.js';
import { getAllVisibleElements } from './shared/index.js';

/**
 * Extract motion tokens from a page
 * Captures transition durations, easing functions, and animation keyframes
 */
export async function extractMotionTokens(page: Page, pageUrl: string): Promise<MotionToken[]> {
  const elements = await getAllVisibleElements(page);
  const tokenMap = new Map<string, MotionToken>();
  const timestamp = new Date().toISOString();

  // Helper to add or merge tokens
  const addToken = (key: string, token: MotionToken) => {
    if (!tokenMap.has(key)) {
      tokenMap.set(key, token);
    } else {
      // Add evidence to existing token
      tokenMap.get(key)!.evidence.push(...token.evidence);
    }
  };

  // Extract from element computed styles
  for (const element of elements) {
    const transitionDuration = element.computedStyles.transitionDuration;
    const transitionTimingFunction = element.computedStyles.transitionTimingFunction;
    const animationDuration = element.computedStyles.animationDuration;
    const animationTimingFunction = element.computedStyles.animationTimingFunction;
    const animationName = element.computedStyles.animationName;

    // Extract transition durations
    if (transitionDuration && transitionDuration !== '0s') {
      const durationMs = parseDurationToMs(transitionDuration);
      if (durationMs !== null) {
        const key = `duration:${durationMs}`;
        addToken(key, {
          property: 'duration',
          value: transitionDuration,
          durationMs,
          evidence: [{
            pageUrl,
            selector: element.selector,
            timestamp,
            computedStyles: {
              transitionDuration,
            },
          }],
        });
      }
    }

    // Extract transition easing
    if (transitionTimingFunction && transitionTimingFunction !== 'ease') {
      const key = `easing:${transitionTimingFunction}`;
      addToken(key, {
        property: 'easing',
        value: transitionTimingFunction,
        evidence: [{
          pageUrl,
          selector: element.selector,
          timestamp,
          computedStyles: {
            transitionTimingFunction,
          },
        }],
      });
    }

    // Extract animation durations
    if (animationDuration && animationDuration !== '0s') {
      const durationMs = parseDurationToMs(animationDuration);
      if (durationMs !== null) {
        const key = `duration:${durationMs}`;
        addToken(key, {
          property: 'duration',
          value: animationDuration,
          durationMs,
          evidence: [{
            pageUrl,
            selector: element.selector,
            timestamp,
            computedStyles: {
              animationDuration,
            },
          }],
        });
      }
    }

    // Extract animation easing
    if (animationTimingFunction && animationTimingFunction !== 'ease') {
      const key = `easing:${animationTimingFunction}`;
      addToken(key, {
        property: 'easing',
        value: animationTimingFunction,
        evidence: [{
          pageUrl,
          selector: element.selector,
          timestamp,
          computedStyles: {
            animationTimingFunction,
          },
        }],
      });
    }

    // Extract animation keyframe names
    if (animationName && animationName !== 'none') {
      const key = `keyframe:${animationName}`;
      addToken(key, {
        property: 'keyframe',
        value: animationName,
        evidence: [{
          pageUrl,
          selector: element.selector,
          timestamp,
          computedStyles: {
            animationName,
          },
        }],
      });
    }
  }

  // Also scan stylesheets for @keyframes rules
  const keyframeNames = await page.evaluate(() => {
    const keyframes: string[] = [];
    try {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSKeyframesRule) {
              keyframes.push(rule.name);
            }
          }
        } catch (e) {
          // Cross-origin stylesheet, skip
        }
      }
    } catch (e) {
      // Error accessing stylesheets
    }
    return keyframes;
  });

  // Add keyframe names from stylesheets
  for (const name of keyframeNames) {
    const key = `keyframe:${name}`;
    if (!tokenMap.has(key)) {
      addToken(key, {
        property: 'keyframe',
        value: name,
        evidence: [{
          pageUrl,
          selector: '@keyframes',
          timestamp,
          computedStyles: {
            animationName: name,
          },
        }],
      });
    }
  }

  return Array.from(tokenMap.values());
}

/**
 * Parse CSS duration value to milliseconds
 * Handles "0.3s" -> 300, "300ms" -> 300
 */
function parseDurationToMs(duration: string): number | null {
  const trimmed = duration.trim();

  // Handle seconds
  const secondsMatch = trimmed.match(/^([\d.]+)s$/);
  if (secondsMatch) {
    return parseFloat(secondsMatch[1]) * 1000;
  }

  // Handle milliseconds
  const msMatch = trimmed.match(/^([\d.]+)ms$/);
  if (msMatch) {
    return parseFloat(msMatch[1]);
  }

  return null;
}
