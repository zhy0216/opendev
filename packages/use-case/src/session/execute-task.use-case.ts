import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { IExecuteTaskUseCase } from '@repo/di';
import {
  ISessionMessageRepository,
  ISessionEventRepository,
  ISessionRepository,
  type SessionRepository,
} from '@repo/repository';
import { ISandboxManager } from '@repo/service';
import {
  BlueprintRunner,
  BlueprintEventBridge,
  DEFAULT_TASK_BLUEPRINT,
  HydrateContextHandler,
  ImplementTaskHandler,
  RunLintHandler,
  RunTestsHandler,
  FixLintHandler,
  FixTestsHandler,
  GitCommitHandler,
} from '@repo/blueprint';
import type { BlueprintContext, NodeHandler } from '@repo/blueprint';
import type { UseCase } from '../base.use-case';
import { createServiceLogger } from '@repo/logger';

const log = createServiceLogger('ExecuteTaskUseCase');

export interface ExecuteTaskInput {
  sessionId: string;
  messageId: string;
  prompt: string;
  apiKey?: string;
}

@injectable()
export class ExecuteTaskUseCase
  extends IExecuteTaskUseCase
  implements UseCase<ExecuteTaskInput, void>
{
  private running = new Set<string>();

  constructor(
    @inject(ISessionMessageRepository)
    private readonly messageRepo: ISessionMessageRepository,
    @inject(ISessionEventRepository)
    private readonly eventRepo: ISessionEventRepository,
    @inject(ISandboxManager)
    private readonly sandboxManager: ISandboxManager,
    @inject(ISessionRepository)
    private readonly sessionRepo: SessionRepository,
  ) {
    super();
  }

  private async waitForSandbox(
    sandboxId: string,
    timeoutMs = 60_000,
    intervalMs = 1_000,
  ): Promise<{ sandboxId: string; authToken: string } | undefined> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const status = await this.sandboxManager.getStatus(sandboxId);
      if (status === 'running') {
        return { sandboxId, authToken: '' };
      }
      if (status === 'error' || status === 'stopped') {
        return undefined;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    log.warn('Timed out waiting for sandbox', { sandboxId });
    return undefined;
  }

  async execute(input: ExecuteTaskInput): Promise<void> {
    if (this.running.has(input.sessionId)) {
      throw new Error('Session already has a running task');
    }
    this.running.add(input.sessionId);

    let sandbox: { sandboxId: string; authToken: string } | undefined;

    try {
      const session = await this.sessionRepo.findById(input.sessionId);
      if (!session) {
        throw new Error(`Session not found: ${input.sessionId}`);
      }

      await this.messageRepo.updateStatus(input.messageId, 'processing');

      // Reuse existing sandbox or create a new one
      const existing = await this.sandboxManager.findBySession(input.sessionId);

      if (existing) {
        const status = await this.sandboxManager.getStatus(existing.sandboxId);

        if (status === 'running') {
          log.info('Reusing existing running sandbox', { sandboxId: existing.sandboxId, sessionId: input.sessionId });
          sandbox = { sandboxId: existing.sandboxId, authToken: '' };
        } else if (status === 'starting' || status === 'pending') {
          log.info('Waiting for existing sandbox to become ready', { sandboxId: existing.sandboxId, status, sessionId: input.sessionId });
          sandbox = await this.waitForSandbox(existing.sandboxId);
        }
        // If status is 'error' or 'stopped', sandbox remains undefined and we fall through to create
      }

      if (!sandbox) {
        log.info('Creating new sandbox', { sessionId: input.sessionId });
        sandbox = await this.sandboxManager.create(input.sessionId, {
          repoOwner: session.repoOwner ?? '',
          repoName: session.repoName ?? '',
          branch: session.branchName ?? undefined,
          secrets: {},
          model: session.model ?? 'anthropic/claude-sonnet-4-6',
          reasoningEffort: session.reasoningEffort ?? 'medium',
          apiKey: input.apiKey ?? '',
        });
      }

      // Build exec function for deterministic handlers
      const exec = async (sandboxId: string, command: string) => {
        return await this.sandboxManager.exec(sandboxId, command);
      };

      // Build sendPrompt function for agent handlers
      const sendPrompt = async (sandboxId: string, prompt: string, messageId: string) => {
        log.info('Sandbox agent loop', { sandboxId, messageId, promptLength: prompt.length });
        await this.sandboxManager.sendPrompt(sandboxId, prompt, messageId, async (event) => {
          await this.eventRepo.create({
            sessionId: input.sessionId,
            messageId: input.messageId,
            type: event.type,
            data: event.data,
          });
        });
        return { success: true, filesTouched: [] as string[] };
      };

      // Wire up handlers
      const handlers = new Map<string, NodeHandler>([
        ['hydrate-context', new HydrateContextHandler()],
        ['implement-task', new ImplementTaskHandler(sendPrompt)],
        ['run-lint', new RunLintHandler(exec)],
        ['fix-lint', new FixLintHandler(sendPrompt)],
        ['run-tests', new RunTestsHandler(exec)],
        ['fix-tests', new FixTestsHandler(sendPrompt)],
        ['git-commit', new GitCommitHandler(exec)],
      ]);

      const runner = new BlueprintRunner(handlers);

      // Wire event bridge
      const bridge = new BlueprintEventBridge(
        async (event) => {
          await this.eventRepo.create({
            sessionId: input.sessionId,
            messageId: input.messageId,
            type: event.type,
            data: event.data,
          });
        },
        (_sessionId, _message) => {
          // WebSocket broadcast will be wired at the server layer
        },
      );
      bridge.wire(runner);

      // Build context
      const context: BlueprintContext = {
        sessionId: input.sessionId,
        messageId: input.messageId,
        sandboxId: sandbox.sandboxId,
        prompt: input.prompt,
        repoOwner: session.repoOwner ?? undefined,
        repoName: session.repoName ?? undefined,
        branchName: session.branchName ?? undefined,
        lintErrors: [],
        testFailures: [],
        filesTouched: [],
      };

      // Run blueprint
      const execution = await runner.run(DEFAULT_TASK_BLUEPRINT, context);

      // Update message status
      const finalStatus = execution.status === 'completed' ? 'completed' : 'failed';
      await this.messageRepo.updateStatus(input.messageId, finalStatus);

      log.info('Blueprint execution finished', {
        sessionId: input.sessionId,
        messageId: input.messageId,
        status: execution.status,
        nodeCount: execution.nodeExecutions.length,
      });
    } finally {
      try {
        if (sandbox?.sandboxId) {
          await this.sandboxManager.stop(sandbox.sandboxId);
        }
      } catch (err) {
        log.warn('Failed to stop sandbox', { error: err instanceof Error ? err.message : String(err) });
      }
      this.running.delete(input.sessionId);
    }
  }
}
