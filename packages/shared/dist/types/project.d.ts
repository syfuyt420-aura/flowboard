import type { UserRole } from './user';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export interface Project {
    id: string;
    name: string;
    description: string | null;
    color: string;
    icon: string;
    coverImageUrl: string | null;
    status: ProjectStatus;
    healthScore: number;
    workspaceId: string;
    ownerId: string;
    startDate: string | null;
    dueDate: string | null;
    taskCount: number;
    completedTaskCount: number;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}
export interface ProjectMember {
    id: string;
    userId: string;
    projectId: string;
    role: UserRole;
    joinedAt: string;
    user: {
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
    };
}
export interface ProjectTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    taskCount: number;
}
//# sourceMappingURL=project.d.ts.map