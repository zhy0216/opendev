import 'reflect-metadata';
import { inject, injectable, optional } from 'inversify';
import { eq, and, desc } from 'drizzle-orm';
import { repoImage, type DbClient } from '@repo/db';
import { ITransaction, IDatabase, getInject } from '@repo/di';

export type RepoImage = typeof repoImage.$inferSelect;
export type RepoImageCreate = Omit<typeof repoImage.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>;
export type RepoImageUpdate = Partial<Omit<RepoImageCreate, 'createdBy'>>;

export abstract class IRepoImageRepository {
  abstract create(data: RepoImageCreate): Promise<RepoImage>;
  abstract findById(id: string): Promise<RepoImage | undefined>;
  abstract findByRepo(repoOwner: string, repoName: string): Promise<RepoImage[]>;
  abstract findLatestByRepo(repoOwner: string, repoName: string): Promise<RepoImage | undefined>;
  abstract update(id: string, data: RepoImageUpdate): Promise<RepoImage | undefined>;
  abstract updateStatus(id: string, status: string): Promise<void>;
  abstract delete(id: string): Promise<boolean>;
}

@injectable()
export class RepoImageRepository {
  private readonly dbClient: DbClient;

  constructor(@inject(ITransaction) @optional() transaction?: DbClient) {
    this.dbClient = transaction ?? getInject<DbClient>(IDatabase);
  }

  async create(data: RepoImageCreate): Promise<RepoImage> {
    const result = await this.dbClient
      .insert(repoImage)
      .values(data)
      .returning();
    return result[0];
  }

  async findById(id: string): Promise<RepoImage | undefined> {
    const result = await this.dbClient
      .select()
      .from(repoImage)
      .where(eq(repoImage.id, id))
      .limit(1);
    return result[0];
  }

  async findByRepo(repoOwner: string, repoName: string): Promise<RepoImage[]> {
    return await this.dbClient
      .select()
      .from(repoImage)
      .where(
        and(
          eq(repoImage.repoOwner, repoOwner),
          eq(repoImage.repoName, repoName)
        )
      );
  }

  async findLatestByRepo(repoOwner: string, repoName: string): Promise<RepoImage | undefined> {
    const result = await this.dbClient
      .select()
      .from(repoImage)
      .where(
        and(
          eq(repoImage.repoOwner, repoOwner),
          eq(repoImage.repoName, repoName)
        )
      )
      .orderBy(desc(repoImage.createdAt))
      .limit(1);
    return result[0];
  }

  async update(id: string, data: RepoImageUpdate): Promise<RepoImage | undefined> {
    const result = await this.dbClient
      .update(repoImage)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(repoImage.id, id))
      .returning();
    return result[0];
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.dbClient
      .update(repoImage)
      .set({ status, updatedAt: new Date() })
      .where(eq(repoImage.id, id));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.dbClient
      .delete(repoImage)
      .where(eq(repoImage.id, id))
      .returning();
    return result.length > 0;
  }
}
