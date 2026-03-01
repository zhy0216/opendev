# Sandbox on Session Create — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create the sandbox asynchronously (fire-and-forget) when a session is created, so it's warm by the time the user sends their first prompt.

**Architecture:** `CreateSessionUseCase` fires a non-awaited `SandboxManager.create()` call after creating the session. Status transitions broadcast to the WebSocket room via a new `sandbox_status` message type. `ExecuteTaskUseCase` reuses the existing running sandbox instead of always creating a new one. Frontend listens for `sandbox_status` WS messages to update the banner reactively.

**Tech Stack:** TypeScript, InversifyJS DI, Bun WebSocket, React, TanStack Query, oRPC

---

### Task 1: Add `sandbox_status` to WebSocket ServerMessage type

**Files:**
- Modify: `packages/types/src/websocket.ts:19-29`

**Step 1: Add the new message type to ServerMessage union**

In `packages/types/src/websocket.ts`, add `sandbox_status` to the `ServerMessage` union type:

```typescript
// Server -> Client messages
export type ServerMessage =
  | { type: 'pong'; timestamp: number }
  | { type: 'subscribed'; sessionId: string; participantId: string }
  | { type: 'sandbox_event'; event: SandboxEventData | null }
  | { type: 'sandbox_status'; status: string }
  | { type: 'history_page'; items: unknown[]; hasMore: boolean; cursor?: string }
  | { type: 'presence_sync'; participants: PresenceInfo[] }
  | { type: 'presence_update'; participant: PresenceInfo }
  | { type: 'presence_leave'; userId: string }
  | { type: 'prompt_queued'; messageId: string }
  | { type: 'session_status'; status: string }
  | { type: 'error'; code: string; message: string };
```

The only change is adding `| { type: 'sandbox_status'; status: string }` after the `sandbox_event` line.

**Step 2: Run typecheck**

Run: `cd /Users/yang/workspace/opendev && bun run typecheck`
Expected: PASS (adding a union variant is backwards-compatible)

**Step 3: Commit**

```bash
git add packages/types/src/websocket.ts
git commit -m "feat: add sandbox_status to WebSocket ServerMessage type"
```

---

### Task 2: Add `onStatusChange` callback to `SandboxManager.create()`

**Files:**
- Modify: `packages/service/src/sandbox/manager.ts:19-20` (abstract class) and `:70-145` (create method)

**Step 1: Update the abstract class signature**

In `packages/service/src/sandbox/manager.ts`, change the `ISandboxManager` abstract `create` signature and the concrete `SandboxManager.create()` method to accept an optional `onStatusChange` callback:

Abstract class at line 20:
```typescript
abstract create(
  sessionId: string,
  config: SandboxConfig,
  onStatusChange?: (status: SandboxStatus) => void,
): Promise<{ sandboxId: string; authToken: string }>;
```

**Step 2: Update the concrete `create()` method signature and add callbacks**

Change the method signature at line 70:
```typescript
async create(
  sessionId: string,
  config: SandboxConfig,
  onStatusChange?: (status: SandboxStatus) => void,
): Promise<{ sandboxId: string; authToken: string }> {
```

Add `onStatusChange?.('pending')` call right after `sandboxRepo.create(...)` (after line 80):
```typescript
onStatusChange?.('pending');
```

Add `onStatusChange?.('starting')` right after `sandboxRepo.updateStatus(sandboxRecord.id, 'starting')` (after line 85):
```typescript
onStatusChange?.('starting');
```

Add `onStatusChange?.('running')` right after `sandboxRepo.updateStatus(sandboxRecord.id, 'running')` (after line 117):
```typescript
onStatusChange?.('running');
```

Add `onStatusChange?.('error')` right after `sandboxRepo.updateStatus(sandboxRecord.id, 'error')` in the catch block (after line 141):
```typescript
onStatusChange?.('error');
```

**Step 3: Run typecheck**

Run: `cd /Users/yang/workspace/opendev && bun run typecheck`
Expected: PASS (the new parameter is optional so all existing callers still work)

**Step 4: Commit**

