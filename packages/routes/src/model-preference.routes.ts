import {
	IModelPreferenceRepository,
	type ModelPreference,
	type ModelPreferenceRepository,
} from "@repo/repository";
import type { ResponseType } from "@repo/types";
import { z } from "zod";
import { handleRoute, protectedProcedure, resolve } from "./procedure";

const list = protectedProcedure
	.input(
		z
			.object({
				organizationId: z.string().uuid().optional(),
			})
			.optional(),
	)
	.handler(async ({ input }): Promise<ResponseType<ModelPreference[]>> => {
		return handleRoute(async () => {
			const repo = resolve<ModelPreferenceRepository>(
				IModelPreferenceRepository,
			);
			const preferences = await repo.findByOrganization(input?.organizationId);
			return { success: true, data: preferences };
		}, "Failed to list model preferences");
	});

const update = protectedProcedure
	.input(
		z.object({
			id: z.string().uuid().optional(),
			organizationId: z.string().uuid().optional(),
			modelId: z.string().min(1),
			enabled: z.boolean(),
			isDefault: z.boolean(),
		}),
	)
	.handler(async ({ input }): Promise<ResponseType<ModelPreference>> => {
		return handleRoute(async () => {
			const repo = resolve<ModelPreferenceRepository>(
				IModelPreferenceRepository,
			);

			const preference = await repo.upsert({
				id: input.id,
				organizationId: input.organizationId,
				modelId: input.modelId,
				enabled: input.enabled,
				isDefault: input.isDefault,
			});

			return { success: true, data: preference };
		}, "Failed to update model preference");
	});

export const modelPreferenceRouter = {
	list,
	update,
};
