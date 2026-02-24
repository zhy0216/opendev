import { tasks } from '@trigger.dev/sdk';
import type {
  sendEmailTask,
  sendOTPEmailTask,
  sendWelcomeEmailTask,
  SendEmailPayload,
  SendOTPEmailPayload,
  SendWelcomeEmailPayload,
} from './trigger/email.tasks';
import type {
  manualCleanupTask,
} from './trigger/scheduled.tasks';
import type {
  processWebhookTask,
  processPaymentWebhookTask,
  processGitWebhookTask,
  WebhookPayload,
  ProcessPaymentWebhookPayload,
  ProcessGitWebhookPayload,
} from './trigger/webhook.tasks';

/**
 * JobService provides a type-safe interface for triggering background jobs
 * from your application code. Use this service instead of directly importing
 * task definitions to avoid bundling Trigger.dev task code into your app.
 */
export class JobService {
  // ============================================
  // Email Jobs
  // ============================================

  /**
   * Send a generic email asynchronously
   * @returns A handle to track the task run
   */
  async sendEmail(payload: SendEmailPayload) {
    return tasks.trigger<typeof sendEmailTask>('send-email', payload);
  }

  /**
   * Send an OTP email for authentication flows
   * @returns A handle to track the task run
   */
  async sendOTPEmail(payload: SendOTPEmailPayload) {
    return tasks.trigger<typeof sendOTPEmailTask>('send-otp-email', payload);
  }

  /**
   * Send a welcome email to new users
   * @returns A handle to track the task run
   */
  async sendWelcomeEmail(payload: SendWelcomeEmailPayload) {
    return tasks.trigger<typeof sendWelcomeEmailTask>('send-welcome-email', payload);
  }

  /**
   * Batch send multiple emails at once
   * @returns A handle to track the batch task run
   */
  async batchSendEmails(payloads: SendEmailPayload[]) {
    return tasks.batchTrigger<typeof sendEmailTask>(
      'send-email',
      payloads.map((payload) => ({ payload }))
    );
  }

  // ============================================
  // Cleanup Jobs
  // ============================================

  /**
   * Trigger a manual cleanup task
   * @returns A handle to track the task run
   */
  async triggerManualCleanup(type: 'sessions' | 'verifications' | 'all') {
    return tasks.trigger<typeof manualCleanupTask>('manual-cleanup', { type });
  }

  // ============================================
  // Webhook Processing Jobs
  // ============================================

  /**
   * Process an incoming webhook asynchronously
   * @returns A handle to track the task run
   */
  async processWebhook(payload: WebhookPayload) {
    return tasks.trigger<typeof processWebhookTask>('process-webhook', payload);
  }

  /**
   * Process a payment webhook (Stripe, Paddle, etc.)
   * @returns A handle to track the task run
   */
  async processPaymentWebhook(payload: ProcessPaymentWebhookPayload) {
    return tasks.trigger<typeof processPaymentWebhookTask>('process-payment-webhook', payload);
  }

  /**
   * Process a git webhook (GitHub, GitLab, etc.)
   * @returns A handle to track the task run
   */
  async processGitWebhook(payload: ProcessGitWebhookPayload) {
    return tasks.trigger<typeof processGitWebhookTask>('process-git-webhook', payload);
  }
}

// Export types for consumers
export type {
  SendEmailPayload,
  SendOTPEmailPayload,
  SendWelcomeEmailPayload,
  WebhookPayload,
  ProcessPaymentWebhookPayload,
  ProcessGitWebhookPayload,
};

// Export a singleton instance for convenience
export const jobService = new JobService();
