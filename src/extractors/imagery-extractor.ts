/**
 * Imagery token extractor (TOKEN-08)
 *
 * Detects aspect ratios, treatment styles, and object-fit conventions
 */

import type { Page } from 'playwright';
import type { ImageryToken } from '../types/index.js';

/**
 * Extract imagery tokens from a page
 * Analyzes content images (excluding icons) for aspect ratios and treatments
 */
export async function extractImageryTokens(page: Page, pageUrl: string): Promise<ImageryToken[]> {
  const timestamp = new Date().toISOString();

  const tokens = await page.evaluate((args) => {
    const { url, timestamp } = args;
    const imageryTokens: ImageryToken[] = [];
    const seen = new Set<string>();

    // Helper to simplify aspect ratio to common formats
    const simplifyAspectRatio = (width: number, height: number): string => {
      if (width === 0 || height === 0) {
        return '1:1';
      }

      const ratio = width / height;

      // Common aspect ratios with tolerance
      const commonRatios: { [key: string]: number } = {
        '1:1': 1.0,
        '4:3': 4 / 3,
        '3:2': 3 / 2,
        '16:9': 16 / 9,
        '21:9': 21 / 9,
        '3:4': 3 / 4,
        '2:3': 2 / 3,
        '9:16': 9 / 16,
      };

      const tolerance = 0.05;

      for (const [name, value] of Object.entries(commonRatios)) {
        if (Math.abs(ratio - value) < tolerance) {
          return name;
        }
      }

      // Return calculated ratio as "width:height" with simplified integers
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(Math.round(width), Math.round(height));
      const w = Math.round(width / divisor);
      const h = Math.round(height / divisor);
      return `${w}:${h}`;
    };

    // Helper to detect image treatment from styles
    const detectTreatment = (element: HTMLElement, width: number, height: number): string => {
      const computedStyle = window.getComputedStyle(element);
      const borderRadius = computedStyle.borderRadius;
      const clipPath = computedStyle.clipPath;

      // Check for masked
      if (clipPath && clipPath !== 'none') {
        return 'masked';
      }

      // Check for circular (borderRadius > 50% of min dimension)
      if (borderRadius && borderRadius !== '0px') {
        const radiusValue = parseFloat(borderRadius);
        const minDimension = Math.min(width, height);
        if (radiusValue >= minDimension / 2) {
          return 'circular';
        }
        if (radiusValue > 0) {
          return 'rounded';
        }
      }

      return 'rectangular';
    };

    // Helper to create unique key for deduplication
    const createKey = (aspectRatio: string, treatment: string): string => {
      return `${aspectRatio}:${treatment}`;
    };

    // 1. Analyze content images
    const images = document.querySelectorAll('img');

    for (const img of images) {
      const src = img.getAttribute('src') || '';
      const rect = img.getBoundingClientRect();

      // Exclude icons (images with "icon" in src or < 64px on either dimension)
      const isIconBySrc = src.includes('icon') || src.includes('/icons/');
      const isIconBySize = img.naturalWidth <= 64 || img.naturalHeight <= 64;

      if (isIconBySrc || isIconBySize) {
        continue; // Skip icons
      }

      // Skip hidden images
      if (rect.width === 0 || rect.height === 0) {
        continue;
      }

      // Use rendered dimensions
      const width = rect.width;
      const height = rect.height;

      // Get aspect ratio
      const aspectRatio = simplifyAspectRatio(width, height);

      // Detect treatment
      const treatment = detectTreatment(img, width, height);

      // Get object-fit
      const computedStyle = window.getComputedStyle(img);
      const objectFit = computedStyle.objectFit || 'fill';

      // Build selector for evidence
      const selector = img.id
        ? `img#${img.id}`
        : img.className
        ? `img.${img.className.split(' ')[0]}`
        : `img[src*="${src.split('/').pop()?.slice(0, 20)}"]`;

      // Create token
      const key = createKey(aspectRatio, treatment);
      if (!seen.has(key)) {
        seen.add(key);
        imageryTokens.push({
          aspectRatio,
          treatment: treatment as 'rounded' | 'circular' | 'rectangular' | 'masked',
          objectFit,
          evidence: [{
            pageUrl: url,
            selector,
            timestamp,
            computedStyles: {
              aspectRatio,
              treatment,
              objectFit,
            },
          }],
        });
      }
    }

    // 2. Check for background images
    const allElements = document.querySelectorAll('*');

    for (const element of allElements) {
      const computedStyle = window.getComputedStyle(element);
      const backgroundImage = computedStyle.backgroundImage;

      if (!backgroundImage || backgroundImage === 'none') {
        continue;
      }

      const rect = element.getBoundingClientRect();

      // Skip hidden elements
      if (rect.width === 0 || rect.height === 0) {
        continue;
      }

      // Skip small elements (likely icons or decorative)
      if (rect.width <= 64 && rect.height <= 64) {
        continue;
      }

      // Get aspect ratio from element dimensions
      const aspectRatio = simplifyAspectRatio(rect.width, rect.height);

      // Detect treatment
      const treatment = detectTreatment(element as HTMLElement, rect.width, rect.height);

      // Get background-size
      const backgroundSize = computedStyle.backgroundSize || 'auto';

      // Build selector
      const htmlElement = element as HTMLElement;
      const selector = htmlElement.id
        ? `#${htmlElement.id}`
        : htmlElement.className
        ? `.${htmlElement.className.split(' ')[0]}`
        : htmlElement.tagName.toLowerCase();

      // Create token
      const key = createKey(aspectRatio, treatment);
      if (!seen.has(key)) {
        seen.add(key);
        imageryTokens.push({
          aspectRatio,
          treatment: treatment as 'rounded' | 'circular' | 'rectangular' | 'masked',
          objectFit: backgroundSize, // Use backgroundSize for background images
          evidence: [{
            pageUrl: url,
            selector,
            timestamp,
            computedStyles: {
              aspectRatio,
              treatment,
              backgroundSize,
            },
          }],
        });
      }
    }

    return imageryTokens;
  }, { url: pageUrl, timestamp });

  return tokens;
}
