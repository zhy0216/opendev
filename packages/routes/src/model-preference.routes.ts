import { protectedProcedure } from './procedure';
import { z } from 'zod';
import { getContainer } from '@repo/di';
import {
  IModelPreferenceRepository,
  type ModelPreferenceRepository,
  type ModelPreference,
} from '@repo/repository';
import type { ResponseType } from '@repo/types';

const list = protectedProcedure
  .input(
    z.object({
      organizationId: z.string().uuid().optional(),
    }).optional()
  )
  .handler(async ({ input }): Promise<ResponseType<ModelPreference[]>> => {
    try {
      const repo = getContainer().get<ModelPreferenceRepository>(IModelPreferenceRepository);
      const preferences = await repo.findByOrganization(input?.organizationId);
      return { success: true, data: preferences };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to list model preferences' };
    }
  });

const update = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid().optional(),
      organizationId: z.string().uuid().optional(),
      modelId: z.string().min(1),
      enabled: z.boolean(),
      isDefault: z.boolean(),
    })
  )
  .handler(async ({ input }): Promise<ResponseType<ModelPreference>> => {
    try {
      const repo = getContainer().get<ModelPreferenceRepository>(IModelPreferenceRepository);

      const preference = await repo.upsert({
        id: input.id,
        organizationId: input.organizationId,
        modelId: input.modelId,
        enabled: input.enabled,
        isDefault: input.isDefault,
      });

      return { success: true, data: preference };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update model preference' };
    }
  });

export const modelPreferenceRouter = {
  list,
  update,
};
