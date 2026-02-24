import { useState } from 'react';
import { cn } from '../../lib/utils';

interface ToolCallEventProps {
  toolName: string;
  args?: unknown;
  timestamp: number;
}

export function ToolCallEvent({ toolName, args, timestamp }: ToolCallEventProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
        <svg
          className="h-4 w-4 text-purple-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.42 15.17l-5.384-3.19A2.625 2.625 0 015 9.837V6.75a2.625 2.625 0 012.636-2.143h8.728A2.625 2.625 0 0119 6.75v3.087a2.625 2.625 0 01-1.036 2.143l-5.384 3.19a2.625 2.625 0 01-3.16 0z"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  {toolName}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(timestamp).toLocaleTimeString()}
                </span>
              </div>
              <svg
                className={cn(
                  'h-4 w-4 text-gray-400 transition-transform',
                  expanded && 'rotate-180'
                )}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </div>
            {expanded && args != null && (
              <div className="border-t border-gray-100 px-3 py-2">
                <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap font-mono">
                  {typeof args === 'string' ? args : JSON.stringify(args, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
