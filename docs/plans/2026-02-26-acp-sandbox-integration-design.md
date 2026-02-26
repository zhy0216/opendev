# ACP Sandbox Integration Design

**Date:** 2026-02-26
**Status:** Approved

## Overview

Integrate Claude Code into Modal Sandbox containers, controlled via Zed's Agent Client Protocol (ACP). The server communicates with the container over HTTP + SSE through Modal Tunnel. Inside the container, a thin HTTP wrapper translates requests into ACP JSON-RPC over stdio to the Claude Code CLI.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Server (Bun)                                               │
│                                                             │
│  WebSocket Client ←→ handlePrompt()                         │
│         ↓                                                   │
│  ExecuteTaskUseCase                                         │
│         ↓                                                   │
│  BlueprintRunner (hydrate → implement → lint → fix → ...)   │
│         ↓ (agent nodes)                                     │
│  SandboxManager                                             │
│    ├─ create()  → Modal SDK: Sandbox.create() + tunnel      │
│    ├─ sendPrompt() → HTTP POST /prompt → SSE stream         │
│    ├─ exec()    → HTTP POST /exec                           │
│    └─ destroy() → Modal SDK: Sandbox.terminate()            │
│         ↓                                                   │
│  SandboxBridge ← SSE events → roomManager.broadcast()       │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP + SSE (via Modal Tunnel, TLS)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Modal Sandbox Container                                     │
│                                                             │
│  HTTP Wrapper (Bun.serve, port 8080)                        │
│    POST /init      → spawn claude-code + ACP init + session │
│    POST /prompt    → ACP session/prompt → SSE response      │
│    POST /exec      → child_process.exec → JSON response     │
│    POST /cancel    → ACP cancel                             │
│    GET  /health    → process alive check                    │
│    POST /terminate → graceful shutdown                      │
│         ↓ ACP JSON-RPC over stdio                           │
│  claude-agent-acp adapter                                   │
│         ↓ stdio                                             │
│  Claude Code CLI                                            │
└─────────────────────────────────────────────────────────────┘
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sandbox runtime | Modal Sandbox | gVisor isolation, TypeScript SDK, tunnel support, pay-per-use |
| Network transport | HTTP + SSE via Modal Tunnel | SSE for streaming agent events, HTTP for commands |
| Container image | Pre-built, pushed to registry | Fast cold start, Modal pulls via `Image.from_registry()` |
| ACP adapter | `@zed-industries/claude-agent-acp` + HTTP wrapper | Reuse existing adapter, thin HTTP layer on top |
| API Key management | User-provided, passed via `/init` at sandbox creation | Per-user keys, stored in memory only |
| Session model | One sandbox per session, ACP session reused across blueprint nodes | Context continuity — Claude Code remembers prior work when fixing lint/tests |
| Approach | Thin wrapper + session reuse (Option C) | Minimal container logic, all orchestration stays in server's BlueprintRunner |

## Container HTTP Wrapper

### State Machine

```
         POST /init
            ↓
  [idle] ──→ [initializing] ──→ [ready] ←──┐
                   │               │        │
                   │ (error)   POST /prompt │
                   ↓               ↓        │
               [error]        [busy] ───────┘
                                   │ (SSE complete / POST /cancel)
                                   │
                              POST /terminate
                                   ↓
                              [terminated]
```

### API

#### `POST /init`

Creates the Claude Code process and establishes an ACP session.

```
Request:  { apiKey: string, model?: string, systemPrompt?: string }
Response: 200 { sessionId: string, capabilities: object }
Error:    409 (already initialized), 500 (spawn failure)
```

The API key is set as `ANTHROPIC_API_KEY` environment variable before spawning Claude Code. It is stored in memory only and cleared on terminate.

#### `POST /prompt`

Sends a prompt to the existing ACP session. Returns an SSE stream.

```
Request:  { prompt: string }
Guard:    State must be 'ready'
Response: SSE stream
  event: token       data: { content: "..." }
  event: tool_call   data: { name: "...", input: {...} }
  event: tool_result data: { name: "...", output: "..." }
  event: done        data: { outcome: "pass" | "fail" }
  event: error       data: { message: "..." }
```