```bash
git add packages/service/src/sandbox/manager.ts
git commit -m "feat: add onStatusChange callback to SandboxManager.create()"
```

---

### Task 3: Add `findBySessionId` method to `SandboxManager`

The `SandboxManager` needs a way for `ExecuteTaskUseCase` to look up an existing sandbox by session ID and reuse it. Currently it only tracks in the `activeSandboxes` map by sandbox ID.

**Files:**
- Modify: `packages/service/src/sandbox/manager.ts:19-31` (abstract class) and add new method

**Step 1: Add abstract method**

Add to `ISandboxManager` abstract class:
```typescript
abstract findBySession(sessionId: string): Promise<{ sandboxId: string } | null>;
```

**Step 2: Implement in SandboxManager**

Add this method to the `SandboxManager` class:

```typescript
async findBySession(sessionId: string): Promise<{ sandboxId: string } | null> {
  // Check in-memory map first
  for (const [sandboxId, active] of this.activeSandboxes) {
    if (active.sessionId === sessionId) {
      return { sandboxId };
    }
  }
  // Fall back to DB
  const sandboxRepo = getInject<SandboxRepository>(ISandboxRepository);
  const record = await sandboxRepo.findBySessionId(sessionId);
  if (record && (record.status === 'running' || record.status === 'starting' || record.status === 'pending')) {
    return { sandboxId: record.id };
  }
  return null;
}
```

**Step 3: Run typecheck**

Run: `cd /Users/yang/workspace/opendev && bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/service/src/sandbox/manager.ts
git commit -m "feat: add findBySession to SandboxManager for sandbox reuse"
```

---

### Task 4: Add `getGlobalSecretByKey` to SecretRepository

We need a way to fetch a single secret by org ID + key name (e.g., `ANTHROPIC_API_KEY`). The existing `getGlobalSecrets` returns all secrets for an org, which works but is wasteful.

**Files:**
- Modify: `packages/repository/src/secret.repository.ts`

**Step 1: Add the method to the abstract class and implementation**

Add to `ISecretRepository` (after line 19):
```typescript
abstract getGlobalSecretByKey(orgId: string, key: string): Promise<GlobalSecret | undefined>;
```

Add to `SecretRepository` class:
```typescript
async getGlobalSecretByKey(orgId: string, key: string): Promise<GlobalSecret | undefined> {
  const result = await this.dbClient
    .select()
    .from(globalSecret)
    .where(
      and(
        eq(globalSecret.organizationId, orgId),
        eq(globalSecret.key, key)
      )
    )
    .limit(1);
  return result[0];
}
```

**Step 2: Run typecheck**

Run: `cd /Users/yang/workspace/opendev && bun run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/repository/src/secret.repository.ts
git commit -m "feat: add getGlobalSecretByKey to SecretRepository"
```

---

### Task 5: Update `CreateSessionUseCase` to fire-and-forget sandbox creation

**Files:**
- Modify: `packages/use-case/src/session/create-session.use-case.ts`

**Step 1: Add imports and DI injections**

Add to the imports at the top:
```typescript
import { ISandboxManager } from '@repo/service';
import { ISecretRepository, type SecretRepository } from '@repo/repository';
import { IEncryptionService, getInject } from '@repo/di';
import type { EncryptionService } from '@repo/service';
import { createServiceLogger } from '@repo/logger';
```

Add logger:
```typescript
const log = createServiceLogger('CreateSessionUseCase');
```

Add DI injections to the constructor (after `projectRepository`):
```typescript
@inject(ISandboxManager)
private readonly sandboxManager: ISandboxManager,
```

**Step 2: Add fire-and-forget sandbox creation after `return` statement**

Replace the end of the `execute()` method. After the participant is created, before returning, fire the sandbox creation:

