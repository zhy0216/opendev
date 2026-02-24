import { protectedProcedure } from './procedure';
import { z } from 'zod';
import { getContainer } from '@repo/di';
import {
  IIntegrationSettingRepository,
  type IntegrationSettingRepository,
  type IntegrationSetting,
} from '@repo/repository';
import type { ResponseType } from '@repo/types';

const list = protectedProcedure
  .input(
    z.object({
      organizationId: z.string().uuid().optional(),
    }).optional()
  )
  .handler(async ({ input }): Promise<ResponseType<IntegrationSetting[]>> => {
    try {
      const repo = getContainer().get<IntegrationSettingRepository>(IIntegrationSettingRepository);
      const settings = await repo.findByOrganization(input?.organizationId);
      return { success: true, data: settings };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to list integration settings' };
    }
  });

const update = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid().optional(),
      organizationId: z.string().uuid().optional(),
      type: z.string().min(1),
      config: z.any(),
      enabled: z.boolean(),
    })
  )
  .handler(async ({ input }): Promise<ResponseType<IntegrationSetting>> => {
    try {
      const repo = getContainer().get<IntegrationSettingRepository>(IIntegrationSettingRepository);

      const setting = await repo.upsert({
        id: input.id,
        organizationId: input.organizationId,
        type: input.type,
        config: input.config,
        enabled: input.enabled,
      });

      return { success: true, data: setting };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update integration setting' };
    }
  });

export const integrationSettingRouter = {
  list,
  update,
};
