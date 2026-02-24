import { cn } from '../../lib/utils';

interface ExecutionCompleteEventProps {
  success: boolean;
  message?: string;
  exitCode?: number;
  timestamp: number;
}

export function ExecutionCompleteEvent({
  success,
  message,
  exitCode,
  timestamp,
}: ExecutionCompleteEventProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
          success ? 'bg-green-100' : 'bg-red-100'
        )}
      >
        {success ? (
          <svg
            className="h-4 w-4 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'border rounded-lg px-3 py-2',
            success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium',
                success ? 'text-green-800' : 'text-red-800'
              )}
            >
              {success ? 'Execution Complete' : 'Execution Failed'}
            </span>
            {exitCode != null && (
              <span
                className={cn(
                  'text-xs font-mono px-1.5 py-0.5 rounded',
                  success
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                )}
              >
                exit {exitCode}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          </div>
          {message && (
            <p
              className={cn(
                'text-sm mt-1',
                success ? 'text-green-700' : 'text-red-700'
              )}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
