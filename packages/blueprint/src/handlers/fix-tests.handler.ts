import type { BlueprintContext, BlueprintNode, NodeHandler, NodeOutcome } from '../types';

export type SendPromptFn = (
  sandboxId: string,
  prompt: string,
  messageId: string,
) => Promise<{ success: boolean; filesTouched: string[] }>;

export class FixTestsHandler implements NodeHandler {
  constructor(private readonly sendPrompt: SendPromptFn) {}

  async execute(
    _node: BlueprintNode,
    context: BlueprintContext,
    _signal: AbortSignal,
  ): Promise<NodeOutcome> {
    const prompt = `Fix the following test failures:\n\n${context.testFailures.join('\n')}`;

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
