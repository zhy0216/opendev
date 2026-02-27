import { ORPCError } from "@orpc/server";
import { type Auth, IAuth } from "@repo/auth";
import { getContainer, getInject } from "@repo/di";
import { getLogger } from "@repo/logger";
import {
	IProjectRepository,
	type ProjectRepository,
	type ProjectUser,
} from "@repo/repository";
import type { ResponseType } from "@repo/types";
import { z } from "zod";
import { internalAuthMiddleware } from "./internal-auth.middleware";
import { authLoggingMiddleware, loggingMiddleware } from "./logging.middleware";
import { type Context, pub } from "./orpc";
import { transactionMiddleware } from "./transaction.middleware";

// ServiceIdentifier type compatible with abstract class tokens
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceIdentifier = abstract new (...args: any[]) => any;

/**
 * Resolves a dependency from the current DI container.
 * Shorthand for `getContainer().get<T>(token)`.
 */
export function resolve<T>(token: ServiceIdentifier): T {
	return getContainer().get<T>(token);
}

/**
 * Wraps a route handler with standardized error handling.
 * Catches errors and returns `{ success: false, error: message }`,
 * while re-throwing ORPCErrors (FORBIDDEN, UNAUTHORIZED, etc.) as-is.
 */
export async function handleRoute<T>(
	fn: () => Promise<ResponseType<T>>,
	fallbackMessage: string,
): Promise<ResponseType<T>> {
	try {
		return await fn();
	} catch (error) {
		if (error instanceof ORPCError) throw error;
		return {
			success: false,
			error: error instanceof Error ? error.message : fallbackMessage,
		};
	}
}

interface AuthContext extends Context {
	user: {
		id: string;
		email: string;
		name: string;
	};
}

export interface ProjectContext extends AuthContext {
	projectMembership: ProjectUser;
}

const authMiddleware = pub.middleware(async ({ context, next }) => {
	const auth = getInject<Auth>(IAuth);
	const session = await auth.api.getSession({
		headers: context.req.headers,
	});

	if (!session?.user) {
		getLogger().warn("Unauthorized access attempt");
		throw new ORPCError("UNAUTHORIZED", {
			message: "You must be logged in to access this resource",
		});
	}

	return next({
		context: { ...context, user: session.user },
	});
});

export const publicProcedure = pub.use(loggingMiddleware);

export const protectedProcedure = pub
	.use(loggingMiddleware)
	.use(transactionMiddleware)
	.use(authMiddleware)
	.use(authLoggingMiddleware);

export const internalProcedure = pub
	.use(loggingMiddleware)
	.use(internalAuthMiddleware);

// Helper function to check project membership
export async function checkProjectMembership(
	projectId: string,
	userId: string,
	allowedRoles: string[],
): Promise<ProjectUser> {
	const log = getLogger().withContext({ projectId, userId });
	const projectRepo = getContainer().get<ProjectRepository>(IProjectRepository);
	const membership = await projectRepo.findUserMembership(projectId, userId);

	if (!membership || !allowedRoles.includes(membership.role)) {
		log
			.withMetadata({ allowedRoles, userRole: membership?.role })
			.warn("Project access denied");
		throw new ORPCError("FORBIDDEN", {
			message: "You do not have permission to access this project",
		});
	}

	log
		.withMetadata({ role: membership.role })
		.debug("Project membership verified");
	return membership;
}

export const projectIdSchema = z.object({ projectId: z.string().uuid() });
