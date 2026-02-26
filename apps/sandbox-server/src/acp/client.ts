import type { ChildProcess } from 'node:child_process';
import type { SseEvent } from './events';
import { mapAcpUpdateToSse } from './events';

/**
 * Wraps the ACP ClientSideConnection for communicating with Claude Code
 * via the claude-agent-acp adapter over stdio.
 *
 * Note: The actual ACP SDK integration will be refined during testing
 * with the real claude-agent-acp binary. This provides the interface
 * and scaffolding.
 */
export class AcpClient {
  private sessionId: string | null = null;
  private initialized = false;

  constructor(private readonly process: ChildProcess) {}

  async initialize(): Promise<{ sessionId: string; capabilities: Record<string, unknown> }> {
    if (this.initialized) {
      throw new Error('Already initialized');
    }

    // TODO: Use @agentclientprotocol/sdk ClientSideConnection
    // const stream = ndJsonStream(this.process.stdin!, this.process.stdout!);
    // this.connection = new ClientSideConnection(toolHandlers, stream);
    // await this.connection.initialize();
    // const session = await this.connection.newSession();

    this.sessionId = `session-${Date.now()}`;
    this.initialized = true;

    return {
      sessionId: this.sessionId,
      capabilities: {},
    };
  }

  async sendPrompt(
    prompt: string,
    onEvent: (event: SseEvent) => void,
  ): Promise<void> {
    if (!this.initialized || !this.sessionId) {
      throw new Error('Not initialized');
    }

    // TODO: Use real ACP session/prompt
    // await this.connection.sendPrompt(this.sessionId, {
    //   messages: [{ role: 'user', content: prompt }],
    // }, {
    //   onUpdate: (update) => {
    //     const sseEvent = mapAcpUpdateToSse(update);
    //     if (sseEvent) onEvent(sseEvent);
    //   },
    // });

    // Placeholder: emit done immediately
    onEvent({ type: 'done', data: { outcome: 'pass' } });
  }

  async cancel(): Promise<void> {
    // TODO: Wire to ACP cancel
  }
}
