import 'reflect-metadata';
import { RPCHandler } from '@orpc/server/fetch';
import { initializeContainer } from '@repo/bootstrap';
import { env } from '@repo/env';
import { getLogger, generateRequestId, runWithLogContextAsync } from '@repo/logger';
import { getInject } from '@repo/di';
import { IAuth, type Auth } from '@repo/auth';
import type { WsData } from '@repo/types';
import { roomManager } from './ws/room-manager';
import { handleWsMessage, handleWsOpen, handleWsClose } from './ws/handlers';

// Initialize DI container first (this also configures the logger)
initializeContainer();

// Dynamic imports after container initialization
const { appRouter, createContext } = await import('@repo/routes');

const handler = new RPCHandler(appRouter);

const server = Bun.serve<WsData>({
  port: Number(env.SERVER_PORT),
  async fetch(request, server) {
    const url = new URL(request.url);

    // CORS preflight - no logging needed
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // WebSocket upgrade for session connections
    const wsMatch = url.pathname.match(/^\/ws\/sessions\/([^/]+)$/);
    if (wsMatch) {
      const sessionId = wsMatch[1];
      const upgraded = server.upgrade(request, {
        data: {
          sessionId: sessionId,
          userId: '',
          clientId: '',
          participantId: '',
        } satisfies WsData,
      });
      if (upgraded) {
        return undefined as unknown as Response;
      }
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    // Handle better-auth requests with logging context
    if (url.pathname.startsWith('/api/auth')) {
      const requestId = generateRequestId();
      return runWithLogContextAsync(
        { requestId, path: url.pathname, method: request.method },
        async () => {
          const log = getLogger();
          log.debug('Auth request started');
          const auth = getInject<Auth>(IAuth);
          const response = await auth.handler(request);
          log.debug('Auth request completed');
          return response;
        }
      );
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          ws: {
            activeSessions: roomManager.getActiveSessionCount(),
            connectedClients: roomManager.getClientCount(),
          },
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle oRPC requests (logging middleware is applied via procedures)
    if (url.pathname.startsWith('/rpc')) {
      const context = await createContext(request);
      const { response } = await handler.handle(request, {
        prefix: '/rpc',
        context,
      });

      if (response) {
        // Add CORS headers to response
        response.headers.set('Access-Control-Allow-Origin', '*');
        return response;
      }
    }

    return new Response('oRPC Server');
  },
  websocket: {
    open(ws) {
      handleWsOpen(ws);
    },
    async message(ws, message) {
      await handleWsMessage(ws, message);
    },
    close(ws) {
      handleWsClose(ws);
    },
  },
});

getLogger()
  .withMetadata({
    port: server.port,
    url: `http://localhost:${server.port}`,
    nodeEnv: env.NODE_ENV,
  })
  .info('Server started');
