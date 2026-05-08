import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isToday(d)) return formatDistanceToNow(d, { addSuffix: true });
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d, yyyy');
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy'): string {
  return format(typeof date === 'string' ? new Date(date) : date, fmt);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

export function generateInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function getContrastColor(hexColor: string): 'black' | 'white' {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'black' : 'white';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export const PRIORITY_CONFIG = {
  P0: { label: 'Critical', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' },
  P1: { label: 'High', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950' },
  P2: { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950' },
  P3: { label: 'Low', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
  P4: { label: 'Minimal', color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-900' },
} as const;

export const STATUS_CONFIG = {
  BACKLOG: { label: 'Backlog', color: 'text-gray-500', dot: 'bg-gray-400' },
  TODO: { label: 'Todo', color: 'text-blue-500', dot: 'bg-blue-400' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-brand-500', dot: 'bg-brand-500' },
  IN_REVIEW: { label: 'In Review', color: 'text-purple-500', dot: 'bg-purple-500' },
  DONE: { label: 'Done', color: 'text-green-500', dot: 'bg-green-500' },
  CANCELLED: { label: 'Cancelled', color: 'text-gray-400', dot: 'bg-gray-300' },
} as const;
