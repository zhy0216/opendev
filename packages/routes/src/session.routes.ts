import { protectedProcedure } from './procedure';
import { z } from 'zod';
import { getContainer } from '@repo/di';
import {
  ISessionRepository,
  type SessionRepository,
  type Session,
  ISessionParticipantRepository,
  type SessionParticipantRepository,
  type SessionParticipant,
  ISessionMessageRepository,
  type SessionMessageRepository,
  type SessionMessage,
  ISessionEventRepository,
  type SessionEventRepository,
  type SessionEvent,
  ISessionArtifactRepository,
  type SessionArtifactRepository,
  type SessionArtifact,
} from '@repo/repository';
import {
  ICreateSessionUseCase,
  type CreateSessionUseCase,
  type CreateSessionOutput,
  IQueuePromptUseCase,
  type QueuePromptUseCase,
  type QueuePromptOutput,
} from '@repo/use-case';
import type { ResponseType } from '@repo/types';
import { ORPCError } from '@orpc/server';

const list = protectedProcedure
  .input(
    z.object({
      status: z.string().optional(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    }).optional()
  )
  .handler(async ({ input, context }): Promise<ResponseType<Session[]>> => {
    try {
      const sessionRepo = getContainer().get<SessionRepository>(ISessionRepository);
      const sessions = await sessionRepo.findByUserId(context.user.id, {
        status: input?.status,
        limit: input?.limit,
        offset: input?.offset,
      });
      return { success: true, data: sessions };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to list sessions' };
    }
  });

const get = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<Session>> => {
    try {
      const sessionRepo = getContainer().get<SessionRepository>(ISessionRepository);
      const participantRepo = getContainer().get<SessionParticipantRepository>(ISessionParticipantRepository);

      const session = await sessionRepo.findById(input.id);
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      const membership = await participantRepo.findMembership(input.id, context.user.id);
      if (!membership) {
        throw new ORPCError('FORBIDDEN', { message: 'You are not a participant in this session' });
      }

      return { success: true, data: session };
    } catch (error) {
      if (error instanceof ORPCError) throw error;
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get session' };
    }
  });

const create = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1, 'Name is required'),
      repoOwner: z.string().optional(),
      repoName: z.string().optional(),
      model: z.string().optional(),
      reasoningEffort: z.string().optional(),
      organizationId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<CreateSessionOutput>> => {
    try {
      const createSessionUseCase = getContainer().get<CreateSessionUseCase>(ICreateSessionUseCase);

      const result = await createSessionUseCase.execute({
        name: input.name,
        repoOwner: input.repoOwner,
        repoName: input.repoName,
        model: input.model ?? 'claude-sonnet-4-20250514',
        reasoningEffort: input.reasoningEffort,
        userId: context.user.id,
        organizationId: input.organizationId,
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create session' };
    }
  });

const deleteSession = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<boolean>> => {
    try {
      const sessionRepo = getContainer().get<SessionRepository>(ISessionRepository);
      const participantRepo = getContainer().get<SessionParticipantRepository>(ISessionParticipantRepository);

      const membership = await participantRepo.findMembership(input.id, context.user.id);
      if (!membership || membership.role !== 'owner') {
        throw new ORPCError('FORBIDDEN', { message: 'Only the session owner can delete this session' });
      }

      const deleted = await sessionRepo.delete(input.id);
      if (!deleted) {
        return { success: false, error: 'Session not found' };
      }

      return { success: true, data: true };
    } catch (error) {
      if (error instanceof ORPCError) throw error;
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete session' };
    }
  });

const archive = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<boolean>> => {
    try {
      const sessionRepo = getContainer().get<SessionRepository>(ISessionRepository);
      const participantRepo = getContainer().get<SessionParticipantRepository>(ISessionParticipantRepository);

      const membership = await participantRepo.findMembership(input.id, context.user.id);
      if (!membership) {
        throw new ORPCError('FORBIDDEN', { message: 'You are not a participant in this session' });
      }

      await sessionRepo.archive(input.id);
      return { success: true, data: true };
    } catch (error) {
      if (error instanceof ORPCError) throw error;
      return { success: false, error: error instanceof Error ? error.message : 'Failed to archive session' };
    }
  });

const unarchive = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<boolean>> => {
    try {
      const sessionRepo = getContainer().get<SessionRepository>(ISessionRepository);
      const participantRepo = getContainer().get<SessionParticipantRepository>(ISessionParticipantRepository);

      const membership = await participantRepo.findMembership(input.id, context.user.id);
      if (!membership) {
        throw new ORPCError('FORBIDDEN', { message: 'You are not a participant in this session' });
      }

      await sessionRepo.unarchive(input.id);
      return { success: true, data: true };
    } catch (error) {
      if (error instanceof ORPCError) throw error;
      return { success: false, error: error instanceof Error ? error.message : 'Failed to unarchive session' };
    }
  });

