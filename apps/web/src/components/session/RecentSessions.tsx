import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { orpc } from '../../orpc';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../lib/utils';
import { getStatusStyle } from '../../lib/status-styles';
import { relativeTime } from '../../lib/format';

function RecentSessionsSkeleton() {
  return (
    <div className="divide-y divide-gray-200">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="py-3 flex items-center justify-between">
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-2" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function RecentSessions() {
  const { data: response, isLoading, isError } = useQuery(
    orpc.session.list.queryOptions({ input: { limit: 5 } })
  );

  const sessions = response?.success ? response.data : [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Recent Sessions
      </h3>

      {isLoading ? (
        <RecentSessionsSkeleton />
      ) : isError ? (
        <p className="text-sm text-gray-500">Failed to load sessions.</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          No sessions yet. Create your first session above.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {sessions.map((session) => {
            const style = getStatusStyle(session.status);
            return (
              <li key={session.id}>
                <Link
                  to={'/dashboard/session/$sessionId' as string}
                  params={{ sessionId: session.id } as Record<string, string>}
                  className="py-3 flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          style.bg,
                          style.text
                        )}
                      >
                        {style.label}
                      </span>
                      {session.model && (
                        <span className="text-xs text-gray-400 truncate">
                          {session.model}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 ml-4 flex-shrink-0">
                    {relativeTime(session.createdAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
