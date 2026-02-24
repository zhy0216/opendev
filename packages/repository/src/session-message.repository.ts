import 'reflect-metadata';
import { inject, injectable, optional } from 'inversify';
import { eq, and, asc } from 'drizzle-orm';
import { sessionMessage, type DbClient } from '@repo/db';
import { ITransaction, IDatabase, getInject } from '@repo/di';

export type SessionMessage = typeof sessionMessage.$inferSelect;
export type SessionMessageCreate = Omit<typeof sessionMessage.$inferInsert, 'id' | 'createdAt'>;

export abstract class ISessionMessageRepository {
  abstract create(data: SessionMessageCreate): Promise<SessionMessage>;
  abstract findBySession(sessionId: string, limit?: number, offset?: number): Promise<SessionMessage[]>;
  abstract findPending(sessionId: string): Promise<SessionMessage[]>;
  abstract updateStatus(id: string, status: string): Promise<void>;
}

@injectable()
export class SessionMessageRepository {
  private readonly dbClient: DbClient;

  constructor(@inject(ITransaction) @optional() transaction?: DbClient) {
    this.dbClient = transaction ?? getInject<DbClient>(IDatabase);
  }

  async create(data: SessionMessageCreate): Promise<SessionMessage> {
    const result = await this.dbClient
      .insert(sessionMessage)
      .values(data)
      .returning();
    return result[0];
  }

  async findBySession(sessionId: string, limit?: number, offset?: number): Promise<SessionMessage[]> {
    let query = this.dbClient
      .select()
      .from(sessionMessage)
      .where(eq(sessionMessage.sessionId, sessionId))
      .orderBy(asc(sessionMessage.createdAt));

    if (limit) {
      query = query.limit(limit) as typeof query;
    }
    if (offset) {
      query = query.offset(offset) as typeof query;
    }

    return await query;
  }

  async findPending(sessionId: string): Promise<SessionMessage[]> {
    return await this.dbClient
      .select()
      .from(sessionMessage)
      .where(
        and(
          eq(sessionMessage.sessionId, sessionId),
          eq(sessionMessage.status, 'pending')
        )
      )
      .orderBy(asc(sessionMessage.createdAt));
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.dbClient
      .update(sessionMessage)
      .set({ status })
      .where(eq(sessionMessage.id, id));
  }
}
