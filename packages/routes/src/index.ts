import { integrationSettingRouter } from "./integration-setting.routes";
import { modelPreferenceRouter } from "./model-preference.routes";
import { organizationRouter } from "./organization.routes";
import { projectRouter } from "./project.routes";
import { repoRouter } from "./repo.routes";
import { repoImageRouter } from "./repo-image.routes";
import { secretRouter } from "./secret.routes";
import { sessionRouter } from "./session.routes";
import { userRouter } from "./user.routes";

export const appRouter = {
	project: projectRouter,
	organization: organizationRouter,
	user: userRouter,
	repo: repoRouter,
	session: sessionRouter,
	secret: secretRouter,
	modelPreference: modelPreferenceRouter,
	integrationSetting: integrationSettingRouter,
	repoImage: repoImageRouter,
};

export type AppRouter = typeof appRouter;

export { createContext } from "./orpc";
export {
	checkProjectMembership,
	handleRoute,
	internalProcedure,
	projectIdSchema,
	protectedProcedure,
	publicProcedure,
	resolve,
} from "./procedure";
