/**
 * Token-bucket / sliding-window rate limiter.
 *
 * Ported from the previous session's `sc-site-eb3fe870-ghost` sc-data
 * package. We use it to stay under UEX's 120 req/min cap with 5 req/min of
 * headroom — `new RateLimiter(115, 60_000)`. The class is generic; any
 * other source with a per-window quota can reuse it.
 *
 * Algorithm: record a timestamp every time `take()` resolves. On the next
 * call, drop timestamps older than `windowMs`, and if the remaining count is
 * below `capacity`, grant immediately. Otherwise sleep until the oldest hit
 * ages out plus a small safety buffer.
 *
 * This is intentionally NOT a classic token bucket because a sliding window
 * matches UEX's documented 120/minute cap better (a classic bucket would let
 * us burst 120 in one second then starve for 59).
 */

export interface RateLimiterOptions {
  /** Maximum allowed calls within the window. */
  capacity: number;
  /** Window size in milliseconds. */
  windowMs: number;
  /** Injected sleep, for tests. Defaults to `Bun.sleep`. */
  sleep?: (ms: number) => Promise<void>;
  /** Injected clock, for tests. Defaults to `Date.now`. */
  now?: () => number;
}

export class RateLimiter {
  readonly capacity: number;
  readonly windowMs: number;
  private readonly hits: number[] = [];
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;

  constructor(opts: RateLimiterOptions) {
    this.capacity = opts.capacity;
    this.windowMs = opts.windowMs;
    this.sleep = opts.sleep ?? ((ms) => Bun.sleep(ms));
    this.now = opts.now ?? (() => Date.now());
  }

  /**
   * Block until a new slot is available, then mark it taken. Never rejects.
   */
  async take(): Promise<void> {
    // Defensive loop: if the process somehow runs with a broken clock we'd
    // rather busy-wait than livelock.
    for (;;) {
      const t = this.now();
      while (this.hits.length > 0) {
        const head = this.hits[0];
        if (head === undefined || head > t - this.windowMs) break;
        this.hits.shift();
      }
      if (this.hits.length < this.capacity) {
        this.hits.push(t);
        return;
      }
      const oldest = this.hits[0];
      if (oldest === undefined) {
        // Impossible — guarded above — but keeps TS happy under
        // noUncheckedIndexedAccess.
        this.hits.push(t);
        return;
      }
      const waitMs = oldest + this.windowMs - t + 50;
      await this.sleep(waitMs > 0 ? waitMs : 50);
    }
  }

  /** Live count of hits currently inside the window. For tests/metrics. */
  get inWindow(): number {
    const t = this.now();
    return this.hits.filter((h) => h > t - this.windowMs).length;
  }
}

/**
 * Factory for the canonical UEX limiter: 115 calls per 60 s, 5 calls of
 * budget headroom under the documented 120/min quota.
 */
export function createUexRateLimiter(): RateLimiter {
  return new RateLimiter({ capacity: 115, windowMs: 60_000 });
}
