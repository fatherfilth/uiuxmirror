/**
 * Progress feedback utilities for CLI
 * Wraps ora for spinner feedback during long operations
 */

import ora from 'ora';
import type { Ora } from 'ora';

/**
 * Execute a task with progress spinner
 * Shows spinner during execution, succeeds on completion, fails on error
 *
 * @param message - Initial spinner message
 * @param task - Async task to execute. Receives update function to change spinner text.
 * @returns Task result
 * @throws Re-throws any error from task after displaying failure
 */
export async function withProgress<T>(
  message: string,
  task: (update: (text: string) => void) => Promise<T>
): Promise<T> {
  const spinner = ora(message).start();

  try {
    const result = await task((text: string) => {
      spinner.text = text;
    });
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}

/**
 * Create a raw ora spinner for commands needing more control
 * Useful for multi-phase operations where manual succeed/fail is needed
 *
 * @param message - Initial spinner message
 * @returns Ora spinner instance
 */
export function createSpinner(message: string): Ora {
  return ora(message);
}
