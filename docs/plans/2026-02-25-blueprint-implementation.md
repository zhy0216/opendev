# Blueprint Orchestration System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a state machine blueprint runner that orchestrates agent task execution, connecting user prompts to sandbox-driven agent loops with deterministic lint/test/git steps in between.

**Architecture:** New `@repo/blueprint` package containing types, runner, event bridge, default blueprint definition, and node handlers. Integrates via `ExecuteTaskUseCase` in `@repo/use-case`, wired to the existing WebSocket `handlePrompt` in `apps/server`.

**Tech Stack:** TypeScript, InversifyJS DI, Bun test runner, existing `@repo/service` sandbox services, existing `@repo/repository` event persistence.

**Design doc:** `docs/plans/2026-02-25-blueprint-orchestration-design.md`

---

### Task 1: Create `@repo/blueprint` package scaffold

**Files:**
- Create: `packages/blueprint/package.json`
- Create: `packages/blueprint/tsconfig.json`
- Create: `packages/blueprint/src/index.ts`

**Step 1: Create package.json**

```json
{
  "name": "@repo/blueprint",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target bun",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "inversify": "^7.0.0",
    "reflect-metadata": "^0.2.2"
  },
  "devDependencies": {
    "@repo/di": "workspace:*",
    "@repo/types": "workspace:*",
    "@repo/logger": "workspace:*",
    "@repo/service": "workspace:*",
    "@repo/repository": "workspace:*",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create empty src/index.ts**

```typescript
// @repo/blueprint — Blueprint orchestration system
```

**Step 4: Install dependencies**

Run: `bun install`
Expected: lockfile updated, no errors

**Step 5: Verify typecheck**

Run: `bun run typecheck --filter=@repo/blueprint`
Expected: PASS (empty package)

**Step 6: Commit**

```bash
git add packages/blueprint/
git commit -m "scaffold: create @repo/blueprint package"
```

---

### Task 2: Core types

**Files:**
- Create: `packages/blueprint/src/types.ts`
- Create: `packages/blueprint/src/__tests__/types.test.ts`
- Modify: `packages/blueprint/src/index.ts`

**Step 1: Write the test for type contracts**

Create `packages/blueprint/src/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import type {
  NodeOutcome,
  NodeType,
  BlueprintNode,
  Blueprint,
  NodeExecution,
  BlueprintStatus,
  BlueprintExecution,
  BlueprintContext,
  NodeHandler,
  AgentLoopConfig,
} from '../types';

