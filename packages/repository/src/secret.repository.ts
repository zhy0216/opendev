import 'reflect-metadata';
import { inject, injectable, optional } from 'inversify';
import { eq, and, isNull } from 'drizzle-orm';
import { repoSecret, globalSecret, type DbClient } from '@repo/db';
import { ITransaction, IDatabase, getInject } from '@repo/di';

export type RepoSecret = typeof repoSecret.$inferSelect;
export type RepoSecretCreate = Omit<typeof repoSecret.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>;

export type GlobalSecret = typeof globalSecret.$inferSelect;
export type GlobalSecretCreate = Omit<typeof globalSecret.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>;

export abstract class ISecretRepository {
  abstract createRepoSecret(data: RepoSecretCreate): Promise<RepoSecret>;
  abstract getRepoSecrets(repoOwner: string, repoName: string): Promise<RepoSecret[]>;
  abstract deleteRepoSecret(id: string): Promise<boolean>;
  abstract createGlobalSecret(data: GlobalSecretCreate): Promise<GlobalSecret>;
  abstract getGlobalSecrets(orgId?: string): Promise<GlobalSecret[]>;
  abstract deleteGlobalSecret(id: string): Promise<boolean>;
}

@injectable()
export class SecretRepository {
  private readonly dbClient: DbClient;

  constructor(@inject(ITransaction) @optional() transaction?: DbClient) {
    this.dbClient = transaction ?? getInject<DbClient>(IDatabase);
  }

  async createRepoSecret(data: RepoSecretCreate): Promise<RepoSecret> {
    const result = await this.dbClient
      .insert(repoSecret)
      .values(data)
      .returning();
    return result[0];
  }

  async getRepoSecrets(repoOwner: string, repoName: string): Promise<RepoSecret[]> {
    return await this.dbClient
      .select()
      .from(repoSecret)
      .where(
        and(
          eq(repoSecret.repoOwner, repoOwner),
          eq(repoSecret.repoName, repoName)
        )
      );
  }

  async deleteRepoSecret(id: string): Promise<boolean> {
    const result = await this.dbClient
      .delete(repoSecret)
      .where(eq(repoSecret.id, id))
      .returning();
    return result.length > 0;
  }

  async createGlobalSecret(data: GlobalSecretCreate): Promise<GlobalSecret> {
    const result = await this.dbClient
      .insert(globalSecret)
      .values(data)
      .returning();
    return result[0];
  }

  async getGlobalSecrets(orgId?: string): Promise<GlobalSecret[]> {
    return await this.dbClient
      .select()
      .from(globalSecret)
      .where(
        orgId
          ? eq(globalSecret.organizationId, orgId)
          : isNull(globalSecret.organizationId)
      );
  }

  async deleteGlobalSecret(id: string): Promise<boolean> {
    const result = await this.dbClient
      .delete(globalSecret)
      .where(eq(globalSecret.id, id))
      .returning();
    return result.length > 0;
  }
}
