import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { IProjectRepository, type ProjectRepository, type Project } from '@repo/repository';
import type { UseCase } from '../base.use-case';

export interface CreateProjectInput {
  name: string;
  url: string;
  userId: string;
}

export interface CreateProjectOutput {
  project: Project;
}

export abstract class ICreateProjectUseCase {
  abstract execute(input: CreateProjectInput): Promise<CreateProjectOutput>;
}

@injectable()
export class CreateProjectUseCase
  implements UseCase<CreateProjectInput, CreateProjectOutput>
{
  constructor(
    @inject(IProjectRepository)
    private readonly projectRepository: ProjectRepository
  ) {}

  async execute(input: CreateProjectInput): Promise<CreateProjectOutput> {
    const project = await this.projectRepository.create({
      name: input.name,
      url: input.url,
    });

    await this.projectRepository.addUser({
      projectId: project.id,
      userId: input.userId,
      role: 'owner',
    });

    return { project };
  }
}
