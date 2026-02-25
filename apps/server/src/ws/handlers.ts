import type { ServerWebSocket } from 'bun';
import type { ClientMessage, WsData, ServerMessage, PresenceInfo } from '@repo/types';
import { getInject, IEncryptionService, IExecuteTaskUseCase } from '@repo/di';
import {
  ISessionParticipantRepository,
  type SessionParticipantRepository,
  ISessionEventRepository,
  type SessionEventRepository,
} from '@repo/repository';
import { IQueuePromptUseCase } from '@repo/use-case';
import { createServiceLogger } from '@repo/logger';
import { roomManager } from './room-manager';

const log = createServiceLogger('WsHandler');

function send(ws: ServerWebSocket<WsData>, message: ServerMessage): void {
  ws.send(JSON.stringify(message));
}

function sendError(ws: ServerWebSocket<WsData>, code: string, message: string): void {
  send(ws, { type: 'error', code, message });
}

async function handleSubscribe(
  ws: ServerWebSocket<WsData>,
  token: string,
  clientId: string
): Promise<void> {
  try {
    const encryption = getInject<InstanceType<typeof import('@repo/service').EncryptionService>>(IEncryptionService);
    const decrypted = encryption.decrypt(token);
    const payload = JSON.parse(decrypted) as { sessionId: string; userId: string; exp: number };

    if (Date.now() > payload.exp) {
      sendError(ws, 'TOKEN_EXPIRED', 'WebSocket token has expired');
      ws.close(4001, 'Token expired');
      return;
    }

    const sessionId = payload.sessionId;
    const userId = payload.userId;

    // Verify participant membership
    const participantRepo = getInject<SessionParticipantRepository>(ISessionParticipantRepository);
    const membership = await participantRepo.findMembership(sessionId, userId);
    if (!membership) {
      sendError(ws, 'FORBIDDEN', 'You are not a participant in this session');
      ws.close(4003, 'Forbidden');
      return;
    }

    // Update ws data
    ws.data.sessionId = sessionId;
    ws.data.userId = userId;
    ws.data.clientId = clientId;
    ws.data.participantId = membership.id;

    // Join room
    roomManager.join(sessionId, ws);

    // Update presence
    const presenceInfo: PresenceInfo = {
      userId,
      clientId,
      status: 'active',
      lastSeen: Date.now(),
    };
    roomManager.updatePresence(sessionId, presenceInfo);

    // Send subscribed confirmation
    send(ws, { type: 'subscribed', sessionId, participantId: membership.id });

    // Broadcast presence sync to all clients in the room
    const participants = roomManager.getPresence(sessionId);
    roomManager.broadcast(sessionId, { type: 'presence_sync', participants });

    log.info('Client subscribed to session', { sessionId, userId, clientId });
  } catch (error) {
    log.error(
      'Subscribe failed',
      error instanceof Error ? error : new Error(String(error))
    );
    sendError(ws, 'SUBSCRIBE_FAILED', 'Failed to subscribe to session');
    ws.close(4000, 'Subscribe failed');
  }
}

function handlePing(ws: ServerWebSocket<WsData>): void {
  send(ws, { type: 'pong', timestamp: Date.now() });
}

function handlePresence(ws: ServerWebSocket<WsData>, status: 'active' | 'idle' | 'typing'): void {
  const { sessionId, userId, clientId } = ws.data;
  if (!sessionId) return;

  const presenceInfo: PresenceInfo = {
    userId,
    clientId,
    status,
    lastSeen: Date.now(),
  };

  roomManager.updatePresence(sessionId, presenceInfo);
  roomManager.broadcast(sessionId, { type: 'presence_update', participant: presenceInfo });
}

async function handleFetchHistory(
  ws: ServerWebSocket<WsData>,
  cursor?: string,
  limit?: number
): Promise<void> {
  const { sessionId } = ws.data;
  if (!sessionId) {
    sendError(ws, 'NOT_SUBSCRIBED', 'You must subscribe to a session first');
    return;
  }

  try {
    const eventRepo = getInject<SessionEventRepository>(ISessionEventRepository);

    let parsedCursor: { timestamp: Date; id: string } | undefined;
    if (cursor) {
      const [timestamp, id] = cursor.split('|');
      if (timestamp && id) {
        parsedCursor = { timestamp: new Date(timestamp), id };
      }
    }

    const fetchLimit = limit ?? 50;
    const events = await eventRepo.findBySession(sessionId, parsedCursor, fetchLimit + 1);

    const hasMore = events.length > fetchLimit;
    const items = hasMore ? events.slice(0, fetchLimit) : events;

    let nextCursor: string | undefined;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = `${lastItem.createdAt.toISOString()}|${lastItem.id}`;
    }

    send(ws, {
      type: 'history_page',
      items,
      hasMore,
      cursor: nextCursor,
    });
  } catch (error) {
    log.error(
      'Failed to fetch history',
      error instanceof Error ? error : new Error(String(error))
    );
    sendError(ws, 'FETCH_FAILED', 'Failed to fetch history');
  }
}

