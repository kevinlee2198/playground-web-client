import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InProcessTokenBucketRateLimiter } from "@/lib/in-process-rate-limiter";

describe("InProcessTokenBucketRateLimiter", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows requests up to capacity", () => {
    const limiter = new InProcessTokenBucketRateLimiter(3, 1000);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
  });

  it("rejects requests when tokens are exhausted", () => {
    const limiter = new InProcessTokenBucketRateLimiter(2, 1000);
    limiter.tryAcquire();
    limiter.tryAcquire();
    expect(limiter.tryAcquire()).toBe(false);
  });

  it("refills at least one token after one interval", () => {
    const limiter = new InProcessTokenBucketRateLimiter(2, 1000);
    limiter.tryAcquire();
    limiter.tryAcquire();
    expect(limiter.tryAcquire()).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(limiter.tryAcquire()).toBe(true);
  });

  it("does not exceed capacity on refill", () => {
    const limiter = new InProcessTokenBucketRateLimiter(2, 1000);
    vi.advanceTimersByTime(10000);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
  });

  it("handles capacity of 1", () => {
    const limiter = new InProcessTokenBucketRateLimiter(1, 500);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
    vi.advanceTimersByTime(500);
    expect(limiter.tryAcquire()).toBe(true);
  });
});
