import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import {
  ISessionRepository,
  type Session,
  type SessionParticipant,
  ISessionParticipantRepository,
  IProjectRepository,
  type ProjectRepository,
  ISecretRepository,
  type SecretRepository,
} from '@repo/repository';
import { getInject, IEncryptionService } from '@repo/di';
import { ISandboxManager, ISandboxBridge } from '@repo/service';
import type { EncryptionService } from '@repo/service';
import { createServiceLogger } from '@repo/logger';
import type { UseCase } from '../base.use-case';

const log = createServiceLogger('CreateSessionUseCase');

export interface CreateSessionInput {
  name: string;
  projectId: string;
  branchName?: string;
  model: string;
  reasoningEffort?: string;
  userId: string;
  organizationId?: string;
}

export interface CreateSessionOutput {
  session: Session;
  participant: SessionParticipant;
}

export abstract class ICreateSessionUseCase {
  abstract execute(input: CreateSessionInput): Promise<CreateSessionOutput>;
}

@injectable()
export class CreateSessionUseCase
  implements UseCase<CreateSessionInput, CreateSessionOutput>
{
  constructor(
    @inject(ISessionRepository)
    private readonly sessionRepository: ISessionRepository,
    @inject(ISessionParticipantRepository)
    private readonly participantRepository: ISessionParticipantRepository,
    @inject(IProjectRepository)
    private readonly projectRepository: ProjectRepository,
    @inject(ISandboxManager)
    private readonly sandboxManager: ISandboxManager,
    @inject(ISandboxBridge)
    private readonly sandboxBridge: ISandboxBridge
  ) {}

  async execute(input: CreateSessionInput): Promise<CreateSessionOutput> {
    const project = await this.projectRepository.findById(input.projectId);
    if (!project) {
      throw new Error(`Project not found: ${input.projectId}`);
    }

    const session = await this.sessionRepository.create({
      name: input.name,
      projectId: input.projectId,
      repoOwner: project.repoOwner,
      repoName: project.repoName,
      repoId: project.repoId,
      branchName: input.branchName ?? project.defaultBranch,
      model: input.model,
      reasoningEffort: input.reasoningEffort,
      createdBy: input.userId,
      organizationId: input.organizationId ?? project.organizationId,
    });

    const participant = await this.participantRepository.add({
      sessionId: session.id,
      userId: input.userId,
      role: 'owner',
    });

    // Fire-and-forget: spawn sandbox in the background
    this.spawnSandboxInBackground(
      session.id,
      project.repoOwner,
      project.repoName,
      input.branchName ?? project.defaultBranch ?? '',
      input.model,
      input.reasoningEffort ?? 'medium',
      input.organizationId ?? project.organizationId
    );

    return { session, participant };
  }

  private spawnSandboxInBackground(
    sessionId: string,
    repoOwner: string,
    repoName: string,
    branch: string,
    model: string,
    reasoningEffort: string,
    organizationId?: string | null
  ): void {
    // Defer execution so the wrapping database transaction can commit first.
    // The sandbox record has a foreign key to agentSession, so the session
    // must be visible (committed) before the sandbox insert runs.
    setTimeout(() => {
      (async () => {
        log.warn("start creating sandbox")
        try {
          const secretRepo = getInject<SecretRepository>(ISecretRepository);
          const encryption = getInject<EncryptionService>(IEncryptionService);

          const apiKey = await this.resolveApiKey(secretRepo, encryption, repoOwner, repoName, organizationId) ?? "";
          // TODO: 
          // if (!apiKey) {
          //   log.warn('ANTHROPIC_API_KEY not found', { sessionId, repoOwner, repoName, organizationId });
          //   return;
          // }

          await this.sandboxManager.create(
            sessionId,
            {
              repoOwner,
              repoName,
              branch,
              secrets: {},
              model,
              reasoningEffort,
              apiKey,
            },
            (status) => {
              this.sandboxBridge.emitEvent({
                type: 'sandbox_status_change',
                sandboxId: '',
                sessionId,
                timestamp: Date.now(),
                data: { status },
              });
            }
          );
        } catch (error) {
          log.error(
            'Background sandbox spawn failed',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      })();
    }, 0);
  }

  private async resolveApiKey(
    secretRepo: SecretRepository,
    encryption: EncryptionService,
    repoOwner: string,
    repoName: string,
    organizationId?: string | null
  ): Promise<string | undefined> {
    // 1. Try repo-level secrets first
    const repoSecrets = await secretRepo.getRepoSecrets(repoOwner, repoName);
    const repoApiKeySecret = repoSecrets.find((s) => s.key === 'ANTHROPIC_API_KEY');
    if (repoApiKeySecret) {
      return encryption.decrypt(repoApiKeySecret.encryptedValue);
    }

    // 2. Fall back to organization-level global secret
    if (organizationId) {
      const globalSecret = await secretRepo.getGlobalSecretByKey(organizationId, 'ANTHROPIC_API_KEY');
      if (globalSecret) {
        return encryption.decrypt(globalSecret.encryptedValue);
      }
    }

    return undefined;
  }
}
