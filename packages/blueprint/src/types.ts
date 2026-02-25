// --- Outcomes & Node Types ---

export type NodeOutcome = 'pass' | 'fail' | 'error';
export type NodeType = 'deterministic' | 'agent';

// --- Blueprint Definition (static graph) ---

export interface BlueprintNode {
  id: string;
  type: NodeType;
  label: string;
  transitions: Record<NodeOutcome, string | null>;
  maxRetries?: number;
}

export interface Blueprint {
  id: string;
  name: string;
  initialNodeId: string;
  nodes: Record<string, BlueprintNode>;
}

// --- Runtime State ---

export interface NodeExecution {
  nodeId: string;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  outcome?: NodeOutcome;
  retryCount: number;
  startedAt: number;
  completedAt?: number;
  output?: unknown;
}

export type BlueprintStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface BlueprintExecution {
  blueprintId: string;
  sessionId: string;
  messageId: string;
  status: BlueprintStatus;
  currentNodeId: string;
  nodeExecutions: NodeExecution[];
  context: BlueprintContext;
}

export interface BlueprintContext {
  sessionId: string;
  messageId: string;
  sandboxId: string;
  prompt: string;
  repoOwner?: string;
  repoName?: string;
  branchName?: string;
  lintErrors: string[];
  testFailures: string[];
  filesTouched: string[];
  commitSha?: string;
}

// --- Node Handler Interface ---

export interface NodeHandler {
  execute(
    node: BlueprintNode,
    context: BlueprintContext,
    signal: AbortSignal,
  ): Promise<NodeOutcome>;
}

// --- Agent Node Config ---

export interface AgentLoopConfig {
  maxTokens: number;
  maxTurns: number;
  timeoutMs: number;
  tools: string[];
  systemPrompt: string;
}
