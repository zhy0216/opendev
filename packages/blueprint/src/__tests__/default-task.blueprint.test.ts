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
