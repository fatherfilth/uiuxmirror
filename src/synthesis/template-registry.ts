/**
 * Template registry for Handlebars-based component synthesis
 * Handles template loading, compilation, caching, and custom helpers
 */

import Handlebars from 'handlebars';
import { readFileSync } from 'fs-extra';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Compiled template cache to avoid re-compilation
const templateCache = new Map<string, HandlebarsTemplateDelegate>();

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, 'templates');

/**
 * Register custom Handlebars helpers
 * Called automatically before first template compilation
 */
function registerHelpers(): void {
  // ifEqual - conditional equality check
  Handlebars.registerHelper('ifEqual', function (this: any, a: string, b: string, options: any) {
    return a === b ? options.fn(this) : options.inverse(this);
  });

  // fallback - use primary if exists, else secondary
  Handlebars.registerHelper('fallback', function (this: any, primary: any, secondary: any) {
    return primary !== undefined && primary !== null ? primary : secondary;
  });

  // cssValue - wrap CSS property-value pair
  Handlebars.registerHelper('cssValue', function (this: any, property: string, value: string) {
    return `${property}: ${value};`;
  });
}

// Register helpers on module initialization
let helpersRegistered = false;
function ensureHelpersRegistered(): void {
  if (!helpersRegistered) {
    registerHelpers();
    helpersRegistered = true;
  }
}

/**
 * Compile a Handlebars template by name
 * Templates are loaded from src/synthesis/templates/ directory
 * Compiled templates are cached for reuse
 *
 * @param templateName - Name of the template file (without .hbs extension)
 * @returns Compiled Handlebars template function
 * @throws Error if template file not found
 */
export function compileTemplate(templateName: string): HandlebarsTemplateDelegate {
  ensureHelpersRegistered();

  // Check cache first
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)!;
  }

  // Load template from disk
  const templatePath = join(TEMPLATES_DIR, `${templateName}.hbs`);
  let templateSource: string;

  try {
    templateSource = readFileSync(templatePath, 'utf-8');
  } catch (error) {
    throw new Error(
      `Template not found: ${templateName}. Available templates: ${getAvailableTemplates().join(', ')}`
    );
  }

  // Compile template
  const compiled = Handlebars.compile(templateSource);

  // Cache for reuse
  templateCache.set(templateName, compiled);

  return compiled;
}

/**
 * Get list of available template names
 * @returns Array of template names (without .hbs extension)
 */
export function getAvailableTemplates(): string[] {
  // Hardcoded list for v1 to avoid fs.readdirSync dependency
  // In production, this would scan the templates directory
  return ['button', 'card', 'input', 'data-table', 'modal', 'nav'];
}

/**
 * Clear the template cache
 * Useful for testing or development hot-reload
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}
