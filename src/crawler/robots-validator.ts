/**
 * Robots.txt compliance module for UIUX-Mirror
 * Implements CRAWL-02: robots.txt compliance checking
 */

import robotsParser from 'robots-parser';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('robots-validator');

interface CachedRobots {
  parser: ReturnType<typeof robotsParser>;
  fetchedAt: number;
}

/**
 * RobotsValidator fetches, caches, and enforces robots.txt rules
 * Cache TTL: 24 hours
 */
export class RobotsValidator {
  private cache = new Map<string, CachedRobots>();
  private readonly cacheTtlMs = 24 * 60 * 60 * 1000; // 24 hours
  private readonly strictMode: boolean;

  /**
   * @param strictMode - If true, block all URLs on network error. If false, allow on error.
   */
  constructor(strictMode = true) {
    this.strictMode = strictMode;
    logger.debug(`RobotsValidator initialized (strict mode: ${strictMode})`);
  }

  /**
   * Extract domain from URL for cache key
   */
  private getDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch (error) {
      logger.error(`Invalid URL: ${url}`, error);
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  /**
   * Fetch robots.txt for a domain and cache the parser
   */
  private async fetchRobotsTxt(domain: string): Promise<ReturnType<typeof robotsParser>> {
    const robotsUrl = `${domain}/robots.txt`;

    try {
      logger.debug(`Fetching robots.txt from ${robotsUrl}`);
      const response = await fetch(robotsUrl);

      if (response.status === 404) {
        // No robots.txt = all allowed
        logger.debug(`No robots.txt found at ${robotsUrl} (404) - allowing all`);
        return robotsParser(robotsUrl, '');
      }

      if (!response.ok) {
        logger.warn(`Failed to fetch robots.txt from ${robotsUrl}: ${response.status}`);
        if (this.strictMode) {
          // In strict mode, treat errors as "disallow all"
          return robotsParser(robotsUrl, 'User-agent: *\nDisallow: /');
        } else {
          // In permissive mode, treat errors as "allow all"
          return robotsParser(robotsUrl, '');
        }
      }

      const text = await response.text();
      return robotsParser(robotsUrl, text);
    } catch (error) {
      logger.error(`Network error fetching robots.txt from ${robotsUrl}`, error);

      if (this.strictMode) {
        // In strict mode, block all URLs for this domain on network error
        logger.warn(`Strict mode: blocking all URLs for ${domain} due to network error`);
        return robotsParser(robotsUrl, 'User-agent: *\nDisallow: /');
      } else {
        // In permissive mode, allow all on error
        logger.warn(`Permissive mode: allowing all URLs for ${domain} despite network error`);
        return robotsParser(robotsUrl, '');
      }
    }
  }

  /**
   * Get or create cached robots.txt parser for a domain
   */
  private async getRobotsParser(domain: string): Promise<ReturnType<typeof robotsParser>> {
    const cached = this.cache.get(domain);
    const now = Date.now();

    if (cached && now - cached.fetchedAt < this.cacheTtlMs) {
      logger.debug(`Using cached robots.txt for ${domain}`);
      return cached.parser;
    }

    // Fetch fresh robots.txt
    const parser = await this.fetchRobotsTxt(domain);
    this.cache.set(domain, { parser, fetchedAt: now });

    return parser;
  }

  /**
   * Check if a URL is allowed by robots.txt
   * @param url - Full URL to check
   * @param userAgent - User agent string (default: 'UIDNABot')
   * @returns Promise<boolean> - true if allowed, false if blocked
   */
  async isAllowed(url: string, userAgent = 'UIDNABot'): Promise<boolean> {
    try {
      const domain = this.getDomain(url);
      const parser = await this.getRobotsParser(domain);
      const allowed = parser.isAllowed(url, userAgent);

      if (!allowed) {
        logger.debug(`robots.txt blocked URL: ${url} (user-agent: ${userAgent})`);
      }

      return allowed ?? true; // Default to allowed if parser returns null/undefined
    } catch (error) {
      logger.error(`Error checking robots.txt for ${url}`, error);
      // On error checking, use strict mode setting
      return !this.strictMode;
    }
  }

  /**
   * Get crawl delay from robots.txt for a domain
   * @param domain - Domain to check (e.g., 'https://example.com')
   * @param userAgent - User agent string (default: 'UIDNABot')
   * @returns Promise<number | null> - Delay in seconds, or null if not specified
   */
  async getCrawlDelay(domain: string, userAgent = 'UIDNABot'): Promise<number | null> {
    try {
      const parser = await this.getRobotsParser(domain);
      const delay = parser.getCrawlDelay(userAgent);

      if (delay) {
        logger.debug(`Crawl delay for ${domain}: ${delay}s (user-agent: ${userAgent})`);
      }

      return delay ?? null;
    } catch (error) {
      logger.error(`Error getting crawl delay for ${domain}`, error);
      return null;
    }
  }

  /**
   * Clear the robots.txt cache
   */
  clearCache(): void {
    logger.debug('Clearing robots.txt cache');
    this.cache.clear();
  }
}
