import { AsyncLocalStorage } from 'async_hooks';
import {
  ConsoleTransport,
  LogLayer,
  LogLevel,
  type LogLayerTransport,
  type LogLevelType,
} from 'loglayer';
import { LogFileRotationTransport } from '@loglayer/transport-log-file-rotation';
import { serializeError } from 'serialize-error';
import { env } from '@repo/env';

// Re-export types and transports for consumers
export { LogLevel, ConsoleTransport, LogFileRotationTransport };
export type { LogLevelType, LogLayerTransport };

/**
 * Request context for structured logging
 */
export interface LogContext {
  requestId?: string;
  userId?: string;
  userEmail?: string;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

// Async local storage for request-scoped logging context
const logContextStorage = new AsyncLocalStorage<LogContext>();

/**
 * Get log level based on environment
 */
function getLogLevelForEnvironment(): LogLevelType {
  const configuredLevel = env.LOG_LEVEL;
  if (configuredLevel) {
    return configuredLevel as LogLevelType;
  }

  // Default levels per environment
  switch (env.NODE_ENV) {
    case 'production':
      return LogLevel.info;
    case 'test':
      return LogLevel.error;
    case 'development':
    default:
      return LogLevel.debug;
  }
}

/**
 * Create transports based on environment
 */
function createTransports(): LogLayerTransport[] {
  const level = getLogLevelForEnvironment();

  return [
    new ConsoleTransport({
      logger: console,
      level,
    }),
  ];
}

// Create the base logger instance
export const logger = new LogLayer({
  errorSerializer: serializeError,
  transport: createTransports(),
});

// Set initial log level
logger.setLevel(getLogLevelForEnvironment());

/**
 * Configure the logger with custom settings
 */
export function configureLogger({
  level,
  transports,
  context,
}: {
  level?: LogLevelType;
  transports?: LogLayerTransport[];
  context?: Record<string, unknown>;
}) {
  const effectiveLevel = level || getLogLevelForEnvironment();
  logger.setLevel(effectiveLevel);

  if (transports && transports.length > 0) {
    logger.withFreshTransports([...transports]);
  }

  if (context) {
    // Store as default context that will be merged with request context
    defaultContext = context;
  }
}

let defaultContext: Record<string, unknown> | undefined;

/**
 * Get the current logging context from async local storage
 */
export function getLogContext(): LogContext | undefined {
  return logContextStorage.getStore();
}

/**
 * Run a function with logging context
 * Use this to wrap request handlers or other scoped operations
 */
export function runWithLogContext<T>(context: LogContext, fn: () => T): T {
  return logContextStorage.run(context, fn);
}

/**
 * Run an async function with logging context
 */
export async function runWithLogContextAsync<T>(
  context: LogContext,
  fn: () => Promise<T>
): Promise<T> {
  return logContextStorage.run(context, fn);
}

/**
 * Get a logger instance with the current request context merged
 * This is the primary way to get a context-aware logger
 */
export function getLogger(additionalContext?: Record<string, unknown>) {
  const requestContext = getLogContext();
  const mergedContext = {
    ...defaultContext,
    ...requestContext,
    ...additionalContext,
  };

  // Only add context if there's something to add
  if (Object.keys(mergedContext).length > 0) {
    return logger.withContext(mergedContext);
  }

  return logger;
}

/**
 * Create a child logger for a specific service/module
 * Adds a 'service' field to all log entries
 */
export function createServiceLogger(serviceName: string) {
  const getServiceLogger = () => getLogger().withContext({ service: serviceName });

  return {
    trace: (message: string, data?: Record<string, unknown>) => {
      const log = getServiceLogger();
      if (data) {
        log.withMetadata(data).trace(message);
      } else {
        log.trace(message);
      }
    },
    debug: (message: string, data?: Record<string, unknown>) => {
      const log = getServiceLogger();
      if (data) {
        log.withMetadata(data).debug(message);
      } else {
        log.debug(message);
      }
    },
    info: (message: string, data?: Record<string, unknown>) => {
      const log = getServiceLogger();
      if (data) {
        log.withMetadata(data).info(message);
      } else {
        log.info(message);
      }
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      const log = getServiceLogger();
      if (data) {
        log.withMetadata(data).warn(message);
      } else {
        log.warn(message);
      }
    },
    error: (message: string, error?: Error, data?: Record<string, unknown>) => {
      const log = getServiceLogger();
      if (error && data) {
        log.withError(error).withMetadata(data).error(message);
      } else if (error) {
        log.withError(error).error(message);
      } else if (data) {
        log.withMetadata(data).error(message);
      } else {
        log.error(message);
      }
    },
    /**
     * Get a child logger with additional context
     */
    withContext: (_context: Record<string, unknown>) =>
      createServiceLogger(serviceName),
  };
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

// Legacy export for backwards compatibility
export function getLoggerWithContext() {
  return getLogger();
}
