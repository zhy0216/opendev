import { cn } from '../../lib/utils';
import type { SandboxStatus } from '@repo/types';

interface SandboxStatusBannerProps {
  status: SandboxStatus;
}

const STATUS_CONFIG: Record<SandboxStatus, { bg: string; text: string; icon: string; label: string }> = {
  pending: {
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-500',
    label: 'Sandbox pending...',
  },
  starting: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    icon: 'text-blue-500',
    label: 'Sandbox starting...',
  },
  running: {
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-800',
    icon: 'text-green-500',
    label: 'Sandbox running',
  },
  stopping: {
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-800',
    icon: 'text-yellow-500',
    label: 'Sandbox stopping...',
  },
  stopped: {
    bg: 'bg-gray-50 border-gray-200',
    text: 'text-gray-600',
    icon: 'text-gray-400',
    label: 'Sandbox stopped',
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    icon: 'text-red-500',
    label: 'Sandbox error',
  },
};

export function SandboxStatusBanner({ status }: SandboxStatusBannerProps) {
  const config = STATUS_CONFIG[status];
  const isAnimating = status === 'pending' || status === 'starting' || status === 'stopping';

  return (
    <div className={cn('border rounded-lg px-4 py-2 flex items-center gap-3', config.bg)}>
      {isAnimating ? (
        <svg
          className={cn('h-4 w-4 animate-spin', config.icon)}
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
      ) : status === 'running' ? (
        <span className={cn('relative flex h-3 w-3', config.icon)}>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
        </span>
      ) : (
        <span className={cn('h-3 w-3 rounded-full', status === 'error' ? 'bg-red-500' : 'bg-gray-400')} />
      )}
      <span className={cn('text-sm font-medium', config.text)}>{config.label}</span>
    </div>
  );
}
