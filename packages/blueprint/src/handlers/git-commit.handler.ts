import type { ExecResult } from '@repo/types';
import type { BlueprintContext, BlueprintNode, NodeHandler, NodeOutcome } from '../types';

export type ExecFn = (sandboxId: string, command: string) => Promise<ExecResult>;

export class GitCommitHandler implements NodeHandler {
  constructor(private readonly exec: ExecFn) {}

  async execute(
    _node: BlueprintNode,
    context: BlueprintContext,
    _signal: AbortSignal,
  ): Promise<NodeOutcome> {
    const commitResult = await this.exec(
      context.sandboxId,
      'git add -A && git commit -m "agent: implement task"',
    );

    if (commitResult.exitCode !== 0) {
      return 'fail';
    }

    const shaResult = await this.exec(context.sandboxId, 'git rev-parse HEAD');

    if (shaResult.exitCode === 0) {
      context.commitSha = shaResult.stdout.trim();
    }

    return 'pass';
  }
}
