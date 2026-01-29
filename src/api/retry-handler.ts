export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

export interface HttpError extends Error {
  status: number;
  retryAfter?: number;
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof Error && 'status' in error && typeof (error as HttpError).status === 'number';
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      lastError = error;

      // Check if error is retryable
      if (!isHttpError(error) || !config.retryableStatuses.includes(error.status)) {
        throw error;
      }

      // Don't retry after last attempt
      if (attempt === config.maxRetries) {
        throw error;
      }

      // Calculate delay
      let delay: number;
      if (error.status === 429 && error.retryAfter) {
        // Use server-provided retry-after value
        delay = error.retryAfter * 1000;
      } else {
        // Exponential backoff with jitter
        const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
        delay = Math.min(exponentialDelay + jitter, config.maxDelayMs);
      }

      await sleep(delay);
    }
  }

  throw lastError ?? new Error('Retry failed');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