#### `POST /exec`

Executes a shell command directly (not through Claude Code).

```
Request:  { command: string, timeout?: number }
Guard:    State must be 'ready' or 'busy'
Response: 200 { exitCode: number, stdout: string, stderr: string }
```

#### `POST /cancel`

Cancels the current ACP prompt.

```
Response: 200 { cancelled: true }
```

#### `GET /health`

```
Response: 200 { status: string, uptime: number, lastActivity: number }
```

#### `POST /terminate`

Graceful shutdown of Claude Code process.

```
Response: 200 { terminated: true }
```

### SSE Event Mapping

| ACP session/update | SSE event |
|---|---|
| message chunk (token) | `event: token` |
| tool_call notification | `event: tool_call` |
| tool_result | `event: tool_result` |
| session complete | `event: done` |
| error | `event: error` |

### Authentication

The server passes a one-time token during `/init`. All subsequent requests must include `Authorization: Bearer {token}`.

## Server-Side Changes

### SandboxManager Refactor

The current stub implementation becomes a real Modal + HTTP client:

```typescript
class SandboxManager {
  // activeSandboxes stores:
  //   sandboxId → { sessionId, tunnelUrl, modalSandboxId }

  async create(sessionId, config) {
    // 1. Modal SDK: Sandbox.create({ image, encrypted_ports: [8080] })
    // 2. Wait for tunnel ready, get tunnelUrl
    // 3. HTTP POST tunnelUrl/init { apiKey, model }
    // 4. Store in DB + activeSandboxes
  }

  async sendPrompt(sandboxId, prompt, messageId) {
    // 1. Get tunnelUrl from activeSandboxes
    // 2. HTTP POST tunnelUrl/prompt { prompt }
    // 3. Consume SSE stream, forward events via SandboxBridge.emitEvent()
    // 4. Wait for event: done, return outcome
  }

  async exec(sandboxId, command) {
    // 1. HTTP POST tunnelUrl/exec { command }
    // 2. Return { exitCode, stdout, stderr }
  }

  async stop(sandboxId) {
    // 1. HTTP POST tunnelUrl/terminate
    // 2. Modal SDK: sandbox.terminate()
    // 3. Update DB status
  }
}
```

### New IModalClient Abstraction

```typescript
// packages/di/src/types.ts
abstract class IModalClient {
  abstract createSandbox(config): Promise<{ sandboxId: string, tunnelUrl: string }>
  abstract terminateSandbox(sandboxId: string): Promise<void>
}
```

Decouples `SandboxManager` from Modal SDK for testability.

### ExecuteTaskUseCase Changes

Minimal — the `exec` and `sendPrompt` closures stop being stubs and delegate to the real `SandboxManager` methods. Handler signatures remain unchanged.

### Unchanged Components

- BlueprintRunner
- Blueprint definitions
- Node Handler interfaces
- BlueprintEventBridge
- WebSocket handlers
- SandboxBridge interface
- DB schema (uses existing `externalSandboxId` field for Modal sandbox ID)

## Data Flow: Full Request Lifecycle

