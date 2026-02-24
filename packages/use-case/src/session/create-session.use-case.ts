import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import {
  ISessionRepository,
  type Session,
  type SessionParticipant,
  ISessionParticipantRepository,
} from '@repo/repository';
import type { UseCase } from '../base.use-case';

export interface CreateSessionInput {
  name: string;
  repoOwner?: string;
  repoName?: string;
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
    private readonly participantRepository: ISessionParticipantRepository
  ) {}

  async execute(input: CreateSessionInput): Promise<CreateSessionOutput> {
    const session = await this.sessionRepository.create({
      name: input.name,
      repoOwner: input.repoOwner,
      repoName: input.repoName,
      model: input.model,
      reasoningEffort: input.reasoningEffort,
      createdBy: input.userId,
      organizationId: input.organizationId,
    });

    const participant = await this.participantRepository.add({
      sessionId: session.id,
      userId: input.userId,
      role: 'owner',
    });

    return { session, participant };
  }
}