const prompt = protectedProcedure
  .input(
    z.object({
      sessionId: z.string().uuid(),
      content: z.string().min(1),
      source: z.string().optional(),
      model: z.string().optional(),
      reasoningEffort: z.string().optional(),
      attachments: z.any().optional(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<QueuePromptOutput>> => {
    try {
      const queuePromptUseCase = getContainer().get<QueuePromptUseCase>(IQueuePromptUseCase);

      const result = await queuePromptUseCase.execute({
        sessionId: input.sessionId,
        userId: context.user.id,
        content: input.content,
        source: input.source,
        model: input.model,
        reasoningEffort: input.reasoningEffort,
        attachments: input.attachments,
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to queue prompt' };
    }
  });

const getEvents = protectedProcedure
  .input(
    z.object({
      sessionId: z.string().uuid(),
      cursor: z.string().optional(),
      limit: z.number().int().positive().optional(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<SessionEvent[]>> => {
    try {
      const participantRepo = getContainer().get<SessionParticipantRepository>(ISessionParticipantRepository);
      const membership = await participantRepo.findMembership(input.sessionId, context.user.id);
      if (!membership) {
        throw new ORPCError('FORBIDDEN', { message: 'You are not a participant in this session' });
      }

      const eventRepo = getContainer().get<SessionEventRepository>(ISessionEventRepository);

      let cursor: { timestamp: Date; id: string } | undefined;
      if (input.cursor) {
        const [timestamp, id] = input.cursor.split('|');
        if (timestamp && id) {
          cursor = { timestamp: new Date(timestamp), id };
        }
      }

      const events = await eventRepo.findBySession(input.sessionId, cursor, input.limit);
      return { success: true, data: events };
    } catch (error) {
      if (error instanceof ORPCError) throw error;
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get events' };
    }
  });

const getArtifacts = protectedProcedure
  .input(
    z.object({
      sessionId: z.string().uuid(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<SessionArtifact[]>> => {
    try {
      const participantRepo = getContainer().get<SessionParticipantRepository>(ISessionParticipantRepository);
      const membership = await participantRepo.findMembership(input.sessionId, context.user.id);
      if (!membership) {
        throw new ORPCError('FORBIDDEN', { message: 'You are not a participant in this session' });
      }

      const artifactRepo = getContainer().get<SessionArtifactRepository>(ISessionArtifactRepository);
      const artifacts = await artifactRepo.findBySession(input.sessionId);
      return { success: true, data: artifacts };
    } catch (error) {
      if (error instanceof ORPCError) throw error;
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get artifacts' };
    }
  });

const getParticipants = protectedProcedure
  .input(
    z.object({
      sessionId: z.string().uuid(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<SessionParticipant[]>> => {
    try {
      const participantRepo = getContainer().get<SessionParticipantRepository>(ISessionParticipantRepository);
      const membership = await participantRepo.findMembership(input.sessionId, context.user.id);
      if (!membership) {
        throw new ORPCError('FORBIDDEN', { message: 'You are not a participant in this session' });
      }

      const participants = await participantRepo.findBySession(input.sessionId);
      return { success: true, data: participants };
    } catch (error) {
      if (error instanceof ORPCError) throw error;
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get participants' };
    }
  });

const addParticipant = protectedProcedure
  .input(
    z.object({
      sessionId: z.string().uuid(),
      userId: z.string().uuid(),
      role: z.string().optional(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<SessionParticipant>> => {
    try {
      const participantRepo = getContainer().get<SessionParticipantRepository>(ISessionParticipantRepository);

      const membership = await participantRepo.findMembership(input.sessionId, context.user.id);
      if (!membership) {
        throw new ORPCError('FORBIDDEN', { message: 'You are not a participant in this session' });
      }

      const participant = await participantRepo.add({
        sessionId: input.sessionId,
        userId: input.userId,
        role: input.role ?? 'member',
      });

      return { success: true, data: participant };
    } catch (error) {
      if (error instanceof ORPCError) throw error;
      return { success: false, error: error instanceof Error ? error.message : 'Failed to add participant' };
    }
  });

const getMessages = protectedProcedure
  .input(
    z.object({
      sessionId: z.string().uuid(),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().nonnegative().optional(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<SessionMessage[]>> => {
    try {
      const participantRepo = getContainer().get<SessionParticipantRepository>(ISessionParticipantRepository);
      const membership = await participantRepo.findMembership(input.sessionId, context.user.id);
      if (!membership) {
        throw new ORPCError('FORBIDDEN', { message: 'You are not a participant in this session' });
      }

      const messageRepo = getContainer().get<SessionMessageRepository>(ISessionMessageRepository);
      const messages = await messageRepo.findBySession(input.sessionId, input.limit, input.offset);
      return { success: true, data: messages };
    } catch (error) {
      if (error instanceof ORPCError) throw error;
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get messages' };
    }
  });

export const sessionRouter = {
  list,
  get,
  create,
  delete: deleteSession,
  archive,
  unarchive,
  prompt,
  getEvents,
  getArtifacts,
  getParticipants,
  addParticipant,
  getMessages,
};
