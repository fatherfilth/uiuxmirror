/**
 * Tests for unit normalization (rem/em/pt to px conversion)
 */

import { describe, it, expect } from 'vitest';
import { normalizeUnit } from '../../src/normalization/unit-normalizer.js';

describe('Unit Normalizer - rem/em/pt to px conversion', () => {
  it('should preserve px values as-is', () => {
    const result = normalizeUnit('16px');

    expect(result.pixels).toBe(16);
    expect(result.original).toBe('16px');
    expect(result.unit).toBe('px');
    expect(result.baseFontSize).toBeUndefined();
  });

  it('should convert 1rem to 16px with default base font size', () => {
    const result = normalizeUnit('1rem');

    expect(result.pixels).toBe(16);
    expect(result.original).toBe('1rem');
    expect(result.unit).toBe('rem');
    expect(result.baseFontSize).toBe(16);
  });

  it('should convert 1.5rem to 24px with base font size 16', () => {
    const result = normalizeUnit('1.5rem', 16);

    expect(result.pixels).toBe(24);
    expect(result.original).toBe('1.5rem');
    expect(result.unit).toBe('rem');
    expect(result.baseFontSize).toBe(16);
  });

  it('should convert 2rem to 32px with base font size 16', () => {
    const result = normalizeUnit('2rem', 16);

    expect(result.pixels).toBe(32);
  });

  it('should convert 1em to 20px with parent font size 20', () => {
    const result = normalizeUnit('1em', 16, 20);

    expect(result.pixels).toBe(20);
    expect(result.original).toBe('1em');
    expect(result.unit).toBe('em');
    expect(result.baseFontSize).toBe(16);
  });

  it('should convert 1em to base font size when no parent specified', () => {
    const result = normalizeUnit('1em', 16);

    expect(result.pixels).toBe(16);
  });

  it('should convert 12pt to 16px (12 * 96/72)', () => {
    const result = normalizeUnit('12pt');

    expect(result.pixels).toBe(16);
    expect(result.original).toBe('12pt');
    expect(result.unit).toBe('pt');
  });

  it('should convert 9pt to 12px', () => {
    const result = normalizeUnit('9pt');

    expect(result.pixels).toBe(12);
  });

  it('should handle 0px correctly', () => {
    const result = normalizeUnit('0px');

    expect(result.pixels).toBe(0);
    expect(result.original).toBe('0px');
    expect(result.unit).toBe('px');
  });

  it('should handle decimal values', () => {
    const result = normalizeUnit('0.875rem', 16);

    expect(result.pixels).toBe(14);
    expect(result.original).toBe('0.875rem');
  });

  it('should round to 2 decimal places', () => {
    const result = normalizeUnit('1.333rem', 16);

    // 1.333 * 16 = 21.328, should round to 21.33
    expect(result.pixels).toBe(21.33);
  });

  it('should throw error for invalid value format', () => {
    expect(() => normalizeUnit('invalid')).toThrow();
  });

  it('should throw error for empty string', () => {
    expect(() => normalizeUnit('')).toThrow();
  });

  it('should preserve original value and unit in output', () => {
    const result = normalizeUnit('1.5rem', 16);

    expect(result.original).toBe('1.5rem');
    expect(result.unit).toBe('rem');
    expect(result.baseFontSize).toBe(16);
  });
});
