import { Link } from '@tanstack/react-router';
import { cn } from '../../lib/utils';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
  active: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Active' },
  running: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Running' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
  error: { bg: 'bg-red-100', text: 'text-red-800', label: 'Error' },
  failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Archived' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled' },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
}

function relativeTime(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(date).toLocaleDateString();
}

interface SessionCardProps {
  session: {
    id: string;
    name: string;
    title?: string | null;
    repoOwner?: string | null;
    repoName?: string | null;
    model?: string | null;
    status: string;
    createdAt: string | Date;
  };
}

export function SessionCard({ session }: SessionCardProps) {
  const style = getStatusStyle(session.status);

  return (
    <Link
      to={'/dashboard/session/$sessionId' as string}
      params={{ sessionId: session.id } as Record<string, string>}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer block"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 truncate flex-1 mr-2">
          {session.name}
        </h3>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0',
            style.bg,
            style.text
          )}
        >
          {style.label}
        </span>
      </div>

      {session.title && (
        <p className="text-xs text-gray-500 truncate mb-3">
          {session.title}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap mb-3">
        {session.repoOwner && session.repoName && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-700 font-mono">
            <svg
              className="mr-1 h-3 w-3 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            {session.repoOwner}/{session.repoName}
          </span>
        )}
        {session.model && (
          <span className="text-xs text-gray-400 truncate">
            {session.model}
          </span>
        )}
      </div>

      <div className="text-xs text-gray-400">
        {relativeTime(session.createdAt)}
      </div>
    </Link>
  );
}
