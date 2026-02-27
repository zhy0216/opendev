import {
	type GitHubRepo,
	type GitHubService,
	IGitHubService,
} from "@repo/service";
import type { ResponseType } from "@repo/types";
import { z } from "zod";
import { handleRoute, protectedProcedure, resolve } from "./procedure";

const list = protectedProcedure
	.input(z.object({ installationId: z.number() }))
	.handler(async ({ input }): Promise<ResponseType<GitHubRepo[]>> => {
		return handleRoute(async () => {
			const githubService = resolve<GitHubService>(IGitHubService);
			const repos = await githubService.listInstalledRepos(
				input.installationId,
			);
			return { success: true, data: repos };
		}, "Failed to list repositories");
	});

const get = protectedProcedure
	.input(
		z.object({
			owner: z.string(),
			name: z.string(),
			installationId: z.number(),
		}),
	)
	.handler(async ({ input }): Promise<ResponseType<GitHubRepo>> => {
		return handleRoute(async () => {
			const githubService = resolve<GitHubService>(IGitHubService);
			const repo = await githubService.getRepo(
				input.owner,
				input.name,
				input.installationId,
			);
			return { success: true, data: repo };
		}, "Failed to get repository");
	});

export const repoRouter = {
	list,
	get,
};
