import { api } from '@/lib/axios';
import type { Task, Comment, ActivityLog, TimeEntry } from '@flowboard/shared';
import type { CreateTaskInput, UpdateTaskInput, MoveTaskInput } from '@flowboard/shared';

interface TasksQuery {
  projectId?: string;
  assignee?: string;
  priority?: string;
  status?: string;
  labelId?: string;
  overdue?: boolean;
  cursor?: string;
  limit?: number;
  search?: string;
}

interface PaginatedTasks {
  data: Task[];
  meta: { cursor: string | null; total: number; hasMore: boolean };
}

export const tasksService = {
  async list(query: TasksQuery): Promise<PaginatedTasks> {
    const { data } = await api.get<{ data: Task[]; meta: PaginatedTasks['meta'] }>('/tasks', {
      params: query,
    });
    return { data: data.data, meta: data.meta };
  },

  async get(id: string): Promise<Task> {
    const { data } = await api.get<{ data: Task }>(`/tasks/${id}`);
    return data.data;
  },

  async create(payload: CreateTaskInput): Promise<Task> {
    const { data } = await api.post<{ data: Task }>('/tasks', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateTaskInput): Promise<Task> {
    const { data } = await api.patch<{ data: Task }>(`/tasks/${id}`, payload);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },

  async move(id: string, payload: MoveTaskInput): Promise<Task> {
    const { data } = await api.post<{ data: Task }>(`/tasks/${id}/move`, payload);
    return data.data;
  },

  async bulk(
    taskIds: string[],
    action: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    await api.post('/tasks/bulk', { taskIds, action, payload });
  },

  async getComments(taskId: string): Promise<Comment[]> {
    const { data } = await api.get<{ data: Comment[] }>(`/tasks/${taskId}/comments`);
    return data.data;
  },

  async addComment(taskId: string, content: string, parentId?: string): Promise<Comment> {
    const { data } = await api.post<{ data: Comment }>(`/tasks/${taskId}/comments`, {
      content,
      parentId,
    });
    return data.data;
  },

  async deleteComment(taskId: string, commentId: string): Promise<void> {
    await api.delete(`/tasks/${taskId}/comments/${commentId}`);
  },

  async reactToComment(taskId: string, commentId: string, emoji: string): Promise<void> {
    await api.post(`/tasks/${taskId}/comments/${commentId}/reactions`, { emoji });
  },

  async getActivity(taskId: string): Promise<ActivityLog[]> {
    const { data } = await api.get<{ data: ActivityLog[] }>(`/tasks/${taskId}/activity`);
    return data.data;
  },

  async startTimer(taskId: string): Promise<TimeEntry> {
    const { data } = await api.post<{ data: TimeEntry }>(`/tasks/${taskId}/time-entries/start`);
    return data.data;
  },

  async stopTimer(taskId: string): Promise<TimeEntry> {
    const { data } = await api.post<{ data: TimeEntry }>(`/tasks/${taskId}/time-entries/stop`);
    return data.data;
  },

  async logTime(
    taskId: string,
    durationMinutes: number,
    description?: string
  ): Promise<TimeEntry> {
    const { data } = await api.post<{ data: TimeEntry }>(`/tasks/${taskId}/time-entries`, {
      durationMinutes,
      description,
    });
    return data.data;
  },
};
