# Blueprint Orchestration System Design

**Date:** 2026-02-25
**Status:** Approved
**Inspired by:** [Stripe Minions Part 1](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents), [Part 2](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents-part-2)

## Overview

A state machine orchestration system that drives agent task execution. Blueprints combine deterministic nodes (lint, typecheck, test, git) with agent nodes (implement code, fix errors) into a directed graph with conditional transitions and retry loops.

**Scope:** Task-level orchestration only. Each user prompt triggers one blueprint execution. Session lifecycle management is out of scope.

**Execution model:** Blueprint is the orchestrator, sandbox is the executor. The Blueprint runner never calls LLMs directly — agent nodes delegate to the sandbox's agent loop. Deterministic nodes send shell commands to the sandbox.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Orchestration level | Task-level (per prompt) | Session lifecycle is a separate concern |
| Customizability | Hardcoded single blueprint | YAGNI — clean abstractions allow extension later |
| Orchestration pattern | State machine | Flow contains retry loops (fix -> re-check) that pipelines can't express |
| LLM execution | Sandbox-driven | Blueprint orchestrates, sandbox executes. Clean separation |
| Test nodes in V1 | Yes | Tests are the primary feedback signal for agent iteration |
| Git behavior | Auto commit + push | Matches Stripe's unattended model |

## Core Types

```typescript
// --- Blueprint Definition ---

type NodeOutcome = 'pass' | 'fail' | 'error'
type NodeType = 'deterministic' | 'agent'

interface BlueprintNode {
  id: string
  type: NodeType
  label: string
  transitions: Record<NodeOutcome, string | null> // outcome -> next node id, null = terminal
  maxRetries?: number
}

interface Blueprint {
  id: string
  name: string
  initialNodeId: string
  nodes: Record<string, BlueprintNode>
}

// --- Runtime State ---

interface NodeExecution {
  nodeId: string
  status: 'running' | 'completed' | 'failed' | 'skipped'
  outcome?: NodeOutcome
  retryCount: number
  startedAt: number
  completedAt?: number
  output?: unknown
}

type BlueprintStatus = 'running' | 'completed' | 'failed' | 'cancelled'

interface BlueprintExecution {
  blueprintId: string
  sessionId: string
  messageId: string
  status: BlueprintStatus
  currentNodeId: string
  nodeExecutions: NodeExecution[]
  context: BlueprintContext
}

interface BlueprintContext {
  sessionId: string
  messageId: string
  sandboxId: string
  prompt: string
  repoOwner?: string
  repoName?: string
  branchName?: string
  lintErrors: string[]
  testFailures: string[]
  filesTouched: string[]
  commitSha?: string
}

// --- Node Execution ---

interface NodeHandler {
  execute(
    node: BlueprintNode,
    context: BlueprintContext,
    signal: AbortSignal,
  ): Promise<NodeOutcome>
}

// --- Agent Node Config ---

interface AgentLoopConfig {
  maxTokens: number
  maxTurns: number
  timeoutMs: number
  tools: string[]
  systemPrompt: string
}
```

## Default Blueprint

```
hydrate-context [D]
  │ pass
implement-task [A]
  │ pass
run-lint [D]
  ├── pass ──→ run-tests [D]
  └── fail ──→ fix-lint [A] (max 1 retry)
                 │ pass
                 └──→ run-lint (loop back)

run-tests [D]
  ├── pass ──→ git-commit [D]
  └── fail ──→ fix-tests [A] (max 1 retry)
                 │ pass
                 └──→ run-tests (loop back)

git-commit [D]
  │ pass
  └──→ done (null terminal)
```

Definition:

```typescript
const DEFAULT_TASK_BLUEPRINT: Blueprint = {
  id: 'default-task',
  name: 'Default Task Blueprint',
  initialNodeId: 'hydrate-context',
  nodes: {
    'hydrate-context': {
      id: 'hydrate-context',
      type: 'deterministic',
      label: 'Hydrate Context',
      transitions: { pass: 'implement-task', fail: null, error: null },
    },
    'implement-task': {
      id: 'implement-task',
      type: 'agent',
      label: 'Implement Task',
      transitions: { pass: 'run-lint', fail: null, error: null },
    },
    'run-lint': {
      id: 'run-lint',
      type: 'deterministic',
      label: 'Run Lint & Typecheck',
      transitions: { pass: 'run-tests', fail: 'fix-lint', error: null },
    },
    'fix-lint': {
      id: 'fix-lint',
      type: 'agent',
      label: 'Fix Lint Errors',
      maxRetries: 1,
      transitions: { pass: 'run-lint', fail: null, error: null },
    },
    'run-tests': {
      id: 'run-tests',
      type: 'deterministic',
      label: 'Run Tests',
      transitions: { pass: 'git-commit', fail: 'fix-tests', error: null },
    },
    'fix-tests': {
      id: 'fix-tests',
      type: 'agent',
      label: 'Fix Test Failures',
      maxRetries: 1,
      transitions: { pass: 'run-tests', fail: null, error: null },
    },
    'git-commit': {
      id: 'git-commit',
      type: 'deterministic',
      label: 'Git Commit & Push',
      transitions: { pass: null, fail: null, error: null },
    },
  },
}
```

## State Machine Runner

The `BlueprintRunner` is a generic state machine executor. It:

