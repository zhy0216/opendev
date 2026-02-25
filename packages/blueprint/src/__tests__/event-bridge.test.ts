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
