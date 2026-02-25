import type { BlueprintContext, BlueprintNode, NodeHandler, NodeOutcome } from '../types';

export type SendPromptFn = (
  sandboxId: string,
  prompt: string,
  messageId: string,
) => Promise<{ success: boolean; filesTouched: string[] }>;

export class FixLintHandler implements NodeHandler {
  constructor(private readonly sendPrompt: SendPromptFn) {}

  async execute(
    _node: BlueprintNode,
    context: BlueprintContext,
    _signal: AbortSignal,
  ): Promise<NodeOutcome> {
    const prompt = `Fix the following lint/typecheck errors:\n\n${context.lintErrors.join('\n')}`;

    const result = await this.sendPrompt(
      context.sandboxId,
      prompt,
      context.messageId,
    );

    context.filesTouched = [
      ...context.filesTouched,
      ...result.filesTouched,
    ];

    return result.success ? 'pass' : 'fail';
  }
}