```
User sends "Implement a login page"
  ↓
1. WebSocket → handlePrompt()
2. QueuePromptUseCase → DB message (pending)
3. ExecuteTaskUseCase.execute() (fire-and-forget)
4. SandboxManager.create()
   ├─ Modal Sandbox.create({ image, encrypted_ports: [8080] })
   ├─ Wait for tunnel (~3-5s cold start)
   ├─ POST {tunnelUrl}/init { apiKey, model }
   └─ Store activeSandboxes + DB
5. BlueprintRunner.run()
   ├─ hydrate-context → 'pass'
   ├─ implement-task → sendPrompt() → SSE stream → events broadcast → 'pass'
   ├─ run-lint → exec("bun run lint") → exitCode 1 → 'fail'
   ├─ fix-lint → sendPrompt() reuses ACP session (has context) → 'pass'
   ├─ run-lint (retry) → 'pass'
   ├─ run-tests → exec("bun test") → 'pass'
   └─ git-commit → exec("git add -A && git commit...") → 'pass'
6. SandboxManager.stop() → terminate container
7. Message status → 'completed', broadcast session_status
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| Modal Sandbox creation failure | Update DB `spawnFailureCount`, circuit breaker check, blueprint fails |
| Tunnel connection timeout | Retry once (10s timeout), destroy sandbox if still failing |
| `/init` failure (Claude Code won't start) | Destroy sandbox, recreate once, blueprint fails on second failure |
| `/prompt` SSE stream interrupted | Treat as 'error' outcome, blueprint follows error transition |
| `/prompt` returns `done { outcome: fail }` | Handler returns 'fail', blueprint follows fail transition (normal) |
| `/exec` timeout (default 60s) | Return exitCode: -1, handler decides pass/fail |
| Claude Code process crash | SSE `event: error`, handler returns 'error', blueprint fails |
| Modal Sandbox idle timeout | Next HTTP request fails, SandboxManager detects and recreates |

## Timeout Configuration

```typescript
const TIMEOUTS = {
  SANDBOX_CREATE: 30_000,     // Modal cold start
  TUNNEL_READY: 15_000,       // Wait for tunnel exposure
  INIT: 20_000,               // Claude Code startup + ACP handshake
  PROMPT: 900_000,            // 15 min inactivity timeout (resets on each event)
  EXEC: 60_000,               // Shell command execution
  IDLE: 1_800_000,            // 30 min idle sandbox reclaim (Modal side)
};
```

The `PROMPT` timeout is an **inactivity timeout** — it resets on each SSE event. As long as Claude Code is producing tokens or tool calls, the timeout does not fire.

## New Package / Directory Structure

```
opendev/
├── apps/
│   └── sandbox-server/          ← NEW: container HTTP wrapper
│       ├── package.json
│       ├── Dockerfile
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts              # Bun.serve() entry
│           ├── routes/
│           │   ├── init.ts           # POST /init
│           │   ├── prompt.ts         # POST /prompt → SSE
│           │   ├── exec.ts           # POST /exec
│           │   ├── cancel.ts         # POST /cancel
│           │   ├── health.ts         # GET /health
│           │   └── terminate.ts      # POST /terminate
│           ├── acp/
│           │   ├── client.ts         # ACP ClientSideConnection wrapper
│           │   └── events.ts         # ACP event → SSE event mapping
│           └── process/
│               └── manager.ts        # Claude Code process spawn/lifecycle
│
├── packages/
│   └── service/src/sandbox/
│       └── modal-client.ts      ← NEW: Modal SDK wrapper
```

### Dependencies

```
apps/sandbox-server (standalone, no monorepo deps)
  ├── @agentclientprotocol/sdk
  └── bun (runtime)

packages/service (new dependency)
  └── modal (npm package)
```

`sandbox-server` is a standalone deployment unit baked into the Docker image. It does not import any monorepo packages.

## Security

| Aspect | Measure |
|--------|---------|
| API Key transport | Via Modal encrypted tunnel (TLS), key stored in memory only |
| Container auth | One-time token from `/init`, subsequent requests use `Authorization: Bearer {token}` |
| Command execution | No whitelist — container itself is the isolation boundary, with timeout |
| Network isolation | Modal Sandbox has no inbound by default, only tunnel port exposed |
| Key cleanup | `/terminate` clears API key from memory |
| Sandbox isolation | Modal gVisor runtime (stronger than standard Docker) |

## Container Image

```dockerfile
FROM oven/bun:1-alpine
RUN npm install -g @anthropic-ai/claude-code
RUN npm install -g @zed-industries/claude-code-acp
COPY apps/sandbox-server /app
WORKDIR /app
RUN bun install --production
EXPOSE 8080
CMD ["bun", "run", "src/index.ts"]
```

Image pushed to registry, Modal pulls via `modal.Image.from_registry("our-registry/acp-sandbox:latest")`.
