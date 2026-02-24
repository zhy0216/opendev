import 'reflect-metadata';
import { inject, injectable, optional } from 'inversify';
import { eq } from 'drizzle-orm';
import { sandbox, type DbClient } from '@repo/db';
import { ITransaction, IDatabase, getInject } from '@repo/di';

export type Sandbox = typeof sandbox.$inferSelect;
export type SandboxCreate = Omit<typeof sandbox.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>;
export type SandboxUpdate = Partial<Omit<SandboxCreate, 'sessionId'>>;

export abstract class ISandboxRepository {
  abstract create(data: SandboxCreate): Promise<Sandbox>;
  abstract findById(id: string): Promise<Sandbox | undefined>;
  abstract findBySessionId(sessionId: string): Promise<Sandbox | undefined>;
  abstract update(id: string, data: SandboxUpdate): Promise<Sandbox | undefined>;
  abstract updateStatus(id: string, status: string): Promise<void>;
  abstract updateHeartbeat(id: string): Promise<void>;
  abstract delete(id: string): Promise<boolean>;
}

@injectable()
export class SandboxRepository {
  private readonly dbClient: DbClient;

  constructor(@inject(ITransaction) @optional() transaction?: DbClient) {
    this.dbClient = transaction ?? getInject<DbClient>(IDatabase);
  }

  async create(data: SandboxCreate): Promise<Sandbox> {
    const result = await this.dbClient
      .insert(sandbox)
      .values(data)
      .returning();
    return result[0];
  }

  async findById(id: string): Promise<Sandbox | undefined> {
    const result = await this.dbClient
      .select()
      .from(sandbox)
      .where(eq(sandbox.id, id))
      .limit(1);
    return result[0];
  }

  async findBySessionId(sessionId: string): Promise<Sandbox | undefined> {
    const result = await this.dbClient
      .select()
      .from(sandbox)
      .where(eq(sandbox.sessionId, sessionId))
      .limit(1);
    return result[0];
  }

  async update(id: string, data: SandboxUpdate): Promise<Sandbox | undefined> {
    const result = await this.dbClient
      .update(sandbox)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sandbox.id, id))
      .returning();
    return result[0];
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.dbClient
      .update(sandbox)
      .set({ status, updatedAt: new Date() })
      .where(eq(sandbox.id, id));
  }

  async updateHeartbeat(id: string): Promise<void> {
    await this.dbClient
      .update(sandbox)
      .set({ lastHeartbeat: new Date(), updatedAt: new Date() })
      .where(eq(sandbox.id, id));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.dbClient
      .delete(sandbox)
      .where(eq(sandbox.id, id))
      .returning();
    return result.length > 0;
  }
}
