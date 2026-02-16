#!/usr/bin/env node
/**
 * CLI entry point for UIUX-Mirror
 * Subcommand-based CLI router
 */

/**
 * Print usage message
 */
function printUsage() {
  console.log(`
Usage: uidna <command> [options]

Commands:
  crawl <url>          Crawl a website and extract design tokens
  extract              Run extraction pipeline on crawled data
  report               Generate Brand DNA Report
  synth <component>    Synthesize a new component using design DNA
  export               Export design tokens in various formats
  mcp                  Start MCP server for AI agent integration

Options:
  --help, -h           Show help for a command
  --version            Show version number

Run 'uidna <command> --help' for command-specific options.
  `.trim());
}

/**
 * Main CLI function
 */
async function main() {
  try {
    // Extract command (first arg after node/script)
    const command = process.argv[2];

    // Handle --help, -h, or no args
    if (!command || command === '--help' || command === '-h') {
      printUsage();
      process.exit(0);
    }

    // Handle --version
    if (command === '--version') {
      console.log('0.1.0');
      process.exit(0);
    }

    // Dispatch to subcommand handler
    switch (command) {
      case 'crawl': {
        const { crawlCommand } = await import('./cli/commands/crawl.js');
        await crawlCommand(process.argv.slice(3));
        break;
      }

      case 'extract':
      case 'mcp':
        console.log(`Command '${command}' not yet implemented`);
        process.exit(0);
        break;

      case 'report': {
        const { reportCommand } = await import('./cli/commands/report.js');
        await reportCommand(process.argv.slice(3));
        break;
      }

      case 'synth': {
        const { synthCommand } = await import('./cli/commands/synth.js');
        await synthCommand(process.argv.slice(3));
        break;
      }

      case 'export':
        console.log(`Command '${command}' not yet implemented`);
        process.exit(0);
        break;

      default:
        console.error(`Error: Unknown command '${command}'\n`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error running UIUX-Mirror:');
    console.error(error instanceof Error ? error.message : String(error));

    // Print stack trace if debug mode
    if (process.env.LOG_LEVEL === 'debug' && error instanceof Error) {
      console.error('');
      console.error('Stack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run CLI
main();
