import path from 'path';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'SYSTEM' | 'DATABASE' | 'REDIS';

const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  GRAY: '\x1b[90m',
};

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const cleanMeta = meta ? this.sanitizeMeta(meta) : undefined;

    if (this.isProduction) {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...(cleanMeta ? { metadata: cleanMeta } : {}),
      });
    }

    // Colorized console logs for development
    let color = COLORS.RESET;
    switch (level) {
      case 'INFO':
        color = COLORS.CYAN;
        break;
      case 'WARN':
        color = COLORS.YELLOW;
        break;
      case 'ERROR':
        color = COLORS.RED;
        break;
      case 'DEBUG':
        color = COLORS.GRAY;
        break;
      case 'DATABASE':
        color = COLORS.GREEN;
        break;
      case 'REDIS':
        color = COLORS.MAGENTA;
        break;
      case 'SYSTEM':
        color = COLORS.BLUE;
        break;
    }

    const metaStr = cleanMeta ? ` ${COLORS.GRAY}${JSON.stringify(cleanMeta)}${COLORS.RESET}` : '';
    return `[${timestamp}] ${color}${level.padEnd(8)}${COLORS.RESET} | ${message}${metaStr}`;
  }

  private sanitizeMeta(meta: any): any {
    if (!meta || typeof meta !== 'object') return meta;
    
    // Create shallow copy to avoid mutating original objects
    const sanitized = { ...meta };
    const sensitiveKeys = ['password', 'token', 'accessToken', 'refreshToken', 'idToken', 'secret'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.includes(key)) {
        sanitized[key] = '********';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeMeta(sanitized[key]);
      }
    }

    return sanitized;
  }

  public info(message: string, meta?: any): void {
    console.log(this.formatMessage('INFO', message, meta));
  }

  public warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('WARN', message, meta));
  }

  public error(message: string, error?: any, meta?: any): void {
    const errorMeta = error instanceof Error 
      ? { name: error.name, message: error.message, stack: error.stack, ...meta }
      : { rawError: error, ...meta };
    console.error(this.formatMessage('ERROR', message, errorMeta));
  }

  public debug(message: string, meta?: any): void {
    if (!this.isProduction) {
      console.log(this.formatMessage('DEBUG', message, meta));
    }
  }

  public db(message: string, meta?: any): void {
    console.log(this.formatMessage('DATABASE', message, meta));
  }

  public redis(message: string, meta?: any): void {
    console.log(this.formatMessage('REDIS', message, meta));
  }

  public system(message: string, meta?: any): void {
    console.log(this.formatMessage('SYSTEM', message, meta));
  }
}

export const logger = new Logger();
