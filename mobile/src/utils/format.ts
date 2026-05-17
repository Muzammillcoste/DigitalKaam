import { Colors } from '@/theme';

export const formatPrice = (amount: number): string => {
  return `Rs. ${amount.toLocaleString('en-PK')}`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatDateTime = (dateString: string): string =>
  `${formatDate(dateString)} at ${formatTime(dateString)}`;

export const formatRelativeTime = (dateString: string): string => {
  const now = Date.now();
  const diff = now - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(dateString);
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  en_route: 'On the way',
  arrived: 'Arrived',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending: 'Pending',
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: Colors.statusConfirmed,
  en_route: Colors.statusEnRoute,
  arrived: Colors.statusArrived,
  in_progress: Colors.statusInProgress,
  completed: Colors.statusCompleted,
  cancelled: Colors.statusCancelled,
  pending: Colors.textSecondary,
};

export const formatStatus = (status: string): string =>
  STATUS_LABELS[status] ?? status;

export const statusColor = (status: string): string =>
  STATUS_COLORS[status] ?? Colors.textSecondary;

export const initials = (name: string): string =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

export const formatArea = (area: string): string =>
  area
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
