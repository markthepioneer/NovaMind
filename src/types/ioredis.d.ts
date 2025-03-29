declare module 'ioredis' {
  interface RedisOptions {
    host?: string;
    port?: number;
    password?: string | null;
    enableOfflineQueue?: boolean;
    retryStrategy?: (times: number) => number | void | null;
  }

  class Redis {
    constructor(options?: RedisOptions);
    on(event: string, listener: (...args: any[]) => void): this;
    connect(): Promise<void>;
    disconnect(): void;
    quit(): Promise<void>;
    set(key: string, value: string): Promise<string>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<number>;
  }

  export = Redis;
} 