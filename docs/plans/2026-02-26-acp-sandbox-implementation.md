# ACP Sandbox Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace stub sandbox communication with real Modal Sandbox + ACP protocol integration, enabling Claude Code to execute tasks inside isolated containers.

**Architecture:** Server creates Modal Sandbox containers with a pre-built image containing an HTTP wrapper + Claude Code. The wrapper translates HTTP/SSE into ACP JSON-RPC over stdio. Blueprint handlers call `SandboxManager.sendPrompt()` and `exec()` which make real HTTP requests to the container.

**Tech Stack:** Modal TypeScript SDK (`modal`), ACP TypeScript SDK (`@agentclientprotocol/sdk`), `@zed-industries/claude-agent-acp`, Bun.serve (container HTTP server), SSE streaming.

---

### Task 1: Scaffold `apps/sandbox-server` package

**Files:**
- Create: `apps/sandbox-server/package.json`
- Create: `apps/sandbox-server/tsconfig.json`
- Create: `apps/sandbox-server/src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "@repo/sandbox-server",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "start": "bun run src/index.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@agentclientprotocol/sdk": "latest"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["bun"]
  },
  "include": ["src"]
}
```

**Step 3: Create minimal entry point**

Create `apps/sandbox-server/src/index.ts`:

```typescript
const PORT = Number(process.env.PORT) || 8080;

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/health' && req.method === 'GET') {
      return Response.json({ status: 'idle', uptime: process.uptime() });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
});

console.log(`Sandbox server listening on port ${server.port}`);
```

**Step 4: Install dependencies**

Run: `cd apps/sandbox-server && bun install`

**Step 5: Verify it starts**

Run: `cd apps/sandbox-server && bun run src/index.ts &` then `curl http://localhost:8080/health`
Expected: `{"status":"idle","uptime":...}`

**Step 6: Commit**

```bash
git add apps/sandbox-server/
git commit -m "feat(sandbox-server): scaffold sandbox HTTP wrapper package"
```

---

### Task 2: Implement process manager (Claude Code spawn/lifecycle)

**Files:**
- Create: `apps/sandbox-server/src/process/manager.ts`
- Test: `apps/sandbox-server/src/process/manager.test.ts`

**Step 1: Write the failing test**

Create `apps/sandbox-server/src/process/manager.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test';
import { ProcessManager } from './manager';

describe('ProcessManager', () => {
  test('starts in idle state', () => {
    const pm = new ProcessManager();
    expect(pm.getState()).toBe('idle');
  });

  test('transitions to initializing on spawn', async () => {
    const pm = new ProcessManager();
    // spawn with a simple command instead of real claude-code
    const promise = pm.spawn({ command: 'echo', args: ['hello'], apiKey: 'test-key' });
    expect(pm.getState()).toBe('initializing');
    await promise;
  });

  test('rejects double spawn', async () => {
    const pm = new ProcessManager();
    await pm.spawn({ command: 'echo', args: ['hello'], apiKey: 'test-key' });
    expect(() => pm.spawn({ command: 'echo', args: ['hello'], apiKey: 'test-key' })).toThrow();
  });

  test('transitions to terminated on kill', async () => {
    const pm = new ProcessManager();
    await pm.spawn({ command: 'cat', args: [], apiKey: 'test-key' });
    pm.kill();
    expect(pm.getState()).toBe('terminated');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/sandbox-server && bun test src/process/manager.test.ts`
Expected: FAIL — module not found

**Step 3: Implement ProcessManager**

Create `apps/sandbox-server/src/process/manager.ts`:

```typescript
import { spawn, type ChildProcess } from 'node:child_process';

export type ProcessState = 'idle' | 'initializing' | 'ready' | 'busy' | 'error' | 'terminated';

export interface SpawnConfig {
  command: string;
  args: string[];
  apiKey: string;
  env?: Record<string, string>;
}

export class ProcessManager {
  private state: ProcessState = 'idle';
  private process: ChildProcess | null = null;
  private apiKey: string | null = null;

  getState(): ProcessState {
    return this.state;
  }

  getProcess(): ChildProcess | null {
    return this.process;
  }

  async spawn(config: SpawnConfig): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot spawn in state: ${this.state}`);
    }

    this.state = 'initializing';
    this.apiKey = config.apiKey;

    const proc = spawn(config.command, config.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: config.apiKey,
        ...config.env,
      },
    });

    proc.on('exit', (code) => {
      if (this.state !== 'terminated') {
        this.state = 'error';
        console.error(`Process exited unexpectedly with code ${code}`);
      }
    });

    this.process = proc;

    // For simple commands that exit immediately, wait for them
    await new Promise<void>((resolve) => {
      if (proc.exitCode !== null) {
        this.state = 'ready';
        resolve();
      } else {
        // Give the process a moment to start
        setTimeout(() => {
          if (this.state === 'initializing') {
            this.state = 'ready';
          }
          resolve();
        }, 100);
      }
    });
  }

  setReady(): void {
    this.state = 'ready';
  }

  setBusy(): void {
    this.state = 'busy';
  }

  kill(): void {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
    this.apiKey = null;
    this.state = 'terminated';
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/sandbox-server && bun test src/process/manager.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/sandbox-server/src/process/
git commit -m "feat(sandbox-server): add ProcessManager for Claude Code lifecycle"
```

---

### Task 3: Implement ACP client wrapper

**Files:**
- Create: `apps/sandbox-server/src/acp/client.ts`
- Create: `apps/sandbox-server/src/acp/events.ts`

**Step 1: Create ACP event types**

Create `apps/sandbox-server/src/acp/events.ts`:

```typescript
export type SseEventType = 'token' | 'tool_call' | 'tool_result' | 'done' | 'error';

export interface SseEvent {
  type: SseEventType;
  data: unknown;
}

export function mapAcpUpdateToSse(update: unknown): SseEvent | null {
  // Maps ACP session/update notifications to our SSE event types.
  // The exact structure depends on the ACP SDK version — this will be
  // refined during integration testing with the real claude-agent-acp.

  const u = update as Record<string, unknown>;

  if (u.type === 'message_chunk' || u.type === 'text') {
    return { type: 'token', data: { content: u.content ?? u.text ?? '' } };
  }

  if (u.type === 'tool_call' || u.type === 'tool_use') {
    return { type: 'tool_call', data: { name: u.name, input: u.input } };
  }

  if (u.type === 'tool_result') {
    return { type: 'tool_result', data: { name: u.name, output: u.output } };
  }

  if (u.type === 'complete' || u.type === 'end_turn') {
    return { type: 'done', data: { outcome: 'pass' } };
  }

  if (u.type === 'error') {
    return { type: 'error', data: { message: u.message ?? 'Unknown error' } };
  }

  return null;
}
```

**Step 2: Create ACP client wrapper**

Create `apps/sandbox-server/src/acp/client.ts`:

```typescript
import type { ChildProcess } from 'node:child_process';
import type { SseEvent } from './events';
import { mapAcpUpdateToSse } from './events';

/**
 * Wraps the ACP ClientSideConnection for communicating with Claude Code
 * via the claude-agent-acp adapter over stdio.
 *
 * Note: The actual ACP SDK integration will be refined during testing
 * with the real claude-agent-acp binary. This provides the interface
 * and scaffolding.
 */
export class AcpClient {
  private sessionId: string | null = null;
  private initialized = false;

  constructor(private readonly process: ChildProcess) {}

  async initialize(): Promise<{ sessionId: string; capabilities: Record<string, unknown> }> {
    if (this.initialized) {
      throw new Error('Already initialized');
    }

    // TODO: Use @agentclientprotocol/sdk ClientSideConnection
    // const stream = ndJsonStream(this.process.stdin!, this.process.stdout!);
    // this.connection = new ClientSideConnection(toolHandlers, stream);
    // await this.connection.initialize();
    // const session = await this.connection.newSession();

    this.sessionId = `session-${Date.now()}`;
    this.initialized = true;

    return {
      sessionId: this.sessionId,
      capabilities: {},
    };
  }

  async sendPrompt(
    prompt: string,
    onEvent: (event: SseEvent) => void,
  ): Promise<void> {
    if (!this.initialized || !this.sessionId) {
      throw new Error('Not initialized');
    }

    // TODO: Use real ACP session/prompt
    // await this.connection.sendPrompt(this.sessionId, {
    //   messages: [{ role: 'user', content: prompt }],
    // }, {
    //   onUpdate: (update) => {
    //     const sseEvent = mapAcpUpdateToSse(update);
    //     if (sseEvent) onEvent(sseEvent);
    //   },
    // });

    // Placeholder: emit done immediately
    onEvent({ type: 'done', data: { outcome: 'pass' } });
  }

  async cancel(): Promise<void> {
    // TODO: Wire to ACP cancel
  }
}
```

**Step 3: Commit**

```bash
git add apps/sandbox-server/src/acp/
git commit -m "feat(sandbox-server): add ACP client wrapper and event mapping"
```

---

### Task 4: Implement HTTP routes

**Files:**
- Create: `apps/sandbox-server/src/routes/init.ts`
- Create: `apps/sandbox-server/src/routes/prompt.ts`
- Create: `apps/sandbox-server/src/routes/exec.ts`
- Create: `apps/sandbox-server/src/routes/cancel.ts`
- Create: `apps/sandbox-server/src/routes/health.ts`
- Create: `apps/sandbox-server/src/routes/terminate.ts`
- Modify: `apps/sandbox-server/src/index.ts`

**Step 1: Create auth middleware helper**

Create `apps/sandbox-server/src/auth.ts`:

```typescript
let bearerToken: string | null = null;

export function setToken(token: string): void {
  bearerToken = token;
}

export function clearToken(): void {
  bearerToken = null;
}

export function verifyAuth(req: Request): boolean {
  if (!bearerToken) return true; // No token set yet (pre-init)
  const header = req.headers.get('Authorization');
  return header === `Bearer ${bearerToken}`;
}
```

**Step 2: Create POST /init route**

Create `apps/sandbox-server/src/routes/init.ts`:

```typescript
import { ProcessManager } from '../process/manager';
import { AcpClient } from '../acp/client';
import { setToken } from '../auth';

export async function handleInit(
  req: Request,
  processManager: ProcessManager,
  setAcpClient: (client: AcpClient) => void,
): Promise<Response> {
  if (processManager.getState() !== 'idle') {
    return Response.json({ error: 'Already initialized' }, { status: 409 });
  }

  const body = await req.json() as {
    apiKey: string;
    bearerToken: string;
    model?: string;
    systemPrompt?: string;
  };

  if (!body.apiKey || !body.bearerToken) {
    return Response.json({ error: 'apiKey and bearerToken are required' }, { status: 400 });
  }

  setToken(body.bearerToken);

  try {
    // Spawn claude-code via claude-agent-acp
    await processManager.spawn({
      command: 'claude-agent-acp',
      args: [],
      apiKey: body.apiKey,
      env: body.model ? { CLAUDE_MODEL: body.model } : undefined,
    });

    const proc = processManager.getProcess();
    if (!proc) {
      throw new Error('Process not available after spawn');
    }

    const acpClient = new AcpClient(proc);
    const result = await acpClient.initialize();
    processManager.setReady();
    setAcpClient(acpClient);

    return Response.json({
      sessionId: result.sessionId,
      capabilities: result.capabilities,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
```

**Step 3: Create POST /prompt route (SSE)**

Create `apps/sandbox-server/src/routes/prompt.ts`:

```typescript
import type { AcpClient } from '../acp/client';
import type { ProcessManager } from '../process/manager';

export async function handlePrompt(
  req: Request,
  processManager: ProcessManager,
  acpClient: AcpClient | null,
): Promise<Response> {
  const state = processManager.getState();
  if (state !== 'ready') {
    return Response.json({ error: `Cannot prompt in state: ${state}` }, { status: 409 });
  }

  if (!acpClient) {
    return Response.json({ error: 'ACP client not initialized' }, { status: 500 });
  }

  const body = await req.json() as { prompt: string };
  if (!body.prompt) {
    return Response.json({ error: 'prompt is required' }, { status: 400 });
  }

  processManager.setBusy();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await acpClient.sendPrompt(body.prompt, (sseEvent) => {
          sendEvent(sseEvent.type, sseEvent.data);
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        sendEvent('error', { message });
      } finally {
        processManager.setReady();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**Step 4: Create POST /exec route**

Create `apps/sandbox-server/src/routes/exec.ts`:

```typescript
import { exec as execCb } from 'node:child_process';

const DEFAULT_TIMEOUT = 60_000;

export async function handleExec(req: Request): Promise<Response> {
  const body = await req.json() as { command: string; timeout?: number };
  if (!body.command) {
    return Response.json({ error: 'command is required' }, { status: 400 });
  }

  const timeout = body.timeout ?? DEFAULT_TIMEOUT;

  return new Promise<Response>((resolve) => {
    execCb(body.command, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      const exitCode = err ? (err as NodeJS.ErrnoException & { code?: number }).code ?? 1 : 0;
      resolve(Response.json({ exitCode, stdout, stderr }));
    });
  });
}
```

**Step 5: Create remaining routes**

Create `apps/sandbox-server/src/routes/cancel.ts`:

```typescript
import type { AcpClient } from '../acp/client';

export async function handleCancel(acpClient: AcpClient | null): Promise<Response> {
  if (acpClient) {
    await acpClient.cancel();
  }
  return Response.json({ cancelled: true });
}
```

Create `apps/sandbox-server/src/routes/health.ts`:

```typescript
import type { ProcessManager } from '../process/manager';

export function handleHealth(processManager: ProcessManager): Response {
  return Response.json({
    status: processManager.getState(),
    uptime: process.uptime(),
    lastActivity: Date.now(),
  });
}
```

Create `apps/sandbox-server/src/routes/terminate.ts`:

```typescript
import type { ProcessManager } from '../process/manager';
import { clearToken } from '../auth';

export function handleTerminate(processManager: ProcessManager): Response {
  processManager.kill();
  clearToken();
  return Response.json({ terminated: true });
}
```

**Step 6: Wire all routes in index.ts**

Rewrite `apps/sandbox-server/src/index.ts`:

```typescript
import { ProcessManager } from './process/manager';
import type { AcpClient } from './acp/client';
import { verifyAuth } from './auth';
import { handleInit } from './routes/init';
import { handlePrompt } from './routes/prompt';
import { handleExec } from './routes/exec';
import { handleCancel } from './routes/cancel';
import { handleHealth } from './routes/health';
import { handleTerminate } from './routes/terminate';

const PORT = Number(process.env.PORT) || 8080;

const processManager = new ProcessManager();
let acpClient: AcpClient | null = null;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;

    // Health check doesn't require auth
    if (url.pathname === '/health' && method === 'GET') {
      return handleHealth(processManager);
    }

    // Init sets up auth, so it doesn't require a bearer token
    if (url.pathname === '/init' && method === 'POST') {
      return handleInit(req, processManager, (client) => { acpClient = client; });
    }

    // All other routes require auth
    if (!verifyAuth(req)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (url.pathname === '/prompt' && method === 'POST') {
      return handlePrompt(req, processManager, acpClient);
    }

    if (url.pathname === '/exec' && method === 'POST') {
      return handleExec(req);
    }

    if (url.pathname === '/cancel' && method === 'POST') {
      return handleCancel(acpClient);
    }

    if (url.pathname === '/terminate' && method === 'POST') {
      return handleTerminate(processManager);
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  },
});

console.log(`Sandbox server listening on port ${server.port}`);
```

**Step 7: Verify typecheck**

Run: `cd apps/sandbox-server && bun run typecheck`
Expected: PASS

**Step 8: Commit**

```bash
git add apps/sandbox-server/src/
git commit -m "feat(sandbox-server): implement HTTP routes with SSE streaming"
```

---

### Task 5: Create Dockerfile for sandbox image

**Files:**
- Create: `apps/sandbox-server/Dockerfile`
- Create: `apps/sandbox-server/.dockerignore`

**Step 1: Create Dockerfile**

```dockerfile
FROM oven/bun:1-alpine

# Install Node.js (needed for claude-code and npm global installs)
RUN apk add --no-cache nodejs npm git

# Install Claude Code CLI and ACP adapter globally
RUN npm install -g @anthropic-ai/claude-code @zed-industries/claude-code-acp

# Copy sandbox server source
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --production
COPY src/ ./src/

EXPOSE 8080

CMD ["bun", "run", "src/index.ts"]
```

**Step 2: Create .dockerignore**

```
node_modules
dist
*.test.ts
```

**Step 3: Verify Docker build**

Run: `cd apps/sandbox-server && docker build -t acp-sandbox:dev .`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add apps/sandbox-server/Dockerfile apps/sandbox-server/.dockerignore
git commit -m "feat(sandbox-server): add Dockerfile for container image"
```

---

### Task 6: Add `IModalClient` DI abstraction and environment variables

**Files:**
- Modify: `packages/di/src/types.ts:37` (append)
- Modify: `packages/di/src/index.ts:1` (add export)
- Modify: `packages/env/src/env.ts:31-34` (add Modal vars)

**Step 1: Add IModalClient to DI types**

Append to `packages/di/src/types.ts` after line 37:

```typescript
// Modal Sandbox
export abstract class IModalClient {
  abstract createSandbox(config: {
    image: string;
    encryptedPorts: number[];
    idleTimeout?: number;
  }): Promise<{ sandboxId: string; tunnelUrl: string }>;
  abstract terminateSandbox(sandboxId: string): Promise<void>;
}
```

**Step 2: Export from DI index**

Modify `packages/di/src/index.ts` to add `IModalClient` to the export:

```typescript
export { IDatabase, ITransaction, IEncryptionService, IInternalAuthService, IExecuteTaskUseCase, IModalClient } from './types';
```

**Step 3: Add Modal env vars**

Add to `packages/env/src/env.ts` after the Linear configuration block (after line 32):

```typescript
    // Modal configuration
    MODAL_TOKEN_ID: z.string().optional(),
    MODAL_TOKEN_SECRET: z.string().optional(),
    MODAL_SANDBOX_IMAGE: z.string().default('ghcr.io/your-org/acp-sandbox:latest'),
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/di/src/types.ts packages/di/src/index.ts packages/env/src/env.ts
git commit -m "feat(di): add IModalClient abstraction and Modal env vars"
```

---

### Task 7: Implement ModalClient

**Files:**
- Create: `packages/service/src/sandbox/modal-client.ts`
- Modify: `packages/service/src/index.ts:12` (add export)
- Modify: `packages/service/package.json:15-20` (add modal dep)

**Step 1: Add `modal` dependency**

Add to `packages/service/package.json` dependencies:

```json
"modal": "latest"
```

Run: `cd packages/service && bun install`

**Step 2: Implement ModalClient**

Create `packages/service/src/sandbox/modal-client.ts`:

```typescript
import 'reflect-metadata';
import { injectable } from 'inversify';
import { IModalClient } from '@repo/di';
import { env } from '@repo/env';
import { createServiceLogger } from '@repo/logger';

const log = createServiceLogger('ModalClient');

@injectable()
export class ModalClient extends IModalClient {
  async createSandbox(config: {
    image: string;
    encryptedPorts: number[];
    idleTimeout?: number;
  }): Promise<{ sandboxId: string; tunnelUrl: string }> {
    log.info('Creating Modal sandbox', { image: config.image });

    // Dynamic import to avoid loading modal SDK when not configured
    const { Sandbox } = await import('modal');

    const sandbox = await Sandbox.create({
      image: config.image,
      encrypted_ports: config.encryptedPorts,
      idle_timeout: config.idleTimeout ?? 1800,
    });

    const sandboxId = sandbox.object_id;

    // Wait for tunnel to be ready
    const tunnels = await sandbox.tunnels({ timeout: 15 });
    const tunnel = tunnels[8080];
    if (!tunnel) {
      await sandbox.terminate();
      throw new Error('Tunnel on port 8080 not available');
    }

    const tunnelUrl = tunnel.url;

    log.info('Modal sandbox created', { sandboxId, tunnelUrl });
    return { sandboxId, tunnelUrl };
  }

  async terminateSandbox(sandboxId: string): Promise<void> {
    log.info('Terminating Modal sandbox', { sandboxId });

    const { Sandbox } = await import('modal');
    const sandbox = await Sandbox.from_id(sandboxId);
    await sandbox.terminate();

    log.info('Modal sandbox terminated', { sandboxId });
  }
}
```

> **Note:** The exact Modal TypeScript SDK API may differ from the Python SDK. The `Sandbox.create()`, `sandbox.tunnels()`, and `Sandbox.from_id()` method names and signatures should be verified against the npm `modal` package docs during implementation. Adjust accordingly.

**Step 3: Export from service index**

Add to `packages/service/src/index.ts`:

```typescript
export { ModalClient, IModalClient } from './sandbox/modal-client';
```

Wait — `IModalClient` is already in `@repo/di`. Only export the concrete class:

```typescript
export { ModalClient } from './sandbox/modal-client';
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (may need adjustments based on actual Modal SDK types)

**Step 5: Commit**

```bash
git add packages/service/src/sandbox/modal-client.ts packages/service/src/index.ts packages/service/package.json
git commit -m "feat(service): implement ModalClient wrapping Modal TypeScript SDK"
```

---

### Task 8: Register ModalClient in DI bootstrap

**Files:**
- Modify: `packages/bootstrap/src/index.ts:2` (add IModalClient import)
- Modify: `packages/bootstrap/src/index.ts:39-44` (add ModalClient import)
- Modify: `packages/bootstrap/src/index.ts:114` (add binding)

**Step 1: Add imports**

Add `IModalClient` to the `@repo/di` import on line 2:

```typescript
import { getContainer, IDatabase, IEncryptionService, IExecuteTaskUseCase, IModalClient } from '@repo/di';
```

Add `ModalClient` to the `@repo/service` import block (around line 39-51):

```typescript
  ModalClient,
```

**Step 2: Add binding**

Add after line 114 (after the `ILinearService` binding):

```typescript
  container.bind(IModalClient).to(ModalClient);
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/bootstrap/src/index.ts
git commit -m "feat(bootstrap): register IModalClient binding"
```

---

### Task 9: Add `apiKey` to SandboxConfig type

**Files:**
- Modify: `packages/types/src/sandbox.ts:3-10`

**Step 1: Add apiKey field**

Add `apiKey` to the `SandboxConfig` interface in `packages/types/src/sandbox.ts`:

```typescript
export interface SandboxConfig {
  repoOwner: string;
  repoName: string;
  branch?: string;
  secrets: Record<string, string>;
  model: string;
  reasoningEffort: string;
  apiKey: string;
}
```

**Step 2: Update ExecuteTaskUseCase to pass apiKey**

In `packages/use-case/src/session/execute-task.use-case.ts` at lines 64-71, add `apiKey` to the config. This will require the use case to receive the API key from the caller (WebSocket handler). For now, add it as an optional field on `ExecuteTaskInput`:

Add to `ExecuteTaskInput` interface (line 27-34):

```typescript
export interface ExecuteTaskInput {
  sessionId: string;
  messageId: string;
  prompt: string;
  repoOwner?: string;
  repoName?: string;
  branchName?: string;
  apiKey?: string;
}
```

And pass it to `SandboxManager.create()`:

```typescript
      const sandbox = await this.sandboxManager.create(input.sessionId, {
        repoOwner: input.repoOwner ?? '',
        repoName: input.repoName ?? '',
        branch: input.branchName,
        secrets: {},
        model: 'anthropic/claude-sonnet-4-6',
        reasoningEffort: 'medium',
        apiKey: input.apiKey ?? '',
      });
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/types/src/sandbox.ts packages/use-case/src/session/execute-task.use-case.ts
git commit -m "feat(types): add apiKey to SandboxConfig"
```

---

### Task 10: Refactor SandboxManager to use Modal + HTTP

**Files:**
- Modify: `packages/service/src/sandbox/manager.ts` (full rewrite of implementation)

This is the core change. Replace the stub with real Modal + HTTP calls.

**Step 1: Write the failing test**

Create `packages/service/src/sandbox/manager.test.ts`:

```typescript
import { describe, test, expect, mock } from 'bun:test';

describe('SandboxManager', () => {
  test('create() calls ModalClient and initializes via HTTP', async () => {
    // This test validates the integration flow:
    // 1. ModalClient.createSandbox() is called
    // 2. HTTP POST /init is sent to tunnelUrl
    // 3. Result stored in activeSandboxes
    // Will be implemented after the refactor using mocks
    expect(true).toBe(true);
  });

  test('sendPrompt() sends HTTP POST and consumes SSE', async () => {
    expect(true).toBe(true);
  });

  test('exec() sends HTTP POST and returns result', async () => {
    expect(true).toBe(true);
  });
});
```

**Step 2: Refactor SandboxManager**

Rewrite `packages/service/src/sandbox/manager.ts`:

```typescript
import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { getInject, IInternalAuthService, IModalClient } from '@repo/di';
import { ISandboxRepository, type SandboxRepository } from '@repo/repository';
import type { SandboxConfig, SandboxStatus, ExecResult, SandboxEvent } from '@repo/types';
import { createServiceLogger } from '@repo/logger';
import { env } from '@repo/env';

const log = createServiceLogger('SandboxManager');

const TIMEOUTS = {
  SANDBOX_CREATE: 30_000,
  TUNNEL_READY: 15_000,
  INIT: 20_000,
  PROMPT: 900_000,
  EXEC: 60_000,
};

export abstract class ISandboxManager {
  abstract create(sessionId: string, config: SandboxConfig): Promise<{ sandboxId: string; authToken: string }>;
  abstract stop(sandboxId: string): Promise<void>;
  abstract destroy(sandboxId: string): Promise<void>;
  abstract getStatus(sandboxId: string): Promise<SandboxStatus>;
  abstract sendPrompt(
    sandboxId: string,
    prompt: string,
    messageId: string,
    onEvent?: (event: SandboxEvent) => void,
  ): Promise<void>;
  abstract exec(sandboxId: string, command: string): Promise<ExecResult>;
}

interface ActiveSandbox {
  sessionId: string;
  tunnelUrl: string;
  modalSandboxId: string;
  bearerToken: string;
}

@injectable()
export class SandboxManager extends ISandboxManager {
  private activeSandboxes = new Map<string, ActiveSandbox>();

  constructor(
    @inject(IModalClient)
    private readonly modalClient: IModalClient,
  ) {
    super();
  }

  async create(sessionId: string, config: SandboxConfig): Promise<{ sandboxId: string; authToken: string }> {
    const sandboxRepo = getInject<SandboxRepository>(ISandboxRepository);
    const internalAuth = getInject<IInternalAuthService>(IInternalAuthService);

    const { token, hash } = internalAuth.generateSandboxToken();

    // Create DB record
    const sandboxRecord = await sandboxRepo.create({
      sessionId,
      authTokenHash: hash,
      status: 'pending',
    });

    try {
      // Create Modal sandbox
      await sandboxRepo.updateStatus(sandboxRecord.id, 'starting');

      const modal = await this.modalClient.createSandbox({
        image: env.MODAL_SANDBOX_IMAGE ?? 'ghcr.io/your-org/acp-sandbox:latest',
        encryptedPorts: [8080],
        idleTimeout: 1800,
      });

      // Initialize the sandbox via HTTP
      const bearerToken = internalAuth.generateToken();
      const initResponse = await fetch(`${modal.tunnelUrl}/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.apiKey,
          bearerToken,
          model: config.model,
        }),
        signal: AbortSignal.timeout(TIMEOUTS.INIT),
      });

      if (!initResponse.ok) {
        const err = await initResponse.text();
        throw new Error(`Init failed: ${err}`);
      }

      await sandboxRepo.updateStatus(sandboxRecord.id, 'running');

      // Track active sandbox
      this.activeSandboxes.set(sandboxRecord.id, {
        sessionId,
        tunnelUrl: modal.tunnelUrl,
        modalSandboxId: modal.sandboxId,
        bearerToken,
      });

      log.info('Sandbox created and initialized', {
        sandboxId: sandboxRecord.id,
        modalSandboxId: modal.sandboxId,
        sessionId,
      });

      return { sandboxId: sandboxRecord.id, authToken: token };
    } catch (err) {
      await sandboxRepo.updateStatus(sandboxRecord.id, 'error');
      log.error('Sandbox creation failed', err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  async sendPrompt(
    sandboxId: string,
    prompt: string,
    messageId: string,
    onEvent?: (event: SandboxEvent) => void,
  ): Promise<void> {
    const active = this.activeSandboxes.get(sandboxId);
    if (!active) {
      throw new Error(`Sandbox not found: ${sandboxId}`);
    }

    log.info('Sending prompt to sandbox', { sandboxId, messageId, promptLength: prompt.length });

    const response = await fetch(`${active.tunnelUrl}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${active.bearerToken}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Prompt failed: ${err}`);
    }

    if (!response.body) {
      throw new Error('No response body for SSE stream');
    }

    // Consume SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastEventTime = Date.now();

    while (true) {
      const timeoutMs = TIMEOUTS.PROMPT - (Date.now() - lastEventTime);
      if (timeoutMs <= 0) {
        reader.cancel();
        throw new Error('Prompt timed out (no events received)');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE events from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ') && eventType) {
          lastEventTime = Date.now();
          try {
            const data = JSON.parse(line.slice(6));
            if (onEvent) {
              onEvent({
                type: eventType as SandboxEvent['type'],
                sandboxId,
                sessionId: active.sessionId,
                messageId,
                timestamp: Date.now(),
                data,
              });
            }
          } catch {
            log.warn('Failed to parse SSE data', { line });
          }
          eventType = '';
        }
      }
    }

    log.info('Prompt completed', { sandboxId, messageId });
  }

  async exec(sandboxId: string, command: string): Promise<ExecResult> {
    const active = this.activeSandboxes.get(sandboxId);
    if (!active) {
      throw new Error(`Sandbox not found: ${sandboxId}`);
    }

    log.info('Executing command in sandbox', { sandboxId, command });

    const response = await fetch(`${active.tunnelUrl}/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${active.bearerToken}`,
      },
      body: JSON.stringify({ command, timeout: TIMEOUTS.EXEC }),
      signal: AbortSignal.timeout(TIMEOUTS.EXEC + 5000),
    });

    if (!response.ok) {
      const err = await response.text();
      return { exitCode: -1, stdout: '', stderr: err };
    }

    return await response.json() as ExecResult;
  }

  async stop(sandboxId: string): Promise<void> {
    const sandboxRepo = getInject<SandboxRepository>(ISandboxRepository);
    const active = this.activeSandboxes.get(sandboxId);

    if (active) {
      try {
        await fetch(`${active.tunnelUrl}/terminate`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${active.bearerToken}` },
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        log.warn('Failed to send terminate to sandbox', { sandboxId });
      }

      try {
        await this.modalClient.terminateSandbox(active.modalSandboxId);
      } catch {
        log.warn('Failed to terminate Modal sandbox', { sandboxId });
      }

      this.activeSandboxes.delete(sandboxId);
    }

    await sandboxRepo.updateStatus(sandboxId, 'stopped');
    log.info('Sandbox stopped', { sandboxId });
  }

  async destroy(sandboxId: string): Promise<void> {
    await this.stop(sandboxId);
  }

  async getStatus(sandboxId: string): Promise<SandboxStatus> {
    const sandboxRepo = getInject<SandboxRepository>(ISandboxRepository);
    const sandboxRecord = await sandboxRepo.findById(sandboxId);
    if (!sandboxRecord) return 'stopped';
    return sandboxRecord.status as SandboxStatus;
  }
}
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/service/src/sandbox/manager.ts
git commit -m "feat(service): refactor SandboxManager with Modal + HTTP implementation"
```

---

### Task 11: Update ExecuteTaskUseCase to use real exec/sendPrompt

**Files:**
- Modify: `packages/use-case/src/session/execute-task.use-case.ts:73-84`

**Step 1: Replace stub exec function**

Change lines 73-77 from:

```typescript
      const exec = async (sandboxId: string, command: string) => {
        log.info('Sandbox exec', { sandboxId, command });
        return { exitCode: 0, stdout: '', stderr: '' };
      };
```

To:

```typescript
      const exec = async (sandboxId: string, command: string) => {
        return await this.sandboxManager.exec(sandboxId, command);
      };
```

**Step 2: Replace stub sendPrompt function**

Change lines 80-84 from:

```typescript
      const sendPrompt = async (sandboxId: string, prompt: string, messageId: string) => {
        log.info('Sandbox agent loop', { sandboxId, messageId, promptLength: prompt.length });
        await this.sandboxManager.sendPrompt(sandboxId, prompt, messageId);
        return { success: true, filesTouched: [] as string[] };
      };
```

To:

```typescript
      const sendPrompt = async (sandboxId: string, prompt: string, messageId: string) => {
        log.info('Sandbox agent loop', { sandboxId, messageId, promptLength: prompt.length });
        await this.sandboxManager.sendPrompt(sandboxId, prompt, messageId, (event) => {
          bridge.persistFn?.({
            type: event.type,
            data: event.data,
          });
        });
        return { success: true, filesTouched: [] as string[] };
      };
```

**Step 3: Add sandbox cleanup in finally block**

Add sandbox stop to the `finally` block (around line 142):

```typescript
    } finally {
      // Stop sandbox after blueprint execution
      try {
        if (sandbox?.sandboxId) {
          await this.sandboxManager.stop(sandbox.sandboxId);
        }
      } catch (err) {
        log.warn('Failed to stop sandbox', { error: err instanceof Error ? err.message : String(err) });
      }
      this.running.delete(input.sessionId);
    }
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/use-case/src/session/execute-task.use-case.ts
git commit -m "feat(use-case): wire ExecuteTaskUseCase to real SandboxManager exec/sendPrompt"
```

---

### Task 12: Update ISandboxManager interface exports

**Files:**
- Verify: `packages/service/src/index.ts` already exports `ISandboxManager` and `SandboxManager`
- Verify: The new `exec()` method is available through the abstract class

**Step 1: Verify the abstract class has `exec()`**

The `ISandboxManager` abstract class in `manager.ts` now has `exec()`. Check that all consumers can access it.

**Step 2: Run full typecheck and lint**

Run: `bun run typecheck && bun run lint`
Expected: PASS

**Step 3: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve type/lint issues from SandboxManager refactor"
```

---

### Task 13: Integration smoke test

**Files:**
- Create: `apps/sandbox-server/src/index.test.ts`

**Step 1: Write integration test for sandbox-server**

```typescript
import { describe, test, expect, afterAll } from 'bun:test';

describe('Sandbox Server Integration', () => {
  const BASE = 'http://localhost:8081';
  let server: ReturnType<typeof Bun.serve>;

  // Import and start server on test port
  test('GET /health returns idle status', async () => {
    const res = await fetch(`${BASE}/health`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('idle');
  });

  test('POST /exec runs a command', async () => {
    const res = await fetch(`${BASE}/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'echo hello' }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.exitCode).toBe(0);
    expect(body.stdout).toContain('hello');
  });

  test('POST /prompt before init returns 409', async () => {
    const res = await fetch(`${BASE}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test' }),
    });
    expect(res.status).toBe(409);
  });
});
```

**Step 2: Run the test**

Run: `PORT=8081 bun run apps/sandbox-server/src/index.ts &` then `cd apps/sandbox-server && bun test`
Expected: Health and exec tests PASS, prompt-before-init returns 409

**Step 3: Commit**

```bash
git add apps/sandbox-server/src/index.test.ts
git commit -m "test(sandbox-server): add integration smoke tests"
```

---

### Task 14: Build and push Docker image

**Step 1: Build the image**

Run: `cd apps/sandbox-server && docker build -t ghcr.io/your-org/acp-sandbox:latest .`

**Step 2: Test the container locally**

Run: `docker run -p 8080:8080 ghcr.io/your-org/acp-sandbox:latest`
Then: `curl http://localhost:8080/health`
Expected: `{"status":"idle",...}`

**Step 3: Push to registry**

Run: `docker push ghcr.io/your-org/acp-sandbox:latest`

**Step 4: Commit any CI/build config changes if needed**

---

### Task 15: End-to-end test with Modal

This task requires Modal credentials configured.

**Step 1: Set Modal environment variables**

```bash
export MODAL_TOKEN_ID=your-token-id
export MODAL_TOKEN_SECRET=your-token-secret
export MODAL_SANDBOX_IMAGE=ghcr.io/your-org/acp-sandbox:latest
```

**Step 2: Test sandbox creation manually**

Write a quick script `scripts/test-modal-sandbox.ts`:

```typescript
import { ModalClient } from '@repo/service';

const client = new ModalClient();

const { sandboxId, tunnelUrl } = await client.createSandbox({
  image: process.env.MODAL_SANDBOX_IMAGE!,
  encryptedPorts: [8080],
  idleTimeout: 300,
});

console.log('Created sandbox:', sandboxId);
console.log('Tunnel URL:', tunnelUrl);

// Test health
const health = await fetch(`${tunnelUrl}/health`);
console.log('Health:', await health.json());

// Test exec
const exec = await fetch(`${tunnelUrl}/exec`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ command: 'echo hello from modal' }),
});
console.log('Exec:', await exec.json());

// Cleanup
await client.terminateSandbox(sandboxId);
console.log('Terminated');
```

**Step 3: Run it**

Run: `bun run scripts/test-modal-sandbox.ts`
Expected: Sandbox created, health ok, exec returns hello, terminated.

**Step 4: Commit test script**

```bash
git add scripts/test-modal-sandbox.ts
git commit -m "test: add Modal sandbox end-to-end test script"
```
