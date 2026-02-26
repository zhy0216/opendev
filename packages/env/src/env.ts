import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    SERVER_PORT: z.coerce.number().int().positive().default(3000),
    BETTER_AUTH_SECRET: z.string().min(1, 'BETTER_AUTH_SECRET is required'),
    BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),
    RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
    EMAIL_FROM: z.string().email().default('noreply@example.com'),
    // Trigger.dev configuration
    TRIGGER_SECRET_KEY: z.string().optional(),
    TRIGGER_PROJECT_REF: z.string().optional(),
    // Encryption
    TOKEN_ENCRYPTION_KEY: z.string().min(64, 'TOKEN_ENCRYPTION_KEY must be at least 64 characters (32-byte hex)').default('0'.repeat(64)),
    // Internal service-to-service auth
    INTERNAL_CALLBACK_SECRET: z.string().min(32).default('development-internal-secret-change-in-production-min32chars'),
    // GitHub App configuration
    GITHUB_APP_ID: z.string().optional(),
    GITHUB_PRIVATE_KEY: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GITHUB_WEBHOOK_SECRET: z.string().optional(),
    // Slack configuration
    SLACK_BOT_TOKEN: z.string().optional(),
    SLACK_SIGNING_SECRET: z.string().optional(),
    SLACK_APP_TOKEN: z.string().optional(),
    // Linear configuration
    LINEAR_API_KEY: z.string().optional(),
    LINEAR_WEBHOOK_SECRET: z.string().optional(),
    // Modal configuration
    MODAL_TOKEN_ID: z.string().optional(),
    MODAL_TOKEN_SECRET: z.string().optional(),
    MODAL_SANDBOX_IMAGE: z.string().default('ghcr.io/your-org/acp-sandbox:latest'),
    // Logging configuration
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

export type Env = typeof env;
