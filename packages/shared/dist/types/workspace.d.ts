import type { UserRole } from './user';
export type WorkspacePlan = 'FREE' | 'PRO' | 'ENTERPRISE';
export interface Workspace {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    accentColor: string;
    timezone: string;
    plan: WorkspacePlan;
    memberCount: number;
    createdAt: string;
    updatedAt: string;
}
export interface WorkspaceMember {
    id: string;
    userId: string;
    workspaceId: string;
    role: UserRole;
    joinedAt: string;
    user: {
        id: string;
        name: string;
        email: string;
        avatarUrl: string | null;
    };
}
export interface WorkspaceInvite {
    id: string;
    email: string;
    role: UserRole;
    workspaceId: string;
    expiresAt: string;
    createdAt: string;
}
//# sourceMappingURL=workspace.d.ts.map