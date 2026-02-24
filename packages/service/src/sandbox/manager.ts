import 'reflect-metadata';
import { injectable } from 'inversify';
import { getInject, IInternalAuthService } from '@repo/di';
import { ISandboxRepository, type SandboxRepository } from '@repo/repository';
import type { SandboxConfig, SandboxStatus } from '@repo/types';
import { createServiceLogger } from '@repo/logger';

const log = createServiceLogger('SandboxManager');

export abstract class ISandboxManager {
  abstract create(sessionId: string, config: SandboxConfig): Promise<{ sandboxId: string; authToken: string }>;
  abstract stop(sandboxId: string): Promise<void>;
  abstract destroy(sandboxId: string): Promise<void>;
  abstract getStatus(sandboxId: string): Promise<SandboxStatus>;
  abstract sendPrompt(sandboxId: string, prompt: string, messageId: string): Promise<void>;
}

interface ActiveSandbox {
  process?: unknown;
  sessionId: string;
}

@injectable()
export class SandboxManager extends ISandboxManager {
  private activeSandboxes = new Map<string, ActiveSandbox>();

  async create(sessionId: string, config: SandboxConfig): Promise<{ sandboxId: string; authToken: string }> {
    const sandboxRepo = getInject<SandboxRepository>(ISandboxRepository);
    const internalAuth = getInject<IInternalAuthService>(IInternalAuthService);

    // Generate auth token and hash it
    const { token, hash } = internalAuth.generateSandboxToken();

    // Create sandbox DB record
    const sandboxRecord = await sandboxRepo.create({
      sessionId,
      authTokenHash: hash,
      status: 'pending',
    });

    // Track active sandbox
    this.activeSandboxes.set(sandboxRecord.id, {
      sessionId,
    });

    log.info('Sandbox created', { sandboxId: sandboxRecord.id, sessionId });

    return { sandboxId: sandboxRecord.id, authToken: token };
  }

  async stop(sandboxId: string): Promise<void> {
    const sandboxRepo = getInject<SandboxRepository>(ISandboxRepository);

    await sandboxRepo.updateStatus(sandboxId, 'stopping');

    const active = this.activeSandboxes.get(sandboxId);
    if (active) {
      // Kill process if running (placeholder for MVP)
      this.activeSandboxes.delete(sandboxId);
    }

    await sandboxRepo.updateStatus(sandboxId, 'stopped');

    log.info('Sandbox stopped', { sandboxId });
  }

  async destroy(sandboxId: string): Promise<void> {
    const sandboxRepo = getInject<SandboxRepository>(ISandboxRepository);

    // Stop first if still running
    const active = this.activeSandboxes.get(sandboxId);
    if (active) {
      this.activeSandboxes.delete(sandboxId);
    }

    await sandboxRepo.updateStatus(sandboxId, 'stopped');

    log.info('Sandbox destroyed', { sandboxId });
  }

  async getStatus(sandboxId: string): Promise<SandboxStatus> {
    const sandboxRepo = getInject<SandboxRepository>(ISandboxRepository);

    const sandboxRecord = await sandboxRepo.findById(sandboxId);
    if (!sandboxRecord) {
      return 'stopped';
    }

    return sandboxRecord.status as SandboxStatus;
  }

  async sendPrompt(sandboxId: string, prompt: string, messageId: string): Promise<void> {
    log.info('Sending prompt to sandbox', { sandboxId, messageId, promptLength: prompt.length });

    // Placeholder: in a full implementation this would send the prompt
    // to the running sandbox process via IPC or WebSocket
    const active = this.activeSandboxes.get(sandboxId);
    if (!active) {
      log.warn('Sandbox not found in active map', { sandboxId });
      return;
    }

    log.debug('Prompt queued for sandbox', { sandboxId, messageId });
  }
}
