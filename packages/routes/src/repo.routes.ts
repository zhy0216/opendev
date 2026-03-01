import {
	type GitHubRepo,
	type GitHubService,
	IGitHubService,
} from "@repo/service";
import { type DbClient, account } from "@repo/db";
import { IDatabase } from "@repo/di";
import { getContainer } from "@repo/di";
import { eq, and } from "drizzle-orm";
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

const listUserRepos = protectedProcedure
	.input(
		z
			.object({
				search: z.string().optional(),
			})
			.optional(),
	)
	.handler(
		async ({ context, input }): Promise<ResponseType<GitHubRepo[]>> => {
			return handleRoute(async () => {
				const db = getContainer().get<DbClient>(IDatabase);

				const accounts = await db
					.select()
					.from(account)
					.where(
						and(
							eq(account.userId, context.user.id),
							eq(account.providerId, "github"),
						),
					)
					.limit(1);

				const ghAccount = accounts[0];
				if (!ghAccount?.accessToken) {
					return {
						success: false,
						error: "No GitHub account linked. Please re-login with GitHub.",
					};
				}

				const githubService = resolve<GitHubService>(IGitHubService);
				const repos = await githubService.listUserRepos(
					ghAccount.accessToken,
				);

				if (input?.search) {
					const q = input.search.toLowerCase();
					const filtered = repos.filter(
						(r) =>
							r.fullName.toLowerCase().includes(q) ||
							r.name.toLowerCase().includes(q),
					);
					return { success: true, data: filtered };
				}

				return { success: true, data: repos };
			}, "Failed to list your GitHub repositories");
		},
	);

export const repoRouter = {
	list,
	get,
	listUserRepos,
};
