import { protectedProcedure } from './procedure';
import { z } from 'zod';
import { getContainer } from '@repo/di';
import {
  IRepoImageRepository,
  type RepoImageRepository,
  type RepoImage,
} from '@repo/repository';
import type { ResponseType } from '@repo/types';

const list = protectedProcedure
  .input(
    z.object({
      repoOwner: z.string().min(1).optional(),
      repoName: z.string().min(1).optional(),
    }).optional()
  )
  .handler(async ({ input }): Promise<ResponseType<RepoImage[]>> => {
    try {
      const repo = getContainer().get<RepoImageRepository>(IRepoImageRepository);
      if (input?.repoOwner && input?.repoName) {
        const images = await repo.findByRepo(input.repoOwner, input.repoName);
        return { success: true, data: images };
      }
      // If no filter provided, return empty array (no "list all" for safety)
      return { success: true, data: [] };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to list repo images' };
    }
  });

const create = protectedProcedure
  .input(
    z.object({
      repoOwner: z.string().min(1),
      repoName: z.string().min(1),
      imageId: z.string().min(1),
      baseSha: z.string().min(1),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<RepoImage>> => {
    try {
      const repo = getContainer().get<RepoImageRepository>(IRepoImageRepository);
      const image = await repo.create({
        repoOwner: input.repoOwner,
        repoName: input.repoName,
        imageId: input.imageId,
        baseSha: input.baseSha,
        status: 'building',
        createdBy: context.user.id,
      });
      return { success: true, data: image };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create repo image' };
    }
  });

const deleteImage = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
    })
  )
  .handler(async ({ input }): Promise<ResponseType<boolean>> => {
    try {
      const repo = getContainer().get<RepoImageRepository>(IRepoImageRepository);
      const deleted = await repo.delete(input.id);
      if (!deleted) {
        return { success: false, error: 'Repo image not found' };
      }
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete repo image' };
    }
  });

const rebuild = protectedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
    })
  )
  .handler(async ({ input }): Promise<ResponseType<boolean>> => {
    try {
      const repo = getContainer().get<RepoImageRepository>(IRepoImageRepository);
      const existing = await repo.findById(input.id);
      if (!existing) {
        return { success: false, error: 'Repo image not found' };
      }
      await repo.updateStatus(input.id, 'building');
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to rebuild repo image' };
    }
  });

export const repoImageRouter = {
  list,
  create,
  delete: deleteImage,
  rebuild,
};
