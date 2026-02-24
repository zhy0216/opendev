import 'reflect-metadata';
import { injectable } from 'inversify';
import { createHmac, timingSafeEqual, randomUUID } from 'crypto';
import { env } from '@repo/env';
import { createServiceLogger } from '@repo/logger';

const log = createServiceLogger('LinearService');

export abstract class ILinearService {
  abstract verifyWebhookSignature(signature: string, body: string): boolean;
  abstract handleIssueAssigned(payload: unknown): Promise<{ sessionId: string }>;
  abstract handleLabelAdded(payload: unknown): Promise<{ sessionId: string }>;
  abstract postComment(issueId: string, body: string): Promise<void>;
}

@injectable()
export class LinearService extends ILinearService {
  private readonly configured: boolean;

  constructor() {
    super();
    this.configured = !!(env.LINEAR_API_KEY && env.LINEAR_WEBHOOK_SECRET);
    if (!this.configured) {
      log.warn('Linear credentials not configured. Linear integration will be unavailable.');
    }
  }

  verifyWebhookSignature(signature: string, body: string): boolean {
    if (!env.LINEAR_WEBHOOK_SECRET) return false;
    const expectedSignature = createHmac('sha256', env.LINEAR_WEBHOOK_SECRET).update(body).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async handleIssueAssigned(payload: unknown): Promise<{ sessionId: string }> {
    const data = payload as { data?: { id?: string; title?: string; assignee?: { name?: string } } };
    const issueId = data.data?.id;
    const title = data.data?.title;
    const assignee = data.data?.assignee?.name;
    log.info('Linear issue assigned', { issueId, title, assignee });
    // Placeholder: actual session creation will be wired later
    const sessionId = randomUUID();
    log.info('Created placeholder session for Linear issue assignment', { sessionId, issueId });
    return { sessionId };
  }

  async handleLabelAdded(payload: unknown): Promise<{ sessionId: string }> {
    const data = payload as { data?: { id?: string; title?: string; labels?: { nodes?: { name?: string }[] } } };
    const issueId = data.data?.id;
    const title = data.data?.title;
    log.info('Linear label added', { issueId, title });
    // Placeholder: actual session creation will be wired later
    const sessionId = randomUUID();
    log.info('Created placeholder session for Linear label added', { sessionId, issueId });
    return { sessionId };
  }

  async postComment(issueId: string, body: string): Promise<void> {
    if (!env.LINEAR_API_KEY) {
      log.warn('Linear API key not configured, cannot post comment');
      return;
    }
    log.info('Posting comment to Linear issue', { issueId, bodyLength: body.length });
    try {
      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Authorization': env.LINEAR_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `mutation CommentCreate($input: CommentCreateInput!) { commentCreate(input: $input) { success } }`,
          variables: { input: { issueId, body } },
        }),
      });
      const result = await response.json() as { data?: { commentCreate?: { success?: boolean } } };
      if (!result.data?.commentCreate?.success) {
        log.error('Failed to post Linear comment', undefined, { issueId });
      }
    } catch (err) {
      log.error('Error posting Linear comment', undefined, { issueId, error: String(err) });
    }
  }
}
