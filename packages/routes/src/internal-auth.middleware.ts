import { ORPCError } from '@orpc/server';
import { pub } from './orpc';
import { getInject, IInternalAuthService } from '@repo/di';
import { getLogger } from '@repo/logger';

export const internalAuthMiddleware = pub.middleware(async ({ context, next }) => {
  const authHeader = context.req.headers.get('Authorization');

  if (!authHeader) {
    getLogger().warn('Missing Authorization header for internal request');
    throw new ORPCError('UNAUTHORIZED', { message: 'Missing Authorization header' });
  }

  // Support both "Bearer <token>" and "Internal <token>" formats
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || (parts[0] !== 'Bearer' && parts[0] !== 'Internal')) {
    getLogger().warn('Invalid Authorization header format for internal request');
    throw new ORPCError('UNAUTHORIZED', { message: 'Invalid Authorization header format' });
  }

  const token = parts[1];
  const internalAuthService = getInject<IInternalAuthService>(IInternalAuthService);

  if (!internalAuthService.verifyToken(token)) {
    getLogger().warn('Invalid internal auth token');
    throw new ORPCError('UNAUTHORIZED', { message: 'Invalid internal auth token' });
  }

  return next({ context });
});
