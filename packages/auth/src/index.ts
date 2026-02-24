import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
import { getInject, IDatabase } from '@repo/di';
import { IEmailService, type EmailService } from '@repo/service';
import type { DbClient } from '@repo/db';
import { env } from '@repo/env';
import * as schema from '@repo/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@repo/logger';

export function createAuth(db: DbClient) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: false,
  },
  advanced: {
    database: {
      generateId: () => uuidv4(),
    },
  },
  trustedOrigins: [
    'http://localhost:5173',
    'http://localhost:3000',
    env.BETTER_AUTH_URL,
  ],
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        // In development mode, skip sending email - log OTP to console
        if (env.NODE_ENV === 'development') {
          logger
            .withMetadata({ email, otp })
            .info(`Dev mode: use OTP "${otp}" to sign in (email skipped)`);
          return;
        }
        const emailService = getInject<EmailService>(IEmailService);
        await emailService.sendOTPEmail(email, otp, type);
      },
      otpLength: 6,
      expiresIn: 600, // 10 minutes
    }),
  ],
});
}

export type Auth = ReturnType<typeof createAuth>;

export const IAuth = Symbol.for('IAuth');
