import 'reflect-metadata';
import { inject, injectable, optional } from 'inversify';
import { eq, and, or, lt, desc } from 'drizzle-orm';
import { sessionEvent, type DbClient } from '@repo/db';
import { ITransaction, IDatabase, getInject } from '@repo/di';

export type SessionEvent = typeof sessionEvent.$inferSelect;
export type SessionEventCreate = Omit<typeof sessionEvent.$inferInsert, 'id' | 'createdAt'>;

export abstract class ISessionEventRepository {
  abstract create(data: SessionEventCreate): Promise<SessionEvent>;
  abstract findBySession(sessionId: string, cursor?: { timestamp: Date; id: string }, limit?: number): Promise<SessionEvent[]>;
  abstract findByMessage(messageId: string): Promise<SessionEvent[]>;
}

@injectable()
export class SessionEventRepository {
  private readonly dbClient: DbClient;

  constructor(@inject(ITransaction) @optional() transaction?: DbClient) {
    this.dbClient = transaction ?? getInject<DbClient>(IDatabase);
  }

  async create(data: SessionEventCreate): Promise<SessionEvent> {
    const result = await this.dbClient
      .insert(sessionEvent)
      .values(data)
      .returning();
    return result[0];
  }

  async findBySession(
    sessionId: string,
    cursor?: { timestamp: Date; id: string },
    limit?: number
  ): Promise<SessionEvent[]> {
    let query = this.dbClient
      .select()
      .from(sessionEvent)
      .where(
        cursor
          ? and(
              eq(sessionEvent.sessionId, sessionId),
              or(
                lt(sessionEvent.createdAt, cursor.timestamp),
                and(
                  eq(sessionEvent.createdAt, cursor.timestamp),
                  lt(sessionEvent.id, cursor.id)
                )
              )
            )
          : eq(sessionEvent.sessionId, sessionId)
      )
      .orderBy(desc(sessionEvent.createdAt));

    if (limit) {
      query = query.limit(limit) as typeof query;
    }

    return await query;
  }

  async findByMessage(messageId: string): Promise<SessionEvent[]> {
    return await this.dbClient
      .select()
      .from(sessionEvent)
      .where(eq(sessionEvent.messageId, messageId))
      .orderBy(desc(sessionEvent.createdAt));
  }
}
