/**
 * Unit tests for CLI utilities (config loader, progress)
 * Tests config loading, merging, validation, and progress wrapper behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { loadFullConfig } from '../../src/cli/config-loader.js';
import { withProgress } from '../../src/cli/progress.js';

// Test configuration directory
const testDir = join(process.cwd(), 'tests', 'cli', '.test-temp');
let originalCwd: string;

beforeEach(async () => {
  // Create temp test directory
  await mkdir(testDir, { recursive: true });

  // Save original cwd
  originalCwd = process.cwd();

  // Change to test directory so config files are loaded from there
  process.chdir(testDir);
});

afterEach(async () => {
  // Restore original cwd
  process.chdir(originalCwd);

  // Clean up temp directory
  if (existsSync(testDir)) {
    await rm(testDir, { recursive: true, force: true });
  }
});

describe('config-loader', () => {
  describe('loadFullConfig', () => {
    it('returns defaults when no config file exists', async () => {
      // Call with minimal CLI args (only seedUrls required)
      const config = await loadFullConfig({
        seedUrls: ['https://example.com'],
      });

      // Verify defaults are applied
      expect(config.maxDepth).toBe(3);
      expect(config.maxPages).toBe(100);
      expect(config.maxConcurrency).toBe(5);
      expect(config.respectRobotsTxt).toBe(true);
      expect(config.outputDir).toBe('.uidna');
      expect(config.seedUrls).toEqual(['https://example.com']);
    });

    it('merges config file values with defaults', async () => {
      // Write temp uidna.config.json
      const configContent = JSON.stringify({
        maxDepth: 5,
        maxPages: 200,
        maxConcurrency: 10,
      }, null, 2);

      await writeFile(join(testDir, 'uidna.config.json'), configContent, 'utf-8');

      // Call loadFullConfig
      const config = await loadFullConfig({
        seedUrls: ['https://example.com'],
      });

      // Verify file values are used
      expect(config.maxDepth).toBe(5);
      expect(config.maxPages).toBe(200);
      expect(config.maxConcurrency).toBe(10);

      // Verify defaults are still applied for unspecified values
      expect(config.respectRobotsTxt).toBe(true);
      expect(config.outputDir).toBe('.uidna');
    });

    it('CLI args override config file', async () => {
      // Write temp config with maxPages: 200
      const configContent = JSON.stringify({
        maxPages: 200,
        maxDepth: 5,
      }, null, 2);

      await writeFile(join(testDir, 'uidna.config.json'), configContent, 'utf-8');

      // Call with CLI override
      const config = await loadFullConfig({
        seedUrls: ['https://test.com'],
        maxPages: 50,  // CLI override
      });

      // Verify CLI wins
      expect(config.maxPages).toBe(50);

      // Verify file values still applied for other fields
      expect(config.maxDepth).toBe(5);
    });

    it('invalid config file throws descriptive error', async () => {
      // Write invalid JSON
      await writeFile(join(testDir, 'uidna.config.json'), '{ invalid json }', 'utf-8');

      // Verify error is thrown
      await expect(
        loadFullConfig({ seedUrls: ['https://example.com'] })
      ).rejects.toThrow(/Invalid JSON in uidna.config.json/);
    });

    it('config validation catches invalid values', async () => {
      // Write config with invalid maxDepth (exceeds max 10)
      const configContent = JSON.stringify({
        maxDepth: 999,
      }, null, 2);

      await writeFile(join(testDir, 'uidna.config.json'), configContent, 'utf-8');

      // Verify validation error is thrown
      await expect(
        loadFullConfig({ seedUrls: ['https://example.com'] })
      ).rejects.toThrow(/Invalid uidna.config.json/);
    });

    it('validates maxPages min/max boundaries', async () => {
      // Test maxPages > 10000 (exceeds max)
      const invalidConfig = JSON.stringify({ maxPages: 50000 }, null, 2);
      await writeFile(join(testDir, 'uidna.config.json'), invalidConfig, 'utf-8');

      await expect(
        loadFullConfig({ seedUrls: ['https://example.com'] })
      ).rejects.toThrow(/Invalid uidna.config.json/);
    });

    it('validates viewport size constraints', async () => {
      // Test invalid viewport (width too small)
      const invalidConfig = JSON.stringify({
        viewportSizes: [{ width: 100, height: 800 }]
      }, null, 2);

      await writeFile(join(testDir, 'uidna.config.json'), invalidConfig, 'utf-8');

      await expect(
        loadFullConfig({ seedUrls: ['https://example.com'] })
      ).rejects.toThrow(/Invalid uidna.config.json/);
    });
  });
});

describe('progress', () => {
  describe('withProgress', () => {
    it('resolves with task result', async () => {
      // Task that returns a value
      const task = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'test-result';
      };

      const result = await withProgress('Testing...', async () => task());

      expect(result).toBe('test-result');
    });

    it('propagates errors from task', async () => {
      // Task that throws
      const task = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Test error');
      };

      await expect(
        withProgress('Testing...', async () => task())
      ).rejects.toThrow('Test error');
    });

    it('allows updating progress message', async () => {
      // Task that uses the update callback
      const updates: string[] = [];

      const result = await withProgress('Initial', async (update) => {
        updates.push('Initial');
        update('Step 1');
        updates.push('Step 1');
        update('Step 2');
        updates.push('Step 2');
        return 'done';
      });

      expect(result).toBe('done');
      expect(updates).toEqual(['Initial', 'Step 1', 'Step 2']);
    });

    it('handles synchronous errors', async () => {
      // Task that throws synchronously
      const task = () => {
        throw new Error('Sync error');
      };

      await expect(
        withProgress('Testing...', async () => task())
      ).rejects.toThrow('Sync error');
    });
  });
});
