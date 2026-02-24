import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import {
  ISessionParticipantRepository,
  ISessionMessageRepository,
  type SessionMessage,
} from '@repo/repository';
import type { UseCase } from '../base.use-case';

export interface QueuePromptInput {
  sessionId: string;
  userId: string;
  content: string;
  source?: string;
  model?: string;
  reasoningEffort?: string;
  attachments?: unknown;
}

export interface QueuePromptOutput {
  message: SessionMessage;
}

export abstract class IQueuePromptUseCase {
  abstract execute(input: QueuePromptInput): Promise<QueuePromptOutput>;
}

@injectable()
export class QueuePromptUseCase
  implements UseCase<QueuePromptInput, QueuePromptOutput>
{
  constructor(
    @inject(ISessionParticipantRepository)
    private readonly participantRepository: ISessionParticipantRepository,
    @inject(ISessionMessageRepository)
    private readonly messageRepository: ISessionMessageRepository
  ) {}

  async execute(input: QueuePromptInput): Promise<QueuePromptOutput> {
    // Verify user is a session participant
    const membership = await this.participantRepository.findMembership(
      input.sessionId,
      input.userId
    );

    if (!membership) {
      throw new Error('User is not a participant in this session');
    }

    // Create message record with status: pending
    const message = await this.messageRepository.create({
      sessionId: input.sessionId,
      authorId: membership.id,
      content: input.content,
      source: input.source ?? 'web',
      model: input.model,
      reasoningEffort: input.reasoningEffort,
      attachments: input.attachments,
      status: 'pending',
    });

    return { message };
  }
}
