import type { ServerMessage } from '@repo/types';
import { UserMessageEvent } from './UserMessageEvent';
import { ToolCallEvent } from './ToolCallEvent';
import { TokenStreamEvent } from './TokenStreamEvent';
import { GitSyncEvent } from './GitSyncEvent';
import { ExecutionCompleteEvent } from './ExecutionCompleteEvent';
import { ErrorEvent } from './ErrorEvent';

interface EventItemProps {
  event: ServerMessage;
}

function extractEventData(event: ServerMessage) {
  if (event.type === 'sandbox_event') {
    const sandboxEvent = event.event;
    return {
      eventType: sandboxEvent?.type ?? 'unknown',
      timestamp: sandboxEvent?.timestamp ?? Date.now(),
      data: sandboxEvent?.data ?? {},
    };
  }
  return null;
}

export function EventItem({ event }: EventItemProps) {
  // Handle sandbox_event wrapper
  if (event.type === 'sandbox_event') {
    const extracted = extractEventData(event);
    if (!extracted) return null;

    const { eventType, timestamp, data: eventData } = extracted;

    switch (eventType) {
      case 'user_message':
        return (
          <UserMessageEvent
            content={(eventData.content as string) ?? ''}
            timestamp={timestamp}
          />
        );

      case 'tool_call':
        return (
          <ToolCallEvent
            toolName={(eventData.toolName as string) ?? (eventData.name as string) ?? 'unknown'}
            args={eventData.args ?? eventData.arguments}
            timestamp={timestamp}
          />
        );

      case 'tool_result':
        return (
          <ToolCallEvent
            toolName={`${(eventData.toolName as string) ?? 'tool'} (result)`}
            args={eventData.result ?? eventData.output}
            timestamp={timestamp}
          />
        );

      case 'token':
        return (
          <TokenStreamEvent
            text={(eventData.text as string) ?? (eventData.token as string) ?? ''}
            timestamp={timestamp}
          />
        );

      case 'git_sync':
        return (
          <GitSyncEvent
            sha={(eventData.sha as string) ?? (eventData.commitSha as string) ?? ''}
            message={eventData.message as string | undefined}
            branch={eventData.branch as string | undefined}
            timestamp={timestamp}
          />
        );

      case 'execution_complete':
        return (
          <ExecutionCompleteEvent
            success={(eventData.success as boolean) ?? (eventData.exitCode === 0)}
            message={eventData.message as string | undefined}
            exitCode={eventData.exitCode as number | undefined}
            timestamp={timestamp}
          />
        );

      case 'error':
        return (
          <ErrorEvent
            code={(eventData.code as string) ?? 'ERROR'}
            message={(eventData.message as string) ?? 'An error occurred'}
            stack={eventData.stack as string | undefined}
            timestamp={timestamp}
          />
        );

      default:
        return (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-xs text-gray-400">?</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-500 font-mono">{eventType}</span>
                <pre className="text-xs text-gray-600 mt-1 overflow-x-auto whitespace-pre-wrap font-mono">
                  {JSON.stringify(eventData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        );
    }
  }

  // Handle direct server message types
  if (event.type === 'error') {
    return (
      <ErrorEvent
        code={event.code}
        message={event.message}
        timestamp={Date.now()}
      />
    );
  }

  if (event.type === 'prompt_queued') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <svg
          className="h-4 w-4 text-blue-400 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm text-gray-500">Prompt queued, processing...</span>
      </div>
    );
  }

  if (event.type === 'session_status') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-blue-400" />
        <span className="text-xs text-gray-500">
          Session status changed to <span className="font-medium">{event.status}</span>
        </span>
      </div>
    );
  }

  // Ignore pong, subscribed, history_page, presence messages in the timeline
  return null;
}
