import { describe, it, expect } from 'bun:test';
import { HydrateContextHandler } from '../handlers/hydrate-context.handler';
import { RunLintHandler } from '../handlers/run-lint.handler';
import { RunTestsHandler } from '../handlers/run-tests.handler';
import { GitCommitHandler } from '../handlers/git-commit.handler';
import type { BlueprintContext, BlueprintNode } from '../types';
import type { ExecResult } from '@repo/types';

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
