# 07 - Sandbox System (Agent Execution Environment)

## Summary

Build the sandbox system that runs coding agents in isolated environments. This is the "data plane" — it receives prompts, runs an AI coding agent, and streams events back to the control plane via WebSocket.

## Reference

`scaffold/background-agents/packages/modal-infra/src/sandbox/` (Python sandbox)
`scaffold/background-agents/packages/control-plane/src/sandbox/lifecycle/manager.ts` (lifecycle)

## Architecture Decision

The reference uses Modal (Python) for sandboxing. We need to decide on our approach:

### Option A: Docker-based Sandboxes (Recommended for MVP)
- Run sandboxes as Docker containers on the same machine or a Docker host
- Use `dockerode` (Node.js Docker client) to manage containers
- Simpler setup, good for self-hosted/single-server deployments
- Each container gets: git, node, python, the coding agent

### Option B: Cloud Sandbox Provider
- Use a service like E2B, Modal, or Fly Machines
- Better isolation and scalability
- More complex setup, requires external account

### Option C: Process-based (Simplest MVP)
- Run agents as child processes with resource limits
- Least isolation but fastest to build
- Good for local development

## Core Components

### SandboxManager
```typescript
class SandboxManager {
  create(sessionId: string, config: SandboxConfig): Promise<Sandbox>;
  stop(sandboxId: string): Promise<void>;
  destroy(sandboxId: string): Promise<void>;
  getStatus(sandboxId: string): Promise<SandboxStatus>;
  exec(sandboxId: string, command: string): Promise<ExecResult>;
}

interface SandboxConfig {
  repoOwner: string;
  repoName: string;
  branch?: string;
  secrets: Record<string, string>;
  model: string;
  reasoningEffort: string;
}
```

### SandboxBridge
Bidirectional communication between sandbox and control plane:
- **Inbound (control plane → sandbox)**: prompt, stop, snapshot commands
- **Outbound (sandbox → control plane)**: agent events (tool_call, token, git_sync, etc.)
- Heartbeat loop for health monitoring

### Agent Runner (inside sandbox)
The actual coding agent process:
1. Receives prompt
2. Runs AI coding agent (e.g., Claude Code CLI, OpenCode, or custom agent)
3. Emits events as the agent works (tool calls, file edits, terminal commands)
4. Reports completion/error

### Lifecycle Manager
```typescript
class SandboxLifecycleManager {
  // Decision functions (pure, no side effects)
  shouldSpawn(state: SandboxState): SpawnDecision;
  shouldSnapshot(state: SandboxState): boolean;
  shouldTimeout(state: SandboxState): boolean;

  // Side-effect executors
  spawn(sessionId: string): Promise<void>;
  snapshot(sandboxId: string): Promise<string>;
  timeout(sandboxId: string): Promise<void>;
}
```

### Sandbox Events (emitted to WebSocket)
```typescript
type SandboxEvent = {
  type: "tool_call" | "tool_result" | "token" | "error" | "git_sync" |
        "execution_complete" | "user_message";
  sandboxId: string;
  sessionId: string;
  messageId?: string;
  timestamp: number;
  // type-specific fields...
};
```

## Implementation Steps

1. Define sandbox types in `packages/types/src/sandbox.ts`
2. Create `packages/service/src/sandbox/`:
   - `manager.ts` — sandbox CRUD
   - `bridge.ts` — WebSocket communication
   - `lifecycle.ts` — lifecycle decisions
   - `agent-runner.ts` — coding agent wrapper
3. Create sandbox Docker image (Dockerfile) with agent tooling
4. Create sandbox repository in `packages/repository/src/sandbox.repository.ts`
5. Integrate with WebSocket room manager (Task 05) for event broadcasting
6. Add sandbox-related routes (status, stop) to session routes
7. Wire into DI container

## Dependencies

- Task 01 (sandbox schema)
- Task 05 (WebSocket for event streaming)
- Task 06 (GitHub for repo cloning)

## Acceptance Criteria

- Can create isolated sandbox for a session
- Sandbox clones repo and starts coding agent
- Prompts are delivered to sandbox and agent executes them
- Agent events stream back to control plane via bridge
- Events broadcast to WebSocket clients
- Heartbeat monitoring with timeout on inactivity
- Clean shutdown on stop command
- Circuit breaker on repeated spawn failures
