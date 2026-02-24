// Client -> Server messages
export type ClientMessage =
  | { type: 'subscribe'; token: string; clientId: string }
  | { type: 'prompt'; content: string; model?: string; reasoningEffort?: string }
  | { type: 'stop' }
  | { type: 'ping' }
  | { type: 'presence'; status: 'active' | 'idle' | 'typing' }
  | { type: 'typing'; isTyping: boolean }
  | { type: 'fetch_history'; cursor?: string; limit?: number };

// Server -> Client messages
export type ServerMessage =
  | { type: 'pong'; timestamp: number }
  | { type: 'subscribed'; sessionId: string; participantId: string }
  | { type: 'sandbox_event'; event: unknown }
  | { type: 'history_page'; items: unknown[]; hasMore: boolean; cursor?: string }
  | { type: 'presence_sync'; participants: PresenceInfo[] }
  | { type: 'presence_update'; participant: PresenceInfo }
  | { type: 'presence_leave'; userId: string }
  | { type: 'prompt_queued'; messageId: string }
  | { type: 'session_status'; status: string }
  | { type: 'error'; code: string; message: string };

export interface PresenceInfo {
  userId: string;
  clientId: string;
  status: 'active' | 'idle' | 'typing';
  lastSeen: number;
}

export interface WsData {
  sessionId: string;
  userId: string;
  clientId: string;
  participantId: string;
}
