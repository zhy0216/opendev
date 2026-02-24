import { projectRouter } from './project.routes';
import { organizationRouter } from './organization.routes';
import { userRouter } from './user.routes';
import { repoRouter } from './repo.routes';
import { sessionRouter } from './session.routes';
import { secretRouter } from './secret.routes';
import { modelPreferenceRouter } from './model-preference.routes';
import { integrationSettingRouter } from './integration-setting.routes';

export const appRouter = {
  project: projectRouter,
  organization: organizationRouter,
  user: userRouter,
  repo: repoRouter,
  session: sessionRouter,
  secret: secretRouter,
  modelPreference: modelPreferenceRouter,
  integrationSetting: integrationSettingRouter,
};

export type AppRouter = typeof appRouter;

export { createContext } from './orpc';
export { publicProcedure, protectedProcedure, internalProcedure, checkProjectMembership, projectIdSchema } from './procedure';
