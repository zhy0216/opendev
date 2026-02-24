import { protectedProcedure, checkProjectMembership, projectIdSchema } from './procedure';
import { z } from 'zod';
import { getContainer } from '@repo/di';
import { IProjectRepository, type ProjectRepository, type Project } from '@repo/repository';
import { ICreateProjectUseCase, type CreateProjectUseCase } from '@repo/use-case';
import type { ResponseType } from '@repo/types';

const list = protectedProcedure.handler(async ({ context }): Promise<ResponseType<Project[]>> => {
  const projectRepo = getContainer().get<ProjectRepository>(IProjectRepository);
  const projects = await projectRepo.findByUserId(context.user.id);
  return { success: true, data: projects };
});

const get = protectedProcedure
  .input(projectIdSchema)
  .handler(async ({ input, context }): Promise<ResponseType<Project>> => {
    await checkProjectMembership(input.projectId, context.user.id, ['owner', 'member']);

    const projectRepo = getContainer().get<ProjectRepository>(IProjectRepository);
    const project = await projectRepo.findById(input.projectId);

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    return { success: true, data: project };
  });

const create = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1, 'Name is required'),
      url: z.string().url('Must be a valid URL'),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<Project>> => {
    const createProjectUseCase = getContainer().get<CreateProjectUseCase>(
      ICreateProjectUseCase
    );

    const result = await createProjectUseCase.execute({
      name: input.name,
      url: input.url,
      userId: context.user.id,
    });

    return { success: true, data: result.project };
  });

const update = protectedProcedure
  .input(
    z.object({
      projectId: z.string().uuid(),
      name: z.string().min(1).optional(),
      url: z.string().url().optional(),
    })
  )
  .handler(async ({ input, context }): Promise<ResponseType<Project>> => {
    await checkProjectMembership(input.projectId, context.user.id, ['owner']);

    const projectRepo = getContainer().get<ProjectRepository>(IProjectRepository);
    const { projectId, ...updateData } = input;

    const project = await projectRepo.update(projectId, updateData);

    if (!project) {
      return { success: false, error: 'Project not found' };
    }

    return { success: true, data: project };
  });

const deleteProject = protectedProcedure
  .input(projectIdSchema)
  .handler(async ({ input, context }): Promise<ResponseType<boolean>> => {
    await checkProjectMembership(input.projectId, context.user.id, ['owner']);

    const projectRepo = getContainer().get<ProjectRepository>(IProjectRepository);
    const deleted = await projectRepo.delete(input.projectId);

    if (!deleted) {
      return { success: false, error: 'Project not found' };
    }

    return { success: true, data: true };
  });

export const projectRouter = {
  list,
  get,
  create,
  update,
  delete: deleteProject,
};
