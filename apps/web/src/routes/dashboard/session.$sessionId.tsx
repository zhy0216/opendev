import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { orpc } from '../../orpc';
import { useSessionSocket } from '../../hooks/use-session-socket';
import { cn } from '../../lib/utils';
import { Skeleton } from '../../components/ui/Skeleton';
import { EventTimeline } from '../../components/session/EventTimeline';
import { FollowUpPrompt } from '../../components/session/FollowUpPrompt';
import { SessionSidebar } from '../../components/session/SessionSidebar';
import { SandboxStatusBanner } from '../../components/session/SandboxStatusBanner';
import type { SandboxStatus } from '@repo/types';

export const Route = createFileRoute('/dashboard/session/$sessionId')({
  component: SessionViewPage,
});

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

const SANDBOX_STATUSES = new Set<string>([
  'pending',
  'starting',
  'running',
  'stopping',
  'stopped',
  'error',
]);

function isSandboxStatus(status: string): status is SandboxStatus {
  return SANDBOX_STATUSES.has(status);
}

function SessionViewPage() {
  const { sessionId } = Route.useParams();

  // Fetch session data
  const {
    data: sessionResponse,
    isLoading: sessionLoading,
    isError: sessionError,
  } = useQuery(
    orpc.session.get.queryOptions({ input: { id: sessionId } })
  );

  // Fetch WS token
  const { data: tokenResponse } = useQuery(
    orpc.session.getWsToken.queryOptions({ input: { sessionId } })
  );

  const wsToken =
    tokenResponse?.success ? (tokenResponse.data as { token: string }).token : null;

  // WebSocket hook
  const {
    connected,
    events,
    participants,
    sessionStatus,
    isProcessing,
    sendPrompt,
    sendStop,
  } = useSessionSocket(sessionId, wsToken);

  const rawSession = sessionResponse?.success ? sessionResponse.data : null;
  const session = rawSession
    ? {
        id: rawSession.id,
        name: rawSession.name,
        status: rawSession.status,
        repoOwner: (rawSession as Record<string, unknown>).repoOwner as string | null | undefined,
        repoName: (rawSession as Record<string, unknown>).repoName as string | null | undefined,
        branch: (rawSession as Record<string, unknown>).branch as string | null | undefined,
        model: (rawSession as Record<string, unknown>).model as string | null | undefined,
        sandboxStatus: (rawSession as Record<string, unknown>).sandboxStatus as string | null | undefined,
        createdAt: rawSession.createdAt,
        updatedAt: rawSession.updatedAt,
      }
    : null;

  const handleFollowUp = useCallback(
    (content: string) => {
      sendPrompt(content);
    },
    [sendPrompt]
  );

  const handleStop = useCallback(() => {
    sendStop();
  }, [sendStop]);

  // Loading state
  if (sessionLoading) {
    return <SessionViewSkeleton />;
  }

  // Error state
  if (sessionError || !session) {
    return (
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Session not found
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            The session you are looking for does not exist or you do not have access to it.
          </p>
          <Link
            to="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const displayStatus = sessionStatus !== 'pending' ? sessionStatus : session.status;
  const statusStyle = getStatusStyle(displayStatus);
  const sandboxStatus = session.sandboxStatus ?? 'pending';
  const hasRepo = session.repoOwner && session.repoName;

  return (
    <div className="-my-6 -mx-4 sm:-mx-6 lg:-mx-8 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/dashboard"
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {session.name}
            </h1>
            {hasRepo && (
              <p className="text-xs text-gray-500 font-mono truncate">
                {session.repoOwner}/{session.repoName}
                {session.branch && (
                  <span className="text-gray-400"> : {session.branch}</span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
              statusStyle.bg,
              statusStyle.text
            )}
          >
            {statusStyle.label}
          </span>
          {isProcessing && (
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <svg
                className="h-3.5 w-3.5 mr-1"
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
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Timeline Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Sandbox Status Banner */}
          {isSandboxStatus(sandboxStatus) && sandboxStatus !== 'running' && (
            <div className="px-4 pt-3">
              <SandboxStatusBanner status={sandboxStatus} />
            </div>
          )}

          {/* Event Timeline */}
          <EventTimeline events={events} isProcessing={isProcessing} />

          {/* Follow-up Prompt */}
          <FollowUpPrompt
            onSubmit={handleFollowUp}
            disabled={!connected}
            isProcessing={isProcessing}
          />
        </div>

        {/* Sidebar */}
        <SessionSidebar
          session={session}
          participants={participants}
          connected={connected}
          onStop={handleStop}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
}

function SessionViewSkeleton() {
  return (
    <div className="-my-6 -mx-4 sm:-mx-6 lg:-mx-8 flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header skeleton */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded" />
          <div>
            <Skeleton className="h-5 w-48 mb-1" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Timeline skeleton */}
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar skeleton */}
        <div className="w-80 border-l border-gray-200 bg-white p-4 space-y-4">
          <Skeleton className="h-4 w-28" />
          <div className="space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-24 mt-6" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
