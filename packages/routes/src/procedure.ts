import { ORPCError } from '@orpc/server';
import { pub, type Context } from './orpc';
import { IAuth, type Auth } from '@repo/auth';
import { transactionMiddleware } from './transaction.middleware';
import { loggingMiddleware, authLoggingMiddleware } from './logging.middleware';
import { getLogger } from '@repo/logger';
import { z } from 'zod';
import { getContainer, getInject } from '@repo/di';
import { IProjectRepository, type ProjectRepository, type ProjectUser } from '@repo/repository';

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
    getLogger().warn('Unauthorized access attempt');
    throw new ORPCError('UNAUTHORIZED', { message: 'You must be logged in to access this resource' });
  }

  return next({
    context: { ...context, user: session.user },
  });
});

export const publicProcedure = pub
  .use(loggingMiddleware);

export const protectedProcedure = pub
  .use(loggingMiddleware)
  .use(transactionMiddleware)
  .use(authMiddleware)
  .use(authLoggingMiddleware);

// Helper function to check project membership
export async function checkProjectMembership(
  projectId: string,
  userId: string,
  allowedRoles: string[]
): Promise<ProjectUser> {
  const log = getLogger().withContext({ projectId, userId });
  const projectRepo = getContainer().get<ProjectRepository>(IProjectRepository);
  const membership = await projectRepo.findUserMembership(projectId, userId);

  if (!membership || !allowedRoles.includes(membership.role)) {
    log.withMetadata({ allowedRoles, userRole: membership?.role }).warn('Project access denied');
    throw new ORPCError('FORBIDDEN', { message: 'You do not have permission to access this project' });
  }

  log.withMetadata({ role: membership.role }).debug('Project membership verified');
  return membership;
}

export const projectIdSchema = z.object({ projectId: z.string().uuid() });
