import 'reflect-metadata';
import { inject, injectable, optional } from 'inversify';
import { eq, and, desc } from 'drizzle-orm';
import { agentSession, type DbClient } from '@repo/db';
import { ITransaction, IDatabase, getInject } from '@repo/di';

export type Session = typeof agentSession.$inferSelect;
export type SessionCreate = Omit<typeof agentSession.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>;
export type SessionUpdate = Partial<Omit<SessionCreate, 'createdBy'>>;

export abstract class ISessionRepository {
  abstract create(data: SessionCreate): Promise<Session>;
  abstract findById(id: string): Promise<Session | undefined>;
  abstract findByUserId(userId: string, filters?: { status?: string; projectId?: string; limit?: number; offset?: number }): Promise<Session[]>;
  abstract update(id: string, data: SessionUpdate): Promise<Session | undefined>;
  abstract delete(id: string): Promise<boolean>;
  abstract updateStatus(id: string, status: string): Promise<void>;
  abstract archive(id: string): Promise<void>;
  abstract unarchive(id: string): Promise<void>;
}

@injectable()
export class SessionRepository {
  private readonly dbClient: DbClient;

  constructor(@inject(ITransaction) @optional() transaction?: DbClient) {
    this.dbClient = transaction ?? getInject<DbClient>(IDatabase);
  }

  async create(data: SessionCreate): Promise<Session> {
    const result = await this.dbClient
      .insert(agentSession)
      .values(data)
      .returning();
    return result[0];
  }

  async findById(id: string): Promise<Session | undefined> {
    const result = await this.dbClient
      .select()
      .from(agentSession)
      .where(eq(agentSession.id, id))
      .limit(1);
    return result[0];
  }

  async findByUserId(
    userId: string,
    filters?: { status?: string; projectId?: string; limit?: number; offset?: number }
  ): Promise<Session[]> {
    const conditions = [eq(agentSession.createdBy, userId)];

    if (filters?.status) {
      conditions.push(eq(agentSession.status, filters.status));
    }
    if (filters?.projectId) {
      conditions.push(eq(agentSession.projectId, filters.projectId));
    }

    let query = this.dbClient
      .select()
      .from(agentSession)
      .where(and(...conditions))
      .orderBy(desc(agentSession.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as typeof query;
    }

    return await query;
  }

  async update(id: string, data: SessionUpdate): Promise<Session | undefined> {
    const result = await this.dbClient
      .update(agentSession)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(agentSession.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.dbClient
      .delete(agentSession)
      .where(eq(agentSession.id, id))
      .returning();
    return result.length > 0;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.dbClient
      .update(agentSession)
      .set({ status, updatedAt: new Date() })
      .where(eq(agentSession.id, id));
  }

  async archive(id: string): Promise<void> {
    await this.dbClient
      .update(agentSession)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(agentSession.id, id));
  }

  async unarchive(id: string): Promise<void> {
    await this.dbClient
      .update(agentSession)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(agentSession.id, id));
  }
}
