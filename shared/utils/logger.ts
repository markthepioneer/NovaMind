export class Logger {
  constructor(private context: string) {}

  info(message: string, ...args: any[]) {
    console.log(`[${this.context}] INFO:`, message, ...args);
  }

  warn(message: string, ...args: any[]) {
    console.warn(`[${this.context}] WARN:`, message, ...args);
  }

  error(message: string, ...args: any[]) {
    console.error(`[${this.context}] ERROR:`, message, ...args);
  }

  debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[${this.context}] DEBUG:`, message, ...args);
    }
  }
} 