```typescript
async execute(input: CreateSessionInput): Promise<CreateSessionOutput> {
  const project = await this.projectRepository.findById(input.projectId);
  if (!project) {
    throw new Error(`Project not found: ${input.projectId}`);
  }

  const session = await this.sessionRepository.create({
    name: input.name,
    projectId: input.projectId,
    repoOwner: project.repoOwner,
    repoName: project.repoName,
    repoId: project.repoId,
    branchName: input.branchName ?? project.defaultBranch,
    model: input.model,
    reasoningEffort: input.reasoningEffort,
    createdBy: input.userId,
    organizationId: input.organizationId ?? project.organizationId,
  });

  const participant = await this.participantRepository.add({
    sessionId: session.id,
    userId: input.userId,
    role: 'owner',
  });

  // Fire-and-forget: create sandbox in background
  this.spawnSandboxInBackground(session.id, {
    repoOwner: project.repoOwner,
    repoName: project.repoName,
    branch: input.branchName ?? project.defaultBranch ?? undefined,
    model: input.model,
    reasoningEffort: input.reasoningEffort ?? 'medium',
    organizationId: input.organizationId ?? project.organizationId ?? undefined,
  });

  return { session, participant };
}

private spawnSandboxInBackground(
  sessionId: string,
  opts: {
    repoOwner: string;
    repoName: string;
    branch?: string;
    model: string;
    reasoningEffort: string;
    organizationId?: string;
  },
): void {
  const run = async () => {
    // Resolve API key from org secrets
    let apiKey = '';
    if (opts.organizationId) {
      const secretRepo = getInject<SecretRepository>(ISecretRepository);
      const secret = await secretRepo.getGlobalSecretByKey(opts.organizationId, 'ANTHROPIC_API_KEY');
      if (secret) {
        const encryption = getInject<EncryptionService>(IEncryptionService);
        apiKey = encryption.decrypt(secret.encryptedValue);
      }
    }

    await this.sandboxManager.create(sessionId, {
      repoOwner: opts.repoOwner,
      repoName: opts.repoName,
      branch: opts.branch,
      secrets: {},
      model: opts.model,
      reasoningEffort: opts.reasoningEffort,
      apiKey,
    });
  };

  run().catch((err) => {
    log.error('Background sandbox creation failed', err instanceof Error ? err : new Error(String(err)));
  });
}
```

**Step 3: Run typecheck**

Run: `cd /Users/yang/workspace/opendev && bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/use-case/src/session/create-session.use-case.ts
git commit -m "feat: fire-and-forget sandbox creation on session create"
```

---

### Task 6: Update `ExecuteTaskUseCase` to reuse existing sandbox

**Files:**
- Modify: `packages/use-case/src/session/execute-task.use-case.ts:56-81`

**Step 1: Replace the sandbox creation block with reuse-or-create logic**

Replace lines 72-81 (the `// Ensure sandbox exists` block) with:

```typescript
// Try to reuse an existing sandbox (created at session time)
const existing = await this.sandboxManager.findBySession(input.sessionId);
if (existing) {
  // Wait for it to be ready if still starting
  const status = await this.sandboxManager.getStatus(existing.sandboxId);
  if (status === 'running') {
    sandbox = { sandboxId: existing.sandboxId, authToken: '' };
  } else if (status === 'starting' || status === 'pending') {
    // Poll until running (timeout 60s)
    sandbox = await this.waitForSandbox(existing.sandboxId);
  }
}

// Fallback: create new sandbox if none available
if (!sandbox) {
  sandbox = await this.sandboxManager.create(input.sessionId, {
    repoOwner: session.repoOwner ?? '',
    repoName: session.repoName ?? '',
    branch: session.branchName ?? undefined,
    secrets: {},
    model: session.model ?? 'anthropic/claude-sonnet-4-6',
    reasoningEffort: session.reasoningEffort ?? 'medium',
    apiKey: input.apiKey ?? '',
  });
}
```

**Step 2: Add `waitForSandbox` helper method**

Add this method to the `ExecuteTaskUseCase` class:

```typescript
private async waitForSandbox(
  sandboxId: string,
  timeoutMs = 60_000,
  intervalMs = 1_000,
): Promise<{ sandboxId: string; authToken: string } | undefined> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await this.sandboxManager.getStatus(sandboxId);
    if (status === 'running') {
      return { sandboxId, authToken: '' };
    }
    if (status === 'error' || status === 'stopped') {
      return undefined;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  log.warn('Timed out waiting for sandbox', { sandboxId });
  return undefined;
}
```

