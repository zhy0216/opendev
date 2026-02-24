import { cn } from '../../lib/utils';

interface UserMessageEventProps {
  content: string;
  timestamp: number;
}

export function UserMessageEvent({ content, timestamp }: UserMessageEventProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
        <svg
          className="h-4 w-4 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">You</span>
          <span className="text-xs text-gray-400">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  );
}
