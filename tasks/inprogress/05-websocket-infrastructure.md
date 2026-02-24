# 05 - WebSocket Infrastructure

## Summary

Add WebSocket support to the Bun server for real-time session event streaming. This enables live updates of agent activity (tool calls, token streaming, git operations) to connected clients.

## Reference

`scaffold/background-agents/packages/control-plane/src/session/durable-object.ts` (WebSocket handling)
`scaffold/background-agents/packages/web/src/hooks/use-session-socket.ts` (client protocol)

## Architecture

Bun has native WebSocket support via `Bun.serve()`. We need to:
1. Add a WebSocket upgrade handler at `/ws/sessions/:id`
2. Manage per-session rooms (set of connected clients)
3. Handle authentication via token-based handshake
4. Broadcast sandbox events to all clients in a session room
5. Support presence tracking (who's viewing a session)

## WebSocket Protocol

### Client → Server
```typescript
{ type: "subscribe", token: string, clientId: string }
{ type: "prompt", content: string, model?: string, reasoningEffort?: string }
{ type: "stop" }
{ type: "ping" }
{ type: "presence", status: "active" | "idle" }
{ type: "fetch_history", cursor: { timestamp: number, id: string }, limit: number }
```

### Server → Client
```typescript
{ type: "pong", timestamp: number }
{ type: "subscribed", sessionId, state, participantId, participant, replay }
{ type: "sandbox_event", event: SandboxEvent }
{ type: "history_page", items, hasMore, cursor }
{ type: "presence_sync", participants }
{ type: "presence_update", participants }
{ type: "presence_leave", userId }
{ type: "prompt_queued", messageId, position }
{ type: "sandbox_warming" | "sandbox_spawning" | "sandbox_ready" | "sandbox_error" }
{ type: "artifact_created" | "artifact_updated", artifact }
{ type: "session_status", status }
{ type: "processing_status", isProcessing }
{ type: "error", code, message }
```

## Server Implementation

### SessionRoomManager
```typescript
class SessionRoomManager {
  // Map<sessionId, Set<WebSocket>>
  private rooms: Map<string, Set<ServerWebSocket>>;

  join(sessionId: string, ws: ServerWebSocket): void;
  leave(sessionId: string, ws: ServerWebSocket): void;
  broadcast(sessionId: string, message: ServerMessage): void;
  broadcastExcept(sessionId: string, ws: ServerWebSocket, message: ServerMessage): void;
  getClients(sessionId: string): Set<ServerWebSocket>;
}
```

### WebSocket Token Flow
1. Client calls `POST /rpc session.getWsToken({ sessionId })` → returns short-lived token
2. Client opens WebSocket connection to `/ws/sessions/:id`
3. Client sends `{ type: "subscribe", token, clientId }`
4. Server verifies token, sends `subscribed` with initial state + event replay

### Integration with Bun.serve()
Extend the existing server in `apps/server/src/index.ts` to handle WebSocket upgrades alongside HTTP.

## Implementation Steps

1. Create `packages/types/src/websocket.ts` with message type definitions
2. Create `apps/server/src/ws/` directory:
   - `room-manager.ts` — session room management
   - `handlers.ts` — message handlers (subscribe, prompt, stop, etc.)
   - `auth.ts` — WebSocket token generation and verification
3. Integrate WebSocket into `apps/server/src/index.ts` Bun.serve() config
4. Add `session.getWsToken` route to oRPC
5. Create a broadcast utility that sandbox/agent code can call to emit events

## Dependencies

- Task 01 (schemas — event/participant tables)
- Task 04 (session routes for token endpoint)

## Acceptance Criteria

- WebSocket upgrade works at `/ws/sessions/:id`
- Token-based authentication on subscribe
- Per-session rooms with broadcast
- Presence tracking (join/leave/idle)
- Cursor-based history fetching over WebSocket
- Ping/pong keepalive (30s interval)
- Reconnection-friendly (replay recent events on subscribe)
- No memory leaks (proper cleanup on disconnect)