**Step 3: Run typecheck**

Run: `cd /Users/yang/workspace/opendev && bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/use-case/src/session/execute-task.use-case.ts
git commit -m "feat: reuse existing sandbox in ExecuteTaskUseCase"
```

---

### Task 7: Handle `sandbox_status` in `useSessionSocket` hook

**Files:**
- Modify: `apps/web/src/hooks/use-session-socket.ts`

**Step 1: Add `sandboxStatus` to state**

Update the `SessionSocketState` interface (line 4-10):
```typescript
interface SessionSocketState {
  connected: boolean;
  events: ServerMessage[];
  participants: PresenceInfo[];
  sessionStatus: string;
  sandboxStatus: string;
  isProcessing: boolean;
}
```

Update the initial state (line 18-24):
```typescript
const [state, setState] = useState<SessionSocketState>({
  connected: false,
  events: [],
  participants: [],
  sessionStatus: 'pending',
  sandboxStatus: 'pending',
  isProcessing: false,
});
```

**Step 2: Handle the new message type in `handleMessage`**

Add a new case in the `switch` statement in `handleMessage` (between the `session_status` case and `error` case, around line 118):

```typescript
case 'sandbox_status':
  return {
    ...prev,
    sandboxStatus: message.status,
  };
```

**Step 3: Run typecheck**

Run: `cd /Users/yang/workspace/opendev && bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/hooks/use-session-socket.ts
git commit -m "feat: handle sandbox_status WebSocket message in useSessionSocket"
```

---

### Task 8: Update session page to use reactive sandbox status

**Files:**
- Modify: `apps/web/src/routes/dashboard/session.$sessionId.tsx`

**Step 1: Destructure `sandboxStatus` from `useSessionSocket`**

Update the destructuring at line 55-64 to include `sandboxStatus`:
```typescript
const {
  connected,
  events,
  participants,
  sessionStatus,
  sandboxStatus: wsSandboxStatus,
  isProcessing,
  sendPrompt,
  sendStop,
  sendTyping,
} = useSessionSocket(sessionId, wsToken);
```

**Step 2: Use WS sandbox status with fallback to session data**

Replace line 144:
```typescript
const sandboxStatus = session.sandboxStatus ?? 'pending';
```
with:
```typescript
const sandboxStatus = wsSandboxStatus !== 'pending' ? wsSandboxStatus : (session.sandboxStatus ?? 'pending');
```

This uses the real-time WS status when available, falling back to the initial session fetch.

**Step 3: Update FollowUpPrompt disabled state**

Update the `FollowUpPrompt` component at line 238-243. Change the `disabled` prop to also check sandbox status:

```typescript
<FollowUpPrompt
  onSubmit={handleFollowUp}
  disabled={!connected || (isSandboxStatus(sandboxStatus) && sandboxStatus !== 'running')}
  isProcessing={isProcessing}
  onTyping={handleTyping}
/>
```

**Step 4: Run typecheck**

Run: `cd /Users/yang/workspace/opendev && bun run typecheck`
Expected: PASS

**Step 5: Run dev server and verify visually**

Run: `cd /Users/yang/workspace/opendev && bun run dev`

Navigate to `http://localhost:5173/dashboard/session/<id>`. Expected:
- Sandbox banner updates from "pending" → "starting" → hides when "running"
- Prompt input is disabled until sandbox is running
- When sandbox is running, the banner disappears and input is enabled

**Step 6: Commit**

```bash
git add apps/web/src/routes/dashboard/session.\$sessionId.tsx
git commit -m "feat: reactive sandbox status banner and disabled input until sandbox ready"
```

---

### Task 9: Wire `onStatusChange` to WebSocket broadcast in `CreateSessionUseCase`

