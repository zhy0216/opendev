import { useState } from 'react';

interface ErrorEventProps {
  code: string;
  message: string;
  stack?: string;
  timestamp: number;
}

export function ErrorEvent({ code, message, stack, timestamp }: ErrorEventProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
        <svg
          className="h-4 w-4 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => stack && setExpanded(!expanded)}
            className="w-full text-left px-3 py-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                  {code}
                </span>
                <span className="text-sm text-red-800">{message}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {new Date(timestamp).toLocaleTimeString()}
                </span>
                {stack && (
                  <svg
                    className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
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
                )}
              </div>
            </div>
          </button>
          {expanded && stack && (
            <div className="border-t border-red-200 px-3 py-2 bg-red-100/50">
              <pre className="text-xs text-red-700 overflow-x-auto whitespace-pre-wrap font-mono">
                {stack}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
