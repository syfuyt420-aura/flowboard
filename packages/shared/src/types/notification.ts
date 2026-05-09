export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_COMMENTED'
  | 'TASK_MENTIONED'
  | 'TASK_DUE_SOON'
  | 'TASK_OVERDUE'
  | 'TASK_STATUS_CHANGED'
  | 'PROJECT_INVITE'
  | 'WORKSPACE_INVITE'
  | 'PROJECT_COMPLETED'
  | 'MEMBER_UPDATE';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  userId: string;
  createdAt: string;
}

export interface NotificationPreferences {
  emailOnAssign: boolean;
  emailOnComment: boolean;
  emailOnMention: boolean;
  emailOnDue: boolean;
  digestFrequency: 'NONE' | 'DAILY' | 'WEEKLY';
  inAppAll: boolean;
}
