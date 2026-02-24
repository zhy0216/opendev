import { projectRouter } from './project.routes';
import { organizationRouter } from './organization.routes';
import { userRouter } from './user.routes';

export const appRouter = {
  project: projectRouter,
  organization: organizationRouter,
  user: userRouter,
};

export type AppRouter = typeof appRouter;

export { createContext } from './orpc';
export { publicProcedure, protectedProcedure, checkProjectMembership, projectIdSchema } from './procedure';
