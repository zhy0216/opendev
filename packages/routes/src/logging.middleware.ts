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
  const user = (context as any).user;

  if (user) {
    // Update the logging context with user information
    const currentContext = getLogger();
    const log = currentContext.withContext({
      userId: user.id,
      userEmail: user.email,
    });

    log.withMetadata({ userName: user.name }).debug('Authenticated request');
  }

  return next({ context });
});
