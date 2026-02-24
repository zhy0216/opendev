import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orpc } from '../../orpc';
import { Skeleton } from '../../components/ui/Skeleton';
import { QueryError } from '../../components/ui/ErrorBoundary';
import { SessionCard } from '../../components/session/SessionCard';
import { SessionFilters } from '../../components/session/SessionFilters';

export const Route = createFileRoute('/dashboard/sessions')({
  component: SessionsPage,
});

function SessionCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-56 mb-3" />
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-5 w-28 rounded-md" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

function SessionsGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SessionCardSkeleton key={i} />
      ))}
    </div>
  );
}

function SessionsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(
    orpc.session.list.queryOptions({
      input: {
        ...(statusFilter ? { status: statusFilter } : {}),
        limit: 50,
      },
    })
  );

  const sessions = response?.success ? response.data : [];

  // Client-side search filtering
  const filteredSessions = searchQuery.trim()
    ? sessions.filter((session) => {
        const query = searchQuery.toLowerCase();
        const name = (session.name ?? '').toLowerCase();
        const title = ((session as { title?: string | null }).title ?? '').toLowerCase();
        return name.includes(query) || title.includes(query);
      })
    : sessions;

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Sessions</h1>
        <p className="mt-1 text-sm text-gray-600">
          View and manage all your agent sessions.
        </p>
      </div>

      <div className="mb-6">
        <SessionFilters
          status={statusFilter}
          onStatusChange={setStatusFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {isError ? (
        <QueryError error={error} onRetry={() => refetch()} />
      ) : isLoading ? (
        <SessionsGridSkeleton count={6} />
      ) : filteredSessions.length === 0 ? (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchQuery.trim() || statusFilter
                ? 'No matching sessions'
                : 'No sessions yet'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery.trim() || statusFilter
                ? 'Try adjusting your filters or search query.'
                : 'Get started by creating a new session from the dashboard.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
