import type { DbClient } from '@repo/db';

// Database
export abstract class IDatabase {
  abstract readonly client: DbClient;
}

export abstract class ITransaction {
  abstract readonly client: DbClient;
}
