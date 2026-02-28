import 'reflect-metadata';
import { type DbClient, project, projectUser } from '@repo/db';
import { getInject, IDatabase, ITransaction } from '@repo/di';
import { and, type Column, eq, getTableColumns, type SQL } from 'drizzle-orm';
import { inject, injectable, optional } from 'inversify';
import type { BaseRepository } from './base.repository';

export type Project = typeof project.$inferSelect;
export type ProjectCreate = { id?: string; name: string; repoOwner: string; repoName: string; repoId?: string | null; defaultBranch?: string; organizationId?: string | null };
export type ProjectUpdate = Partial<Omit<ProjectCreate, 'id'>>;

export type ProjectUser = typeof projectUser.$inferSelect;
export type ProjectUserCreate = typeof projectUser.$inferInsert;

export abstract class IProjectRepository {
  abstract findById(id: string): Promise<Project | undefined>;
  abstract findAll(): Promise<Project[]>;
  abstract findByUserId(userId: string, organizationId?: string): Promise<Project[]>;
  abstract findByOrganization(organizationId: string): Promise<Project[]>;
  abstract findOne(filter: Partial<Project>): Promise<Project | undefined>;
  abstract create(data: ProjectCreate): Promise<Project>;
  abstract update(id: string, data: ProjectUpdate): Promise<Project | undefined>;
  abstract delete(id: string): Promise<boolean>;
  abstract exists(id: string): Promise<boolean>;
  abstract addUser(data: ProjectUserCreate): Promise<ProjectUser>;
  abstract findUserMembership(projectId: string, userId: string): Promise<ProjectUser | undefined>;
}

@injectable()
export class ProjectRepository
  implements BaseRepository<Project, ProjectCreate, ProjectUpdate>
{
  private readonly dbClient: DbClient;

  constructor(@inject(ITransaction) @optional() transaction?: DbClient) {
    this.dbClient = transaction ?? getInject<DbClient>(IDatabase);
  }

  async findById(id: string): Promise<Project | undefined> {
    const result = await this.dbClient
      .select()
      .from(project)
      .where(eq(project.id, id))
      .limit(1);
    return result[0];
  }

  async findAll(): Promise<Project[]> {
    return await this.dbClient.select().from(project);
  }

  async findByUserId(userId: string, organizationId?: string): Promise<Project[]> {
    const conditions = [eq(projectUser.userId, userId)];
    if (organizationId) {
      conditions.push(eq(project.organizationId, organizationId));
    }
    const result = await this.dbClient
      .select({ project })
      .from(project)
      .innerJoin(projectUser, eq(project.id, projectUser.projectId))
      .where(and(...conditions));
    return result.map((r) => r.project);
  }

  async findByOrganization(organizationId: string): Promise<Project[]> {
    return await this.dbClient
      .select()
      .from(project)
      .where(eq(project.organizationId, organizationId));
  }

  async findOne(filter: Partial<Project>): Promise<Project | undefined> {
    const columns = getTableColumns(project);
    const conditions: SQL[] = [];
    for (const [key, value] of Object.entries(filter)) {
      const column = columns[key as keyof typeof columns] as Column | undefined;
      if (column) {
        conditions.push(eq(column, value as string));
      }
    }

    if (conditions.length === 0) return undefined;

    const result = await this.dbClient
      .select()
      .from(project)
      .where(and(...conditions))
      .limit(1);
    return result[0];
  }

  async create(data: ProjectCreate): Promise<Project> {
    const result = await this.dbClient
      .insert(project)
      .values({ name: data.name, repoOwner: data.repoOwner, repoName: data.repoName, repoId: data.repoId, defaultBranch: data.defaultBranch, organizationId: data.organizationId })
      .returning();
    return result[0];
  }

  async update(id: string, data: ProjectUpdate): Promise<Project | undefined> {
    const result = await this.dbClient
      .update(project)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(project.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.dbClient
      .delete(project)
      .where(eq(project.id, id))
      .returning();
    return result.length > 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return result !== undefined;
  }

  async addUser(data: ProjectUserCreate): Promise<ProjectUser> {
    const result = await this.dbClient
      .insert(projectUser)
      .values(data)
      .returning();
    return result[0];
  }

  async findUserMembership(
    projectId: string,
    userId: string
  ): Promise<ProjectUser | undefined> {
    const result = await this.dbClient
      .select()
      .from(projectUser)
      .where(
        and(eq(projectUser.projectId, projectId), eq(projectUser.userId, userId))
      )
      .limit(1);
    return result[0];
  }
}
