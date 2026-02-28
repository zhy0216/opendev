import { ORPCError } from "@orpc/server";
import { getInject, IEncryptionService } from "@repo/di";
import {
	ISandboxRepository,
	ISessionArtifactRepository,
	ISessionEventRepository,
	ISessionMessageRepository,
	ISessionParticipantRepository,
	ISessionRepository,
	type SandboxRepository,
	type Session,
	type SessionArtifact,
	type SessionArtifactRepository,
	type SessionEvent,
	type SessionEventRepository,
	type SessionMessage,
	type SessionMessageRepository,
	type SessionParticipant,
	type SessionParticipantRepository,
	type SessionRepository,
} from "@repo/repository";
import type { EncryptionService } from "@repo/service";
import { ISandboxManager, type SandboxManager } from "@repo/service";
import type { ResponseType, SandboxStatus } from "@repo/types";
import {
	type CreateSessionOutput,
	type CreateSessionUseCase,
	ICreateSessionUseCase,
	IQueuePromptUseCase,
	type QueuePromptOutput,
	type QueuePromptUseCase,
} from "@repo/use-case";
import { z } from "zod";
import { handleRoute, protectedProcedure, resolve } from "./procedure";

/**
 * Verifies the user is a participant in the session, throwing FORBIDDEN if not.
 */
async function requireParticipant(
	sessionId: string,
	userId: string,
): Promise<SessionParticipant> {
	const participantRepo = resolve<SessionParticipantRepository>(
		ISessionParticipantRepository,
	);
	const membership = await participantRepo.findMembership(sessionId, userId);
	if (!membership) {
		throw new ORPCError("FORBIDDEN", {
			message: "You are not a participant in this session",
		});
	}
	return membership;
}

const list = protectedProcedure
	.input(
		z
			.object({
				status: z.string().optional(),
				projectId: z.string().uuid().optional(),
				limit: z.number().int().positive().optional(),
				offset: z.number().int().nonnegative().optional(),
			})
			.optional(),
	)
	.handler(async ({ input, context }): Promise<ResponseType<Session[]>> => {
		return handleRoute(async () => {
			const sessionRepo = resolve<SessionRepository>(ISessionRepository);
			const sessions = await sessionRepo.findByUserId(context.user.id, {
				status: input?.status,
				projectId: input?.projectId,
				limit: input?.limit,
				offset: input?.offset,
			});
			return { success: true, data: sessions };
		}, "Failed to list sessions");
	});

const get = protectedProcedure
	.input(
		z.object({
			id: z.string().uuid(),
		}),
	)
	.handler(async ({ input, context }): Promise<ResponseType<Session>> => {
		return handleRoute(async () => {
			const sessionRepo = resolve<SessionRepository>(ISessionRepository);

			const session = await sessionRepo.findById(input.id);
			if (!session) {
				return { success: false, error: "Session not found" };
			}

			await requireParticipant(input.id, context.user.id);
			return { success: true, data: session };
		}, "Failed to get session");
	});

const create = protectedProcedure
	.input(
		z.object({
			name: z.string().min(1, "Name is required"),
			projectId: z.string().uuid(),
			branchName: z.string().optional(),
			model: z.string().optional(),
			reasoningEffort: z.string().optional(),
			organizationId: z.string().uuid().optional(),
		}),
	)
	.handler(
		async ({ input, context }): Promise<ResponseType<CreateSessionOutput>> => {
			return handleRoute(async () => {
				const createSessionUseCase = resolve<CreateSessionUseCase>(
					ICreateSessionUseCase,
				);

				const result = await createSessionUseCase.execute({
					name: input.name,
					projectId: input.projectId,
					branchName: input.branchName,
					model: input.model ?? "claude-sonnet-4-20250514",
					reasoningEffort: input.reasoningEffort,
					userId: context.user.id,
					organizationId: input.organizationId,
				});

				return { success: true, data: result };
			}, "Failed to create session");
		},
	);

