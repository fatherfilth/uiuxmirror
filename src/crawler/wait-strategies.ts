/**
 * Framework detection and dynamic content wait strategies for UIUX-Mirror
 * Implements CRAWL-04: Dynamic content handling for modern web frameworks
 */

import type { Page } from 'playwright';
import type { Framework, CssInJsLibrary } from '../types/crawl-config.js';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('wait-strategies');

/**
 * Detect the frontend framework used by the page
 * @param page - Playwright Page object
 * @returns Detected framework or 'unknown'
 */
export async function detectFramework(page: Page): Promise<Framework> {
  try {
    // @ts-ignore - This code runs in browser context, DOM types are available there
    const framework = await page.evaluate(() => {
      // React detection
      if (
        (window as any).__NEXT_DATA__ ||
        (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
        document.querySelector('[data-reactroot]')
      ) {
        return 'react';
      }

      // Vue detection
      if (
        (window as any).__NUXT__ ||
        (window as any).$nuxt ||
        (window as any).__VUE__
      ) {
        return 'vue';
      }

      // Angular detection
      if ((window as any).ng || document.querySelector('[ng-version]')) {
        return 'angular';
      }

      // Svelte detection
      if (document.querySelector('[class*="svelte-"]')) {
        return 'svelte';
      }

      return 'unknown';
    }) as Framework;

    logger.debug(`Detected framework: ${framework}`);
    return framework;
  } catch (error) {
    logger.warn('Error detecting framework', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 'unknown';
  }
}

/**
 * Detect CSS-in-JS library used by the page
 * @param page - Playwright Page object
 * @returns Detected CSS-in-JS library or 'none'
 */
export async function detectCSSInJSLibrary(page: Page): Promise<CssInJsLibrary> {
  try {
    // @ts-ignore - This code runs in browser context, DOM types are available there
    const cssInJs = await page.evaluate(() => {
      // Emotion detection
      if (document.querySelector('style[data-emotion]')) {
        return 'emotion';
      }

      // styled-components detection
      if (
        document.querySelector('style[data-styled]') ||
        Array.from(document.querySelectorAll('*')).some(
          (el) => (el as HTMLElement).className && /^sc-/.test((el as HTMLElement).className)
        )
      ) {
        return 'styled-components';
      }

      // Stitches detection
      if (document.querySelector('style[data-stitches]')) {
        return 'stitches';
      }

      return 'none';
    }) as CssInJsLibrary;

    if (cssInJs !== 'none') {
      logger.debug(`Detected CSS-in-JS library: ${cssInJs}`);
    }

    return cssInJs;
  } catch (error) {
    logger.warn('Error detecting CSS-in-JS library', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 'none';
  }
}

/**
 * Wait for framework-specific hydration to complete
 * @param page - Playwright Page object
 * @param framework - Detected framework
 */
async function waitForFrameworkHydration(page: Page, framework: Framework): Promise<void> {
  if (framework === 'unknown') {
    return; // No framework-specific wait needed
  }

  try {
    switch (framework) {
      case 'react':
        // Wait for Next.js hydration or general React readiness
        // @ts-ignore - This code runs in browser context, DOM types are available there
        await page.waitForFunction(
          () => {
            const nextData = (window as any).__NEXT_DATA__;
            // If Next.js, check hydration status
            if (nextData) {
              return nextData.hydrated !== false;
            }
            // For other React apps, check for React DevTools hook
            return !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
          },
          { timeout: 5000 }
        ).catch(() => {});
        logger.debug('React hydration complete');
        break;

      case 'vue':
        // Wait for Vue/Nuxt hydration
        // @ts-ignore - This code runs in browser context, DOM types are available there
        await page.waitForFunction(
          () => {
            const nuxt = (window as any).__NUXT__;
            if (nuxt) {
              return nuxt.isHydrating === false;
            }
            // For other Vue apps, check for data-v-app or mounted flag
            return !!document.querySelector('[data-v-app]') || !!(window as any).__VUE__;
          },
          { timeout: 5000 }
        ).catch(() => {});
        logger.debug('Vue hydration complete');
        break;

      case 'angular':
        // Wait for Angular zone to be stable
        await page.waitForSelector('[ng-version]', { timeout: 5000 });
        await page.waitForTimeout(500); // Additional buffer for Angular zone stability
        logger.debug('Angular hydration complete');
        break;

      case 'svelte':
        // Svelte doesn't have a specific hydration flag, just wait a bit
        await page.waitForTimeout(500);
        logger.debug('Svelte content ready');
        break;
    }
  } catch (error) {
    // Timeout or error - log and continue
    logger.warn(`Framework hydration wait timed out for ${framework}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Wait for CSS-in-JS style injection to complete
 * @param page - Playwright Page object
 */
async function waitForStyleInjection(page: Page): Promise<void> {
  try {
    // @ts-ignore - This code runs in browser context, DOM types are available there
    await page.waitForFunction(
      () => {
        // Check for CSS-in-JS specific style tags
        if (
          document.querySelector('style[data-emotion]') ||
          document.querySelector('style[data-styled]') ||
          document.querySelector('style[data-stitches]')
        ) {
          return true;
        }

        // Fallback: check if any stylesheets are loaded
        return document.styleSheets.length > 0;
      },
      { timeout: 3000 }
    ).catch(() => {});
    logger.debug('Style injection complete');
  } catch (error) {
    // Timeout is okay - site may not use CSS-in-JS
    logger.debug('No CSS-in-JS detected or style injection timed out');
  }
}

/**
 * Orchestrate all wait strategies to ensure content is fully ready
 * @param page - Playwright Page object
 * @returns Detected framework and CSS-in-JS library
 */
export async function waitForContentReady(
  page: Page
): Promise<{ framework: Framework; cssInJsLibrary: CssInJsLibrary }> {
  try {
    // Step 1: Wait for network idle
    logger.debug('Waiting for network idle...');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch (error) {
    logger.warn('Network idle timeout - continuing anyway', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Step 2: Detect framework
  const framework = await detectFramework(page);

  // Step 3: Wait for framework-specific hydration
  await waitForFrameworkHydration(page, framework);

  // Step 4: Detect CSS-in-JS library
  const cssInJsLibrary = await detectCSSInJSLibrary(page);

  // Step 5: Wait for style injection
  await waitForStyleInjection(page);

  // Step 6: Additional buffer for final style calculations
  await page.waitForTimeout(200);

  logger.debug(
    `Content ready - Framework: ${framework}, CSS-in-JS: ${cssInJsLibrary}`
  );

  return { framework, cssInJsLibrary };
}
