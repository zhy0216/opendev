import 'reflect-metadata';
import { inject, injectable, optional } from 'inversify';
import { eq, and } from 'drizzle-orm';
import { sessionParticipant, type DbClient } from '@repo/db';
import { ITransaction, IDatabase, getInject } from '@repo/di';

export type SessionParticipant = typeof sessionParticipant.$inferSelect;
export type SessionParticipantCreate = typeof sessionParticipant.$inferInsert;

export abstract class ISessionParticipantRepository {
  abstract add(data: SessionParticipantCreate): Promise<SessionParticipant>;
  abstract remove(sessionId: string, userId: string): Promise<boolean>;
  abstract findBySession(sessionId: string): Promise<SessionParticipant[]>;
  abstract findMembership(sessionId: string, userId: string): Promise<SessionParticipant | undefined>;
}

@injectable()
export class SessionParticipantRepository {
  private readonly dbClient: DbClient;

  constructor(@inject(ITransaction) @optional() transaction?: DbClient) {
    this.dbClient = transaction ?? getInject<DbClient>(IDatabase);
  }

  async add(data: SessionParticipantCreate): Promise<SessionParticipant> {
    const result = await this.dbClient
      .insert(sessionParticipant)
      .values(data)
      .returning();
    return result[0];
  }

  async remove(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.dbClient
      .delete(sessionParticipant)
      .where(
        and(
          eq(sessionParticipant.sessionId, sessionId),
          eq(sessionParticipant.userId, userId)
        )
      )
      .returning();
    return result.length > 0;
  }

  async findBySession(sessionId: string): Promise<SessionParticipant[]> {
    return await this.dbClient
      .select()
      .from(sessionParticipant)
      .where(eq(sessionParticipant.sessionId, sessionId));
  }

  async findMembership(
    sessionId: string,
    userId: string
  ): Promise<SessionParticipant | undefined> {
    const result = await this.dbClient
      .select()
      .from(sessionParticipant)
      .where(
        and(
          eq(sessionParticipant.sessionId, sessionId),
          eq(sessionParticipant.userId, userId)
        )
      )
      .limit(1);
    return result[0];
  }
}
