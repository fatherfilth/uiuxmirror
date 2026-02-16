/**
 * Markdown generation utilities
 * Provides helpers for creating GitHub-flavored markdown tables, code blocks, and formatting
 */

import { markdownTable } from 'markdown-table';

/**
 * Generate GitHub-flavored markdown table
 * Wraps markdown-table library with convenient API
 *
 * @param headers - Column headers
 * @param rows - Table rows (each row is array of cell values)
 * @param align - Optional column alignment ('l', 'c', 'r')
 * @returns Formatted markdown table string
 */
export function generateTable(
  headers: string[],
  rows: string[][],
  align?: Array<'l' | 'c' | 'r'>
): string {
  return markdownTable([headers, ...rows], {
    align: align || headers.map(() => 'l' as const),
  });
}

/**
 * Wrap code in fenced code block
 * Trims trailing whitespace for clean output
 *
 * @param code - Code content
 * @param lang - Optional language tag for syntax highlighting
 * @returns Fenced code block string
 */
export function codeBlock(code: string, lang?: string): string {
  const trimmedCode = code.trimEnd();
  const langTag = lang || '';
  return `\`\`\`${langTag}\n${trimmedCode}\n\`\`\``;
}

/**
 * Generate markdown heading
 * @param text - Heading text
 * @param level - Heading level (1-6)
 * @returns Markdown heading string
 */
export function heading(text: string, level: 1 | 2 | 3 | 4 | 5 | 6): string {
  const hashes = '#'.repeat(level);
  return `${hashes} ${text}`;
}

/**
 * Wrap text in bold markdown
 * @param text - Text to make bold
 * @returns Bold markdown string
 */
export function bold(text: string): string {
  return `**${text}**`;
}

/**
 * Wrap text in inline code
 * @param text - Text to format as code
 * @returns Inline code markdown string
 */
export function inlineCode(text: string): string {
  return `\`${text}\``;
}

/**
 * Create markdown link
 * @param text - Link text
 * @param url - Link URL
 * @returns Markdown link string
 */
export function link(text: string, url: string): string {
  return `[${text}](${url})`;
}

/**
 * Create formatted section with heading and content
 * Combines heading + blank line + content for consistent section formatting
 *
 * @param heading - Section heading text
 * @param level - Heading level (1-6)
 * @param content - Section content
 * @returns Formatted section string
 */
export function section(heading: string, level: number, content: string): string {
  const headingStr = `${'#'.repeat(level)} ${heading}`;
  return `${headingStr}\n\n${content}`;
}
