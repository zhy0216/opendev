# Design: Create Sandbox at Session Creation Time

## Problem

Sandboxes are currently created on-demand when the first prompt is sent. This means users see "Sandbox pending..." on the session page and must wait ~30-45s after sending their first prompt before execution begins.

## Solution

Create the sandbox asynchronously (fire-and-forget) when a session is created. The session creation returns immediately, and the sandbox boots in the background. Status updates stream to the frontend via WebSocket.

## Changes

### 1. CreateSessionUseCase

Add a fire-and-forget sandbox creation step after session + participant creation:

1. Fetch the org-level API key from `globalSecret` table (key: `ANTHROPIC_API_KEY`)
2. Call `SandboxManager.create()` in a non-awaited promise
3. Pass an `onStatusChange` callback that broadcasts status to the WebSocket room
4. Return `{ session, participant }` immediately (no blocking)

### 2. SandboxManager.create() — Status Broadcast Callback

Add an optional `onStatusChange?: (status: SandboxStatus) => void` parameter to `create()`. Call it at each transition: pending, starting, running, error. The caller (use case layer) wires this to WebSocket room broadcasts.

### 3. ExecuteTaskUseCase — Reuse Existing Sandbox

When a prompt arrives, check for an existing sandbox before creating a new one:

- `running` → reuse directly
- `starting`/`pending` → poll until ready (timeout 60s)
- `error`/`stopped`/none → create new sandbox (fallback)

### 4. WebSocket: New `sandbox_status` Message Type

Server broadcasts `{ type: 'sandbox_status', status: SandboxStatus }` to the session room on each transition.

### 5. Frontend

- `useSessionSocket`: handle `sandbox_status` message, update state
- Session page: update banner reactively from WS state instead of from initial session fetch
- Disable/label the send button while sandbox is not `running`

### 6. API Key Resolution

Fetch from `globalSecret` table where `organizationId` matches the session's org and `key = 'ANTHROPIC_API_KEY'`. Decrypt using `EncryptionService`. If not found, sandbox creation fails gracefully with an error status broadcast.

## Files to Modify

- `packages/use-case/src/session/create-session.use-case.ts` — add sandbox creation
- `packages/service/src/sandbox/manager.ts` — add onStatusChange callback
- `packages/use-case/src/session/execute-task.use-case.ts` — reuse existing sandbox
- `packages/types/src/websocket.ts` — add `sandbox_status` message type
- `apps/server/src/ws/handlers.ts` — (no change needed, broadcasts come from use case)
- `apps/web/src/hooks/use-session-socket.ts` — handle `sandbox_status`
- `apps/web/src/routes/dashboard/session.$sessionId.tsx` — reactive banner + button state
