import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter } from '../../src/api/rate-limiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', async () => {
    const limiter = createRateLimiter();

    // Should not throw
    await limiter.checkLimits();
    limiter.recordRequest();

    const status = limiter.getStatus();
    expect(status.minuteCount).toBe(1);
    expect(status.hourCount).toBe(1);
  });

  it('tracks minute and hour counts separately', async () => {
    const limiter = createRateLimiter();

    for (let i = 0; i < 10; i++) {
      await limiter.checkLimits();
      limiter.recordRequest();
    }

    const status = limiter.getStatus();
    expect(status.minuteCount).toBe(10);
    expect(status.hourCount).toBe(10);
  });

  it('resets minute count after 60 seconds', async () => {
    const limiter = createRateLimiter();

    for (let i = 0; i < 10; i++) {
      await limiter.checkLimits();
      limiter.recordRequest();
    }

    // Advance time by 61 seconds
    vi.advanceTimersByTime(61000);

    // Need to call getStatus to trigger reset check
    const status = limiter.getStatus();
    expect(status.minuteCount).toBe(0);
    // Hour count only resets after an hour
  });

  it('provides status with correct limits', () => {
    const limiter = createRateLimiter();
    const status = limiter.getStatus();

    expect(status.minuteLimit).toBe(100);
    expect(status.hourLimit).toBe(3400);
  });
});
