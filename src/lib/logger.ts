// Production-safe logging utility
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private log(level: LogLevel, message: string, data?: unknown) {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    // In development, use console logging
    if (this.isDevelopment) {
      switch (level) {
        case 'error':
          console.error(`[${entry.timestamp}] ERROR:`, message, data);
          break;
        case 'warn':
          console.warn(`[${entry.timestamp}] WARN:`, message, data);
          break;
        case 'info':
          console.info(`[${entry.timestamp}] INFO:`, message, data);
          break;
        case 'debug':
          console.debug(`[${entry.timestamp}] DEBUG:`, message, data);
          break;
      }
    }

    // In production, only log errors and warnings to avoid console pollution
    if (!this.isDevelopment && (level === 'error' || level === 'warn')) {
      // In a real app, you might want to send these to a logging service
      console[level](`[${level.toUpperCase()}]`, message);
    }
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data);
  }
}

export const logger = new Logger();