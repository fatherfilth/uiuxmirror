/**
 * Imagery token extractor (TOKEN-08)
 *
 * Detects aspect ratios, treatment styles, and object-fit conventions
 */

import type { Page } from 'playwright';
import type { ImageryToken } from '../types/index.js';

/**
 * Browser-side script for imagery extraction.
 * Defined as string to avoid esbuild __name decorator injection in browser context.
 */
const IMAGERY_EXTRACT_SCRIPT = `((args) => {
  var url = args.url;
  var timestamp = args.timestamp;
  var imageryTokens = [];
  var seen = {};

  var simplifyAspectRatio = function(width, height) {
    if (width === 0 || height === 0) return '1:1';
    var ratio = width / height;
    var commonRatios = {
      '1:1': 1.0, '4:3': 4/3, '3:2': 3/2, '16:9': 16/9, '21:9': 21/9,
      '3:4': 3/4, '2:3': 2/3, '9:16': 9/16
    };
    var tolerance = 0.05;
    var names = Object.keys(commonRatios);
    for (var i = 0; i < names.length; i++) {
      if (Math.abs(ratio - commonRatios[names[i]]) < tolerance) return names[i];
    }
    var gcd = function(a, b) { return b === 0 ? a : gcd(b, a % b); };
    var divisor = gcd(Math.round(width), Math.round(height));
    return Math.round(width / divisor) + ':' + Math.round(height / divisor);
  };

  var detectTreatment = function(element, width, height) {
    var cs = window.getComputedStyle(element);
    var clipPath = cs.clipPath;
    if (clipPath && clipPath !== 'none') return 'masked';
    var borderRadius = cs.borderRadius;
    if (borderRadius && borderRadius !== '0px') {
      var radiusValue = parseFloat(borderRadius);
      var minDimension = Math.min(width, height);
      if (radiusValue >= minDimension / 2) return 'circular';
      if (radiusValue > 0) return 'rounded';
    }
    return 'rectangular';
  };

  var createKey = function(aspectRatio, treatment) {
    return aspectRatio + ':' + treatment;
  };

  // 1. Analyze content images
  var images = document.querySelectorAll('img');
  for (var i = 0; i < images.length; i++) {
    var img = images[i];
    var src = img.getAttribute('src') || '';
    var rect = img.getBoundingClientRect();

    var isIconBySrc = src.indexOf('icon') !== -1 || src.indexOf('/icons/') !== -1;
    var isIconBySize = img.naturalWidth <= 64 || img.naturalHeight <= 64;
    if (isIconBySrc || isIconBySize) continue;
    if (rect.width === 0 || rect.height === 0) continue;

    var width = rect.width;
    var height = rect.height;
    var aspectRatio = simplifyAspectRatio(width, height);
    var treatment = detectTreatment(img, width, height);
    var cs = window.getComputedStyle(img);
    var objectFit = cs.objectFit || 'fill';

    var selector = img.id
      ? 'img#' + img.id
      : img.className
      ? 'img.' + img.className.split(' ')[0]
      : 'img[src*="' + (src.split('/').pop() || '').slice(0, 20) + '"]';

    var key = createKey(aspectRatio, treatment);
    if (!seen[key]) {
      seen[key] = true;
      imageryTokens.push({
        aspectRatio: aspectRatio,
        treatment: treatment,
        objectFit: objectFit,
        evidence: [{
          pageUrl: url,
          selector: selector,
          timestamp: timestamp,
          computedStyles: { aspectRatio: aspectRatio, treatment: treatment, objectFit: objectFit }
        }]
      });
    }
  }

  // 2. Check for background images
  var allElements = document.querySelectorAll('*');
  for (var j = 0; j < allElements.length; j++) {
    var element = allElements[j];
    var elCS = window.getComputedStyle(element);
    var backgroundImage = elCS.backgroundImage;
    if (!backgroundImage || backgroundImage === 'none') continue;

    var elRect = element.getBoundingClientRect();
    if (elRect.width === 0 || elRect.height === 0) continue;
    if (elRect.width <= 64 && elRect.height <= 64) continue;

    var bgAspectRatio = simplifyAspectRatio(elRect.width, elRect.height);
    var bgTreatment = detectTreatment(element, elRect.width, elRect.height);
    var backgroundSize = elCS.backgroundSize || 'auto';

    var elSelector = element.id
      ? '#' + element.id
      : element.className
      ? '.' + element.className.split(' ')[0]
      : element.tagName.toLowerCase();

    var bgKey = createKey(bgAspectRatio, bgTreatment);
    if (!seen[bgKey]) {
      seen[bgKey] = true;
      imageryTokens.push({
        aspectRatio: bgAspectRatio,
        treatment: bgTreatment,
        objectFit: backgroundSize,
        evidence: [{
          pageUrl: url,
          selector: elSelector,
          timestamp: timestamp,
          computedStyles: { aspectRatio: bgAspectRatio, treatment: bgTreatment, backgroundSize: backgroundSize }
        }]
      });
    }
  }

  return imageryTokens;
})`;

/**
 * Extract imagery tokens from a page
 * Analyzes content images (excluding icons) for aspect ratios and treatments
 */
export async function extractImageryTokens(page: Page, pageUrl: string): Promise<ImageryToken[]> {
  try {
    const timestamp = new Date().toISOString();
    // Interpolate args into script string to avoid arg-passing issues with string evaluate
    const script = IMAGERY_EXTRACT_SCRIPT + `(${JSON.stringify({ url: pageUrl, timestamp })})`;
    const tokens = await page.evaluate(script);
    return (tokens as ImageryToken[]) || [];
  } catch (error) {
    // Graceful failure - return empty array
    return [];
  }
}
