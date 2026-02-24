import { cn } from '../../lib/utils';
import type { PresenceInfo } from '@repo/types';

interface SessionSidebarProps {
  session: {
    id: string;
    name: string;
    status: string;
    repoOwner?: string | null;
    repoName?: string | null;
    branch?: string | null;
    model?: string | null;
    createdAt: string | Date;
    updatedAt?: string | Date | null;
  };
  participants: PresenceInfo[];
  connected: boolean;
  onStop: () => void;
  isProcessing: boolean;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  running: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Running' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
  failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Archived' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Cancelled' },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
}

export function SessionSidebar({
  session,
  participants,
  connected,
  onStop,
  isProcessing,
}: SessionSidebarProps) {
  const style = getStatusStyle(session.status);
  const hasRepo = session.repoOwner && session.repoName;

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
      {/* Session Metadata */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Session Details</h3>
        <dl className="space-y-2">
          <div>
            <dt className="text-xs text-gray-500">Status</dt>
            <dd className="mt-0.5">
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  style.bg,
                  style.text
                )}
              >
                {style.label}
              </span>
            </dd>
          </div>

          {hasRepo && (
            <div>
              <dt className="text-xs text-gray-500">Repository</dt>
              <dd className="mt-0.5 text-sm text-gray-900 font-mono">
                {session.repoOwner}/{session.repoName}
              </dd>
            </div>
          )}

          {session.branch && (
            <div>
              <dt className="text-xs text-gray-500">Branch</dt>
              <dd className="mt-0.5 text-sm text-gray-900 font-mono">
                {session.branch}
              </dd>
            </div>
          )}

          {session.model && (
            <div>
              <dt className="text-xs text-gray-500">Model</dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {session.model}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-xs text-gray-500">Created</dt>
            <dd className="mt-0.5 text-sm text-gray-900">
              {new Date(session.createdAt).toLocaleString()}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-gray-500">Connection</dt>
            <dd className="mt-0.5 flex items-center gap-1.5">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  connected ? 'bg-green-400' : 'bg-red-400'
                )}
              />
              <span className="text-xs text-gray-600">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* Participants */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Participants
          <span className="ml-1.5 text-xs font-normal text-gray-400">
            ({participants.length})
          </span>
        </h3>
        {participants.length === 0 ? (
          <p className="text-xs text-gray-400">No one else is viewing</p>
        ) : (
          <ul className="space-y-2">
            {participants.map((p) => (
              <li key={p.clientId} className="flex items-center gap-2">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full flex-shrink-0',
                    p.status === 'active'
                      ? 'bg-green-400'
                      : p.status === 'typing'
                        ? 'bg-green-400 animate-pulse'
                        : 'bg-yellow-400'
                  )}
                />
                <span className="text-sm text-gray-700 truncate">
                  {p.userId}
                </span>
                <span className="text-xs text-gray-400 capitalize">
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Artifacts Placeholder */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Artifacts</h3>
        <p className="text-xs text-gray-400">
          No artifacts produced yet.
        </p>
      </div>

      {/* Actions */}
      <div className="p-4 mt-auto">
        <div className="space-y-2">
          {isProcessing && (
            <button
              type="button"
              onClick={onStop}
              className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <svg
                className="h-4 w-4 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"
                />
              </svg>
              Stop Agent
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
