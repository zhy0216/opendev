import { projectRouter } from './project.routes';
import { organizationRouter } from './organization.routes';
import { userRouter } from './user.routes';
import { repoRouter } from './repo.routes';

export const appRouter = {
  project: projectRouter,
  organization: organizationRouter,
  user: userRouter,
  repo: repoRouter,
};

export type AppRouter = typeof appRouter;

export { createContext } from './orpc';
export { publicProcedure, protectedProcedure, internalProcedure, checkProjectMembership, projectIdSchema } from './procedure';
