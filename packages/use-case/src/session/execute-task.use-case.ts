import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { IExecuteTaskUseCase } from '@repo/di';
import {
  ISessionMessageRepository,
  ISessionEventRepository,
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
  repoOwner?: string;
  repoName?: string;
  branchName?: string;
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
  ) {
    super();
  }

  async execute(input: ExecuteTaskInput): Promise<void> {
    if (this.running.has(input.sessionId)) {
      throw new Error('Session already has a running task');
    }
    this.running.add(input.sessionId);

    try {
      await this.messageRepo.updateStatus(input.messageId, 'processing');

      // Ensure sandbox exists
      const sandbox = await this.sandboxManager.create(input.sessionId, {
        repoOwner: input.repoOwner ?? '',
        repoName: input.repoName ?? '',
        branch: input.branchName,
        secrets: {},
        model: 'anthropic/claude-sonnet-4-6',
        reasoningEffort: 'medium',
      });

      // Build exec function for deterministic handlers
      const exec = async (sandboxId: string, command: string) => {
        log.info('Sandbox exec', { sandboxId, command });
        return { exitCode: 0, stdout: '', stderr: '' };
      };

      // Build sendPrompt function for agent handlers
      const sendPrompt = async (sandboxId: string, prompt: string, messageId: string) => {
        log.info('Sandbox agent loop', { sandboxId, messageId, promptLength: prompt.length });
        await this.sandboxManager.sendPrompt(sandboxId, prompt, messageId);
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
        repoOwner: input.repoOwner,
        repoName: input.repoName,
        branchName: input.branchName,
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
      this.running.delete(input.sessionId);
    }
  }
}
