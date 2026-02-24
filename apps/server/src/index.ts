import 'reflect-metadata';
import { RPCHandler } from '@orpc/server/fetch';
import { initializeContainer } from '@repo/bootstrap';
import { env } from '@repo/env';
import { getLogger, generateRequestId, runWithLogContextAsync, createServiceLogger } from '@repo/logger';
import { getInject } from '@repo/di';
import { IAuth, type Auth } from '@repo/auth';
import { ISlackService, IGitHubBotService, ILinearService } from '@repo/service';
import type { SlackService } from '@repo/service';
import type { GitHubBotService } from '@repo/service';
import type { LinearService } from '@repo/service';
import type { WsData } from '@repo/types';
import { roomManager } from './ws/room-manager';
import { handleWsMessage, handleWsOpen, handleWsClose } from './ws/handlers';

// Initialize DI container first (this also configures the logger)
initializeContainer();

const webhookLog = createServiceLogger('WebhookHandler');

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

    // Slack events webhook
    if (url.pathname === '/api/slack/events') {
      try {
        const rawBody = await request.text();
        const slackService = getInject<SlackService>(ISlackService);
        const signature = request.headers.get('x-slack-signature') || '';
        const timestamp = request.headers.get('x-slack-request-timestamp') || '';

        if (!slackService.verifySignature(signature, timestamp, rawBody)) {
          return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 200 });
        }

        const payload = JSON.parse(rawBody) as { type?: string; challenge?: string; event?: { type?: string; channel?: string; ts?: string; text?: string } };

        // Handle Slack URL verification challenge
        if (payload.type === 'url_verification') {
          return new Response(JSON.stringify({ challenge: payload.challenge }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Handle events asynchronously
        if (payload.type === 'event_callback' && payload.event) {
          const event = payload.event;
          if (event.type === 'app_mention' && event.channel) {
            // Process asynchronously - don't await
            slackService.postMessage(event.channel, 'Got it! Creating a session...', event.ts).catch((err) => {
              webhookLog.error('Failed to respond to Slack mention', err instanceof Error ? err : new Error(String(err)));
            });
          }
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        webhookLog.error('Slack webhook error', err instanceof Error ? err : new Error(String(err)));
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // GitHub webhooks
    if (url.pathname === '/api/github/webhooks') {
      try {
        const rawBody = await request.text();
        const githubBotService = getInject<GitHubBotService>(IGitHubBotService);
        const signature = request.headers.get('x-hub-signature-256') || '';
        const event = request.headers.get('x-github-event') || '';

        if (!githubBotService.verifyWebhookSignature(signature, rawBody)) {
          return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 200 });
        }

        const payload = JSON.parse(rawBody);

        // Route based on event type - process asynchronously
        if (event === 'pull_request_review_requested' || (event === 'pull_request' && (payload as { action?: string }).action === 'review_requested')) {
          githubBotService.handlePRReviewRequested(payload).catch((err) => {
            webhookLog.error('Failed to handle PR review requested', err instanceof Error ? err : new Error(String(err)));
          });
        } else if (event === 'issues' && (payload as { action?: string }).action === 'opened') {
          githubBotService.handleIssueMention(payload).catch((err) => {
            webhookLog.error('Failed to handle issue mention', err instanceof Error ? err : new Error(String(err)));
          });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        webhookLog.error('GitHub webhook error', err instanceof Error ? err : new Error(String(err)));
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Linear webhooks
    if (url.pathname === '/api/linear/webhooks') {
      try {
        const rawBody = await request.text();
        const linearService = getInject<LinearService>(ILinearService);
        const signature = request.headers.get('linear-signature') || '';

        if (!linearService.verifyWebhookSignature(signature, rawBody)) {
          return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 200 });
        }

        const payload = JSON.parse(rawBody) as { action?: string; type?: string };

        // Route based on action type - process asynchronously
        if (payload.type === 'Issue' && payload.action === 'update') {
          // Could be assignment or label change - handle both
          linearService.handleIssueAssigned(payload).catch((err) => {
            webhookLog.error('Failed to handle Linear issue assigned', err instanceof Error ? err : new Error(String(err)));
          });
        } else if (payload.action === 'create' && payload.type === 'IssueLabel') {
          linearService.handleLabelAdded(payload).catch((err) => {
            webhookLog.error('Failed to handle Linear label added', err instanceof Error ? err : new Error(String(err)));
          });
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        webhookLog.error('Linear webhook error', err instanceof Error ? err : new Error(String(err)));
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
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