const deleteSession = protectedProcedure
	.input(
		z.object({
			id: z.string().uuid(),
		}),
	)
	.handler(async ({ input, context }): Promise<ResponseType<boolean>> => {
		return handleRoute(async () => {
			const sessionRepo = resolve<SessionRepository>(ISessionRepository);
			const membership = await requireParticipant(input.id, context.user.id);

			if (membership.role !== "owner") {
				throw new ORPCError("FORBIDDEN", {
					message: "Only the session owner can delete this session",
				});
			}

			const deleted = await sessionRepo.delete(input.id);
			if (!deleted) {
				return { success: false, error: "Session not found" };
			}

			return { success: true, data: true };
		}, "Failed to delete session");
	});

const archive = protectedProcedure
	.input(
		z.object({
			id: z.string().uuid(),
		}),
	)
	.handler(async ({ input, context }): Promise<ResponseType<boolean>> => {
		return handleRoute(async () => {
			await requireParticipant(input.id, context.user.id);

			const sessionRepo = resolve<SessionRepository>(ISessionRepository);
			await sessionRepo.archive(input.id);
			return { success: true, data: true };
		}, "Failed to archive session");
	});

const unarchive = protectedProcedure
	.input(
		z.object({
			id: z.string().uuid(),
		}),
	)
	.handler(async ({ input, context }): Promise<ResponseType<boolean>> => {
		return handleRoute(async () => {
			await requireParticipant(input.id, context.user.id);

			const sessionRepo = resolve<SessionRepository>(ISessionRepository);
			await sessionRepo.unarchive(input.id);
			return { success: true, data: true };
		}, "Failed to unarchive session");
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
		}),
	)
	.handler(
		async ({ input, context }): Promise<ResponseType<QueuePromptOutput>> => {
			return handleRoute(async () => {
				const queuePromptUseCase =
					resolve<QueuePromptUseCase>(IQueuePromptUseCase);

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
			}, "Failed to queue prompt");
		},
	);

const getEvents = protectedProcedure
	.input(
		z.object({
			sessionId: z.string().uuid(),
			cursor: z.string().optional(),
			limit: z.number().int().positive().optional(),
		}),
	)
	.handler(
		async ({ input, context }): Promise<ResponseType<SessionEvent[]>> => {
			return handleRoute(async () => {
				await requireParticipant(input.sessionId, context.user.id);

				const eventRepo = resolve<SessionEventRepository>(
					ISessionEventRepository,
				);

				let cursor: { timestamp: Date; id: string } | undefined;
				if (input.cursor) {
					const [timestamp, id] = input.cursor.split("|");
					if (timestamp && id) {
						cursor = { timestamp: new Date(timestamp), id };
					}
				}

				const events = await eventRepo.findBySession(
					input.sessionId,
					cursor,
					input.limit,
				);
				return { success: true, data: events };
			}, "Failed to get events");
		},
	);

const getArtifacts = protectedProcedure
	.input(
		z.object({
			sessionId: z.string().uuid(),
		}),
	)
	.handler(
		async ({ input, context }): Promise<ResponseType<SessionArtifact[]>> => {
			return handleRoute(async () => {
				await requireParticipant(input.sessionId, context.user.id);

				const artifactRepo = resolve<SessionArtifactRepository>(
					ISessionArtifactRepository,
				);
				const artifacts = await artifactRepo.findBySession(input.sessionId);
				return { success: true, data: artifacts };
			}, "Failed to get artifacts");
		},
	);

const getParticipants = protectedProcedure
	.input(
		z.object({
			sessionId: z.string().uuid(),
		}),
	)
	.handler(
		async ({ input, context }): Promise<ResponseType<SessionParticipant[]>> => {
			return handleRoute(async () => {
				await requireParticipant(input.sessionId, context.user.id);

				const participantRepo = resolve<SessionParticipantRepository>(
					ISessionParticipantRepository,
				);
				const participants = await participantRepo.findBySession(
					input.sessionId,
				);
				return { success: true, data: participants };
			}, "Failed to get participants");
		},
	);

