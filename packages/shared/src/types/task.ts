export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';

export interface Label {
  id: string;
  name: string;
  color: string;
  workspaceId: string;
}

export interface TaskAssignee {
  userId: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface TaskDependency {
  id: string;
  blockingTaskId: string;
  blockedTaskId: string;
  type: 'BLOCKS' | 'BLOCKED_BY';
}

export interface CustomFieldValue {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  value: unknown;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  projectId: string;
  parentTaskId: string | null;
  position: number;
  dueDate: string | null;
  startDate: string | null;
  estimatedHours: number | null;
  storyPoints: number | null;
  assignees: TaskAssignee[];
  labels: Label[];
  attachments: TaskAttachment[];
  dependencies: TaskDependency[];
  customFields: CustomFieldValue[];
  subtaskCount: number;
  completedSubtaskCount: number;
  commentCount: number;
  timeTrackedMinutes: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  createdBy: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  parentId: string | null;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  reactions: CommentReaction[];
  attachments: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CommentReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  userId: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  createdAt: string;
}