async function handlePrompt(
  ws: ServerWebSocket<WsData>,
  content: string,
  model?: string,
  reasoningEffort?: string
): Promise<void> {
  const { sessionId, userId } = ws.data;
  if (!sessionId) {
    sendError(ws, 'NOT_SUBSCRIBED', 'You must subscribe to a session first');
    return;
  }

  try {
    // Queue the message via existing use case
    const queuePrompt = getInject<IQueuePromptUseCase>(IQueuePromptUseCase);
    const { message } = await queuePrompt.execute({
      sessionId,
      userId,
      content,
      source: 'web',
      model,
      reasoningEffort,
    });

    send(ws, { type: 'prompt_queued', messageId: message.id });
    roomManager.broadcast(sessionId, { type: 'session_status', status: 'processing' });

    // Execute blueprint in the background (don't await — fire and forget)
    const executeTask = getInject<IExecuteTaskUseCase>(IExecuteTaskUseCase);
    executeTask.execute({
      sessionId,
      messageId: message.id,
      prompt: content,
    }).then(() => {
      roomManager.broadcast(sessionId, { type: 'session_status', status: 'completed' });
    }).catch((err) => {
      log.error('Blueprint execution failed', err instanceof Error ? err : new Error(String(err)));
      roomManager.broadcast(sessionId, { type: 'session_status', status: 'failed' });
    });
  } catch (error) {
    log.error('Failed to queue prompt', error instanceof Error ? error : new Error(String(error)));
    sendError(ws, 'PROMPT_FAILED', 'Failed to queue prompt');
  }
}

function handleTyping(ws: ServerWebSocket<WsData>, isTyping: boolean): void {
  const { sessionId, userId, clientId } = ws.data;
  if (!sessionId) return;

  const presenceInfo: PresenceInfo = {
    userId,
    clientId,
    status: isTyping ? 'typing' : 'active',
    lastSeen: Date.now(),
  };

  roomManager.updatePresence(sessionId, presenceInfo);
  roomManager.broadcast(sessionId, { type: 'presence_update', participant: presenceInfo });
}

function handleStop(ws: ServerWebSocket<WsData>): void {
  const { sessionId } = ws.data;
  if (!sessionId) {
    sendError(ws, 'NOT_SUBSCRIBED', 'You must subscribe to a session first');
    return;
  }

  // TODO: wire to BlueprintRunner.stop() when runner instance is accessible
  roomManager.broadcast(sessionId, { type: 'session_status', status: 'stopped' });
  log.info('Stop requested', { sessionId });
}

export async function handleWsMessage(
  ws: ServerWebSocket<WsData>,
  rawMessage: string | Buffer
): Promise<void> {
  try {
    const text = typeof rawMessage === 'string' ? rawMessage : new TextDecoder().decode(rawMessage);
    const message = JSON.parse(text) as ClientMessage;

    switch (message.type) {
      case 'subscribe':
        await handleSubscribe(ws, message.token, message.clientId);
        break;
      case 'ping':
        handlePing(ws);
        break;
      case 'presence':
        handlePresence(ws, message.status);
        break;
      case 'typing':
        handleTyping(ws, message.isTyping);
        break;
      case 'fetch_history':
        await handleFetchHistory(ws, message.cursor, message.limit);
        break;
      case 'prompt':
        await handlePrompt(ws, message.content, message.model, message.reasoningEffort);
        break;
      case 'stop':
        handleStop(ws);
        break;
      default:
        sendError(ws, 'UNKNOWN_MESSAGE', `Unknown message type`);
    }
  } catch (error) {
    log.error(
      'Failed to handle WebSocket message',
      error instanceof Error ? error : new Error(String(error))
    );
    sendError(ws, 'PARSE_ERROR', 'Failed to parse message');
  }
}

export function handleWsOpen(ws: ServerWebSocket<WsData>): void {
  log.debug('WebSocket connection opened');
}

export function handleWsClose(ws: ServerWebSocket<WsData>): void {
  const { sessionId, userId, clientId } = ws.data;
  if (sessionId) {
    roomManager.leave(sessionId, ws);
    roomManager.removePresence(sessionId, clientId);

    // Broadcast presence leave to remaining clients
    if (userId) {
      roomManager.broadcast(sessionId, { type: 'presence_leave', userId });
      // Send updated presence sync
      const participants = roomManager.getPresence(sessionId);
      roomManager.broadcast(sessionId, { type: 'presence_sync', participants });
    }

    log.debug('WebSocket connection closed', { sessionId, userId, clientId });
  }
}
