import { useState, useEffect, useRef, useCallback } from 'react';
import type { ServerMessage, ClientMessage, PresenceInfo } from '@repo/types';

interface SessionSocketState {
  connected: boolean;
  events: ServerMessage[];
  participants: PresenceInfo[];
  sessionStatus: string;
  isProcessing: boolean;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const PING_INTERVAL_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;
const IDLE_TIMEOUT_MS = 5 * 60 * 1_000; // 5 minutes

export function useSessionSocket(sessionId: string, token: string | null) {
  const [state, setState] = useState<SessionSocketState>({
    connected: false,
    events: [],
    participants: [],
    sessionStatus: 'pending',
    isProcessing: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);

  const clearPingInterval = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    let message: ServerMessage;
    try {
      message = JSON.parse(event.data as string) as ServerMessage;
    } catch {
      return;
    }

    setState((prev) => {
      switch (message.type) {
        case 'pong':
          // Keepalive response, no state update needed
          return prev;

        case 'subscribed':
          return { ...prev, sessionStatus: 'connected' };

        case 'sandbox_event':
          return {
            ...prev,
            events: [...prev.events, message],
            isProcessing: true,
          };

        case 'history_page':
          return {
            ...prev,
            events: [...prev.events, message],
          };

        case 'presence_sync':
          return { ...prev, participants: message.participants };

        case 'presence_update':
          return {
            ...prev,
            participants: [
              ...prev.participants.filter(
                (p) => p.clientId !== message.participant.clientId
              ),
              message.participant,
            ],
          };

        case 'presence_leave':
          return {
            ...prev,
            participants: prev.participants.filter(
              (p) => p.userId !== message.userId
            ),
          };

        case 'prompt_queued':
          return {
            ...prev,
            events: [...prev.events, message],
            isProcessing: true,
          };

        case 'session_status':
          return {
            ...prev,
            sessionStatus: message.status,
            isProcessing: message.status === 'running',
          };

        case 'error':
          return {
            ...prev,
            events: [...prev.events, message],
          };

        default:
          return prev;
      }
    });
  }, []);

  const connect = useCallback(() => {
    if (!token || unmountedRef.current) return;

    const wsUrl = `ws://${window.location.host}/ws/sessions/${sessionId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) {
        ws.close();
        return;
      }

      reconnectAttemptRef.current = 0;
      setState((prev) => ({ ...prev, connected: true }));

      // Subscribe with token
      const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      send({ type: 'subscribe', token, clientId });

      // Start ping interval
      clearPingInterval();
      pingIntervalRef.current = setInterval(() => {
        send({ type: 'ping' });
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setState((prev) => ({ ...prev, connected: false }));
      clearPingInterval();

      if (unmountedRef.current) return;

      // Reconnect with exponential backoff
      if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay =
          BASE_RECONNECT_DELAY_MS *
          Math.pow(2, reconnectAttemptRef.current);
        reconnectAttemptRef.current += 1;
        clearReconnectTimeout();
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = (event) => {
      console.error('[ws] connection error', event);
      // onclose will be called after onerror, so reconnect is handled there
    };
  }, [sessionId, token, send, handleMessage, clearPingInterval, clearReconnectTimeout]);

  // Connect when token is available
  useEffect(() => {
    unmountedRef.current = false;

    if (token) {
      connect();
    }

    return () => {
      unmountedRef.current = true;
      clearPingInterval();
      clearReconnectTimeout();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [token, connect, clearPingInterval, clearReconnectTimeout]);

  // Idle detection
  useEffect(() => {
    const resetIdleTimer = () => {
      if (isIdleRef.current) {
        isIdleRef.current = false;
        send({ type: 'presence', status: 'active' });
      }

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      idleTimerRef.current = setTimeout(() => {
        isIdleRef.current = true;
        send({ type: 'presence', status: 'idle' });
      }, IDLE_TIMEOUT_MS);
    };

    const activityEvents = ['mousemove', 'keypress', 'mousedown', 'touchstart', 'scroll'];
    for (const event of activityEvents) {
      window.addEventListener(event, resetIdleTimer, { passive: true });
    }

    // Start the idle timer
    resetIdleTimer();

    return () => {
      for (const event of activityEvents) {
        window.removeEventListener(event, resetIdleTimer);
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [send]);

  // Send helpers
  const sendPrompt = useCallback(
    (content: string, model?: string, reasoningEffort?: string) => {
      send({ type: 'prompt', content, model, reasoningEffort });
    },
    [send]
  );

  const sendStop = useCallback(() => {
    send({ type: 'stop' });
  }, [send]);

  const sendPresence = useCallback(
    (status: 'active' | 'idle' | 'typing') => {
      send({ type: 'presence', status });
    },
    [send]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      send({ type: 'typing', isTyping });
    },
    [send]
  );

  const fetchHistory = useCallback(
    (cursor?: string, limit?: number) => {
      send({ type: 'fetch_history', cursor, limit });
    },
    [send]
  );

  return {
    ...state,
    sendPrompt,
    sendStop,
    sendPresence,
    sendTyping,
    fetchHistory,
  };
}
