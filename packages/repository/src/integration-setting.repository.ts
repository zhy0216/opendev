import 'reflect-metadata';
import { inject, injectable, optional } from 'inversify';
import { eq, and, isNull } from 'drizzle-orm';
import { integrationSetting, type DbClient } from '@repo/db';
import { ITransaction, IDatabase, getInject } from '@repo/di';

export type IntegrationSetting = typeof integrationSetting.$inferSelect;
export type IntegrationSettingCreate = Omit<typeof integrationSetting.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>;

export abstract class IIntegrationSettingRepository {
  abstract findByOrganization(organizationId?: string): Promise<IntegrationSetting[]>;
  abstract upsert(data: IntegrationSettingCreate & { id?: string }): Promise<IntegrationSetting>;
  abstract delete(id: string): Promise<boolean>;
}

@injectable()
export class IntegrationSettingRepository {
  private readonly dbClient: DbClient;

  constructor(@inject(ITransaction) @optional() transaction?: DbClient) {
    this.dbClient = transaction ?? getInject<DbClient>(IDatabase);
  }

  async findByOrganization(organizationId?: string): Promise<IntegrationSetting[]> {
    return await this.dbClient
      .select()
      .from(integrationSetting)
      .where(
        organizationId
          ? eq(integrationSetting.organizationId, organizationId)
          : isNull(integrationSetting.organizationId)
      );
  }

  async upsert(data: IntegrationSettingCreate & { id?: string }): Promise<IntegrationSetting> {
    if (data.id) {
      const result = await this.dbClient
        .update(integrationSetting)
        .set({
          type: data.type,
          config: data.config,
          enabled: data.enabled,
          updatedAt: new Date(),
        })
        .where(eq(integrationSetting.id, data.id))
        .returning();
      if (result[0]) return result[0];
    }

    const result = await this.dbClient
      .insert(integrationSetting)
      .values(data)
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.dbClient
      .delete(integrationSetting)
      .where(eq(integrationSetting.id, id))
      .returning();
    return result.length > 0;
  }
}
