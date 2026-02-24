import { useRef, useEffect, useCallback, useState } from 'react';
import type { ServerMessage } from '@repo/types';
import { EventItem } from './EventItem';

interface EventTimelineProps {
  events: ServerMessage[];
  isProcessing: boolean;
}

export function EventTimeline({ events, isProcessing }: EventTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Track if user has scrolled up
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);

  // Auto-scroll on new events
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events.length, autoScroll]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4"
    >
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
              />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No events yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Events will appear here as the agent processes your request.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, index) => (
            <EventItem key={index} event={event} />
          ))}
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center gap-2 mt-3 px-3 py-2">
          <span className="flex space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
          <span className="text-xs text-gray-400">Agent is working...</span>
        </div>
      )}

      {!autoScroll && events.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setAutoScroll(true);
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }}
          className="fixed bottom-24 right-96 bg-white border border-gray-200 rounded-full shadow-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
            />
          </svg>
          Scroll to bottom
        </button>
      )}
    </div>
  );
}
