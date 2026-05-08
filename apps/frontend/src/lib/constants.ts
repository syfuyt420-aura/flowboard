export const APP_NAME = 'FlowBoard';
export const APP_DESCRIPTION = 'Team Intelligence Platform';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export const ACCESS_TOKEN_KEY = 'fb_access_token';

export const QUERY_KEYS = {
  auth: {
    me: ['auth', 'me'] as const,
    sessions: ['auth', 'sessions'] as const,
  },
  workspaces: {
    list: ['workspaces'] as const,
    detail: (id: string) => ['workspaces', id] as const,
    members: (id: string) => ['workspaces', id, 'members'] as const,
  },
  projects: {
    list: (workspaceId?: string) => ['projects', workspaceId] as const,
    detail: (id: string) => ['projects', id] as const,
    members: (id: string) => ['projects', id, 'members'] as const,
  },
  tasks: {
    list: (projectId?: string) => ['tasks', projectId] as const,
    detail: (id: string) => ['tasks', id] as const,
    activity: (id: string) => ['tasks', id, 'activity'] as const,
    comments: (id: string) => ['tasks', id, 'comments'] as const,
    timeEntries: (id: string) => ['tasks', id, 'time-entries'] as const,
  },
  notifications: {
    list: ['notifications'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
  },
  analytics: {
    dashboard: ['analytics', 'dashboard'] as const,
    velocity: (projectId: string) => ['analytics', 'velocity', projectId] as const,
    workload: (workspaceId: string) => ['analytics', 'workload', workspaceId] as const,
  },
} as const;

export const MAX_FILE_SIZE_MB = 25;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ACCEPTED_FILE_TYPES = [...ACCEPTED_IMAGE_TYPES, 'application/pdf', 'text/plain'];

export const DEBOUNCE_MS = 300;
export const TOAST_DURATION = 4000;

export const KANBAN_COLUMNS = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'IN_REVIEW',
  'DONE',
] as const;
