import { protectedProcedure } from './procedure';
import { z } from 'zod';
import { getContainer } from '@repo/di';
import { IGitHubService, type GitHubService, type GitHubRepo } from '@repo/service';
import type { ResponseType } from '@repo/types';

const list = protectedProcedure
  .input(z.object({ installationId: z.number() }))
  .handler(async ({ input }): Promise<ResponseType<GitHubRepo[]>> => {
    const githubService = getContainer().get<GitHubService>(IGitHubService);

    try {
      const repos = await githubService.listInstalledRepos(input.installationId);
      return { success: true, data: repos };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list repositories';
      return { success: false, error: message };
    }
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
    const githubService = getContainer().get<GitHubService>(IGitHubService);

    try {
      const repo = await githubService.getRepo(input.owner, input.name, input.installationId);
      return { success: true, data: repo };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get repository';
      return { success: false, error: message };
    }
  });

export const repoRouter = {
  list,
  get,
};
