export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(prefix: string = 'MCP', level: LogLevel = LogLevel.INFO) {
    this.prefix = prefix;
    this.level = level;
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  public debug(message: string, data?: any): void {
    if (this.level <= LogLevel.DEBUG) {
      this.log(LogLevel.DEBUG, message, data);
    }
  }

  public info(message: string, data?: any): void {
    if (this.level <= LogLevel.INFO) {
      this.log(LogLevel.INFO, message, data);
    }
  }

  public warn(message: string, data?: any): void {
    if (this.level <= LogLevel.WARN) {
      this.log(LogLevel.WARN, message, data);
    }
  }

  public error(message: string, data?: any): void {
    if (this.level <= LogLevel.ERROR) {
      this.log(LogLevel.ERROR, message, data);
    }
  }

  private log(level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    
    const logEntry: LogEntry = {
      timestamp,
      level: levelStr,
      message: `[${this.prefix}] ${message}`
    };

    if (data !== undefined) {
      logEntry.data = data;
    }

    const logLine = this.formatLogEntry(logEntry);
    
    // All logs go to stderr to avoid interfering with MCP communication on stdout
    process.stderr.write(logLine + '\n');
  }

  private formatLogEntry(entry: LogEntry): string {
    const baseMessage = `${entry.timestamp} [${entry.level}] ${entry.message}`;
    
    if (entry.data !== undefined) {
      if (typeof entry.data === 'string') {
        return `${baseMessage} - ${entry.data}`;
      } else {
        try {
          return `${baseMessage} - ${JSON.stringify(entry.data)}`;
        } catch {
          return `${baseMessage} - [Unable to serialize data]`;
        }
      }
    }
    
    return baseMessage;
  }

  public child(prefix: string): Logger {
    const childPrefix = `${this.prefix}:${prefix}`;
    return new Logger(childPrefix, this.level);
  }
}

// Export a default logger instance
export const logger = new Logger('TeamThinkMCP');

// Convenience functions for global logging
export const debug = (message: string, data?: any) => logger.debug(message, data);
export const info = (message: string, data?: any) => logger.info(message, data);
export const warn = (message: string, data?: any) => logger.warn(message, data);
export const error = (message: string, data?: any) => logger.error(message, data);