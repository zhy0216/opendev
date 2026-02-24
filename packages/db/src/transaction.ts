import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsDatabase, PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';

export type Transaction = PgTransaction<
  PostgresJsQueryResultHKT,
  any,
  ExtractTablesWithRelations<any>
>;

export type DbClient = PostgresJsDatabase<any> | Transaction;
