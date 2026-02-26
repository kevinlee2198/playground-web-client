/**
 * In-process token-bucket rate limiter.
 *
 * Allows `capacity` requests, refilling 1 token per `refillIntervalMs`.
 * State is held in memory within the current Node.js process — in serverless
 * environments with multiple concurrent instances, the effective rate limit
 * is multiplied by the number of instances. For shared rate limiting across
 * instances, use an external store (e.g., Redis).
 */
export class InProcessTokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillIntervalMs: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  tryAcquire(): boolean {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = Math.floor(elapsed / this.refillIntervalMs);
    if (newTokens > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }
}
