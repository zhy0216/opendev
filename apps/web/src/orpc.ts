import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import type { RouterClient } from '@orpc/server';
import type { AppRouter } from '@repo/routes';

const link = new RPCLink({
  url: '/rpc',
  fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
});

export const client: RouterClient<AppRouter> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
