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

    // check fails -> fix passes (retryCount=0) -> check fails again -> fix would run but retryCount=1 exceeds maxRetries=1
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
    ]);
    const runner = new BlueprintRunner(handlers);
    const result = await runner.run(simpleBp, { ...baseContext });

    expect(result.status).toBe('failed');
  });
});
