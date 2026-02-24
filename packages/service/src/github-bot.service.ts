import 'reflect-metadata';
import { injectable } from 'inversify';
import { createHmac, timingSafeEqual, randomUUID } from 'crypto';
import { env } from '@repo/env';
import { createServiceLogger } from '@repo/logger';

const log = createServiceLogger('GitHubBotService');

export abstract class IGitHubBotService {
  abstract verifyWebhookSignature(signature: string, body: string): boolean;
  abstract handlePRReviewRequested(payload: unknown): Promise<{ sessionId: string }>;
  abstract handleIssueMention(payload: unknown): Promise<{ sessionId: string }>;
  abstract postComment(owner: string, repo: string, issueNumber: number, body: string): Promise<void>;
}

@injectable()
export class GitHubBotService extends IGitHubBotService {
  private readonly configured: boolean;

  constructor() {
    super();
    this.configured = !!env.GITHUB_WEBHOOK_SECRET;
    if (!this.configured) {
      log.warn('GitHub webhook secret not configured. GitHub bot integration will be unavailable.');
    }
  }

  verifyWebhookSignature(signature: string, body: string): boolean {
    if (!env.GITHUB_WEBHOOK_SECRET) return false;
    const expectedSignature = 'sha256=' + createHmac('sha256', env.GITHUB_WEBHOOK_SECRET).update(body).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async handlePRReviewRequested(payload: unknown): Promise<{ sessionId: string }> {
    const pr = payload as { pull_request?: { number?: number; title?: string }; repository?: { full_name?: string } };
    const prNumber = pr.pull_request?.number;
    const repoName = pr.repository?.full_name;
    log.info('PR review requested', { prNumber, repoName });
    // Placeholder: actual session creation will be wired later
    const sessionId = randomUUID();
    log.info('Created placeholder session for PR review', { sessionId, prNumber, repoName });
    return { sessionId };
  }

  async handleIssueMention(payload: unknown): Promise<{ sessionId: string }> {
    const issue = payload as { issue?: { number?: number; title?: string }; repository?: { full_name?: string } };
    const issueNumber = issue.issue?.number;
    const repoName = issue.repository?.full_name;
    log.info('Issue mention detected', { issueNumber, repoName });
    // Placeholder: actual session creation will be wired later
    const sessionId = randomUUID();
    log.info('Created placeholder session for issue mention', { sessionId, issueNumber, repoName });
    return { sessionId };
  }

  async postComment(owner: string, repo: string, issueNumber: number, body: string): Promise<void> {
    log.info('postComment called (placeholder)', { owner, repo, issueNumber, bodyLength: body.length });
    // Placeholder: actual GitHub API call will use the GitHub App token
    // POST /repos/{owner}/{repo}/issues/{issue_number}/comments
  }
}
