/**
 * Icon token extractor (TOKEN-07)
 *
 * Detects SVG stroke vs fill style, stroke weight, and size conventions
 * Icon font detection deferred to Phase 2 per research recommendation
 */

import type { Page } from 'playwright';
import type { IconToken } from '../types/index.js';

/**
 * Extract icon tokens from a page
 * Analyzes inline SVGs and icon images
 */
export async function extractIconTokens(page: Page, pageUrl: string): Promise<IconToken[]> {
  const timestamp = new Date().toISOString();

  const tokens = await page.evaluate((args) => {
    const { url, timestamp } = args;
    const iconTokens: IconToken[] = [];
    const seen = new Set<string>();

    // Helper to create unique key for deduplication
    const createKey = (style: string, size: number, strokeWeight?: number): string => {
      return `${style}:${size}:${strokeWeight || 'none'}`;
    };

    // 1. Analyze inline SVG elements
    const svgs = document.querySelectorAll('svg');

    for (const svg of svgs) {
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        continue; // Skip hidden SVGs
      }

      // Determine SVG style: stroke, fill, or mixed
      let hasStroke = false;
      let hasFill = false;

      const paths = svg.querySelectorAll('path, circle, rect, polygon, polyline, line, ellipse');
      for (const shape of paths) {
        const computedStyle = window.getComputedStyle(shape);
        const stroke = shape.getAttribute('stroke') || computedStyle.stroke;
        const fill = shape.getAttribute('fill') || computedStyle.fill;

        if (stroke && stroke !== 'none') {
          hasStroke = true;
        }
        if (fill && fill !== 'none') {
          hasFill = true;
        }
      }

      const style = hasStroke && hasFill ? 'mixed' : hasStroke ? 'stroke' : 'fill';

      // Get stroke weight (if stroke-based)
      let strokeWeight: number | undefined;
      if (hasStroke) {
        const firstPath = svg.querySelector('path, circle, rect, polygon, polyline, line, ellipse');
        if (firstPath) {
          const computedStyle = window.getComputedStyle(firstPath);
          const strokeWidthAttr = firstPath.getAttribute('stroke-width');
          const strokeWidth = strokeWidthAttr || computedStyle.strokeWidth;
          if (strokeWidth && strokeWidth !== 'none') {
            strokeWeight = parseFloat(strokeWidth);
          }
        }
      }

      // Get size from SVG dimensions or viewBox
      let sizePixels = Math.max(rect.width, rect.height);

      // Try to get native size from viewBox if available
      const viewBox = svg.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.split(/\s+/);
        if (parts.length === 4) {
          const vbWidth = parseFloat(parts[2]);
          const vbHeight = parseFloat(parts[3]);
          if (!isNaN(vbWidth) && !isNaN(vbHeight)) {
            // Use viewBox size if rendered size seems arbitrary (e.g., 100% width)
            if (rect.width > 100 || rect.height > 100) {
              sizePixels = Math.max(vbWidth, vbHeight);
            }
          }
        }
      }

      // Build selector for evidence
      const selector = svg.id
        ? `svg#${svg.id}`
        : `svg[viewBox="${svg.getAttribute('viewBox') || ''}"]`;

      // Create token
      const key = createKey(style, sizePixels, strokeWeight);
      if (!seen.has(key)) {
        seen.add(key);
        iconTokens.push({
          style: style as 'stroke' | 'fill' | 'mixed',
          strokeWeight,
          sizePixels,
          format: 'svg-inline',
          evidence: [{
            pageUrl: url,
            selector,
            timestamp,
            computedStyles: {
              'icon-style': style,
              'icon-size': `${sizePixels}px`,
            },
          }],
        });
      }
    }

    // 2. Analyze icon images
    // Heuristic: images with "icon" in src or images < 64px on either dimension
    const images = document.querySelectorAll('img');

    for (const img of images) {
      const src = img.getAttribute('src') || '';
      const rect = img.getBoundingClientRect();

      // Check if likely an icon
      const isIconBySrc = src.includes('icon') || src.includes('/icons/');
      const isIconBySize = img.naturalWidth <= 64 || img.naturalHeight <= 64;

      if (!isIconBySrc && !isIconBySize) {
        continue; // Not an icon
      }

      if (rect.width === 0 || rect.height === 0) {
        continue; // Skip hidden images
      }

      const sizePixels = Math.max(img.naturalWidth || rect.width, img.naturalHeight || rect.height);

      // Determine format
      const format = src.endsWith('.svg') ? 'svg-img' : 'img';

      // Build selector for evidence
      const selector = img.id
        ? `img#${img.id}`
        : img.className
        ? `img.${img.className.split(' ')[0]}`
        : `img[src*="${src.split('/').pop()?.slice(0, 20)}"]`;

      // Create token (assume fill for image-based icons)
      const key = createKey('fill', sizePixels);
      if (!seen.has(key)) {
        seen.add(key);
        iconTokens.push({
          style: 'fill',
          sizePixels,
          format: format as 'svg-img' | 'img',
          evidence: [{
            pageUrl: url,
            selector,
            timestamp,
            computedStyles: {
              'icon-format': format,
              'icon-size': `${sizePixels}px`,
            },
          }],
        });
      }
    }

    return iconTokens;
  }, { url: pageUrl, timestamp });

  return tokens;
}
