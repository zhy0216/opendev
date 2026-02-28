import { pub } from './orpc';
import {
  runWithLogContextAsync,
  generateRequestId,
  getLogger,
  type LogContext,
} from '@repo/logger';

/**
 * Logging middleware that wraps each request with logging context.
 * This enables structured logging with requestId, userId, path, and method
 * across all downstream operations.
 */
export const loggingMiddleware = pub.middleware(async ({ context, next }) => {
  const url = new URL(context.req.url);
  const requestId = generateRequestId();

  const logContext: LogContext = {
    requestId,
    path: url.pathname,
    method: context.req.method,
  };

  return runWithLogContextAsync(logContext, async () => {
    const startTime = Date.now();
    const log = getLogger();

    log.debug('Request started');

    try {
      const result = await next({ context });
      const duration = Date.now() - startTime;

      log.withMetadata({ durationMs: duration }).info('Request completed');

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      log
        .withMetadata({
          durationMs: duration,
          error: error instanceof Error ? error.message : String(error),
        })
        .error('Request failed');
      throw error;
    }
  });
});

/**
 * Enhanced logging middleware for authenticated requests.
 * Adds userId and userEmail to the logging context.
 * Should be used after authMiddleware.
 */
export const authLoggingMiddleware = pub.middleware(async ({ context, next }) => {
  // Extract user info from context if available (set by authMiddleware)
  if ('user' in context && context.user && typeof context.user === 'object') {
    const user = context.user as { id: string; email: string; name: string };
    const log = getLogger().withContext({
      userId: user.id,
      userEmail: user.email,
    });

    log.withMetadata({ userName: user.name }).debug('Authenticated request');
  }

  return next({ context });
});
