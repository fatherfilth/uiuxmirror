/**
 * Icon token extractor (TOKEN-07)
 *
 * Detects SVG stroke vs fill style, stroke weight, and size conventions
 * Icon font detection deferred to Phase 2 per research recommendation
 */

import type { Page } from 'playwright';
import type { IconToken } from '../types/index.js';

/**
 * Browser-side script for icon extraction.
 * Defined as string to avoid esbuild __name decorator injection in browser context.
 */
const ICON_EXTRACT_SCRIPT = `((args) => {
  var url = args.url;
  var timestamp = args.timestamp;
  var iconTokens = [];
  var seen = {};

  var createKey = function(style, size, strokeWeight) {
    return style + ':' + size + ':' + (strokeWeight || 'none');
  };

  // 1. Analyze inline SVG elements
  var svgs = document.querySelectorAll('svg');
  for (var i = 0; i < svgs.length; i++) {
    var svg = svgs[i];
    var rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    var hasStroke = false;
    var hasFill = false;
    var paths = svg.querySelectorAll('path, circle, rect, polygon, polyline, line, ellipse');
    for (var j = 0; j < paths.length; j++) {
      var shape = paths[j];
      var cs = window.getComputedStyle(shape);
      var stroke = shape.getAttribute('stroke') || cs.stroke;
      var fill = shape.getAttribute('fill') || cs.fill;
      if (stroke && stroke !== 'none') hasStroke = true;
      if (fill && fill !== 'none') hasFill = true;
    }

    var style = hasStroke && hasFill ? 'mixed' : hasStroke ? 'stroke' : 'fill';

    var strokeWeight = undefined;
    if (hasStroke) {
      var firstPath = svg.querySelector('path, circle, rect, polygon, polyline, line, ellipse');
      if (firstPath) {
        var fcs = window.getComputedStyle(firstPath);
        var strokeWidthAttr = firstPath.getAttribute('stroke-width');
        var strokeWidth = strokeWidthAttr || fcs.strokeWidth;
        if (strokeWidth && strokeWidth !== 'none') {
          strokeWeight = parseFloat(strokeWidth);
        }
      }
    }

    var sizePixels = Math.max(rect.width, rect.height);
    var viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      var parts = viewBox.split(/\\s+/);
      if (parts.length === 4) {
        var vbWidth = parseFloat(parts[2]);
        var vbHeight = parseFloat(parts[3]);
        if (!isNaN(vbWidth) && !isNaN(vbHeight)) {
          if (rect.width > 100 || rect.height > 100) {
            sizePixels = Math.max(vbWidth, vbHeight);
          }
        }
      }
    }

    var selector = svg.id
      ? 'svg#' + svg.id
      : 'svg[viewBox="' + (svg.getAttribute('viewBox') || '') + '"]';

    var key = createKey(style, sizePixels, strokeWeight);
    if (!seen[key]) {
      seen[key] = true;
      iconTokens.push({
        style: style,
        strokeWeight: strokeWeight,
        sizePixels: sizePixels,
        format: 'svg-inline',
        evidence: [{
          pageUrl: url,
          selector: selector,
          timestamp: timestamp,
          computedStyles: {
            'icon-style': style,
            'icon-size': sizePixels + 'px'
          }
        }]
      });
    }
  }

  // 2. Analyze icon images
  var images = document.querySelectorAll('img');
  for (var k = 0; k < images.length; k++) {
    var img = images[k];
    var src = img.getAttribute('src') || '';
    var imgRect = img.getBoundingClientRect();

    var isIconBySrc = src.indexOf('icon') !== -1 || src.indexOf('/icons/') !== -1;
    var isIconBySize = img.naturalWidth <= 64 || img.naturalHeight <= 64;
    if (!isIconBySrc && !isIconBySize) continue;
    if (imgRect.width === 0 || imgRect.height === 0) continue;

    var imgSize = Math.max(img.naturalWidth || imgRect.width, img.naturalHeight || imgRect.height);
    var format = src.endsWith('.svg') ? 'svg-img' : 'img';

    var imgSelector = img.id
      ? 'img#' + img.id
      : img.className
      ? 'img.' + img.className.split(' ')[0]
      : 'img[src*="' + (src.split('/').pop() || '').slice(0, 20) + '"]';

    var imgKey = createKey('fill', imgSize);
    if (!seen[imgKey]) {
      seen[imgKey] = true;
      iconTokens.push({
        style: 'fill',
        sizePixels: imgSize,
        format: format,
        evidence: [{
          pageUrl: url,
          selector: imgSelector,
          timestamp: timestamp,
          computedStyles: {
            'icon-format': format,
            'icon-size': imgSize + 'px'
          }
        }]
      });
    }
  }

  return iconTokens;
})`;

/**
 * Extract icon tokens from a page
 * Analyzes inline SVGs and icon images
 */
export async function extractIconTokens(page: Page, pageUrl: string): Promise<IconToken[]> {
  try {
    const timestamp = new Date().toISOString();
    // Interpolate args into script string to avoid arg-passing issues with string evaluate
    const script = ICON_EXTRACT_SCRIPT + `(${JSON.stringify({ url: pageUrl, timestamp })})`;
    const tokens = await page.evaluate(script);
    return (tokens as IconToken[]) || [];
  } catch (error) {
    // Graceful failure - return empty array
    return [];
  }
}
