import 'reflect-metadata';
import { inject, injectable, optional } from 'inversify';
import { eq } from 'drizzle-orm';
import { sessionArtifact, type DbClient } from '@repo/db';
import { ITransaction, IDatabase, getInject } from '@repo/di';

export type SessionArtifact = typeof sessionArtifact.$inferSelect;
export type SessionArtifactCreate = Omit<typeof sessionArtifact.$inferInsert, 'id' | 'createdAt'>;
export type SessionArtifactUpdate = Partial<Omit<SessionArtifactCreate, 'sessionId'>>;

export abstract class ISessionArtifactRepository {
  abstract create(data: SessionArtifactCreate): Promise<SessionArtifact>;
  abstract findBySession(sessionId: string): Promise<SessionArtifact[]>;
  abstract update(id: string, data: SessionArtifactUpdate): Promise<SessionArtifact | undefined>;
}

@injectable()
export class SessionArtifactRepository {
  private readonly dbClient: DbClient;

  constructor(@inject(ITransaction) @optional() transaction?: DbClient) {
    this.dbClient = transaction ?? getInject<DbClient>(IDatabase);
  }

  async create(data: SessionArtifactCreate): Promise<SessionArtifact> {
    const result = await this.dbClient
      .insert(sessionArtifact)
      .values(data)
      .returning();
    return result[0];
  }

  async findBySession(sessionId: string): Promise<SessionArtifact[]> {
    return await this.dbClient
      .select()
      .from(sessionArtifact)
      .where(eq(sessionArtifact.sessionId, sessionId));
  }

  async update(id: string, data: SessionArtifactUpdate): Promise<SessionArtifact | undefined> {
    const result = await this.dbClient
      .update(sessionArtifact)
      .set({ ...data })
      .where(eq(sessionArtifact.id, id))
      .returning();
    return result[0];
  }
}
