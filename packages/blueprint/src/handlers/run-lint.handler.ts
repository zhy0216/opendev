import type { ExecResult } from '@repo/types';
import type { BlueprintContext, BlueprintNode, NodeHandler, NodeOutcome } from '../types';

export type ExecFn = (sandboxId: string, command: string) => Promise<ExecResult>;

export class RunLintHandler implements NodeHandler {
  constructor(private readonly exec: ExecFn) {}

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

    context.lintErrors = result.stderr
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    return 'fail';
  }
}
