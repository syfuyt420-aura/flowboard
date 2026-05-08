import { api } from '@/lib/axios';
import type { Project, ProjectMember } from '@flowboard/shared';
import type { CreateProjectInput, UpdateProjectInput } from '@flowboard/shared';

interface PaginatedResponse<T> {
  data: T[];
  meta: { cursor: string | null; total: number; hasMore: boolean };
}

export const projectsService = {
  async list(
    workspaceId: string,
    params?: { status?: string; search?: string; cursor?: string; limit?: number }
  ): Promise<PaginatedResponse<Project>> {
    const { data } = await api.get<{ data: Project[]; meta: PaginatedResponse<Project>['meta'] }>(
      '/projects',
      { params: { workspaceId, ...params } }
    );
    return { data: data.data, meta: data.meta };
  },

  async get(id: string): Promise<Project> {
    const { data } = await api.get<{ data: Project }>(`/projects/${id}`);
    return data.data;
  },

  async create(payload: CreateProjectInput): Promise<Project> {
    const { data } = await api.post<{ data: Project }>('/projects', payload);
    return data.data;
  },

  async update(id: string, payload: UpdateProjectInput): Promise<Project> {
    const { data } = await api.patch<{ data: Project }>(`/projects/${id}`, payload);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },

  async getMembers(id: string): Promise<ProjectMember[]> {
    const { data } = await api.get<{ data: ProjectMember[] }>(`/projects/${id}/members`);
    return data.data;
  },
};
