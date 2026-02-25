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
