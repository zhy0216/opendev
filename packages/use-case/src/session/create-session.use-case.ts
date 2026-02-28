import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import {
  ISessionRepository,
  type Session,
  type SessionParticipant,
  ISessionParticipantRepository,
  IProjectRepository,
  type ProjectRepository,
} from '@repo/repository';
import type { UseCase } from '../base.use-case';

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
    private readonly projectRepository: ProjectRepository
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

    return { session, participant };
  }
}
