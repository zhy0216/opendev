import { cn } from '../../lib/utils';
import type { PresenceInfo } from '@repo/types';

interface PresenceIndicatorProps {
  participants: PresenceInfo[];
}

const MAX_VISIBLE = 5;

function getInitials(userId: string): string {
  // Extract initials from userId - take first two characters uppercased
  const cleaned = userId.replace(/[^a-zA-Z0-9]/g, '');
  return cleaned.slice(0, 2).toUpperCase() || '??';
}

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-cyan-500',
  'bg-emerald-500',
];

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getStatusDotClass(status: PresenceInfo['status']): string {
  switch (status) {
    case 'active':
      return 'bg-green-400';
    case 'idle':
      return 'bg-yellow-400';
    case 'typing':
      return 'bg-green-400 animate-pulse';
    default:
      return 'bg-gray-400';
  }
}

function getStatusLabel(status: PresenceInfo['status']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'idle':
      return 'Idle';
    case 'typing':
      return 'Typing...';
    default:
      return status;
  }
}

export function PresenceIndicator({ participants }: PresenceIndicatorProps) {
  if (participants.length === 0) return null;

  const visible = participants.slice(0, MAX_VISIBLE);
  const overflow = participants.length - MAX_VISIBLE;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map((p) => (
          <div
            key={p.clientId}
            className="relative group"
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full border-2 border-white text-white text-xs flex items-center justify-center font-medium',
                getAvatarColor(p.userId)
              )}
            >
              {getInitials(p.userId)}
            </div>
            {/* Status dot */}
            <span
              className={cn(
                'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white',
                getStatusDotClass(p.status)
              )}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
              <div className="bg-gray-900 text-white text-xs rounded-md px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                <div className="font-medium">{p.userId}</div>
                <div className="text-gray-300">{getStatusLabel(p.status)}</div>
              </div>
              <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
            </div>
          </div>
        ))}
        {overflow > 0 && (
          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 text-gray-600 text-xs flex items-center justify-center font-medium">
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
}
