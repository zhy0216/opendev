import type { ExecResult } from '@repo/types';
import type { BlueprintContext, BlueprintNode, NodeHandler, NodeOutcome } from '../types';

export type ExecFn = (sandboxId: string, command: string) => Promise<ExecResult>;

export class RunTestsHandler implements NodeHandler {
  constructor(private readonly exec: ExecFn) {}

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

    context.testFailures = result.stderr
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    return 'fail';
  }
}
