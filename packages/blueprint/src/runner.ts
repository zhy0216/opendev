import type {
  Blueprint,
  BlueprintContext,
  BlueprintExecution,
  BlueprintNode,
  BlueprintStatus,
  NodeExecution,
  NodeHandler,
  NodeOutcome,
} from './types';

type BlueprintEventMap = {
  'node:started': [execution: BlueprintExecution, node: BlueprintNode];
  'node:completed': [execution: BlueprintExecution, node: BlueprintNode, outcome: NodeOutcome];
  'node:error': [execution: BlueprintExecution, node: BlueprintNode, error: unknown];
  'blueprint:completed': [execution: BlueprintExecution];
  'blueprint:failed': [execution: BlueprintExecution, reason: string];
  'blueprint:cancelled': [execution: BlueprintExecution];
};

type EventKey = keyof BlueprintEventMap;

export class BlueprintRunner {
  private abortControllers = new Map<string, AbortController>();
  private listeners = new Map<EventKey, Array<(...args: any[]) => void>>();

  constructor(private nodeHandlers: Map<string, NodeHandler>) {}

  on<K extends EventKey>(event: K, listener: (...args: BlueprintEventMap[K]) => void): void {
    const list = this.listeners.get(event) ?? [];
    list.push(listener);
    this.listeners.set(event, list);
  }

  private emit<K extends EventKey>(event: K, ...args: BlueprintEventMap[K]): void {
    const list = this.listeners.get(event);
    if (list) {
      for (const fn of list) {
        fn(...args);
      }
    }
  }

  stop(messageId: string): void {
    this.abortControllers.get(messageId)?.abort();
  }

  async run(blueprint: Blueprint, context: BlueprintContext): Promise<BlueprintExecution> {
    const abort = new AbortController();
    this.abortControllers.set(context.messageId, abort);

    const execution: BlueprintExecution = {
      blueprintId: blueprint.id,
      sessionId: context.sessionId,
      messageId: context.messageId,
      status: 'running',
      currentNodeId: blueprint.initialNodeId,
      nodeExecutions: [],
      context,
    };

    try {
      let currentNodeId: string | null = blueprint.initialNodeId;

      while (currentNodeId !== null) {
        if (abort.signal.aborted) {
          execution.status = 'cancelled';
          this.emit('blueprint:cancelled', execution);
          break;
        }

        const node: BlueprintNode | undefined = blueprint.nodes[currentNodeId];
        if (!node) {
          execution.status = 'failed';
          this.emit('blueprint:failed', execution, `Node not found: ${currentNodeId}`);
          break;
        }

        const handler = this.nodeHandlers.get(node.id);
        if (!handler) {
          execution.status = 'failed';
          this.emit('blueprint:failed', execution, `No handler for node: ${node.id}`);
          break;
        }

        // Check retry limits
        const priorRuns = execution.nodeExecutions.filter(e => e.nodeId === node.id).length;
        if (node.maxRetries !== undefined && priorRuns > node.maxRetries) {
          execution.status = 'failed';
          this.emit('blueprint:failed', execution, `Max retries exceeded for node: ${node.id}`);
          break;
        }

        const nodeExec: NodeExecution = {
          nodeId: node.id,
          status: 'running',
          retryCount: priorRuns,
          startedAt: Date.now(),
        };
        execution.currentNodeId = currentNodeId;
        execution.nodeExecutions.push(nodeExec);
        this.emit('node:started', execution, node);

        try {
          const outcome = await handler.execute(node, execution.context, abort.signal);
          nodeExec.outcome = outcome;
          nodeExec.status = 'completed';
          nodeExec.completedAt = Date.now();
          this.emit('node:completed', execution, node, outcome);
          currentNodeId = node.transitions[outcome];
        } catch (err) {
          if (abort.signal.aborted) {
            nodeExec.status = 'failed';
            nodeExec.outcome = 'error';
            nodeExec.completedAt = Date.now();
            execution.status = 'cancelled';
            this.emit('blueprint:cancelled', execution);
            break;
          }
          nodeExec.status = 'failed';
          nodeExec.outcome = 'error';
          nodeExec.completedAt = Date.now();
          this.emit('node:error', execution, node, err);
          currentNodeId = node.transitions.error;
        }
      }

      if (execution.status === 'running') {
        execution.status = 'completed';
        this.emit('blueprint:completed', execution);
      }
    } finally {
      this.abortControllers.delete(context.messageId);
    }

    return execution;
  }
}