const addParticipant = protectedProcedure
	.input(
		z.object({
			sessionId: z.string().uuid(),
			userId: z.string().uuid(),
			role: z.string().optional(),
		}),
	)
	.handler(
		async ({ input, context }): Promise<ResponseType<SessionParticipant>> => {
			return handleRoute(async () => {
				await requireParticipant(input.sessionId, context.user.id);

				const participantRepo = resolve<SessionParticipantRepository>(
					ISessionParticipantRepository,
				);
				const participant = await participantRepo.add({
					sessionId: input.sessionId,
					userId: input.userId,
					role: input.role ?? "member",
				});

				return { success: true, data: participant };
			}, "Failed to add participant");
		},
	);

const getMessages = protectedProcedure
	.input(
		z.object({
			sessionId: z.string().uuid(),
			limit: z.number().int().positive().optional(),
			offset: z.number().int().nonnegative().optional(),
		}),
	)
	.handler(
		async ({ input, context }): Promise<ResponseType<SessionMessage[]>> => {
			return handleRoute(async () => {
				await requireParticipant(input.sessionId, context.user.id);

				const messageRepo = resolve<SessionMessageRepository>(
					ISessionMessageRepository,
				);
				const messages = await messageRepo.findBySession(
					input.sessionId,
					input.limit,
					input.offset,
				);
				return { success: true, data: messages };
			}, "Failed to get messages");
		},
	);

const getWsToken = protectedProcedure
	.input(
		z.object({
			sessionId: z.string().uuid(),
		}),
	)
	.handler(
		async ({ input, context }): Promise<ResponseType<{ token: string }>> => {
			return handleRoute(async () => {
				await requireParticipant(input.sessionId, context.user.id);

				const encryption = getInject<EncryptionService>(IEncryptionService);
				const token = encryption.encrypt(
					JSON.stringify({
						sessionId: input.sessionId,
						userId: context.user.id,
						exp: Date.now() + 60000,
					}),
				);

				return { success: true, data: { token } };
			}, "Failed to generate WebSocket token");
		},
	);

const getSandboxStatus = protectedProcedure
	.input(
		z.object({
			sessionId: z.string().uuid(),
		}),
	)
	.handler(
		async ({
			input,
			context,
		}): Promise<ResponseType<{ status: SandboxStatus }>> => {
			return handleRoute(async () => {
				await requireParticipant(input.sessionId, context.user.id);

				const sandboxRepo = resolve<SandboxRepository>(ISandboxRepository);
				const sandboxRecord = await sandboxRepo.findBySessionId(
					input.sessionId,
				);

				if (!sandboxRecord) {
					return {
						success: true,
						data: { status: "stopped" as SandboxStatus },
					};
				}

				return {
					success: true,
					data: { status: sandboxRecord.status as SandboxStatus },
				};
			}, "Failed to get sandbox status");
		},
	);

const stopSandbox = protectedProcedure
	.input(
		z.object({
			sessionId: z.string().uuid(),
		}),
	)
	.handler(async ({ input, context }): Promise<ResponseType<boolean>> => {
		return handleRoute(async () => {
			await requireParticipant(input.sessionId, context.user.id);

			const sandboxRepo = resolve<SandboxRepository>(ISandboxRepository);
			const sandboxRecord = await sandboxRepo.findBySessionId(input.sessionId);

			if (!sandboxRecord) {
				return { success: false, error: "No sandbox found for this session" };
			}

			const sandboxManager = resolve<SandboxManager>(ISandboxManager);
			await sandboxManager.stop(sandboxRecord.id);

			return { success: true, data: true };
		}, "Failed to stop sandbox");
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
	getWsToken,
	getSandboxStatus,
	stopSandbox,
};
