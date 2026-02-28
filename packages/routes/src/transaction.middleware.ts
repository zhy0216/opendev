import { type Transaction, type DB } from '@repo/db';
import { runWithTransaction, getInject, IDatabase } from '@repo/di';
import { pub } from './orpc';

export const transactionMiddleware = pub.middleware(async ({ context, next }) => {
  const database = getInject<DB>(IDatabase);

  return await database.transaction(async (tx: Transaction) => {
    return await runWithTransaction(tx, async () => {
      const result = await next({ context });

      if (result && typeof result === 'object' && 'ok' in result && !result.ok) {
        const error = 'error' in result ? result.error : null;
        throw error || new Error('Procedure failed');
      }

      return result;
    });
  });
});
