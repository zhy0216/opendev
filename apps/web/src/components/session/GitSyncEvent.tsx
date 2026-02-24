interface GitSyncEventProps {
  sha: string;
  message?: string;
  branch?: string;
  timestamp: number;
}

export function GitSyncEvent({ sha, message, branch, timestamp }: GitSyncEventProps) {
  const shortSha = sha.length > 7 ? sha.slice(0, 7) : sha;

  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
        <svg
          className="h-4 w-4 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-green-800">Git Sync</span>
            <code className="text-xs font-mono bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
              {shortSha}
            </code>
            {branch && (
              <span className="text-xs text-green-600">
                on {branch}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          </div>
          {message && (
            <p className="text-sm text-green-800 mt-1">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
