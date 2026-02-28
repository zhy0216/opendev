import { cn } from './utils';

export interface StatusStyle {
  bg: string;
  text: string;
  label: string;
}

const STATUS_STYLES: Record<string, StatusStyle> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  active: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Active' },
  running: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Running' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
  error: { bg: 'bg-red-100', text: 'text-red-800', label: 'Error' },
  failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Archived' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled' },
};

const DEFAULT_STYLE: StatusStyle = { bg: 'bg-gray-100', text: 'text-gray-600', label: '' };

export function getStatusStyle(status: string): StatusStyle {
  const style = STATUS_STYLES[status];
  if (style) return style;
  return { ...DEFAULT_STYLE, label: status };
}

export function statusBadgeClass(status: string) {
  const style = getStatusStyle(status);
  return cn(
    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
    style.bg,
    style.text,
  );
}
