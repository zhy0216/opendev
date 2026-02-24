import type { PresenceInfo } from '@repo/types';

interface TypingIndicatorProps {
  participants: PresenceInfo[];
  currentUserId?: string;
}

export function TypingIndicator({ participants, currentUserId }: TypingIndicatorProps) {
  const typingUsers = participants.filter(
    (p) => p.status === 'typing' && p.userId !== currentUserId
  );

  if (typingUsers.length === 0) return null;

  // Deduplicate by userId in case same user has multiple connections
  const uniqueUserIds = [...new Set(typingUsers.map((p) => p.userId))];

  let text: string;
  if (uniqueUserIds.length === 1) {
    text = `${uniqueUserIds[0]} is typing`;
  } else if (uniqueUserIds.length === 2) {
    text = `${uniqueUserIds[0]} and ${uniqueUserIds[1]} are typing`;
  } else {
    text = `${uniqueUserIds[0]} and ${uniqueUserIds.length - 1} others are typing`;
  }

  return (
    <div className="px-4 py-1.5">
      <p className="text-xs text-gray-400 flex items-center gap-1">
        <span>{text}</span>
        <span className="inline-flex gap-0.5">
          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
      </p>
    </div>
  );
}
