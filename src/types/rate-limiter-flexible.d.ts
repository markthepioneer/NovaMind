declare module 'rate-limiter-flexible' {
  export interface IRateLimiterOptions {
    storeClient: any;
    points?: number;
    duration?: number;
    blockDuration?: number;
    keyPrefix?: string;
  }

  export interface RateLimiterRes {
    msBeforeNext: number;
    remainingPoints: number;
    consumedPoints: number;
    isFirstInDuration: boolean;
  }

  export class RateLimiterRedis {
    constructor(opts: IRateLimiterOptions);
    consume(key: string): Promise<RateLimiterRes>;
    block(key: string, secDuration: number): Promise<void>;
    get(key: string): Promise<RateLimiterRes | null>;
    delete(key: string): Promise<void>;
  }
} 