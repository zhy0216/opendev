import 'reflect-metadata';
import { injectable } from 'inversify';
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '@repo/env';
import { createServiceLogger } from '@repo/logger';

const log = createServiceLogger('SlackService');

export abstract class ISlackService {
  abstract verifySignature(signature: string, timestamp: string, body: string): boolean;
  abstract postMessage(channel: string, text: string, threadTs?: string): Promise<void>;
  abstract postBlocks(channel: string, blocks: unknown[], threadTs?: string): Promise<void>;
}

@injectable()
export class SlackService extends ISlackService {
  private botToken: string | undefined;
  private signingSecret: string | undefined;

  constructor() {
    super();
    this.botToken = env.SLACK_BOT_TOKEN;
    this.signingSecret = env.SLACK_SIGNING_SECRET;
    if (!this.botToken || !this.signingSecret) {
      log.warn('Slack credentials not configured. Slack integration will be unavailable.');
    }
  }

  verifySignature(signature: string, timestamp: string, body: string): boolean {
    if (!this.signingSecret) return false;
    const sigBasestring = `v0:${timestamp}:${body}`;
    const mySignature = 'v0=' + createHmac('sha256', this.signingSecret).update(sigBasestring).digest('hex');
    try {
      return timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  async postMessage(channel: string, text: string, threadTs?: string): Promise<void> {
    if (!this.botToken) throw new Error('Slack not configured');
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, text, ...(threadTs ? { thread_ts: threadTs } : {}) }),
    });
    const data = await response.json() as { ok: boolean; error?: string };
    if (!data.ok) {
      log.error('Failed to post Slack message', undefined, { channel, slackError: data.error });
    }
  }

  async postBlocks(channel: string, blocks: unknown[], threadTs?: string): Promise<void> {
    if (!this.botToken) throw new Error('Slack not configured');
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, blocks, ...(threadTs ? { thread_ts: threadTs } : {}) }),
    });
    const data = await response.json() as { ok: boolean; error?: string };
    if (!data.ok) {
      log.error('Failed to post Slack blocks', undefined, { channel, slackError: data.error });
    }
  }
}
