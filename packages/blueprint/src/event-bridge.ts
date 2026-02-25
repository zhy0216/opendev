import type { BlueprintRunner } from './runner';

type PersistFn = (event: { type: string; sessionId: string; messageId: string; data: unknown }) => Promise<void>;
type BroadcastFn = (sessionId: string, message: unknown) => void;

export class BlueprintEventBridge {
  constructor(
    private persist: PersistFn,
    private broadcast: BroadcastFn,
  ) {}

  wire(runner: BlueprintRunner): void {
    runner.on('node:started', (execution, node) => {
      const event = {
        type: 'blueprint_node_started' as const,
        sessionId: execution.sessionId,
        messageId: execution.messageId,
        data: { nodeId: node.id, label: node.label, type: node.type },
      };
      this.persist(event);
      this.broadcast(execution.sessionId, { type: 'sandbox_event', event });
    });

    runner.on('node:completed', (execution, node, outcome) => {
      const event = {
        type: 'blueprint_node_completed' as const,
        sessionId: execution.sessionId,
        messageId: execution.messageId,
        data: { nodeId: node.id, label: node.label, outcome },
      };
      this.persist(event);
      this.broadcast(execution.sessionId, { type: 'sandbox_event', event });
    });

    runner.on('node:error', (execution, node, error) => {
      const event = {
        type: 'blueprint_node_error' as const,
        sessionId: execution.sessionId,
        messageId: execution.messageId,
        data: { nodeId: node.id, label: node.label, error: String(error) },
      };
      this.persist(event);
      this.broadcast(execution.sessionId, { type: 'sandbox_event', event });
    });

    runner.on('blueprint:completed', (execution) => {
      const event = {
        type: 'blueprint_completed' as const,
        sessionId: execution.sessionId,
        messageId: execution.messageId,
        data: { nodeCount: execution.nodeExecutions.length },
      };
      this.persist(event);
      this.broadcast(execution.sessionId, { type: 'sandbox_event', event });
    });

    runner.on('blueprint:failed', (execution, reason) => {
      const event = {
        type: 'blueprint_failed' as const,
        sessionId: execution.sessionId,
        messageId: execution.messageId,
        data: { reason, lastNodeId: execution.currentNodeId },
      };
      this.persist(event);
      this.broadcast(execution.sessionId, { type: 'sandbox_event', event });
    });

    runner.on('blueprint:cancelled', (execution) => {
      const event = {
        type: 'blueprint_failed' as const,
        sessionId: execution.sessionId,
        messageId: execution.messageId,
        data: { reason: 'cancelled', lastNodeId: execution.currentNodeId },
      };
      this.persist(event);
      this.broadcast(execution.sessionId, { type: 'sandbox_event', event });
    });
  }
}
