import 'reflect-metadata';
import { inject, injectable, optional } from 'inversify';
import { eq, and, isNull } from 'drizzle-orm';
import { modelPreference, type DbClient } from '@repo/db';
import { ITransaction, IDatabase, getInject } from '@repo/di';

export type ModelPreference = typeof modelPreference.$inferSelect;
export type ModelPreferenceCreate = Omit<typeof modelPreference.$inferInsert, 'id' | 'createdAt'>;

export abstract class IModelPreferenceRepository {
  abstract findByOrganization(organizationId?: string): Promise<ModelPreference[]>;
  abstract upsert(data: ModelPreferenceCreate & { id?: string }): Promise<ModelPreference>;
  abstract delete(id: string): Promise<boolean>;
}

@injectable()
export class ModelPreferenceRepository {
  private readonly dbClient: DbClient;

  constructor(@inject(ITransaction) @optional() transaction?: DbClient) {
    this.dbClient = transaction ?? getInject<DbClient>(IDatabase);
  }

  async findByOrganization(organizationId?: string): Promise<ModelPreference[]> {
    return await this.dbClient
      .select()
      .from(modelPreference)
      .where(
        organizationId
          ? eq(modelPreference.organizationId, organizationId)
          : isNull(modelPreference.organizationId)
      );
  }

  async upsert(data: ModelPreferenceCreate & { id?: string }): Promise<ModelPreference> {
    if (data.id) {
      const result = await this.dbClient
        .update(modelPreference)
        .set({
          modelId: data.modelId,
          enabled: data.enabled,
          isDefault: data.isDefault,
        })
        .where(eq(modelPreference.id, data.id))
        .returning();
      if (result[0]) return result[0];
    }

    const result = await this.dbClient
      .insert(modelPreference)
      .values(data)
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.dbClient
      .delete(modelPreference)
      .where(eq(modelPreference.id, id))
      .returning();
    return result.length > 0;
  }
}
