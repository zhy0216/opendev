import {
	IIntegrationSettingRepository,
	type IntegrationSetting,
	type IntegrationSettingRepository,
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
	.handler(async ({ input }): Promise<ResponseType<IntegrationSetting[]>> => {
		return handleRoute(async () => {
			const repo = resolve<IntegrationSettingRepository>(
				IIntegrationSettingRepository,
			);
			const settings = await repo.findByOrganization(input?.organizationId);
			return { success: true, data: settings };
		}, "Failed to list integration settings");
	});

const update = protectedProcedure
	.input(
		z.object({
			id: z.string().uuid().optional(),
			organizationId: z.string().uuid().optional(),
			type: z.string().min(1),
			config: z.any(),
			enabled: z.boolean(),
		}),
	)
	.handler(async ({ input }): Promise<ResponseType<IntegrationSetting>> => {
		return handleRoute(async () => {
			const repo = resolve<IntegrationSettingRepository>(
				IIntegrationSettingRepository,
			);

			const setting = await repo.upsert({
				id: input.id,
				organizationId: input.organizationId,
				type: input.type,
				config: input.config,
				enabled: input.enabled,
			});

			return { success: true, data: setting };
		}, "Failed to update integration setting");
	});

export const integrationSettingRouter = {
	list,
	update,
};
