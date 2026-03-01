import type { ServerWebSocket } from 'bun';
import type { WsData, PresenceInfo, ServerMessage } from '@repo/types';
import { createServiceLogger } from '@repo/logger';

const log = createServiceLogger('SessionRoomManager');

export class SessionRoomManager {
  private rooms: Map<string, Set<ServerWebSocket<WsData>>> = new Map();
  private presence: Map<string, Map<string, PresenceInfo>> = new Map();

  join(sessionId: string, ws: ServerWebSocket<WsData>): void {
    let room = this.rooms.get(sessionId);
    if (!room) {
      room = new Set();
      this.rooms.set(sessionId, room);
    }
    room.add(ws);
    log.debug('Client joined room', { sessionId, clientId: ws.data.clientId, roomSize: room.size });
  }

  leave(sessionId: string, ws: ServerWebSocket<WsData>): void {
    const room = this.rooms.get(sessionId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        this.rooms.delete(sessionId);
        this.presence.delete(sessionId);
        log.debug('Room removed (empty)', { sessionId });
      } else {
        log.debug('Client left room', { sessionId, clientId: ws.data.clientId, roomSize: room.size });
      }
    }
  }

  broadcast(sessionId: string, message: ServerMessage): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;

    const payload = JSON.stringify(message);
    for (const client of room) {
      client.send(payload);
    }
  }

  broadcastExcept(sessionId: string, message: ServerMessage, excludeWs: ServerWebSocket<WsData>): void {
    const room = this.rooms.get(sessionId);
    if (!room) return;

    const payload = JSON.stringify(message);
    for (const client of room) {
      if (client !== excludeWs) {
        client.send(payload);
      }
    }
  }

  getClients(sessionId: string): Set<ServerWebSocket<WsData>> {
    return this.rooms.get(sessionId) ?? new Set();
  }

  updatePresence(sessionId: string, info: PresenceInfo): void {
    let sessionPresence = this.presence.get(sessionId);
    if (!sessionPresence) {
      sessionPresence = new Map();
      this.presence.set(sessionId, sessionPresence);
    }
    sessionPresence.set(info.clientId, info);
  }

  removePresence(sessionId: string, clientId: string): void {
    const sessionPresence = this.presence.get(sessionId);
    if (sessionPresence) {
      sessionPresence.delete(clientId);
      if (sessionPresence.size === 0) {
        this.presence.delete(sessionId);
      }
    }
  }

  removePresenceByUserId(sessionId: string, userId: string): void {
    const sessionPresence = this.presence.get(sessionId);
    if (!sessionPresence) return;
    for (const [clientId, info] of sessionPresence) {
      if (info.userId === userId) {
        sessionPresence.delete(clientId);
      }
    }
    if (sessionPresence.size === 0) {
      this.presence.delete(sessionId);
    }
  }

  hasPresenceForUser(sessionId: string, userId: string): boolean {
    const sessionPresence = this.presence.get(sessionId);
    if (!sessionPresence) return false;
    for (const info of sessionPresence.values()) {
      if (info.userId === userId) return true;
    }
    return false;
  }

  getPresence(sessionId: string): PresenceInfo[] {
    const sessionPresence = this.presence.get(sessionId);
    if (!sessionPresence) return [];
    return Array.from(sessionPresence.values());
  }

  getActiveSessionCount(): number {
    return this.rooms.size;
  }

  getClientCount(): number {
    let count = 0;
    for (const room of this.rooms.values()) {
      count += room.size;
    }
    return count;
  }
}

export const roomManager = new SessionRoomManager();
