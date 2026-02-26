import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { getInject, IInternalAuthService, IModalClient } from '@repo/di';
import { ISandboxRepository, type SandboxRepository } from '@repo/repository';
import type { SandboxConfig, SandboxStatus, ExecResult, SandboxEvent } from '@repo/types';
import { createServiceLogger } from '@repo/logger';
import { env } from '@repo/env';

const log = createServiceLogger('SandboxManager');

const TIMEOUTS = {
  SANDBOX_CREATE: 30_000,
  TUNNEL_READY: 15_000,
  INIT: 20_000,
  PROMPT: 900_000,
  EXEC: 60_000,
};

export abstract class ISandboxManager {
  abstract create(sessionId: string, config: SandboxConfig): Promise<{ sandboxId: string; authToken: string }>;
  abstract stop(sandboxId: string): Promise<void>;
  abstract destroy(sandboxId: string): Promise<void>;
  abstract getStatus(sandboxId: string): Promise<SandboxStatus>;
  abstract sendPrompt(
    sandboxId: string,
    prompt: string,
    messageId: string,
    onEvent?: (event: SandboxEvent) => void,
  ): Promise<void>;
  abstract exec(sandboxId: string, command: string): Promise<ExecResult>;
}

interface ActiveSandbox {
  sessionId: string;
  tunnelUrl: string;
  modalSandboxId: string;
  bearerToken: string;
}

@injectable()
export class SandboxManager extends ISandboxManager {
  private activeSandboxes = new Map<string, ActiveSandbox>();

  constructor(
    @inject(IModalClient)
    private readonly modalClient: IModalClient,
  ) {
    super();
  }

  async create(sessionId: string, config: SandboxConfig): Promise<{ sandboxId: string; authToken: string }> {
    const sandboxRepo = getInject<SandboxRepository>(ISandboxRepository);
    const internalAuth = getInject<IInternalAuthService>(IInternalAuthService);

    const { token, hash } = internalAuth.generateSandboxToken();

    const sandboxRecord = await sandboxRepo.create({
      sessionId,
      authTokenHash: hash,
      status: 'pending',
    });

    try {
      await sandboxRepo.updateStatus(sandboxRecord.id, 'starting');

      const modal = await Promise.race([
        this.modalClient.createSandbox({
          image: env.MODAL_SANDBOX_IMAGE ?? 'ghcr.io/your-org/acp-sandbox:latest',
          encryptedPorts: [8080],
          idleTimeout: 1800,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Sandbox creation timed out')), TIMEOUTS.SANDBOX_CREATE),
        ),
      ]);

      const bearerToken = internalAuth.generateToken();
      const initResponse = await fetch(`${modal.tunnelUrl}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          bearerToken,
          model: config.model,
        }),
        signal: AbortSignal.timeout(TIMEOUTS.INIT),
      });

      if (!initResponse.ok) {
        const err = await initResponse.text();
        throw new Error(`Init failed: ${err}`);
      }

      await sandboxRepo.updateStatus(sandboxRecord.id, 'running');

      this.activeSandboxes.set(sandboxRecord.id, {
        sessionId,
        tunnelUrl: modal.tunnelUrl,
        modalSandboxId: modal.sandboxId,
        bearerToken,
      });

      log.info('Sandbox created and initialized', {
        sandboxId: sandboxRecord.id,
        modalSandboxId: modal.sandboxId,
        sessionId,
      });

      return { sandboxId: sandboxRecord.id, authToken: token };
    } catch (err) {
      await sandboxRepo.updateStatus(sandboxRecord.id, 'error');
      log.error('Sandbox creation failed', err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  async sendPrompt(
    sandboxId: string,
    prompt: string,
    messageId: string,
    onEvent?: (event: SandboxEvent) => void,
  ): Promise<void> {
    const active = this.activeSandboxes.get(sandboxId);
    if (!active) {
      throw new Error(`Sandbox not found: ${sandboxId}`);
    }

    log.info('Sending prompt to sandbox', { sandboxId, messageId, promptLength: prompt.length });

    const response = await fetch(`${active.tunnelUrl}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${active.bearerToken}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Prompt failed: ${err}`);
    }

    if (!response.body) {
      throw new Error('No response body for SSE stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastEventTime = Date.now();

    while (true) {
      const readResult = await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          const timeoutMs = TIMEOUTS.PROMPT - (Date.now() - lastEventTime);
          setTimeout(() => reject(new Error('Prompt timed out (no events received)')), Math.max(timeoutMs, 0));
        }),
      ]);
      const { done, value } = readResult;
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ') && eventType) {
          lastEventTime = Date.now();
          try {
            const data = JSON.parse(line.slice(6));
            if (onEvent) {
              onEvent({
                type: eventType as SandboxEvent['type'],
                sandboxId,
                sessionId: active.sessionId,
                messageId,
                timestamp: Date.now(),
                data,
              });
            }
          } catch {
            log.warn('Failed to parse SSE data', { line });
          }
          eventType = '';
        }
      }
    }

    log.info('Prompt completed', { sandboxId, messageId });
  }

  async exec(sandboxId: string, command: string): Promise<ExecResult> {
    const active = this.activeSandboxes.get(sandboxId);
    if (!active) {
      throw new Error(`Sandbox not found: ${sandboxId}`);
    }

    log.info('Executing command in sandbox', { sandboxId, command });

    const response = await fetch(`${active.tunnelUrl}/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${active.bearerToken}`,
      },
      body: JSON.stringify({ command, timeout: TIMEOUTS.EXEC }),
      signal: AbortSignal.timeout(TIMEOUTS.EXEC + 5000),
    });

    if (!response.ok) {
      const err = await response.text();
      return { exitCode: -1, stdout: '', stderr: err };
    }

    return await response.json() as ExecResult;
  }

  async stop(sandboxId: string): Promise<void> {
    const sandboxRepo = getInject<SandboxRepository>(ISandboxRepository);
    const active = this.activeSandboxes.get(sandboxId);

    if (active) {
      try {
        await fetch(`${active.tunnelUrl}/terminate`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${active.bearerToken}` },
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        log.warn('Failed to send terminate to sandbox', { sandboxId });
      }

      try {
        await this.modalClient.terminateSandbox(active.modalSandboxId);
      } catch {
        log.warn('Failed to terminate Modal sandbox', { sandboxId });
      }

      this.activeSandboxes.delete(sandboxId);
    }

    await sandboxRepo.updateStatus(sandboxId, 'stopped');
    log.info('Sandbox stopped', { sandboxId });
  }

  async destroy(sandboxId: string): Promise<void> {
    await this.stop(sandboxId);
  }

  async getStatus(sandboxId: string): Promise<SandboxStatus> {
    const sandboxRepo = getInject<SandboxRepository>(ISandboxRepository);
    const sandboxRecord = await sandboxRepo.findById(sandboxId);
    if (!sandboxRecord) return 'stopped';
    return sandboxRecord.status as SandboxStatus;
  }
}
