import { type Transaction } from '@repo/db';
import { runWithTransaction, getInject, IDatabase } from '@repo/di';
import type { DbClient } from '@repo/db';
import { pub } from './orpc';

export const transactionMiddleware = pub.middleware(async ({ context, next }) => {
  const database = getInject<DbClient>(IDatabase);

  return await (database as any).transaction(async (tx: Transaction) => {
    return await runWithTransaction(tx, async () => {
      const result = await next({ context });

      if (result && typeof result === 'object' && 'ok' in result && !result.ok) {
        throw (result as any).error || new Error('Procedure failed');
      }

      return result;
    });
  });
});