The sandbox creation in `CreateSessionUseCase` needs to broadcast status changes via WebSocket. Since the `roomManager` lives in the server layer (`apps/server/`), and the use case is in `packages/use-case/`, we can't import it directly. Instead, we use the existing `SandboxBridge` event emitter which is already wired in DI.

**Files:**
- Modify: `packages/use-case/src/session/create-session.use-case.ts` (the `spawnSandboxInBackground` method)
- Modify: `apps/server/src/ws/handlers.ts` (wire bridge listener on subscribe)

**Step 1: Pass `onStatusChange` to `SandboxManager.create()` in `spawnSandboxInBackground`**

Update the `run()` function inside `spawnSandboxInBackground` to pass the callback:

```typescript
const run = async () => {
  // Resolve API key from org secrets
  let apiKey = '';
  if (opts.organizationId) {
    const secretRepo = getInject<SecretRepository>(ISecretRepository);
    const secret = await secretRepo.getGlobalSecretByKey(opts.organizationId, 'ANTHROPIC_API_KEY');
    if (secret) {
      const encryption = getInject<EncryptionService>(IEncryptionService);
      apiKey = encryption.decrypt(secret.encryptedValue);
    }
  }

  await this.sandboxManager.create(
    sessionId,
    {
      repoOwner: opts.repoOwner,
      repoName: opts.repoName,
      branch: opts.branch,
      secrets: {},
      model: opts.model,
      reasoningEffort: opts.reasoningEffort,
      apiKey,
    },
    (status) => {
      // Broadcast to WS room via the bridge
      const { roomManager } = require('../../../apps/server/src/ws/room-manager');
      // We can't import server-layer code here. Instead, use a simpler approach:
      // Import the roomManager lazily. But this crosses layer boundaries.
      // Better approach: just log for now, and wire the broadcast at the server layer.
    },
  );
};
```

**ACTUALLY** — the cleanest approach is to wire this at the server layer. The `session.create` route in `packages/routes/src/session.routes.ts` calls `CreateSessionUseCase`. After the use case returns, the route handler can fire the sandbox creation with the broadcast callback, since the route layer has access to the room manager.

**Revised approach:** Move the fire-and-forget sandbox spawn from `CreateSessionUseCase` to the `session.create` route handler. This keeps layer boundaries clean.

**Step 1 (revised): Revert the background spawn from CreateSessionUseCase**

Keep `CreateSessionUseCase` as it originally was (no sandbox code). Instead, update `packages/routes/src/session.routes.ts` to fire the sandbox creation after the use case returns.

In `packages/routes/src/session.routes.ts`, update the `create` handler:

```typescript
const create = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1, "Name is required"),
      projectId: z.string().uuid(),
      branchName: z.string().optional(),
      model: z.string().optional(),
      reasoningEffort: z.string().optional(),
      organizationId: z.string().uuid().optional(),
    }),
  )
  .handler(
    async ({ input, context }): Promise<ResponseType<CreateSessionOutput>> => {
      return handleRoute(async () => {
        const createSessionUseCase = resolve<CreateSessionUseCase>(
          ICreateSessionUseCase,
        );

        const result = await createSessionUseCase.execute({
          name: input.name,
          projectId: input.projectId,
          branchName: input.branchName,
          model: input.model ?? "claude-sonnet-4-20250514",
          reasoningEffort: input.reasoningEffort,
          userId: context.user.id,
          organizationId: input.organizationId,
        });

        // Fire-and-forget: create sandbox in background
        spawnSandboxForSession(result.session).catch((err) => {
          const log = createServiceLogger('SessionRoutes');
          log.error('Background sandbox creation failed', err instanceof Error ? err : new Error(String(err)));
        });

        return { success: true, data: result };
      }, "Failed to create session");
    },
  );
```

Add the helper function in the same file (at the top, after imports):

```typescript
import { createServiceLogger } from '@repo/logger';
import { roomManager } from '../../../apps/server/src/ws/room-manager';
```

Wait — this also crosses boundaries. The routes package can't import from the server app.

**Final cleanest approach:** The route handler lives in `packages/routes/`, but `roomManager` is in `apps/server/`. We need a way to broadcast from the routes layer.

