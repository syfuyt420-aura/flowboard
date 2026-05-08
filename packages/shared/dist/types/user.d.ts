export type UserRole = 'OWNER' | 'ADMIN' | 'PROJECT_MANAGER' | 'MEMBER' | 'VIEWER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
export interface User {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    role: UserRole;
    status: UserStatus;
    timezone: string;
    locale: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}
export interface UserProfile extends User {
    workspaceCount: number;
    taskCount: number;
}
export interface SessionInfo {
    id: string;
    userAgent: string;
    ipAddress: string;
    createdAt: string;
    lastActiveAt: string;
    isCurrent: boolean;
}
//# sourceMappingURL=user.d.ts.map