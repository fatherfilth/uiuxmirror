/**
 * Custom error classes for UIUX-Mirror
 * All errors extend a base UidnaError class
 */

/**
 * Base error class for all UIUX-Mirror errors
 */
export class UidnaError extends Error {
  public readonly code: string;
  public readonly timestamp: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Crawl failure error (network issues, timeouts, etc.)
 */
export class CrawlError extends UidnaError {
  public readonly url: string;
  public readonly statusCode?: number;

  constructor(url: string, message: string, statusCode?: number) {
    super('CRAWL_ERROR', message);
    this.url = url;
    this.statusCode = statusCode;
  }
}

/**
 * Token extraction failure error
 */
export class ExtractionError extends UidnaError {
  public readonly url: string;
  public readonly selector?: string;

  constructor(url: string, message: string, selector?: string) {
    super('EXTRACTION_ERROR', message);
    this.url = url;
    this.selector = selector;
  }
}

/**
 * Robots.txt blocked access error
 */
export class RobotsBlockedError extends UidnaError {
  public readonly url: string;

  constructor(url: string) {
    super('ROBOTS_BLOCKED', `Access to ${url} is blocked by robots.txt`);
    this.url = url;
  }
}

/**
 * Configuration validation error
 */
export class ConfigValidationError extends UidnaError {
  public readonly field: string;

  constructor(field: string, message: string) {
    super('CONFIG_VALIDATION_ERROR', message);
    this.field = field;
  }
}
