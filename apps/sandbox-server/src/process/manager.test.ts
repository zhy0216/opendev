import { describe, test, expect } from 'bun:test';
import { ProcessManager } from './manager';

describe('ProcessManager', () => {
  test('starts in idle state', () => {
    const pm = new ProcessManager();
    expect(pm.getState()).toBe('idle');
  });

  test('transitions to initializing on spawn', async () => {
    const pm = new ProcessManager();
    const promise = pm.spawn({ command: 'echo', args: ['hello'], apiKey: 'test-key' });
    expect(pm.getState()).toBe('initializing');
    await promise;
  });

  test('rejects double spawn', async () => {
    const pm = new ProcessManager();
    await pm.spawn({ command: 'cat', args: [], apiKey: 'test-key' });
    expect(() => pm.spawn({ command: 'echo', args: ['hello'], apiKey: 'test-key' })).toThrow();
  });

  test('transitions to terminated on kill', async () => {
    const pm = new ProcessManager();
    await pm.spawn({ command: 'cat', args: [], apiKey: 'test-key' });
    pm.kill();
    expect(pm.getState()).toBe('terminated');
  });
});
