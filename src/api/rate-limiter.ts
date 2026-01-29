export interface RateLimiter {
  checkLimits(): Promise<void>;
  recordRequest(): void;
  getStatus(): RateLimitStatus;
}

export interface RateLimitStatus {
  minuteCount: number;
  minuteLimit: number;
  hourCount: number;
  hourLimit: number;
  minuteResetAt: number;
  hourResetAt: number;
}

const MINUTE_LIMIT = 100; // Buffer below 120
const HOUR_LIMIT = 3400; // Buffer below 3600

export function createRateLimiter(): RateLimiter {
  let minuteCount = 0;
  let hourCount = 0;
  let minuteResetAt = Date.now() + 60 * 1000;
  let hourResetAt = Date.now() + 60 * 60 * 1000;

  function resetCountersIfNeeded(): void {
    const now = Date.now();

    if (now >= minuteResetAt) {
      minuteCount = 0;
      minuteResetAt = now + 60 * 1000;
    }

    if (now >= hourResetAt) {
      hourCount = 0;
      hourResetAt = now + 60 * 60 * 1000;
    }
  }

  const limiter: RateLimiter = {
    async checkLimits(): Promise<void> {
      resetCountersIfNeeded();

      const now = Date.now();

      // Check minute limit
      if (minuteCount >= MINUTE_LIMIT) {
        const waitTime = minuteResetAt - now;
        if (waitTime > 0) {
          await sleep(waitTime);
          resetCountersIfNeeded();
        }
      }

      // Check hour limit
      if (hourCount >= HOUR_LIMIT) {
        const waitTime = hourResetAt - now;
        if (waitTime > 0) {
          await sleep(waitTime);
          resetCountersIfNeeded();
        }
      }
    },

    recordRequest(): void {
      resetCountersIfNeeded();
      minuteCount++;
      hourCount++;
    },

    getStatus(): RateLimitStatus {
      resetCountersIfNeeded();
      return {
        minuteCount,
        minuteLimit: MINUTE_LIMIT,
        hourCount,
        hourLimit: HOUR_LIMIT,
        minuteResetAt,
        hourResetAt,
      };
    },
  };

  return limiter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
