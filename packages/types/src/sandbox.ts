export type SandboxStatus = 'pending' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error';

export interface SandboxConfig {
  repoOwner: string;
  repoName: string;
  branch?: string;
  secrets: Record<string, string>;
  model: string;
  reasoningEffort: string;
}

export type SandboxEventType = 'tool_call' | 'tool_result' | 'token' | 'error' | 'git_sync' | 'execution_complete' | 'user_message';

export interface SandboxEvent {
  type: SandboxEventType;
  sandboxId: string;
  sessionId: string;
  messageId?: string;
  timestamp: number;
  data: unknown;
}

export interface SpawnDecision {
  shouldSpawn: boolean;
  reason: string;
}

export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}