Looking at the existing codebase, the `SandboxBridge` in `packages/service/` is designed exactly for this — it's an in-process event emitter. But it currently emits `SandboxEvent`s, not status changes.

**Simplest viable approach:** Do the fire-and-forget in the **server layer** (`apps/server/src/index.ts` or a new helper), triggered after the oRPC handler returns. But oRPC doesn't give us post-handler hooks.

**Pragmatic approach:** Move everything into the `CreateSessionUseCase` but accept that the WS broadcast for sandbox status will happen differently. Since the `SandboxManager.create()` already updates the DB status, and the frontend already has a `getSandboxStatus` route, we can:

1. Keep `CreateSessionUseCase` doing the fire-and-forget (as in Task 5)
2. Have `SandboxManager.create()` fire the `onStatusChange` callback
3. Wire the callback in `CreateSessionUseCase` to emit events via `SandboxBridge`
4. In the server's `handleSubscribe`, register a `SandboxBridge` listener that forwards to `roomManager.broadcast()`

**Step 1: Wire SandboxBridge listener in handleSubscribe**

In `apps/server/src/ws/handlers.ts`, after the `handleSubscribe` function successfully subscribes (after line 76), register a bridge listener:

Add import at top:
```typescript
import { ISandboxBridge } from '@repo/service';
```

At the end of `handleSubscribe`, after the presence sync broadcast (after line 76):
```typescript
// Register sandbox status bridge listener for this session
const bridge = getInject<ISandboxBridge>(ISandboxBridge);
bridge.onEvent(sessionId, (event) => {
  if (event.type === 'sandbox_status_change') {
    roomManager.broadcast(sessionId, {
      type: 'sandbox_status',
      status: (event.data as { status: string }).status,
    });
  }
});
```

**Step 2: In CreateSessionUseCase, use SandboxBridge to emit status changes**

Update the `spawnSandboxInBackground` method to use `SandboxBridge`:

Add `ISandboxBridge` import and inject it:
```typescript
import { ISandboxBridge } from '@repo/service';
```

In constructor, add:
```typescript
@inject(ISandboxBridge)
private readonly sandboxBridge: ISandboxBridge,
```

Update the `run()` async function inside `spawnSandboxInBackground`:
```typescript
await this.sandboxManager.create(
  sessionId,
  {
    repoOwner: opts.repoOwner,
    repoName: opts.repoName,
    branch: opts.branch,
    secrets: {},
    model: opts.model,
    reasoningEffort: opts.reasoningEffort,
    apiKey,
  },
  (status) => {
    this.sandboxBridge.emitEvent({
      type: 'sandbox_status_change' as any,
      sandboxId: '',
      sessionId,
      timestamp: Date.now(),
      data: { status },
    });
  },
);
```

**Step 3: Add `sandbox_status_change` to SandboxEventType**

In `packages/types/src/sandbox.ts`, add to the `SandboxEventType` union:
```typescript
| 'sandbox_status_change'
```

**Step 4: Run typecheck**

Run: `cd /Users/yang/workspace/opendev && bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/types/src/sandbox.ts packages/use-case/src/session/create-session.use-case.ts apps/server/src/ws/handlers.ts
git commit -m "feat: wire sandbox status broadcasts via SandboxBridge to WebSocket room"
```

---

### Task 10: Final integration test — verify end-to-end

**Step 1: Start dev servers**

Run: `cd /Users/yang/workspace/opendev && bun run dev`

**Step 2: Create a new session via the UI**

Navigate to the dashboard, create a new session. After creation, navigate to the session page.

Expected behavior:
- Session page loads immediately
- Sandbox status banner shows "Sandbox starting..." (blue, animated)
- After ~30s, banner updates to "Sandbox running" or disappears
- Prompt input becomes enabled
- If sandbox fails, banner shows "Sandbox error" (red)

**Step 3: Run typecheck and lint**

Run: `cd /Users/yang/workspace/opendev && bun run typecheck && bun run lint`
Expected: PASS

**Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "feat: create sandbox at session creation time (fire-and-forget)"
```