1. Starts at `initialNodeId`
2. Looks up the `NodeHandler` for the current node
3. Checks retry limits (by counting prior executions of the same node in history)
4. Executes the handler, passing `BlueprintContext` and `AbortSignal`
5. Records the `NodeExecution` result
6. Follows the transition for the returned `NodeOutcome`
7. Repeats until reaching a `null` transition (terminal) or failure

The runner emits events at each step:
- `node:started` — node execution begins
- `node:completed` — node returned an outcome
- `node:error` — node threw an exception
- `blueprint:completed` — all nodes finished, reached terminal
- `blueprint:failed` — max retries exceeded or unrecoverable error
- `blueprint:cancelled` — user triggered stop

## Integration with Existing System

### Entry Point

```
User sends "prompt" via WebSocket
  -> handlePrompt (existing, apps/server/src/ws/handlers.ts)
    -> QueuePromptUseCase.execute()        (existing: creates message, status='pending')
    -> ExecuteTaskUseCase.execute()        (NEW: starts blueprint)
      -> BlueprintRunner.run()
        -> node events emitted
          -> persisted to sessionEvent     (existing schema)
          -> broadcast via roomManager     (existing WebSocket infra)
```

### New: ExecuteTaskUseCase

Bridges the existing message/session system to the Blueprint runner:

1. Marks message as `processing`
2. Ensures sandbox exists via `ISandboxService`
3. Builds `BlueprintContext` from session + message data
4. Runs `BlueprintRunner.run(DEFAULT_TASK_BLUEPRINT, context)`
5. Marks message as `completed` or `failed` based on result

### New: BlueprintEventBridge

Connects Blueprint runner events to existing infrastructure:

- Persists events to `sessionEvent` table (via `ISessionEventRepository`)
- Broadcasts events to WebSocket clients (via `SessionRoomManager`)
- Blueprint events coexist with sandbox agent events (tool_call, token, etc.) as two layers

### New Event Types

Added to `SandboxEventType`:

```typescript
| 'blueprint_node_started'
| 'blueprint_node_completed'
| 'blueprint_node_error'
| 'blueprint_completed'
| 'blueprint_failed'
```

### DI Registration

New abstractions in `packages/di/src/types.ts`:
- `IExecuteTaskUseCase`
- `IBlueprintRunner`
- `ISandboxService`

Bindings in `packages/bootstrap/src/index.ts`.

## Error Handling

### Three-layer strategy

| Layer | Scenario | Handling |
|-------|----------|----------|
| Recoverable | Lint finds errors | Handler returns `fail` -> transitions to fix node |
| Unrecoverable | Lint command crashes | Handler throws -> `error` transition -> `null` -> blueprint failed |
| Infrastructure | Sandbox down | Handler timeout -> throw -> blueprint failed |

### Additional error scenarios

| Scenario | Handling |
|----------|----------|
| Agent loop runs away | `AgentLoopConfig.maxTokens` / `maxTurns` / `timeoutMs` limits |
| Fix node can't fix | Re-check still fails -> second fix attempt -> `maxRetries` exceeded -> blueprint failed |
| User clicks stop | `AbortSignal` -> current node interrupted -> blueprint cancelled |
| Sandbox unresponsive | Handler-level timeout -> throw -> blueprint failed |

### Failure behavior

- **No rollback** on failure. Sandbox file changes are preserved.
- Users can manually continue in the sandbox or give the agent new instructions.
- This matches Stripe's philosophy: "a run that's not entirely correct is often still an excellent starting point."

## Stop/Cancel

`BlueprintRunner` maintains an `AbortController` per execution (keyed by `messageId`).

- `stop(messageId)` calls `abort()` on the controller
- Runner checks `signal.aborted` before entering each node
- `AbortSignal` is passed to `NodeHandler.execute()`, which passes it to sandbox commands
- Deterministic nodes: kill child process
- Agent nodes: send stop instruction to sandbox

WebSocket `stop` message calls `runner.stop(messageId)`.

## Agent Node Safety Boundaries

Each agent node gets a constrained "box" (per Stripe's "putting LLMs into contained boxes"):

| Agent Node | Tools | Constraints |
|------------|-------|-------------|
| `implement-task` | read, write, search, shell | High token limit, high turn limit |
| `fix-lint` | write_file, shell | Low token limit, low turn limit, prompt = lint errors only |
| `fix-tests` | read_file, write_file, shell | Medium token limit, prompt = test output only |

## Concurrency

One blueprint execution per session at a time. `ExecuteTaskUseCase` enforces this with an in-memory set of active session IDs. Concurrent prompts to the same session are rejected.

## Package Structure

```
packages/
  blueprint/                         <- new package: @repo/blueprint
    src/
      types.ts                       <- Blueprint, BlueprintNode, NodeOutcome, etc.
      runner.ts                      <- BlueprintRunner (state machine)
      event-bridge.ts                <- BlueprintEventBridge
      default-task.blueprint.ts      <- DEFAULT_TASK_BLUEPRINT definition
      handlers/
        hydrate-context.handler.ts
        implement-task.handler.ts
        run-lint.handler.ts
        fix-lint.handler.ts
        run-tests.handler.ts
        fix-tests.handler.ts
        git-commit.handler.ts
      index.ts
```
