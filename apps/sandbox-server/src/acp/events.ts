export type SseEventType = 'token' | 'tool_call' | 'tool_result' | 'done' | 'error';

export interface SseEvent {
  type: SseEventType;
  data: unknown;
}

export function mapAcpUpdateToSse(update: unknown): SseEvent | null {
  const u = update as Record<string, unknown>;

  if (u.type === 'message_chunk' || u.type === 'text') {
    return { type: 'token', data: { content: u.content ?? u.text ?? '' } };
  }

  if (u.type === 'tool_call' || u.type === 'tool_use') {
    return { type: 'tool_call', data: { name: u.name, input: u.input } };
  }

  if (u.type === 'tool_result') {
    return { type: 'tool_result', data: { name: u.name, output: u.output } };
  }

  if (u.type === 'complete' || u.type === 'end_turn') {
    return { type: 'done', data: { outcome: 'pass' } };
  }

  if (u.type === 'error') {
    return { type: 'error', data: { message: u.message ?? 'Unknown error' } };
  }

  return null;
}
