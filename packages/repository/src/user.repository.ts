import 'reflect-metadata';
import { type DbClient, user } from '@repo/db';
import { getInject, IDatabase, ITransaction } from '@repo/di';
import { and, type Column, eq, getTableColumns, type SQL } from 'drizzle-orm';
import { inject, injectable, optional } from 'inversify';
import type { BaseRepository } from './base.repository';

export type User = typeof user.$inferSelect;
export type UserCreate = Omit<typeof user.$inferInsert, 'createdAt' | 'updatedAt'>;
export type UserUpdate = Partial<Omit<UserCreate, 'id'>>;

export abstract class IUserRepository {
  abstract findById(id: string): Promise<User | undefined>;
  abstract findByEmail(email: string): Promise<User | undefined>;
  abstract findAll(): Promise<User[]>;
  abstract findOne(filter: Partial<User>): Promise<User | undefined>;
  abstract create(data: UserCreate): Promise<User>;
  abstract update(id: string, data: UserUpdate): Promise<User | undefined>;
  abstract delete(id: string): Promise<boolean>;
  abstract exists(id: string): Promise<boolean>;
}

@injectable()
export class UserRepository
  implements BaseRepository<User, UserCreate, UserUpdate>
{
  private readonly dbClient: DbClient;

  constructor(@inject(ITransaction) @optional() transaction?: DbClient) {
    this.dbClient = transaction ?? getInject<DbClient>(IDatabase);
  }

  async findById(id: string): Promise<User | undefined> {
    const result = await this.dbClient
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    return result[0];
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.dbClient
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    return result[0];
  }

  async findAll(): Promise<User[]> {
    return await this.dbClient.select().from(user);
  }

  async findOne(filter: Partial<User>): Promise<User | undefined> {
    const columns = getTableColumns(user);
    const conditions: SQL[] = [];
    for (const [key, value] of Object.entries(filter)) {
      const column = columns[key as keyof typeof columns] as Column | undefined;
      if (column) {
        conditions.push(eq(column, value as string));
      }
    }

    if (conditions.length === 0) return undefined;

    const result = await this.dbClient
      .select()
      .from(user)
      .where(and(...conditions))
      .limit(1);
    return result[0];
  }

  async create(data: UserCreate): Promise<User> {
    const result = await this.dbClient.insert(user).values(data).returning();
    return result[0];
  }

  async update(id: string, data: UserUpdate): Promise<User | undefined> {
    const result = await this.dbClient
      .update(user)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(user.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.dbClient
      .delete(user)
      .where(eq(user.id, id))
      .returning();
    return result.length > 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return result !== undefined;
  }
}
