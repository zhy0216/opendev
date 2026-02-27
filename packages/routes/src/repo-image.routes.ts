import {
	IRepoImageRepository,
	type RepoImage,
	type RepoImageRepository,
} from "@repo/repository";
import type { ResponseType } from "@repo/types";
import { z } from "zod";
import { handleRoute, protectedProcedure, resolve } from "./procedure";

const list = protectedProcedure
	.input(
		z
			.object({
				repoOwner: z.string().min(1).optional(),
				repoName: z.string().min(1).optional(),
			})
			.optional(),
	)
	.handler(async ({ input }): Promise<ResponseType<RepoImage[]>> => {
		return handleRoute(async () => {
			const repo = resolve<RepoImageRepository>(IRepoImageRepository);
			if (input?.repoOwner && input?.repoName) {
				const images = await repo.findByRepo(input.repoOwner, input.repoName);
				return { success: true, data: images };
			}
			return { success: true, data: [] };
		}, "Failed to list repo images");
	});

const create = protectedProcedure
	.input(
		z.object({
			repoOwner: z.string().min(1),
			repoName: z.string().min(1),
			imageId: z.string().min(1),
			baseSha: z.string().min(1),
		}),
	)
	.handler(async ({ input, context }): Promise<ResponseType<RepoImage>> => {
		return handleRoute(async () => {
			const repo = resolve<RepoImageRepository>(IRepoImageRepository);
			const image = await repo.create({
				repoOwner: input.repoOwner,
				repoName: input.repoName,
				imageId: input.imageId,
				baseSha: input.baseSha,
				status: "building",
				createdBy: context.user.id,
			});
			return { success: true, data: image };
		}, "Failed to create repo image");
	});

const deleteImage = protectedProcedure
	.input(
		z.object({
			id: z.string().uuid(),
		}),
	)
	.handler(async ({ input }): Promise<ResponseType<boolean>> => {
		return handleRoute(async () => {
			const repo = resolve<RepoImageRepository>(IRepoImageRepository);
			const deleted = await repo.delete(input.id);
			if (!deleted) {
				return { success: false, error: "Repo image not found" };
			}
			return { success: true, data: true };
		}, "Failed to delete repo image");
	});

const rebuild = protectedProcedure
	.input(
		z.object({
			id: z.string().uuid(),
		}),
	)
	.handler(async ({ input }): Promise<ResponseType<boolean>> => {
		return handleRoute(async () => {
			const repo = resolve<RepoImageRepository>(IRepoImageRepository);
			const existing = await repo.findById(input.id);
			if (!existing) {
				return { success: false, error: "Repo image not found" };
			}
			await repo.updateStatus(input.id, "building");
			return { success: true, data: true };
		}, "Failed to rebuild repo image");
	});

export const repoImageRouter = {
	list,
	create,
	delete: deleteImage,
	rebuild,
};
