interface TokenStreamEventProps {
  text: string;
  timestamp: number;
}

export function TokenStreamEvent({ text, timestamp }: TokenStreamEventProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
        <svg
          className="h-4 w-4 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
          />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
            <code>{text}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
