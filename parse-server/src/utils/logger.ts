export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, meta?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}] ${this.context}: ${message}${metaString}`;
  }

  info(message: string, meta?: Record<string, any>): void {
    console.log(this.formatMessage('INFO', message, meta));
  }

  error(message: string, meta?: Record<string, any>): void {
    console.error(this.formatMessage('ERROR', message, meta));
  }

  warn(message: string, meta?: Record<string, any>): void {
    console.warn(this.formatMessage('WARN', message, meta));
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }
}

export default Logger;