describe('Blueprint types', () => {
  it('BlueprintNode has required fields', () => {
    const node: BlueprintNode = {
      id: 'test-node',
      type: 'deterministic',
      label: 'Test Node',
      transitions: { pass: 'next', fail: null, error: null },
    };
    expect(node.id).toBe('test-node');
    expect(node.type).toBe('deterministic');
    expect(node.transitions.pass).toBe('next');
    expect(node.maxRetries).toBeUndefined();
  });

  it('BlueprintNode supports optional maxRetries', () => {
    const node: BlueprintNode = {
      id: 'fix-node',
      type: 'agent',
      label: 'Fix Node',
      transitions: { pass: 'check', fail: null, error: null },
      maxRetries: 1,
    };
    expect(node.maxRetries).toBe(1);
  });

  it('Blueprint has initialNodeId and nodes map', () => {
    const bp: Blueprint = {
      id: 'test-bp',
      name: 'Test Blueprint',
      initialNodeId: 'start',
      nodes: {
        start: {
          id: 'start',
          type: 'deterministic',
          label: 'Start',
          transitions: { pass: null, fail: null, error: null },
        },
      },
    };
    expect(bp.initialNodeId).toBe('start');
    expect(bp.nodes['start']).toBeDefined();
  });

  it('BlueprintContext has required fields', () => {
    const ctx: BlueprintContext = {
      sessionId: 's1',
      messageId: 'm1',
      sandboxId: 'sb1',
      prompt: 'do something',
      lintErrors: [],
      testFailures: [],
      filesTouched: [],
    };
    expect(ctx.sessionId).toBe('s1');
    expect(ctx.lintErrors).toEqual([]);
    expect(ctx.commitSha).toBeUndefined();
  });

  it('NodeExecution tracks retry count', () => {
    const exec: NodeExecution = {
      nodeId: 'fix-lint',
      status: 'completed',
      outcome: 'pass',
      retryCount: 1,
      startedAt: Date.now(),
      completedAt: Date.now(),
    };
    expect(exec.retryCount).toBe(1);
    expect(exec.outcome).toBe('pass');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/blueprint/src/__tests__/types.test.ts`
Expected: FAIL — cannot resolve `../types`

**Step 3: Write types.ts**

Create `packages/blueprint/src/types.ts`:

```typescript
// --- Outcomes & Node Types ---

export type NodeOutcome = 'pass' | 'fail' | 'error';
export type NodeType = 'deterministic' | 'agent';

// --- Blueprint Definition (static graph) ---

export interface BlueprintNode {
  id: string;
  type: NodeType;
  label: string;
  transitions: Record<NodeOutcome, string | null>;
  maxRetries?: number;
}

export interface Blueprint {
  id: string;
  name: string;
  initialNodeId: string;
  nodes: Record<string, BlueprintNode>;
}

// --- Runtime State ---

export interface NodeExecution {
  nodeId: string;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  outcome?: NodeOutcome;
  retryCount: number;
  startedAt: number;
  completedAt?: number;
  output?: unknown;
}

export type BlueprintStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface BlueprintExecution {
  blueprintId: string;
  sessionId: string;
  messageId: string;
  status: BlueprintStatus;
  currentNodeId: string;
  nodeExecutions: NodeExecution[];
  context: BlueprintContext;
}

export interface BlueprintContext {
  sessionId: string;
  messageId: string;
  sandboxId: string;
  prompt: string;
  repoOwner?: string;
  repoName?: string;
  branchName?: string;
  lintErrors: string[];
  testFailures: string[];
  filesTouched: string[];
  commitSha?: string;
}

// --- Node Handler Interface ---

export interface NodeHandler {
  execute(
    node: BlueprintNode,
    context: BlueprintContext,
    signal: AbortSignal,
  ): Promise<NodeOutcome>;
}

// --- Agent Node Config ---

export interface AgentLoopConfig {
  maxTokens: number;
  maxTurns: number;
  timeoutMs: number;
  tools: string[];
  systemPrompt: string;
}
```

**Step 4: Export from index.ts**

Update `packages/blueprint/src/index.ts`:

```typescript
export type {
  NodeOutcome,
  NodeType,
  BlueprintNode,
  Blueprint,
  NodeExecution,
  BlueprintStatus,
  BlueprintExecution,
  BlueprintContext,
  NodeHandler,
  AgentLoopConfig,
} from './types';
```

**Step 5: Run test to verify it passes**

Run: `bun test packages/blueprint/src/__tests__/types.test.ts`
Expected: PASS — all 5 tests pass

**Step 6: Commit**

```bash
git add packages/blueprint/src/types.ts packages/blueprint/src/__tests__/types.test.ts packages/blueprint/src/index.ts
git commit -m "feat(blueprint): add core type definitions"
```

---

### Task 3: BlueprintRunner — state machine executor

**Files:**
- Create: `packages/blueprint/src/runner.ts`
- Create: `packages/blueprint/src/__tests__/runner.test.ts`
- Modify: `packages/blueprint/src/index.ts`

**Step 1: Write the failing tests**

Create `packages/blueprint/src/__tests__/runner.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { BlueprintRunner } from '../runner';
import type { Blueprint, BlueprintContext, BlueprintNode, NodeHandler, NodeOutcome } from '../types';

// --- Test Helpers ---

function makeHandler(outcome: NodeOutcome): NodeHandler {
  return {
    async execute(_node: BlueprintNode, _ctx: BlueprintContext, _signal: AbortSignal) {
      return outcome;
    },
  };
}

function makeFailThenPassHandler(): NodeHandler {
  let calls = 0;
  return {
    async execute(_node: BlueprintNode, _ctx: BlueprintContext, _signal: AbortSignal) {
      calls++;
      return calls === 1 ? 'fail' : 'pass';
    },
  };
}

function makeErrorHandler(msg: string): NodeHandler {
  return {
    async execute() {
      throw new Error(msg);
    },
  };
}

function makeContextMutatingHandler(mutation: (ctx: BlueprintContext) => void): NodeHandler {
  return {
    async execute(_node: BlueprintNode, ctx: BlueprintContext, _signal: AbortSignal) {
      mutation(ctx);
      return 'pass';
    },
  };
}

const baseContext: BlueprintContext = {
  sessionId: 's1',
  messageId: 'm1',
  sandboxId: 'sb1',
  prompt: 'test prompt',
  lintErrors: [],
  testFailures: [],
  filesTouched: [],
};

// --- Simple two-node blueprint: A -> B -> done ---

const simpleBp: Blueprint = {
  id: 'simple',
  name: 'Simple',
  initialNodeId: 'a',
  nodes: {
    a: { id: 'a', type: 'deterministic', label: 'A', transitions: { pass: 'b', fail: null, error: null } },
    b: { id: 'b', type: 'deterministic', label: 'B', transitions: { pass: null, fail: null, error: null } },
  },
};

// --- Blueprint with retry loop: check -> fix -> check (max 1 retry) ---

const retryBp: Blueprint = {
  id: 'retry',
  name: 'Retry',
  initialNodeId: 'check',
  nodes: {
    check: { id: 'check', type: 'deterministic', label: 'Check', transitions: { pass: null, fail: 'fix', error: null } },
    fix: { id: 'fix', type: 'agent', label: 'Fix', maxRetries: 1, transitions: { pass: 'check', fail: null, error: null } },
  },
};

// --- Tests ---

describe('BlueprintRunner', () => {
  it('runs a simple linear blueprint to completion', async () => {
    const handlers = new Map<string, NodeHandler>([
      ['a', makeHandler('pass')],
      ['b', makeHandler('pass')],
    ]);
    const runner = new BlueprintRunner(handlers);
    const result = await runner.run(simpleBp, { ...baseContext });

    expect(result.status).toBe('completed');
    expect(result.nodeExecutions).toHaveLength(2);
    expect(result.nodeExecutions[0].nodeId).toBe('a');
    expect(result.nodeExecutions[0].outcome).toBe('pass');
    expect(result.nodeExecutions[1].nodeId).toBe('b');
    expect(result.nodeExecutions[1].outcome).toBe('pass');
  });

  it('terminates on null transition (fail)', async () => {
    const handlers = new Map<string, NodeHandler>([
      ['a', makeHandler('fail')],
      ['b', makeHandler('pass')],
    ]);
    const runner = new BlueprintRunner(handlers);
    const result = await runner.run(simpleBp, { ...baseContext });

    expect(result.status).toBe('completed');
    expect(result.nodeExecutions).toHaveLength(1);
    expect(result.nodeExecutions[0].outcome).toBe('fail');
  });

  it('handles retry loop: check fails -> fix passes -> check passes', async () => {
    const checkHandler = makeFailThenPassHandler();
    const handlers = new Map<string, NodeHandler>([
      ['check', checkHandler],
      ['fix', makeHandler('pass')],
    ]);
    const runner = new BlueprintRunner(handlers);
    const result = await runner.run(retryBp, { ...baseContext });

    expect(result.status).toBe('completed');
    expect(result.nodeExecutions).toHaveLength(3);
    expect(result.nodeExecutions[0].nodeId).toBe('check');
    expect(result.nodeExecutions[0].outcome).toBe('fail');
    expect(result.nodeExecutions[1].nodeId).toBe('fix');
    expect(result.nodeExecutions[1].outcome).toBe('pass');
    expect(result.nodeExecutions[2].nodeId).toBe('check');
    expect(result.nodeExecutions[2].outcome).toBe('pass');
  });

  it('fails when maxRetries exceeded', async () => {
    const handlers = new Map<string, NodeHandler>([
      ['check', makeHandler('fail')],
      ['fix', makeHandler('pass')],
    ]);
    const runner = new BlueprintRunner(handlers);
    const result = await runner.run(retryBp, { ...baseContext });

    // check fails -> fix passes -> check fails again -> fix would run but maxRetries=1 means only 1 retry allowed
    // First fix run (retryCount=0): OK
    // Second fix run (retryCount=1): exceeds maxRetries=1
    expect(result.status).toBe('failed');
  });

  it('handles node throwing an error', async () => {
    const handlers = new Map<string, NodeHandler>([
      ['a', makeErrorHandler('boom')],
      ['b', makeHandler('pass')],
    ]);
    const runner = new BlueprintRunner(handlers);
    const result = await runner.run(simpleBp, { ...baseContext });

    expect(result.status).toBe('completed');
    expect(result.nodeExecutions).toHaveLength(1);
    expect(result.nodeExecutions[0].outcome).toBe('error');
    expect(result.nodeExecutions[0].status).toBe('failed');
  });

  it('supports cancellation via AbortSignal', async () => {
    const slowHandler: NodeHandler = {
      async execute(_node, _ctx, signal) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 5000);
          signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('aborted'));
          });
        });
        return 'pass';
      },
    };
    const handlers = new Map<string, NodeHandler>([
      ['a', slowHandler],
      ['b', makeHandler('pass')],
    ]);
    const runner = new BlueprintRunner(handlers);

    // Start run, then stop after a short delay
    const runPromise = runner.run(simpleBp, { ...baseContext });
    setTimeout(() => runner.stop(baseContext.messageId), 50);
    const result = await runPromise;

    expect(result.status).toBe('cancelled');
  });

  it('passes context between nodes and nodes can mutate it', async () => {
    const handlers = new Map<string, NodeHandler>([
      ['a', makeContextMutatingHandler(ctx => { ctx.filesTouched.push('file1.ts'); })],
      ['b', makeContextMutatingHandler(ctx => { ctx.commitSha = 'abc123'; })],
    ]);
    const runner = new BlueprintRunner(handlers);
    const result = await runner.run(simpleBp, { ...baseContext });

    expect(result.status).toBe('completed');
    expect(result.context.filesTouched).toEqual(['file1.ts']);
    expect(result.context.commitSha).toBe('abc123');
  });

  it('emits events for node lifecycle', async () => {
    const events: string[] = [];
    const handlers = new Map<string, NodeHandler>([
      ['a', makeHandler('pass')],
      ['b', makeHandler('pass')],
    ]);
    const runner = new BlueprintRunner(handlers);
    runner.on('node:started', (_exec, node) => events.push(`started:${node.id}`));
    runner.on('node:completed', (_exec, node) => events.push(`completed:${node.id}`));
    runner.on('blueprint:completed', () => events.push('blueprint:completed'));
    await runner.run(simpleBp, { ...baseContext });

    expect(events).toEqual([
      'started:a', 'completed:a',
      'started:b', 'completed:b',
      'blueprint:completed',
    ]);
  });

  it('throws if handler not found for a node', async () => {
    const handlers = new Map<string, NodeHandler>([
      ['a', makeHandler('pass')],
      // 'b' handler missing
    ]);
    const runner = new BlueprintRunner(handlers);
    const result = await runner.run(simpleBp, { ...baseContext });

    expect(result.status).toBe('failed');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/blueprint/src/__tests__/runner.test.ts`
Expected: FAIL — cannot resolve `../runner`

**Step 3: Write runner.ts**

Create `packages/blueprint/src/runner.ts`:

```typescript
import type {
  Blueprint,
  BlueprintContext,
  BlueprintExecution,
  BlueprintNode,
  BlueprintStatus,
  NodeExecution,
  NodeHandler,
  NodeOutcome,
} from './types';

type BlueprintEventMap = {
  'node:started': [execution: BlueprintExecution, node: BlueprintNode];
  'node:completed': [execution: BlueprintExecution, node: BlueprintNode, outcome: NodeOutcome];
  'node:error': [execution: BlueprintExecution, node: BlueprintNode, error: unknown];
  'blueprint:completed': [execution: BlueprintExecution];
  'blueprint:failed': [execution: BlueprintExecution, reason: string];
  'blueprint:cancelled': [execution: BlueprintExecution];
};

type EventKey = keyof BlueprintEventMap;

export class BlueprintRunner {
  private abortControllers = new Map<string, AbortController>();
  private listeners = new Map<EventKey, Array<(...args: any[]) => void>>();

  constructor(private nodeHandlers: Map<string, NodeHandler>) {}

  on<K extends EventKey>(event: K, listener: (...args: BlueprintEventMap[K]) => void): void {
    const list = this.listeners.get(event) ?? [];
    list.push(listener);
    this.listeners.set(event, list);
  }

  private emit<K extends EventKey>(event: K, ...args: BlueprintEventMap[K]): void {
    const list = this.listeners.get(event);
    if (list) {
      for (const fn of list) {
        fn(...args);
      }
    }
  }

  stop(messageId: string): void {
    this.abortControllers.get(messageId)?.abort();
  }

  async run(blueprint: Blueprint, context: BlueprintContext): Promise<BlueprintExecution> {
    const abort = new AbortController();
    this.abortControllers.set(context.messageId, abort);

    const execution: BlueprintExecution = {
      blueprintId: blueprint.id,
      sessionId: context.sessionId,
      messageId: context.messageId,
      status: 'running',
      currentNodeId: blueprint.initialNodeId,
      nodeExecutions: [],
      context,
    };

    try {
      let currentNodeId: string | null = blueprint.initialNodeId;

      while (currentNodeId !== null) {
        if (abort.signal.aborted) {
          execution.status = 'cancelled';
          this.emit('blueprint:cancelled', execution);
          break;
        }

        const node = blueprint.nodes[currentNodeId];
        if (!node) {
          execution.status = 'failed';
          this.emit('blueprint:failed', execution, `Node not found: ${currentNodeId}`);
          break;
        }

        const handler = this.nodeHandlers.get(node.id);
        if (!handler) {
          execution.status = 'failed';
          this.emit('blueprint:failed', execution, `No handler for node: ${node.id}`);
          break;
        }

        // Check retry limits
        const priorRuns = execution.nodeExecutions.filter(e => e.nodeId === node.id).length;
        if (node.maxRetries !== undefined && priorRuns > node.maxRetries) {
          execution.status = 'failed';
          this.emit('blueprint:failed', execution, `Max retries exceeded for node: ${node.id}`);
          break;
        }

        const nodeExec: NodeExecution = {
          nodeId: node.id,
          status: 'running',
          retryCount: priorRuns,
          startedAt: Date.now(),
        };
        execution.currentNodeId = currentNodeId;
        execution.nodeExecutions.push(nodeExec);
        this.emit('node:started', execution, node);

        try {
          const outcome = await handler.execute(node, execution.context, abort.signal);
          nodeExec.outcome = outcome;
          nodeExec.status = 'completed';
          nodeExec.completedAt = Date.now();
          this.emit('node:completed', execution, node, outcome);
          currentNodeId = node.transitions[outcome];
        } catch (err) {
          if (abort.signal.aborted) {
            nodeExec.status = 'failed';
            nodeExec.outcome = 'error';
            nodeExec.completedAt = Date.now();
            execution.status = 'cancelled';
            this.emit('blueprint:cancelled', execution);
            break;
          }
          nodeExec.status = 'failed';
          nodeExec.outcome = 'error';
          nodeExec.completedAt = Date.now();
          this.emit('node:error', execution, node, err);
          currentNodeId = node.transitions.error;
        }
      }

      if (execution.status === 'running') {
        execution.status = 'completed';
        this.emit('blueprint:completed', execution);
      }
    } finally {
      this.abortControllers.delete(context.messageId);
    }

    return execution;
  }
}
```

**Step 4: Export from index.ts**

Add to `packages/blueprint/src/index.ts`:

```typescript
export { BlueprintRunner } from './runner';
```

**Step 5: Run tests to verify they pass**

Run: `bun test packages/blueprint/src/__tests__/runner.test.ts`
Expected: PASS — all 8 tests pass

**Step 6: Commit**

```bash
git add packages/blueprint/src/runner.ts packages/blueprint/src/__tests__/runner.test.ts packages/blueprint/src/index.ts
git commit -m "feat(blueprint): add BlueprintRunner state machine executor"
```

---

### Task 4: Default task blueprint definition

**Files:**
- Create: `packages/blueprint/src/default-task.blueprint.ts`
- Create: `packages/blueprint/src/__tests__/default-task.blueprint.test.ts`
- Modify: `packages/blueprint/src/index.ts`

**Step 1: Write the failing test**

Create `packages/blueprint/src/__tests__/default-task.blueprint.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { DEFAULT_TASK_BLUEPRINT } from '../default-task.blueprint';

describe('DEFAULT_TASK_BLUEPRINT', () => {
  const bp = DEFAULT_TASK_BLUEPRINT;

  it('starts at hydrate-context', () => {
    expect(bp.initialNodeId).toBe('hydrate-context');
  });

  it('has all 7 nodes', () => {
    const ids = Object.keys(bp.nodes);
    expect(ids).toHaveLength(7);
    expect(ids).toContain('hydrate-context');
    expect(ids).toContain('implement-task');
    expect(ids).toContain('run-lint');
    expect(ids).toContain('fix-lint');
    expect(ids).toContain('run-tests');
    expect(ids).toContain('fix-tests');
    expect(ids).toContain('git-commit');
  });

  it('hydrate-context passes to implement-task', () => {
    expect(bp.nodes['hydrate-context'].transitions.pass).toBe('implement-task');
  });

  it('implement-task passes to run-lint', () => {
    expect(bp.nodes['implement-task'].transitions.pass).toBe('run-lint');
  });

  it('run-lint branches: pass -> run-tests, fail -> fix-lint', () => {
    expect(bp.nodes['run-lint'].transitions.pass).toBe('run-tests');
    expect(bp.nodes['run-lint'].transitions.fail).toBe('fix-lint');
  });

  it('fix-lint loops back to run-lint with maxRetries=1', () => {
    expect(bp.nodes['fix-lint'].transitions.pass).toBe('run-lint');
    expect(bp.nodes['fix-lint'].maxRetries).toBe(1);
  });

  it('run-tests branches: pass -> git-commit, fail -> fix-tests', () => {
    expect(bp.nodes['run-tests'].transitions.pass).toBe('git-commit');
    expect(bp.nodes['run-tests'].transitions.fail).toBe('fix-tests');
  });

  it('fix-tests loops back to run-tests with maxRetries=1', () => {
    expect(bp.nodes['fix-tests'].transitions.pass).toBe('run-tests');
    expect(bp.nodes['fix-tests'].maxRetries).toBe(1);
  });

  it('git-commit is terminal (all transitions null)', () => {
    expect(bp.nodes['git-commit'].transitions.pass).toBeNull();
    expect(bp.nodes['git-commit'].transitions.fail).toBeNull();
    expect(bp.nodes['git-commit'].transitions.error).toBeNull();
  });

  it('deterministic nodes: hydrate-context, run-lint, run-tests, git-commit', () => {
    const deterministic = Object.values(bp.nodes).filter(n => n.type === 'deterministic');
    expect(deterministic.map(n => n.id).sort()).toEqual(
      ['git-commit', 'hydrate-context', 'run-lint', 'run-tests']
    );
  });

  it('agent nodes: implement-task, fix-lint, fix-tests', () => {
    const agent = Object.values(bp.nodes).filter(n => n.type === 'agent');
    expect(agent.map(n => n.id).sort()).toEqual(
      ['fix-lint', 'fix-tests', 'implement-task']
    );
  });

  it('all node ids match their key in the nodes map', () => {
    for (const [key, node] of Object.entries(bp.nodes)) {
      expect(node.id).toBe(key);
    }
  });

  it('all transitions point to valid node ids or null', () => {
    const validIds = new Set(Object.keys(bp.nodes));
    for (const node of Object.values(bp.nodes)) {
      for (const target of Object.values(node.transitions)) {
        if (target !== null) {
          expect(validIds.has(target)).toBe(true);
        }
      }
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/blueprint/src/__tests__/default-task.blueprint.test.ts`
Expected: FAIL — cannot resolve `../default-task.blueprint`

**Step 3: Write default-task.blueprint.ts**

Create `packages/blueprint/src/default-task.blueprint.ts`:

```typescript
import type { Blueprint } from './types';

export const DEFAULT_TASK_BLUEPRINT: Blueprint = {
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
};
```

**Step 4: Export from index.ts**

Add to `packages/blueprint/src/index.ts`:

```typescript
export { DEFAULT_TASK_BLUEPRINT } from './default-task.blueprint';
```

**Step 5: Run test to verify it passes**

Run: `bun test packages/blueprint/src/__tests__/default-task.blueprint.test.ts`
Expected: PASS — all 12 tests pass

**Step 6: Commit**

```bash
git add packages/blueprint/src/default-task.blueprint.ts packages/blueprint/src/__tests__/default-task.blueprint.test.ts packages/blueprint/src/index.ts
git commit -m "feat(blueprint): add default task blueprint definition"
```

---

### Task 5: Node handlers — deterministic nodes

**Files:**
- Create: `packages/blueprint/src/handlers/hydrate-context.handler.ts`
- Create: `packages/blueprint/src/handlers/run-lint.handler.ts`
- Create: `packages/blueprint/src/handlers/run-tests.handler.ts`
- Create: `packages/blueprint/src/handlers/git-commit.handler.ts`
- Create: `packages/blueprint/src/handlers/index.ts`
- Create: `packages/blueprint/src/__tests__/handlers.test.ts`

All deterministic handlers follow the same pattern: send a command to the sandbox via `ISandboxBridge` / `ISandboxManager`, parse the result, return `'pass'` or `'fail'`, and mutate `BlueprintContext` as needed.

Since the sandbox execution is not yet fully implemented (manager and bridge are placeholders), these handlers will delegate to the existing `ISandboxManager` interface. The handlers are thin wrappers that can be tested with mocks.

**Step 1: Write the failing tests**

Create `packages/blueprint/src/__tests__/handlers.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { HydrateContextHandler } from '../handlers/hydrate-context.handler';
import { RunLintHandler } from '../handlers/run-lint.handler';
import { RunTestsHandler } from '../handlers/run-tests.handler';
import { GitCommitHandler } from '../handlers/git-commit.handler';
import type { BlueprintContext, BlueprintNode } from '../types';
import type { ExecResult } from '@repo/types';

// --- Mock sandbox exec function ---

type ExecFn = (sandboxId: string, command: string) => Promise<ExecResult>;

function makeContext(overrides?: Partial<BlueprintContext>): BlueprintContext {
  return {
    sessionId: 's1',
    messageId: 'm1',
    sandboxId: 'sb1',
    prompt: 'test',
    lintErrors: [],
    testFailures: [],
    filesTouched: [],
    ...overrides,
  };
}

const dummyNode: BlueprintNode = {
  id: 'test',
  type: 'deterministic',
  label: 'Test',
  transitions: { pass: null, fail: null, error: null },
};

const signal = new AbortController().signal;

describe('HydrateContextHandler', () => {
  it('returns pass and is a no-op placeholder', async () => {
    const handler = new HydrateContextHandler();
    const ctx = makeContext();
    const result = await handler.execute(dummyNode, ctx, signal);
    expect(result).toBe('pass');
  });
});

describe('RunLintHandler', () => {
  it('returns pass when lint succeeds (exit code 0)', async () => {
    const exec: ExecFn = async () => ({ exitCode: 0, stdout: 'ok', stderr: '' });
    const handler = new RunLintHandler(exec);
    const ctx = makeContext();
    const result = await handler.execute(dummyNode, ctx, signal);
    expect(result).toBe('pass');
    expect(ctx.lintErrors).toEqual([]);
  });

  it('returns fail and populates lintErrors when lint fails', async () => {
    const exec: ExecFn = async () => ({
      exitCode: 1,
      stdout: '',
      stderr: 'Error: semicolon expected\nError: unused variable',
    });
    const handler = new RunLintHandler(exec);
    const ctx = makeContext();
    const result = await handler.execute(dummyNode, ctx, signal);
    expect(result).toBe('fail');
    expect(ctx.lintErrors).toHaveLength(2);
  });
});

describe('RunTestsHandler', () => {
  it('returns pass when tests succeed', async () => {
    const exec: ExecFn = async () => ({ exitCode: 0, stdout: '5 tests passed', stderr: '' });
    const handler = new RunTestsHandler(exec);
    const ctx = makeContext();
    const result = await handler.execute(dummyNode, ctx, signal);
    expect(result).toBe('pass');
    expect(ctx.testFailures).toEqual([]);
  });

  it('returns fail and populates testFailures when tests fail', async () => {
    const exec: ExecFn = async () => ({
      exitCode: 1,
      stdout: '',
      stderr: 'FAIL src/foo.test.ts\nFAIL src/bar.test.ts',
    });
    const handler = new RunTestsHandler(exec);
    const ctx = makeContext();
    const result = await handler.execute(dummyNode, ctx, signal);
    expect(result).toBe('fail');
    expect(ctx.testFailures).toHaveLength(2);
  });
});

describe('GitCommitHandler', () => {
  it('returns pass and sets commitSha on success', async () => {
    const exec: ExecFn = async (_id, cmd) => {
      if (cmd.includes('rev-parse')) {
        return { exitCode: 0, stdout: 'abc1234\n', stderr: '' };
      }
      return { exitCode: 0, stdout: '', stderr: '' };
    };
    const handler = new GitCommitHandler(exec);
    const ctx = makeContext();
    const result = await handler.execute(dummyNode, ctx, signal);
    expect(result).toBe('pass');
    expect(ctx.commitSha).toBe('abc1234');
  });

  it('returns fail when git commit fails', async () => {
    const exec: ExecFn = async () => ({ exitCode: 1, stdout: '', stderr: 'nothing to commit' });
    const handler = new GitCommitHandler(exec);
    const ctx = makeContext();
    const result = await handler.execute(dummyNode, ctx, signal);
    expect(result).toBe('fail');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/blueprint/src/__tests__/handlers.test.ts`
Expected: FAIL — cannot resolve handler modules

**Step 3: Write the handler implementations**

Create `packages/blueprint/src/handlers/hydrate-context.handler.ts`:

```typescript
import type { BlueprintContext, BlueprintNode, NodeHandler, NodeOutcome } from '../types';

export class HydrateContextHandler implements NodeHandler {
  async execute(
    _node: BlueprintNode,
    _context: BlueprintContext,
    _signal: AbortSignal,
  ): Promise<NodeOutcome> {
    // Placeholder: in a full implementation, this would:
    // - Read repo structure from sandbox
    // - Fetch rule files (CLAUDE.md, .cursorrules)
    // - Hydrate links from the user prompt (fetch URLs, ticket details)
    // - Populate context with repo metadata
    return 'pass';
  }
}
```

Create `packages/blueprint/src/handlers/run-lint.handler.ts`:

```typescript
import type { ExecResult } from '@repo/types';
import type { BlueprintContext, BlueprintNode, NodeHandler, NodeOutcome } from '../types';

type ExecFn = (sandboxId: string, command: string) => Promise<ExecResult>;

export class RunLintHandler implements NodeHandler {
  constructor(private exec: ExecFn) {}

  async execute(
    _node: BlueprintNode,
    context: BlueprintContext,
    _signal: AbortSignal,
  ): Promise<NodeOutcome> {
    const result = await this.exec(context.sandboxId, 'bun run lint && bun run typecheck');
    if (result.exitCode === 0) {
      context.lintErrors = [];
      return 'pass';
    }
    context.lintErrors = parseLintOutput(result.stderr);
    return 'fail';
  }
}

function parseLintOutput(stderr: string): string[] {
  return stderr
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}
```

Create `packages/blueprint/src/handlers/run-tests.handler.ts`:

```typescript
import type { ExecResult } from '@repo/types';
import type { BlueprintContext, BlueprintNode, NodeHandler, NodeOutcome } from '../types';

type ExecFn = (sandboxId: string, command: string) => Promise<ExecResult>;

export class RunTestsHandler implements NodeHandler {
  constructor(private exec: ExecFn) {}

  async execute(
    _node: BlueprintNode,
    context: BlueprintContext,
    _signal: AbortSignal,
  ): Promise<NodeOutcome> {
    const result = await this.exec(context.sandboxId, 'bun test');
    if (result.exitCode === 0) {
      context.testFailures = [];
      return 'pass';
    }
    context.testFailures = parseTestOutput(result.stderr);
    return 'fail';
  }
}

function parseTestOutput(stderr: string): string[] {
  return stderr
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}
```

Create `packages/blueprint/src/handlers/git-commit.handler.ts`:

```typescript
import type { ExecResult } from '@repo/types';
import type { BlueprintContext, BlueprintNode, NodeHandler, NodeOutcome } from '../types';

type ExecFn = (sandboxId: string, command: string) => Promise<ExecResult>;

export class GitCommitHandler implements NodeHandler {
  constructor(private exec: ExecFn) {}

  async execute(
    _node: BlueprintNode,
    context: BlueprintContext,
    _signal: AbortSignal,
  ): Promise<NodeOutcome> {
    const commitResult = await this.exec(
      context.sandboxId,
      'git add -A && git commit -m "agent: implement task"',
    );
    if (commitResult.exitCode !== 0) {
      return 'fail';
    }

    const shaResult = await this.exec(context.sandboxId, 'git rev-parse HEAD');
    if (shaResult.exitCode === 0) {
      context.commitSha = shaResult.stdout.trim();
    }

    return 'pass';
  }
}
```

Create `packages/blueprint/src/handlers/index.ts`:

```typescript
export { HydrateContextHandler } from './hydrate-context.handler';
export { RunLintHandler } from './run-lint.handler';
export { RunTestsHandler } from './run-tests.handler';
export { GitCommitHandler } from './git-commit.handler';
```

**Step 4: Export from package index**

Add to `packages/blueprint/src/index.ts`:

```typescript
export { HydrateContextHandler, RunLintHandler, RunTestsHandler, GitCommitHandler } from './handlers';
```

**Step 5: Run tests to verify they pass**

Run: `bun test packages/blueprint/src/__tests__/handlers.test.ts`
Expected: PASS — all 7 tests pass

**Step 6: Commit**

```bash
git add packages/blueprint/src/handlers/ packages/blueprint/src/__tests__/handlers.test.ts packages/blueprint/src/index.ts
git commit -m "feat(blueprint): add deterministic node handlers"
```

---

### Task 6: Node handlers — agent nodes

**Files:**
- Create: `packages/blueprint/src/handlers/implement-task.handler.ts`
- Create: `packages/blueprint/src/handlers/fix-lint.handler.ts`
- Create: `packages/blueprint/src/handlers/fix-tests.handler.ts`
- Create: `packages/blueprint/src/__tests__/agent-handlers.test.ts`
- Modify: `packages/blueprint/src/handlers/index.ts`

Agent handlers delegate to the sandbox's agent loop. They accept a `SendPromptFn` that sends an instruction to the sandbox and waits for completion.

**Step 1: Write the failing tests**

Create `packages/blueprint/src/__tests__/agent-handlers.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { ImplementTaskHandler } from '../handlers/implement-task.handler';
import { FixLintHandler } from '../handlers/fix-lint.handler';
import { FixTestsHandler } from '../handlers/fix-tests.handler';
import type { BlueprintContext, BlueprintNode } from '../types';

type SendPromptFn = (sandboxId: string, prompt: string, messageId: string) => Promise<{ success: boolean; filesTouched: string[] }>;

function makeContext(overrides?: Partial<BlueprintContext>): BlueprintContext {
  return {
    sessionId: 's1',
    messageId: 'm1',
    sandboxId: 'sb1',
    prompt: 'add a hello world endpoint',
    lintErrors: [],
    testFailures: [],
    filesTouched: [],
    ...overrides,
  };
}

const dummyNode: BlueprintNode = {
  id: 'test',
  type: 'agent',
  label: 'Test',
  transitions: { pass: null, fail: null, error: null },
};

const signal = new AbortController().signal;

describe('ImplementTaskHandler', () => {
  it('returns pass and updates filesTouched on success', async () => {
    const send: SendPromptFn = async () => ({ success: true, filesTouched: ['src/index.ts'] });
    const handler = new ImplementTaskHandler(send);
    const ctx = makeContext();
    const result = await handler.execute(dummyNode, ctx, signal);
    expect(result).toBe('pass');
    expect(ctx.filesTouched).toEqual(['src/index.ts']);
  });

  it('returns fail when agent loop fails', async () => {
    const send: SendPromptFn = async () => ({ success: false, filesTouched: [] });
    const handler = new ImplementTaskHandler(send);
    const ctx = makeContext();
    const result = await handler.execute(dummyNode, ctx, signal);
    expect(result).toBe('fail');
  });
});

describe('FixLintHandler', () => {
  it('passes lint errors in prompt to agent', async () => {
    let capturedPrompt = '';
    const send: SendPromptFn = async (_id, prompt) => {
      capturedPrompt = prompt;
      return { success: true, filesTouched: [] };
    };
    const handler = new FixLintHandler(send);
    const ctx = makeContext({ lintErrors: ['Error: semicolon expected', 'Error: unused var'] });
    await handler.execute(dummyNode, ctx, signal);
    expect(capturedPrompt).toContain('semicolon expected');
    expect(capturedPrompt).toContain('unused var');
  });
});

describe('FixTestsHandler', () => {
  it('passes test failures in prompt to agent', async () => {
    let capturedPrompt = '';
    const send: SendPromptFn = async (_id, prompt) => {
      capturedPrompt = prompt;
      return { success: true, filesTouched: [] };
    };
    const handler = new FixTestsHandler(send);
    const ctx = makeContext({ testFailures: ['FAIL src/foo.test.ts: expected 1 to be 2'] });
    await handler.execute(dummyNode, ctx, signal);
    expect(capturedPrompt).toContain('FAIL src/foo.test.ts');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/blueprint/src/__tests__/agent-handlers.test.ts`
Expected: FAIL — cannot resolve handler modules

**Step 3: Write agent handler implementations**

Create `packages/blueprint/src/handlers/implement-task.handler.ts`:

```typescript
import type { BlueprintContext, BlueprintNode, NodeHandler, NodeOutcome } from '../types';

type SendPromptFn = (
  sandboxId: string,
  prompt: string,
  messageId: string,
) => Promise<{ success: boolean; filesTouched: string[] }>;

export class ImplementTaskHandler implements NodeHandler {
  constructor(private sendPrompt: SendPromptFn) {}

  async execute(
    _node: BlueprintNode,
    context: BlueprintContext,
    _signal: AbortSignal,
  ): Promise<NodeOutcome> {
    const result = await this.sendPrompt(
      context.sandboxId,
      context.prompt,
      context.messageId,
    );
    context.filesTouched = result.filesTouched;
    return result.success ? 'pass' : 'fail';
  }
}
```

Create `packages/blueprint/src/handlers/fix-lint.handler.ts`:

```typescript
import type { BlueprintContext, BlueprintNode, NodeHandler, NodeOutcome } from '../types';

type SendPromptFn = (
  sandboxId: string,
  prompt: string,
  messageId: string,
) => Promise<{ success: boolean; filesTouched: string[] }>;

export class FixLintHandler implements NodeHandler {
  constructor(private sendPrompt: SendPromptFn) {}

  async execute(
    _node: BlueprintNode,
    context: BlueprintContext,
    _signal: AbortSignal,
  ): Promise<NodeOutcome> {
    const prompt = [
      'Fix the following lint and typecheck errors:',
      '',
      ...context.lintErrors,
    ].join('\n');

    const result = await this.sendPrompt(context.sandboxId, prompt, context.messageId);
    context.filesTouched.push(...result.filesTouched);
    return result.success ? 'pass' : 'fail';
  }
}
```

Create `packages/blueprint/src/handlers/fix-tests.handler.ts`:

```typescript
import type { BlueprintContext, BlueprintNode, NodeHandler, NodeOutcome } from '../types';

type SendPromptFn = (
  sandboxId: string,
  prompt: string,
  messageId: string,
) => Promise<{ success: boolean; filesTouched: string[] }>;

export class FixTestsHandler implements NodeHandler {
  constructor(private sendPrompt: SendPromptFn) {}

  async execute(
    _node: BlueprintNode,
    context: BlueprintContext,
    _signal: AbortSignal,
  ): Promise<NodeOutcome> {
    const prompt = [
      'Fix the following test failures:',
      '',
      ...context.testFailures,
    ].join('\n');

    const result = await this.sendPrompt(context.sandboxId, prompt, context.messageId);
    context.filesTouched.push(...result.filesTouched);
    return result.success ? 'pass' : 'fail';
  }
}
```

**Step 4: Update handlers/index.ts**

Add to `packages/blueprint/src/handlers/index.ts`:

```typescript
export { ImplementTaskHandler } from './implement-task.handler';
export { FixLintHandler } from './fix-lint.handler';
export { FixTestsHandler } from './fix-tests.handler';
```

**Step 5: Update package index.ts exports**

Add to the export line in `packages/blueprint/src/index.ts`:

```typescript
export { ImplementTaskHandler, FixLintHandler, FixTestsHandler } from './handlers';
```

**Step 6: Run tests to verify they pass**

Run: `bun test packages/blueprint/src/__tests__/agent-handlers.test.ts`
Expected: PASS — all 4 tests pass

**Step 7: Commit**

```bash
git add packages/blueprint/src/handlers/ packages/blueprint/src/__tests__/agent-handlers.test.ts packages/blueprint/src/index.ts
git commit -m "feat(blueprint): add agent node handlers"
```

---

### Task 7: BlueprintEventBridge

**Files:**
- Create: `packages/blueprint/src/event-bridge.ts`
- Create: `packages/blueprint/src/__tests__/event-bridge.test.ts`
- Modify: `packages/blueprint/src/index.ts`
- Modify: `packages/types/src/sandbox.ts` — add new event types

**Step 1: Add new event types to SandboxEventType**

Modify `packages/types/src/sandbox.ts` line 12. Change:

```typescript
export type SandboxEventType = 'tool_call' | 'tool_result' | 'token' | 'error' | 'git_sync' | 'execution_complete' | 'user_message';
```

To:

```typescript
export type SandboxEventType =
  | 'tool_call'
  | 'tool_result'
  | 'token'
  | 'error'
  | 'git_sync'
  | 'execution_complete'
  | 'user_message'
  | 'blueprint_node_started'
  | 'blueprint_node_completed'
  | 'blueprint_node_error'
  | 'blueprint_completed'
  | 'blueprint_failed';
```

**Step 2: Write the failing test**

Create `packages/blueprint/src/__tests__/event-bridge.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { BlueprintEventBridge } from '../event-bridge';
import { BlueprintRunner } from '../runner';
import type { Blueprint, BlueprintContext, NodeHandler } from '../types';

function makeHandler(outcome: 'pass' | 'fail'): NodeHandler {
  return {
    async execute() { return outcome; },
  };
}

const simpleBp: Blueprint = {
  id: 'test',
  name: 'Test',
  initialNodeId: 'a',
  nodes: {
    a: { id: 'a', type: 'deterministic', label: 'A', transitions: { pass: null, fail: null, error: null } },
  },
};

const baseContext: BlueprintContext = {
  sessionId: 's1',
  messageId: 'm1',
  sandboxId: 'sb1',
  prompt: 'test',
  lintErrors: [],
  testFailures: [],
  filesTouched: [],
};

describe('BlueprintEventBridge', () => {
  it('captures node:started and node:completed events', async () => {
    const persisted: Array<{ type: string; data: unknown }> = [];
    const broadcasted: unknown[] = [];

    const bridge = new BlueprintEventBridge(
      async (event) => { persisted.push(event); },
      (sessionId, message) => { broadcasted.push({ sessionId, message }); },
    );

    const handlers = new Map([['a', makeHandler('pass')]]);
    const runner = new BlueprintRunner(handlers);
    bridge.wire(runner);

    await runner.run(simpleBp, { ...baseContext });

    // Should have: node_started, node_completed, blueprint_completed
    expect(persisted).toHaveLength(3);
    expect(persisted[0].type).toBe('blueprint_node_started');
    expect(persisted[1].type).toBe('blueprint_node_completed');
    expect(persisted[2].type).toBe('blueprint_completed');

    // Same events broadcasted via WebSocket
    expect(broadcasted).toHaveLength(3);
  });

  it('captures blueprint:failed event', async () => {
    const persisted: Array<{ type: string; data: unknown }> = [];

    const bridge = new BlueprintEventBridge(
      async (event) => { persisted.push(event); },
      () => {},
    );

    // No handlers registered — will fail with "no handler"
    const handlers = new Map<string, NodeHandler>();
    const runner = new BlueprintRunner(handlers);
    bridge.wire(runner);

    await runner.run(simpleBp, { ...baseContext });

    expect(persisted.some(e => e.type === 'blueprint_failed')).toBe(true);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `bun test packages/blueprint/src/__tests__/event-bridge.test.ts`
Expected: FAIL — cannot resolve `../event-bridge`

**Step 4: Write event-bridge.ts**

Create `packages/blueprint/src/event-bridge.ts`:

```typescript
import type { BlueprintRunner } from './runner';

type PersistFn = (event: { type: string; sessionId: string; messageId: string; data: unknown }) => Promise<void>;
type BroadcastFn = (sessionId: string, message: unknown) => void;

export class BlueprintEventBridge {
  constructor(
    private persist: PersistFn,
    private broadcast: BroadcastFn,
  ) {}

  wire(runner: BlueprintRunner): void {
    runner.on('node:started', (execution, node) => {
      const event = {
        type: 'blueprint_node_started' as const,
        sessionId: execution.sessionId,
        messageId: execution.messageId,
        data: { nodeId: node.id, label: node.label, type: node.type },
      };
      this.persist(event);
      this.broadcast(execution.sessionId, { type: 'sandbox_event', event });
    });

    runner.on('node:completed', (execution, node, outcome) => {
      const event = {
        type: 'blueprint_node_completed' as const,
        sessionId: execution.sessionId,
        messageId: execution.messageId,
        data: { nodeId: node.id, label: node.label, outcome },
      };
      this.persist(event);
      this.broadcast(execution.sessionId, { type: 'sandbox_event', event });
    });

    runner.on('node:error', (execution, node, error) => {
      const event = {
        type: 'blueprint_node_error' as const,
        sessionId: execution.sessionId,
        messageId: execution.messageId,
        data: { nodeId: node.id, label: node.label, error: String(error) },
      };
      this.persist(event);
      this.broadcast(execution.sessionId, { type: 'sandbox_event', event });
    });

    runner.on('blueprint:completed', (execution) => {
      const event = {
        type: 'blueprint_completed' as const,
        sessionId: execution.sessionId,
        messageId: execution.messageId,
        data: { nodeCount: execution.nodeExecutions.length },
      };
      this.persist(event);
      this.broadcast(execution.sessionId, { type: 'sandbox_event', event });
    });

    runner.on('blueprint:failed', (execution, reason) => {
      const event = {
        type: 'blueprint_failed' as const,
        sessionId: execution.sessionId,
        messageId: execution.messageId,
        data: { reason, lastNodeId: execution.currentNodeId },
      };
      this.persist(event);
      this.broadcast(execution.sessionId, { type: 'sandbox_event', event });
    });

    runner.on('blueprint:cancelled', (execution) => {
      const event = {
        type: 'blueprint_failed' as const,
        sessionId: execution.sessionId,
        messageId: execution.messageId,
        data: { reason: 'cancelled', lastNodeId: execution.currentNodeId },
      };
      this.persist(event);
      this.broadcast(execution.sessionId, { type: 'sandbox_event', event });
    });
  }
}
```

**Step 5: Export from index.ts**

Add to `packages/blueprint/src/index.ts`:

```typescript
export { BlueprintEventBridge } from './event-bridge';
```

**Step 6: Run tests to verify they pass**

Run: `bun test packages/blueprint/src/__tests__/event-bridge.test.ts`
Expected: PASS — all 2 tests pass

**Step 7: Commit**

```bash
git add packages/blueprint/ packages/types/src/sandbox.ts
git commit -m "feat(blueprint): add event bridge and new blueprint event types"
```

---

### Task 8: ExecuteTaskUseCase + DI wiring

**Files:**
- Create: `packages/use-case/src/session/execute-task.use-case.ts`
- Modify: `packages/use-case/src/session/index.ts` — re-export
- Modify: `packages/di/src/types.ts` — add `IExecuteTaskUseCase` abstract class
- Modify: `packages/di/src/index.ts` — export it
- Modify: `packages/bootstrap/src/index.ts` — register binding
- Modify: `packages/use-case/package.json` — add `@repo/blueprint` dependency

**Step 1: Add DI abstract class**

Add to `packages/di/src/types.ts` after the existing abstracts:

```typescript
// Blueprint
export abstract class IExecuteTaskUseCase {
  abstract execute(input: {
    sessionId: string;
    messageId: string;
    prompt: string;
    repoOwner?: string;
    repoName?: string;
    branchName?: string;
  }): Promise<void>;
}
```

**Step 2: Export from DI index**

Add `IExecuteTaskUseCase` to the export list in `packages/di/src/index.ts`:

```typescript
export { IDatabase, ITransaction, IEncryptionService, IInternalAuthService, IExecuteTaskUseCase } from './types';
```

**Step 3: Add @repo/blueprint dependency to use-case package**

Add to `devDependencies` in `packages/use-case/package.json`:

```json
"@repo/blueprint": "workspace:*"
```

**Step 4: Write ExecuteTaskUseCase**

Create `packages/use-case/src/session/execute-task.use-case.ts`:

```typescript
import 'reflect-metadata';
import { inject, injectable } from 'inversify';
import { IExecuteTaskUseCase } from '@repo/di';
import {
  ISessionMessageRepository,
  ISessionEventRepository,
} from '@repo/repository';
import { ISandboxManager } from '@repo/service';
import {
  BlueprintRunner,
  BlueprintEventBridge,
  DEFAULT_TASK_BLUEPRINT,
  HydrateContextHandler,
  ImplementTaskHandler,
  RunLintHandler,
  RunTestsHandler,
  FixLintHandler,
  FixTestsHandler,
  GitCommitHandler,
} from '@repo/blueprint';
import type { BlueprintContext, NodeHandler } from '@repo/blueprint';
import type { UseCase } from '../base.use-case';
import { createServiceLogger } from '@repo/logger';

const log = createServiceLogger('ExecuteTaskUseCase');

export interface ExecuteTaskInput {
  sessionId: string;
  messageId: string;
  prompt: string;
  repoOwner?: string;
  repoName?: string;
  branchName?: string;
}

@injectable()
export class ExecuteTaskUseCase
  extends IExecuteTaskUseCase
  implements UseCase<ExecuteTaskInput, void>
{
  private running = new Set<string>();

  constructor(
    @inject(ISessionMessageRepository)
    private readonly messageRepo: ISessionMessageRepository,
    @inject(ISessionEventRepository)
    private readonly eventRepo: ISessionEventRepository,
    @inject(ISandboxManager)
    private readonly sandboxManager: ISandboxManager,
  ) {
    super();
  }

  async execute(input: ExecuteTaskInput): Promise<void> {
    if (this.running.has(input.sessionId)) {
      throw new Error('Session already has a running task');
    }
    this.running.add(input.sessionId);

    try {
      await this.messageRepo.updateStatus(input.messageId, 'processing');

      // Ensure sandbox exists
      const sandbox = await this.sandboxManager.create(input.sessionId, {
        repoOwner: input.repoOwner ?? '',
        repoName: input.repoName ?? '',
        branch: input.branchName,
        secrets: {},
        model: 'anthropic/claude-sonnet-4-6',
        reasoningEffort: 'medium',
      });

      // Build exec function for deterministic handlers
      const exec = async (sandboxId: string, command: string) => {
        // Placeholder: delegate to sandbox process execution
        log.info('Sandbox exec', { sandboxId, command });
        return { exitCode: 0, stdout: '', stderr: '' };
      };

      // Build sendPrompt function for agent handlers
      const sendPrompt = async (sandboxId: string, prompt: string, messageId: string) => {
        log.info('Sandbox agent loop', { sandboxId, messageId, promptLength: prompt.length });
        await this.sandboxManager.sendPrompt(sandboxId, prompt, messageId);
        // Placeholder: wait for agent loop completion
        return { success: true, filesTouched: [] as string[] };
      };

      // Wire up handlers
      const handlers = new Map<string, NodeHandler>([
        ['hydrate-context', new HydrateContextHandler()],
        ['implement-task', new ImplementTaskHandler(sendPrompt)],
        ['run-lint', new RunLintHandler(exec)],
        ['fix-lint', new FixLintHandler(sendPrompt)],
        ['run-tests', new RunTestsHandler(exec)],
        ['fix-tests', new FixTestsHandler(sendPrompt)],
        ['git-commit', new GitCommitHandler(exec)],
      ]);

      const runner = new BlueprintRunner(handlers);

      // Wire event bridge
      const bridge = new BlueprintEventBridge(
        async (event) => {
          await this.eventRepo.create({
            sessionId: input.sessionId,
            messageId: input.messageId,
            type: event.type,
            data: event.data,
          });
        },
        (_sessionId, _message) => {
          // WebSocket broadcast will be wired at the server layer
        },
      );
      bridge.wire(runner);

      // Build context
      const context: BlueprintContext = {
        sessionId: input.sessionId,
        messageId: input.messageId,
        sandboxId: sandbox.sandboxId,
        prompt: input.prompt,
        repoOwner: input.repoOwner,
        repoName: input.repoName,
        branchName: input.branchName,
        lintErrors: [],
        testFailures: [],
        filesTouched: [],
      };

      // Run blueprint
      const execution = await runner.run(DEFAULT_TASK_BLUEPRINT, context);

      // Update message status
      const finalStatus = execution.status === 'completed' ? 'completed' : 'failed';
      await this.messageRepo.updateStatus(input.messageId, finalStatus);

      log.info('Blueprint execution finished', {
        sessionId: input.sessionId,
        messageId: input.messageId,
        status: execution.status,
        nodeCount: execution.nodeExecutions.length,
      });
    } finally {
      this.running.delete(input.sessionId);
    }
  }
}
```

**Step 5: Re-export from session/index.ts**

Check the current exports in `packages/use-case/src/session/index.ts` and add:

```typescript
export { ExecuteTaskUseCase, IExecuteTaskUseCase } from './execute-task.use-case';
```

Note: `IExecuteTaskUseCase` is re-exported from `@repo/di`, but the concrete class needs to be accessible from `@repo/use-case`.

**Step 6: Register in bootstrap**

Add to `packages/bootstrap/src/index.ts`:

In the imports section, add `ExecuteTaskUseCase` and `IExecuteTaskUseCase` to the `@repo/use-case` import, and add `IExecuteTaskUseCase` to the `@repo/di` import.

In the `initializeContainer()` function, after the existing use case bindings (line 120), add:

```typescript
container.bind(IExecuteTaskUseCase).to(ExecuteTaskUseCase);
```

**Step 7: Run bun install (new dependency)**

Run: `bun install`
Expected: lockfile updated

**Step 8: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 9: Commit**

```bash
git add packages/di/src/types.ts packages/di/src/index.ts packages/use-case/ packages/bootstrap/src/index.ts
git commit -m "feat(blueprint): add ExecuteTaskUseCase and DI wiring"
```

---

### Task 9: Wire handlePrompt and handleStop to blueprint

**Files:**
- Modify: `apps/server/src/ws/handlers.ts` — update `handlePrompt` and `handleStop`

**Step 1: Update handlePrompt**

Replace the `handlePrompt` function (lines 156-176) in `apps/server/src/ws/handlers.ts`:

```typescript
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
    const queuePrompt = getInject<InstanceType<typeof import('@repo/use-case').QueuePromptUseCase>>(IQueuePromptUseCase);
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
    const executeTask = getInject<InstanceType<typeof import('@repo/use-case').ExecuteTaskUseCase>>(IExecuteTaskUseCase);
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
```

**Step 2: Add imports**

Add to the imports at the top of `apps/server/src/ws/handlers.ts`:

```typescript
import { IQueuePromptUseCase } from '@repo/use-case';
import { IExecuteTaskUseCase } from '@repo/di';
```

**Step 3: Update handleStop**

Replace the `handleStop` function (lines 193-204):

```typescript
function handleStop(ws: ServerWebSocket<WsData>): void {
  const { sessionId } = ws.data;
  if (!sessionId) {
    sendError(ws, 'NOT_SUBSCRIBED', 'You must subscribe to a session first');
    return;
  }

  // TODO: wire to BlueprintRunner.stop() when runner instance is accessible
  // For now, broadcast the stop status
  roomManager.broadcast(sessionId, { type: 'session_status', status: 'stopped' });
  log.info('Stop requested', { sessionId });
}
```

**Step 4: Update handleWsMessage to make handlePrompt async**

In the switch statement (line 231), change `handlePrompt` call to await:

```typescript
case 'prompt':
  await handlePrompt(ws, message.content, message.model, message.reasoningEffort);
  break;
```

**Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/server/src/ws/handlers.ts
git commit -m "feat(blueprint): wire handlePrompt to ExecuteTaskUseCase"
```

---

### Task 10: Run full test suite and verify

**Step 1: Run all blueprint tests**

Run: `bun test packages/blueprint/`
Expected: All tests pass (types, runner, default blueprint, handlers, agent handlers, event bridge)

**Step 2: Run full project test suite**

Run: `bun test`
Expected: All tests pass including existing service tests

**Step 3: Run typecheck across entire project**

Run: `bun run typecheck`
Expected: PASS

**Step 4: Run lint**

Run: `bun run lint`
Expected: PASS (or fix any lint issues)

**Step 5: Fix any issues found**

If any tests or typecheck fail, fix them before proceeding.

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: fix lint and typecheck issues from blueprint integration"
```

(Only if there were issues to fix. Skip if all passed clean.)
