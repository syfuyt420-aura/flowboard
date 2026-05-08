import { api } from '@/lib/axios';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  plan: string;
}

export const workspaceService = {
  async list(): Promise<Workspace[]> {
    const { data } = await api.get<{ data: Workspace[] }>('/workspaces');
    return data.data;
  },

  async create(payload: { name: string; slug?: string }): Promise<Workspace> {
    const { data } = await api.post<{ data: Workspace }>('/workspaces', payload);
    return data.data;
  },

  async get(id: string): Promise<Workspace> {
    const { data } = await api.get<{ data: Workspace }>(`/workspaces/${id}`);
    return data.data;
  },
};
