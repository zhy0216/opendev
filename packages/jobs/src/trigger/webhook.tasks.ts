import { task } from '@trigger.dev/sdk';
import { logger } from '@trigger.dev/sdk';

// Webhook payload types
export interface WebhookPayload {
  source: string;
  event: string;
  data: Record<string, unknown>;
  headers?: Record<string, string>;
  receivedAt: string;
}

export interface ProcessPaymentWebhookPayload {
  provider: 'stripe' | 'paddle' | 'lemonsqueezy';
  eventType: string;
  data: Record<string, unknown>;
}

export interface ProcessGitWebhookPayload {
  provider: 'github' | 'gitlab' | 'bitbucket';
  eventType: string;
  repository?: string;
  data: Record<string, unknown>;
}

/**
 * Generic webhook processing task
 * Use this for handling incoming webhooks asynchronously
 */
export const processWebhookTask = task({
  id: 'process-webhook',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: WebhookPayload) => {
    logger.info('Processing webhook', {
      source: payload.source,
      event: payload.event,
      receivedAt: payload.receivedAt,
    });

    // Route to specific handlers based on source
    switch (payload.source) {
      case 'stripe':
      case 'paddle':
      case 'lemonsqueezy':
        logger.info('Payment webhook received', { provider: payload.source });
        // TODO: Process payment webhook
        break;

      case 'github':
      case 'gitlab':
      case 'bitbucket':
        logger.info('Git webhook received', { provider: payload.source });
        // TODO: Process git webhook
        break;

      default:
        logger.warn('Unknown webhook source', { source: payload.source });
    }

    return {
      success: true,
      processedAt: new Date().toISOString(),
    };
  },
});

/**
 * Payment webhook processing task
 * Handles payment-related events from Stripe, Paddle, etc.
 */
export const processPaymentWebhookTask = task({
  id: 'process-payment-webhook',
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 60000,
    factor: 2,
  },
  run: async (payload: ProcessPaymentWebhookPayload) => {
    logger.info('Processing payment webhook', {
      provider: payload.provider,
      eventType: payload.eventType,
    });

    // TODO: Implement actual payment webhook processing
    // This would typically:
    // 1. Verify the webhook signature
    // 2. Update subscription/payment status in database
    // 3. Send confirmation emails
    // 4. Trigger any follow-up actions

    switch (payload.eventType) {
      case 'checkout.session.completed':
      case 'subscription.created':
        logger.info('New subscription/purchase', { provider: payload.provider });
        // TODO: Provision access, send welcome email
        break;

      case 'subscription.updated':
        logger.info('Subscription updated', { provider: payload.provider });
        // TODO: Update user's plan
        break;

      case 'subscription.deleted':
      case 'subscription.cancelled':
        logger.info('Subscription cancelled', { provider: payload.provider });
        // TODO: Revoke access, send cancellation email
        break;

      case 'invoice.payment_failed':
        logger.warn('Payment failed', { provider: payload.provider });
        // TODO: Send payment failed notification
        break;

      default:
        logger.info('Unhandled payment event', { eventType: payload.eventType });
    }

    return {
      success: true,
      provider: payload.provider,
      eventType: payload.eventType,
      processedAt: new Date().toISOString(),
    };
  },
});

/**
 * Git webhook processing task
 * Handles git events from GitHub, GitLab, Bitbucket
 */
export const processGitWebhookTask = task({
  id: 'process-git-webhook',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    factor: 2,
  },
  run: async (payload: ProcessGitWebhookPayload) => {
    logger.info('Processing git webhook', {
      provider: payload.provider,
      eventType: payload.eventType,
      repository: payload.repository,
    });

    // TODO: Implement actual git webhook processing
    // This would typically:
    // 1. Verify the webhook signature
    // 2. Parse the event data
    // 3. Trigger deployments, notifications, etc.

    switch (payload.eventType) {
      case 'push':
        logger.info('Push event received', { repository: payload.repository });
        // TODO: Trigger deployment, run CI/CD
        break;

      case 'pull_request':
      case 'merge_request':
        logger.info('PR/MR event received', { repository: payload.repository });
        // TODO: Run checks, post comments
        break;

      case 'release':
        logger.info('Release event received', { repository: payload.repository });
        // TODO: Trigger release workflow
        break;

      default:
        logger.info('Unhandled git event', { eventType: payload.eventType });
    }

    return {
      success: true,
      provider: payload.provider,
      eventType: payload.eventType,
      repository: payload.repository,
      processedAt: new Date().toISOString(),
    };
  },
});
