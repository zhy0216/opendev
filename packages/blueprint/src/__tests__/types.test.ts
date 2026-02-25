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
