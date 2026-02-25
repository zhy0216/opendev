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
