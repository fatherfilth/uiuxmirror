/**
 * Simple structured logger for UIUX-Mirror
 * No external dependencies - uses console with structured output
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private moduleName: string;
  private minLevel: LogLevel;

  constructor(moduleName: string) {
    this.moduleName = moduleName;
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const baseMsg = `[${timestamp}] [${level.toUpperCase()}] [${this.moduleName}] ${message}`;

    if (context && Object.keys(context).length > 0) {
      return `${baseMsg} ${JSON.stringify(context)}`;
    }

    return baseMsg;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context));
    }
  }
}

/**
 * Factory function to create a logger instance for a specific module
 */
export function createLogger(moduleName: string): Logger {
  return new Logger(moduleName);
}
